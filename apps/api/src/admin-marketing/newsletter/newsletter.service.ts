import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../modules/email/email.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';
import { ListSubscribersDto, NewsletterStatus } from './dto/list-subscribers.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { SendNewsletterDto } from './dto/send-newsletter.dto';
import { BulkActionDto, BulkAction } from './dto/bulk-action.dto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: EmailService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  // ─────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────
  async listSubscribers(dto: ListSubscribersDto) {
    const { page, limit, skip } = parsePagination(dto);

    const where: Prisma.NewsletterSubscriberWhereInput = {};
    if (dto.status) where.status = dto.status as any;
    if (dto.source) where.source = dto.source as any;
    if (dto.tag) where.tags = { has: dto.tag };
    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { firstName: { contains: dto.search, mode: 'insensitive' } },
        { lastName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) (where.createdAt as any).gte = new Date(dto.from);
      if (dto.to) (where.createdAt as any).lte = new Date(dto.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  // ─────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────
  async getStats() {
    const [total, active, unsubscribed, bounced, pending, last30d, last7d] =
      await Promise.all([
        this.prisma.newsletterSubscriber.count(),
        this.prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
        this.prisma.newsletterSubscriber.count({
          where: { status: 'UNSUBSCRIBED' },
        }),
        this.prisma.newsletterSubscriber.count({ where: { status: 'BOUNCED' } }),
        this.prisma.newsletterSubscriber.count({ where: { status: 'PENDING_CONFIRMATION' } }),
        this.prisma.newsletterSubscriber.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 864e5) },
          },
        }),
        this.prisma.newsletterSubscriber.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 864e5) },
          },
        }),
      ]);

    const growthRate =
      last30d > 0 ? ((last7d / last30d) * 100).toFixed(1) : '0';

    // By source
    const bySourceRaw = await this.prisma.newsletterSubscriber.groupBy({
      by: ['utmSource'],
      _count: true,
    });
    const bySource = bySourceRaw.map((r) => ({
      source: r.utmSource ?? 'unknown',
      count: r._count,
    }));

    return {
      total,
      active,
      unsubscribed,
      bounced,
      pending,
      new30d: last30d,
      new7d: last7d,
      growthRate: `${growthRate}%`,
      bySource,
      unsubscribeRate:
        total > 0 ? `${((unsubscribed / total) * 100).toFixed(1)}%` : '0%',
      bounceRate:
        total > 0 ? `${((bounced / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  // ─────────────────────────────────────────────────
  // GET ONE
  // ─────────────────────────────────────────────────
  async getSubscriber(id: string) {
    const sub = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!sub) throw new NotFoundException('Subscriber not found');
    return sub;
  }

  // ─────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────
  async updateSubscriber(id: string, dto: UpdateSubscriberDto, adminId: string) {
    await this.getSubscriber(id);

    const updated = await this.prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status } as any),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.name !== undefined && { firstName: dto.name }),
        updatedAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId, tenantId: "system",
        action: 'SUBSCRIBER_UPDATED',
        description: 'SUBSCRIBER_UPDATED',
        entityType: 'NewsletterSubscriber',
        entityId: id,
        metadata: dto as any,
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────
  // BULK ACTIONS
  // ─────────────────────────────────────────────────
  async bulkAction(dto: BulkActionDto, adminId: string) {
    if (dto.subscriberIds.length === 0) {
      throw new BadRequestException('No subscribers selected');
    }
    if (dto.subscriberIds.length > 5000) {
      throw new BadRequestException('Maximum 5000 subscribers per bulk action');
    }

    let result: any;

    switch (dto.action) {
      case BulkAction.UNSUBSCRIBE:
        result = await this.prisma.newsletterSubscriber.updateMany({
          where: { id: { in: dto.subscriberIds } },
          data: {
            status: 'UNSUBSCRIBED',
            unsubscribedAt: new Date(),
          },
        });
        break;

      case BulkAction.REACTIVATE:
        result = await this.prisma.newsletterSubscriber.updateMany({
          where: { id: { in: dto.subscriberIds } },
          data: { status: 'ACTIVE', unsubscribedAt: null },
        });
        break;

      case BulkAction.MARK_BOUNCED:
        result = await this.prisma.newsletterSubscriber.updateMany({
          where: { id: { in: dto.subscriberIds } },
          data: { status: 'BOUNCED' },
        });
        break;

      case BulkAction.DELETE:
        result = await this.prisma.newsletterSubscriber.deleteMany({
          where: { id: { in: dto.subscriberIds } },
        });
        break;

      case BulkAction.TAG:
        if (!dto.tag) throw new BadRequestException('Tag required');
        // push tag onto array (Postgres)
        result = { count: 0 };
        for (const id of dto.subscriberIds) {
          const s = await this.prisma.newsletterSubscriber.findUnique({
            where: { id },
            select: { tags: true },
          });
          if (!s) continue;
          const tags = Array.from(new Set([...(s.tags ?? []), dto.tag]));
          await this.prisma.newsletterSubscriber.update({
            where: { id },
      data: { tags } as any,
          });
          result.count++;
        }
        break;

      case BulkAction.UNTAG:
        if (!dto.tag) throw new BadRequestException('Tag required');
        result = { count: 0 };
        for (const id of dto.subscriberIds) {
          const s = await this.prisma.newsletterSubscriber.findUnique({
            where: { id },
            select: { tags: true },
          });
          if (!s) continue;
          const tags = (s.tags ?? []).filter((t) => t !== dto.tag);
          await this.prisma.newsletterSubscriber.update({
            where: { id },
      data: { tags } as any,
          });
          result.count++;
        }
        break;
    }

    await this.prisma.activityLog.create({
      data: {
          description: 'Marketing activity',
        userId: adminId, tenantId: "system",
        action: `SUBSCRIBER_BULK_${dto.action}`,
        entityType: 'NewsletterSubscriber',
        entityId: null,
        metadata: {
          action: dto.action,
          count: dto.subscriberIds.length,
          tag: dto.tag,
        } as any,
      },
    });

    return { success: true, action: dto.action, ...result };
  }

  // ─────────────────────────────────────────────────
  // SEND NEWSLETTER
  // ─────────────────────────────────────────────────
  async sendNewsletter(dto: SendNewsletterDto, adminId: string) {
    // Test mode → single email
    if (dto.testMode) {
      if (!dto.testEmail)
        throw new BadRequestException('testEmail required in testMode');
      await this.resend.send({
        toEmail: dto.testEmail,
        subject: `[TEST] ${dto.subject}`,
      });
      return { success: true, testMode: true, sentTo: dto.testEmail };
    }

    // Build recipient list
    const where: Prisma.NewsletterSubscriberWhereInput = { status: 'ACTIVE' };
    if (dto.subscriberIds && dto.subscriberIds.length > 0) {
      where.id = { in: dto.subscriberIds };
    }
    if (dto.tags && dto.tags.length > 0) {
      where.tags = { hasSome: dto.tags };
    }

    const recipients = await this.prisma.newsletterSubscriber.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException('No active recipients matched');
    }

    // Batch id — NewsletterEmailLog per-subscriber hota hai, koi single Newsletter model nahi
    const newsletterId = `NL-${Date.now()}`;

    // Har recipient ka log row (open/click tracking isi se hoga)
    await this.prisma.newsletterEmailLog.createMany({
      data: recipients.map((r) => ({
        subscriberId: r.id,
        subject: dto.subject,
        status: 'SENT',
        sentAt: new Date(),
      })),
    });

    // Enqueue in batches of 100
    const BATCH = 100;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await this.emailQueue.add(
        'newsletter-batch',
        {
          newsletterId,
          subject: dto.subject,
          recipients: batch,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    }

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        tenantId: 'system',
        action: 'NEWSLETTER_SENT',
        description: 'NEWSLETTER_SENT',
        entityType: 'Newsletter',
        entityId: newsletterId,
        metadata: {
          subject: dto.subject,
          recipients: recipients.length,
        } as any,
      },
    });

    this.logger.log(
      `Newsletter ${newsletterId} queued for ${recipients.length} recipients`,
    );

    return {
      success: true,
      newsletterId,
      queuedFor: recipients.length,
    };
  }

  // ─────────────────────────────────────────────────
  // NEWSLETTER HISTORY
  // ─────────────────────────────────────────────────
  async listNewsletters(dto: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePagination(dto);

    const [items, total] = await Promise.all([
      this.prisma.newsletterEmailLog.findMany({
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: {
          
        },
      }),
      this.prisma.newsletterEmailLog.count(),
    ]);

    return paginated(items, total, page, limit);
  }

  // ─────────────────────────────────────────────────
  // EXPORT CSV
  // ─────────────────────────────────────────────────
  async exportSubscribers(filters: ListSubscribersDto) {
    const where: Prisma.NewsletterSubscriberWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.tag) where.tags = { has: filters.tag };

    const subs = await this.prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });

    const header = 'email,name,status,source,tags,subscribed_at,unsubscribed_at';
    const rows = subs.map((s) =>
      [
        s.email,
        `"${(s.firstName ?? '').replace(/"/g, '""')}"`,
        s.status,
        s.source ?? '',
        `"${(s.tags ?? []).join(';')}"`,
        s.createdAt.toISOString(),
        s.unsubscribedAt?.toISOString() ?? '',
      ].join(','),
    );

    return { csv: [header, ...rows].join('\n'), count: subs.length };
  }
}
