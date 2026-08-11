import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    @InjectQueue('sms-queue') private readonly smsQueue: Queue,
  ) {}

  private async log(userId: string, action: string, entityId: string, metadata?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: 'system', userId, action, description: action,
          entityType: 'MarketingCampaign', entityId, metadata,
        },
      });
    } catch { /* silent */ }
  }

  async list(dto: ListCampaignsDto) {
    const { page, limit, skip } = parsePagination(dto);
    const where: Prisma.MarketingCampaignWhereInput = {};
    if (dto.status) where.status = dto.status as any;
    const VALID_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'ANNOUNCEMENT', 'RETARGETING'];
    if (dto.channel && VALID_CHANNELS.includes(dto.channel)) {
      where.type = dto.channel as any;
    }
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  async getStats() {
    const [total, sent, scheduled, draft, failed, agg] = await Promise.all([
      this.prisma.marketingCampaign.count(),
      this.prisma.marketingCampaign.count({ where: { status: 'COMPLETED' } }),
      this.prisma.marketingCampaign.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.marketingCampaign.count({ where: { status: 'DRAFT' } }),
      this.prisma.marketingCampaign.count({ where: { status: 'FAILED' } }),
      this.prisma.marketingCampaign.aggregate({
        _sum: { totalRecipients: true, totalOpened: true, totalClicked: true },
      }),
    ]);

    const recips = agg._sum.totalRecipients ?? 0;
    const opens = agg._sum.totalOpened ?? 0;
    const clicks = agg._sum.totalClicked ?? 0;

    return {
      total, sent, scheduled, draft, failed,
      totalRecipients: recips, totalOpens: opens, totalClicks: clicks,
      openRate: recips > 0 ? `${((opens / recips) * 100).toFixed(1)}%` : '0%',
      clickRate: recips > 0 ? `${((clicks / recips) * 100).toFixed(1)}%` : '0%',
      ctr: opens > 0 ? `${((clicks / opens) * 100).toFixed(1)}%` : '0%',
    };
  }

  async getOne(id: string) {
    const c = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async create(dto: CreateCampaignDto, adminId: string) {
    if ((dto.channel === 'EMAIL' || dto.channel === 'BOTH') && (!dto.emailSubject || !dto.emailHtml)) {
      throw new BadRequestException('emailSubject + emailHtml required for EMAIL channel');
    }
    if ((dto.channel === 'SMS' || dto.channel === 'BOTH')) {
      if (!dto.smsMessage) throw new BadRequestException('smsMessage required for SMS channel');
      if (dto.smsMessage.length > 500) throw new BadRequestException('SMS too long (>500 chars)');
    }

    const scheduledAt = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    if (scheduledAt && isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledFor date');
    }

    const campaign = await this.prisma.marketingCampaign.create({
      data: {
        campaignNumber: `CMP-${Date.now()}`,
        name: dto.name,
        slug: `${dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
        type: (dto.channel === 'BOTH' ? 'EMAIL' : dto.channel) as any,
        subject: dto.emailSubject,
        previewText: dto.emailPreheader,
        bodyHtml: dto.emailHtml,
        smsMessage: dto.smsMessage,
        targetTags: dto.audienceTags ?? [],
        targetSegment: dto.audienceSegment,
        scheduledAt,
        status: dto.draft ? 'DRAFT' : scheduledAt ? 'SCHEDULED' : 'DRAFT',
        createdById: adminId,
      },
    });

    await this.log(adminId, 'CAMPAIGN_CREATED', campaign.id, { name: dto.name });
    return campaign;
  }

  async launch(id: string, adminId: string) {
    const campaign = await this.getOne(id);
    if (campaign.status === 'COMPLETED' || campaign.status === 'RUNNING') {
      throw new BadRequestException(`Campaign already ${campaign.status}`);
    }

    const audienceWhere: Prisma.NewsletterSubscriberWhereInput = { status: 'ACTIVE' };
    if (campaign.targetTags.length > 0) {
      audienceWhere.tags = { hasSome: campaign.targetTags };
    }
    const recipients = await this.prisma.newsletterSubscriber.findMany({
      where: audienceWhere,
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException('No recipients match audience filter');
    }

    await this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date(), totalRecipients: recipients.length },
    });

    if (campaign.subject && campaign.bodyHtml) {
      const BATCH = 100;
      for (let i = 0; i < recipients.length; i += BATCH) {
        await this.emailQueue.add(
          'campaign-batch',
          {
            campaignId: id,
            subject: campaign.subject,
            html: campaign.bodyHtml,
            preheader: campaign.previewText,
            recipients: recipients.slice(i, i + BATCH).map((r) => ({
              ...r,
              name: [r.firstName, r.lastName].filter(Boolean).join(' ') || null,
            })),
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      }
    }

    if (campaign.smsMessage) {
      const withPhones = await this.prisma.newsletterSubscriber.findMany({
        where: { ...audienceWhere, phone: { not: null } },
        select: { id: true, phone: true, email: true },
      });
      const BATCH = 50;
      for (let i = 0; i < withPhones.length; i += BATCH) {
        await this.smsQueue.add(
          'campaign-sms-batch',
          { campaignId: id, message: campaign.smsMessage, recipients: withPhones.slice(i, i + BATCH) },
          { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
        );
      }
    }

    await this.log(adminId, 'CAMPAIGN_LAUNCHED', id, { recipients: recipients.length });
    this.logger.log(`Campaign ${id} launched -> ${recipients.length} recipients`);
    return { success: true, queuedFor: recipients.length };
  }

  async pause(id: string, adminId: string) {
    await this.getOne(id);
    const updated = await this.prisma.marketingCampaign.update({
      where: { id }, data: { status: 'PAUSED' },
    });
    await this.log(adminId, 'CAMPAIGN_PAUSED', id);
    return updated;
  }

  async cancel(id: string, adminId: string) {
    await this.getOne(id);
    const updated = await this.prisma.marketingCampaign.update({
      where: { id }, data: { status: 'CANCELLED' },
    });
    await this.log(adminId, 'CAMPAIGN_CANCELLED', id);
    return updated;
  }
}
