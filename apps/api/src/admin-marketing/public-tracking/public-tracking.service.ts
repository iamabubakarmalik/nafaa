import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../modules/email/email.service';
import { QueueService } from '../../core/queue/queue.service';
import { calculateLeadScore, scoreToTemperature } from '../_shared/helpers/lead-scoring.helper';
import { generateTicketNumber } from '../_shared/helpers/ticket-number.helper';
import { randomUUID } from 'crypto';
import type {
  TrackPageviewDto,
  TrackEventDto,
  SubscribeNewsletterDto,
  SubmitContactFormDto,
  BookDemoDto,
  StartChatDto,
  ChatMessageDto,
} from './dto/tracking.dto';

interface Meta { ip?: string; userAgent?: string; referer?: string }

@Injectable()
export class PublicTrackingService {
  private readonly logger = new Logger(PublicTrackingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly queue: QueueService,
  ) {}

  // ─── Pageview + Session ───────────────────────────────────
  async trackPageview(dto: TrackPageviewDto, meta: Meta) {
    // Check if new visitor
    const existing = await this.prisma.marketingPageView.findFirst({
      where: { visitorId: dto.visitorId },
      select: { id: true },
    });
    const isNew = !existing;

    await this.prisma.marketingPageView.create({
      data: {
        path: dto.path,
        fullUrl: dto.fullUrl,
        title: dto.title,
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        isNewVisitor: isNew,
        referrer: meta.referer ?? dto.referrer,
        referrerDomain: this.extractDomain(meta.referer ?? dto.referrer),
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        utmTerm: dto.utmTerm,
        utmContent: dto.utmContent,
        deviceType: dto.deviceType,
        browser: dto.browser,
        os: dto.os,
        screenWidth: dto.screenWidth,
        screenHeight: dto.screenHeight,
        country: dto.country,
        city: dto.city,
        ipAddress: meta.ip,
        language: dto.language,
        loadTimeMs: dto.loadTimeMs,
      },
    });

    // Session upsert
    const session = await this.prisma.marketingSession.findUnique({
      where: { sessionId: dto.sessionId },
    });
    if (!session) {
      await this.prisma.marketingSession.create({
        data: {
          sessionId: dto.sessionId,
          visitorId: dto.visitorId,
          landingPage: dto.path,
          entryReferrer: meta.referer,
          entryUtmSource: dto.utmSource,
          entryUtmMedium: dto.utmMedium,
          entryUtmCampaign: dto.utmCampaign,
          pageViews: 1,
          deviceType: dto.deviceType,
          browser: dto.browser,
          os: dto.os,
          country: dto.country,
          city: dto.city,
          ipAddress: meta.ip,
        },
      });
    } else {
      await this.prisma.marketingSession.update({
        where: { sessionId: dto.sessionId },
        data: {
          pageViews: { increment: 1 },
          exitPage: dto.path,
          bounced: false,
        },
      });
    }

    return { ok: true };
  }

  async trackEvent(dto: TrackEventDto) {
    await this.prisma.marketingEvent.create({
      data: {
        eventName: dto.eventName,
        eventCategory: dto.eventCategory,
        eventLabel: dto.eventLabel,
        eventValue: dto.eventValue,
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        path: dto.path,
        properties: dto.properties,
      },
    });
    return { ok: true };
  }

  // ─── Newsletter ───────────────────────────────────────────
  async subscribeNewsletter(dto: SubscribeNewsletterDto, meta: Meta) {
    if (!this.isValidEmail(dto.email)) {
      throw new BadRequestException('Invalid email');
    }

    const email = dto.email.toLowerCase().trim();

    // Upsert
    const sub = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        source: (dto.source as any) ?? 'NEWSLETTER',
        sourceUrl: dto.sourceUrl,
        sourcePage: dto.sourcePage,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        interests: dto.interests ?? [],
        industry: dto.industry,
        role: dto.role,
        companyName: dto.companyName,
        country: dto.country ?? 'Pakistan',
        city: dto.city,
        language: dto.language ?? 'en',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        tags: dto.tags ?? [],
        verificationToken: randomUUID(),
      },
      update: {
        status: 'ACTIVE',
        unsubscribedAt: null,
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
      },
    });

    // Send welcome email (async via queue)
    if (sub.status === 'ACTIVE') {
      this.queue
        .sendEmail({
          templateSlug: 'newsletter-welcome',
          toEmail: sub.email,
          toName: [sub.firstName, sub.lastName].filter(Boolean).join(' '),
        } as any)
        .catch(() => null);
    }

    // Create/update lead
    await this.upsertLeadFromEmail({
      fullName: [dto.firstName, dto.lastName].filter(Boolean).join(' ') || email.split('@')[0],
      email,
      phone: dto.phone,
      companyName: dto.companyName,
      industry: dto.industry,
      source: 'NEWSLETTER',
      originType: 'newsletter',
      originId: sub.id,
      landingPage: dto.sourcePage,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
    });

    return { ok: true, subscriberId: sub.id };
  }

  async unsubscribeNewsletter(email: string, reason?: string) {
    const sub = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!sub) return { ok: true }; // silent

    await this.prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
        unsubscribeReason: reason,
      },
    });
    return { ok: true };
  }

  // ─── Contact Form ─────────────────────────────────────────
  async submitContactForm(dto: SubmitContactFormDto, meta: Meta) {
    const ticketNumber = await generateTicketNumber('CT', () =>
      this.prisma.contactFormSubmission.count(),
    );

    // Anti-spam basic score
    const spamScore = this.calculateSpamScore(dto);
    const isSpam = spamScore > 0.7;

    // Priority detection
    const urgencyWords = /urgent|asap|emergency|critical|immediately/i;
    const priority = urgencyWords.test(dto.message) ? 'URGENT' : 'NORMAL';

    const form = await this.prisma.contactFormSubmission.create({
      data: {
        ticketNumber,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        companyName: dto.companyName,
        designation: dto.designation,
        country: dto.country,
        city: dto.city,
        formType: (dto.formType as any) ?? 'GENERAL',
        subject: dto.subject,
        message: dto.message,
        sourceUrl: dto.sourceUrl,
        sourcePage: dto.sourcePage,
        referrer: meta.referer,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        priority: priority as any,
        status: isSpam ? 'SPAM' : 'NEW',
        isSpam,
        spamScore,
      },
    });

    // Auto-confirm email to submitter
    if (!isSpam) {
      this.queue
        .sendEmail({
          templateSlug: 'contact-form-received',
          toEmail: form.email,
          toName: form.fullName,
          variables: { ticketNumber, subject: dto.subject },
        } as any)
        .catch(() => null);

      // Notify internal team (admin)
      this.queue
        .sendEmail({
          templateSlug: 'contact-form-internal-alert',
          toEmail: process.env.ADMIN_ALERT_EMAIL ?? 'admin@nafaa.pk',
          variables: {
            ticketNumber,
            senderName: dto.fullName,
            senderEmail: dto.email,
            subject: dto.subject,
            message: dto.message.slice(0, 500),
          },
        } as any)
        .catch(() => null);

      await this.upsertLeadFromEmail({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        source: 'CONTACT_FORM',
        originType: 'contact_form',
        originId: form.id,
        landingPage: dto.sourcePage,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
      });
    }

    return { ok: true, ticketNumber };
  }

  // ─── Demo Booking ─────────────────────────────────────────
  async bookDemo(dto: BookDemoDto, meta: Meta) {
    const bookingNumber = await generateTicketNumber('DM', () =>
      this.prisma.demoBooking.count(),
    );

    const preferredDate = new Date(dto.preferredDate);
    if (isNaN(preferredDate.getTime())) {
      throw new BadRequestException('Invalid preferredDate');
    }

    const booking = await this.prisma.demoBooking.create({
      data: {
        bookingNumber,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        companyName: dto.companyName,
        designation: dto.designation,
        industry: dto.industry,
        companySize: dto.companySize,
        city: dto.city,
        country: dto.country ?? 'Pakistan',
        numberOfShops: dto.numberOfShops,
        currentSoftware: dto.currentSoftware,
        painPoints: dto.painPoints,
        interestedIn: dto.interestedIn ?? [],
        budget: dto.budget,
        timeline: dto.timeline,
        preferredDate,
        preferredTime: dto.preferredTime,
        duration: dto.duration ?? 30,
        meetingType: dto.meetingType ?? 'VIDEO_CALL',
        sourceUrl: dto.sourceUrl,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    // Confirm to prospect
    this.queue
      .sendEmail({
        templateSlug: 'demo-booking-received',
        toEmail: booking.email,
        toName: booking.fullName,
        variables: {
          bookingNumber,
          preferredDate: preferredDate.toLocaleDateString('en-PK'),
          preferredTime: dto.preferredTime,
        },
      } as any)
      .catch(() => null);

    // Notify admin
    this.queue
      .sendEmail({
        templateSlug: 'demo-booking-internal-alert',
        toEmail: process.env.ADMIN_ALERT_EMAIL ?? 'admin@nafaa.pk',
        variables: {
          bookingNumber,
          senderName: dto.fullName,
          senderCompany: dto.companyName ?? 'N/A',
          preferredDate: preferredDate.toLocaleDateString('en-PK'),
          preferredTime: dto.preferredTime,
        },
      } as any)
      .catch(() => null);

    // Auto-create HOT lead
    await this.upsertLeadFromEmail({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      companyName: dto.companyName,
      industry: dto.industry,
      companySize: dto.companySize,
      source: 'DEMO_REQUEST',
      originType: 'demo_booking',
      originId: booking.id,
      landingPage: dto.sourceUrl,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      budget: dto.budget,
      timeline: dto.timeline,
    });

    return { ok: true, bookingNumber };
  }

  // ─── Chatbot ──────────────────────────────────────────────
  async startChat(dto: StartChatDto, meta: Meta) {
    const conversationNumber = await generateTicketNumber('CH', () =>
      this.prisma.chatbotConversation.count(),
    );
    const conv = await this.prisma.chatbotConversation.create({
      data: {
        conversationNumber,
        visitorId: dto.visitorId,
        visitorName: dto.visitorName,
        visitorEmail: dto.visitorEmail,
        visitorPhone: dto.visitorPhone,
        currentPage: dto.currentPage,
        referrerUrl: meta.referer,
        language: dto.language ?? 'en',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    // Bot greeting
    await this.prisma.chatbotMessage.create({
      data: {
        conversationId: conv.id,
        senderType: 'BOT',
        senderName: 'Nafaa Bot',
        content: 'Assalam-o-Alaikum! Main Nafaa ka assistant hun. Aap ki kese madad kar sakta hun?',
      },
    });

    await this.prisma.chatbotConversation.update({
      where: { id: conv.id },
      data: { messageCount: 1, botMessageCount: 1 },
    });

    return {
      ok: true,
      conversationId: conv.id,
      conversationNumber,
    };
  }

  async chatMessage(dto: ChatMessageDto) {
    const conv = await this.prisma.chatbotConversation.findUnique({
      where: { id: dto.conversationId },
    });
    if (!conv) throw new BadRequestException('Conversation not found');

    await this.prisma.chatbotMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderType: 'USER',
        senderName: conv.visitorName ?? 'Visitor',
        content: dto.content,
      },
    });

    await this.prisma.chatbotConversation.update({
      where: { id: dto.conversationId },
      data: {
        messageCount: { increment: 1 },
        userMessageCount: { increment: 1 },
        lastActivityAt: new Date(),
        // If bot was handling and no human takeover, mark as waiting
        status: conv.status === 'BOT_HANDLING' ? 'WAITING_HUMAN' : conv.status,
      },
    });

    return { ok: true };
  }

  // ─── Heatmap ──────────────────────────────────────────────
  async recordHeatmap(body: {
    path: string; visitorId: string; sessionId: string; deviceType?: string;
    clicks?: any[]; scrollDepth?: number; moves?: any[]; durationSec?: number;
  }) {
    await this.prisma.heatmapSession.create({
      data: {
        path: body.path,
        visitorId: body.visitorId,
        sessionId: body.sessionId,
        deviceType: body.deviceType,
        clicks: body.clicks as any,
        scrollDepth: body.scrollDepth,
        moves: body.moves as any,
        durationSec: body.durationSec,
      },
    });
    return { ok: true };
  }

  // ─── Helpers ──────────────────────────────────────────────
  private async upsertLeadFromEmail(input: {
    fullName: string; email?: string; phone?: string; companyName?: string;
    industry?: string; companySize?: string; source: any;
    originType?: string; originId?: string; landingPage?: string;
    utmSource?: string; utmMedium?: string; utmCampaign?: string;
    budget?: string; timeline?: string;
  }) {
    const existing = input.email
      ? await this.prisma.marketingLead.findFirst({
          where: { email: input.email.toLowerCase() },
        })
      : null;

    const scoreInput = {
      source: input.source,
      hasEmail: !!input.email,
      hasPhone: !!input.phone,
      hasCompany: !!input.companyName,
      companySize: input.companySize,
      budget: input.budget,
      timeline: input.timeline,
    };
    const score = calculateLeadScore(scoreInput);
    const temperature = scoreToTemperature(score);

    if (existing) {
      await this.prisma.marketingLead.update({
        where: { id: existing.id },
        data: {
          lastContactAt: new Date(),
          score: Math.max(existing.score, score),
          temperature: temperature as any,
          ...(input.companyName && !existing.companyName ? { companyName: input.companyName } : {}),
        },
      });
      return existing.id;
    }

    const leadNumber = await generateTicketNumber('LD', () =>
      this.prisma.marketingLead.count(),
    );

    const lead = await this.prisma.marketingLead.create({
      data: {
        leadNumber,
        fullName: input.fullName,
        email: input.email?.toLowerCase(),
        phone: input.phone,
        companyName: input.companyName,
        industry: input.industry,
        companySize: input.companySize,
        source: input.source,
        originType: input.originType,
        originId: input.originId,
        landingPage: input.landingPage,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        budget: input.budget,
        timeline: input.timeline,
        score,
        temperature: temperature as any,
        status: 'NEW',
      },
    });
    return lead.id;
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private extractDomain(url?: string) {
    if (!url) return undefined;
    try {
      return new URL(url).hostname;
    } catch {
      return undefined;
    }
  }

  private calculateSpamScore(dto: SubmitContactFormDto): number {
    let score = 0;
    const msg = dto.message.toLowerCase();
    const spamWords = ['viagra', 'crypto', 'forex', 'loan', 'bitcoin', 'click here', 'buy now'];
    for (const w of spamWords) if (msg.includes(w)) score += 0.2;
    if ((dto.message.match(/https?:\/\//g) ?? []).length > 3) score += 0.3;
    if (dto.message.length < 20) score += 0.2;
    return Math.min(1, score);
  }
}
