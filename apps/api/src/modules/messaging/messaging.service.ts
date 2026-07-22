import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, MessageChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';
import { CreateTemplateDto } from './dto/template.dto';
import { CreateCampaignDto } from './dto/campaign.dto';
import { SendMessageDto } from './dto/send-message.dto';

function renderTemplate(body: string, vars: Record<string, any> = {}) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''));
}

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService, private readonly queue: QueueService) {}

  // ─── TEMPLATES ───
  async createTemplate(tenantId: string, dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: { tenantId, ...dto, variables: dto.variables ?? [] },
    });
  }
  async listTemplates(tenantId: string, channel?: MessageChannel) {
    return this.prisma.messageTemplate.findMany({
      where: { tenantId, ...(channel ? { channel } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async updateTemplate(tenantId: string, id: string, dto: Partial<CreateTemplateDto>) {
    const t = await this.prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException();
    return this.prisma.messageTemplate.update({ where: { id }, data: dto });
  }
  async deleteTemplate(tenantId: string, id: string) {
    const t = await this.prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException();
    return this.prisma.messageTemplate.update({ where: { id }, data: { isActive: false } });
  }

  // ─── CAMPAIGNS ───
  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.messageCampaign.create({
      data: {
        tenantId, name: dto.name, channel: dto.channel,
        templateId: dto.templateId, targetSegment: dto.targetSegment,
        segmentFilters: dto.segmentFilters, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        customSubject: dto.customSubject, customBody: dto.customBody,
        variables: dto.variables,
        status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });
  }

  async listCampaigns(tenantId: string, status?: CampaignStatus) {
    return this.prisma.messageCampaign.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async launchCampaign(tenantId: string, campaignId: string) {
    const c = await this.prisma.messageCampaign.findFirst({
      where: { id: campaignId, tenantId }, include: { template: true },
    });
    if (!c) throw new NotFoundException();
    if (c.status === 'RUNNING' || c.status === 'COMPLETED') {
      throw new BadRequestException('Campaign already running or completed');
    }

    // Resolve recipients by segment
    const customers = await this.resolveSegment(c.targetSegment, c.segmentFilters);
    const subject = c.customSubject ?? c.template?.subject;
    const bodyTpl = c.customBody ?? c.template?.body ?? '';

    await this.prisma.messageCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING, startedAt: new Date(),
        totalRecipients: customers.length,
      },
    });

    let sent = 0;
    for (const cust of customers) {
      const body = renderTemplate(bodyTpl, { name: cust.fullName, ...(c.variables as any) });
      try {
        if (c.channel === 'SMS' && cust.phone) {
          await this.queue.sendSms({ toPhone: cust.phone, message: body });
        } else if (c.channel === 'EMAIL' && cust.email) {
          await this.queue.sendEmail({ templateSlug: 'campaign-generic', toEmail: cust.email, toName: cust.fullName, variables: { subject, body } });
        } else if (c.channel === 'PUSH') {
          await this.queue.sendPush({ customerId: cust.id, title: subject ?? c.name, body });
        } else if (c.channel === 'WHATSAPP' && cust.phone) {
          await this.queue.sendWhatsapp({ toPhone: cust.phone, message: body });
        } else if (c.channel === 'IN_APP') {
          await this.queue.createNotification({ customerId: cust.id, type: 'CAMPAIGN', title: subject ?? c.name, body, channels: ['IN_APP'] });
        }
        sent++;
      } catch {}
      await this.prisma.messageLog.create({
        data: {
          campaignId, tenantId, channel: c.channel,
          toPhone: cust.phone, toEmail: cust.email,
          customerId: cust.id, subject, body, status: 'QUEUED',
        },
      });
    }

    await this.prisma.messageCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.COMPLETED, completedAt: new Date(), sentCount: sent },
    });

    return { success: true, sent };
  }

  private async resolveSegment(segment: string, filters: any) {
    const base: Prisma.MarketplaceCustomerWhereInput = { isActive: true, isBanned: false };
    if (segment === 'ACTIVE_30D') base.lastActiveAt = { gt: new Date(Date.now() - 30 * 86400000) };
    if (segment === 'INACTIVE_60D') base.lastActiveAt = { lt: new Date(Date.now() - 60 * 86400000) };
    if (segment === 'NEW_CUSTOMERS') base.createdAt = { gt: new Date(Date.now() - 7 * 86400000) };
    return this.prisma.marketplaceCustomer.findMany({
      where: base,
      select: { id: true, fullName: true, phone: true, email: true },
      take: 50000,
    });
  }

  // ─── DIRECT SEND ───
  async sendDirect(tenantId: string, dto: SendMessageDto) {
    const recipients: { phone?: string; email?: string; customerId?: string; name?: string }[] = [];
    if (dto.customerIds?.length) {
      const rows = await this.prisma.marketplaceCustomer.findMany({
        where: { id: { in: dto.customerIds } },
        select: { id: true, phone: true, email: true, fullName: true },
      });
      rows.forEach((r) => recipients.push({ customerId: r.id, phone: r.phone, email: r.email ?? undefined, name: r.fullName }));
    }
    dto.toPhones?.forEach((p) => recipients.push({ phone: p }));
    dto.toEmails?.forEach((e) => recipients.push({ email: e }));

    let queued = 0;
    for (const r of recipients) {
      const body = renderTemplate(dto.body, { name: r.name, ...(dto.variables ?? {}) });
      if (dto.channel === 'SMS' && r.phone) { await this.queue.sendSms({ toPhone: r.phone, message: body }); queued++; }
      if (dto.channel === 'EMAIL' && r.email) { await this.queue.sendEmail({ templateSlug: dto.templateSlug ?? 'generic', toEmail: r.email, toName: r.name, variables: { subject: dto.subject, body } }); queued++; }
      if (dto.channel === 'WHATSAPP' && r.phone) { await this.queue.sendWhatsapp({ toPhone: r.phone, message: body }); queued++; }
      if (dto.channel === 'PUSH' && r.customerId) { await this.queue.sendPush({ customerId: r.customerId, title: dto.subject ?? 'Nafaa', body }); queued++; }
    }
    return { queued };
  }

  // ─── LOGS ───
  async listLogs(tenantId: string, opts?: { channel?: MessageChannel; limit?: number; offset?: number }) {
    const where: Prisma.MessageLogWhereInput = { tenantId };
    if (opts?.channel) where.channel = opts.channel;
    return this.prisma.messageLog.findMany({
      where, orderBy: { sentAt: 'desc' },
      take: opts?.limit ?? 50, skip: opts?.offset ?? 0,
    });
  }

  // ─── CONVERSATIONS (2-way chat) ───
  async listConversations(tenantId: string) {
    return this.prisma.conversation.findMany({
      where: { tenantId, status: 'OPEN' },
      orderBy: { lastMessageAt: 'desc' },
      include: { _count: { select: { messages: true } } },
      take: 100,
    });
  }

  async getConversation(tenantId: string, id: string) {
    const c = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!c) throw new NotFoundException();
    // Mark all inbound messages as read
    await this.prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });
    return c;
  }

  async replyConversation(tenantId: string, id: string, body: string, senderId: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { id, tenantId } });
    if (!conv) throw new NotFoundException();
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.conversationMessage.create({
        data: {
          conversationId: id, direction: 'OUTBOUND', senderType: 'BUSINESS',
          senderId, body, channel: conv.channel,
        },
      });
      await tx.conversation.update({
        where: { id }, data: { lastMessageAt: new Date(), lastMessagePreview: body.slice(0, 100) },
      });

      // Dispatch through actual channel
      if (conv.channel === 'SMS' && conv.externalHandle) {
        await this.queue.sendSms({ toPhone: conv.externalHandle, message: body });
      } else if (conv.channel === 'WHATSAPP' && conv.externalHandle) {
        await this.queue.sendWhatsapp({ toPhone: conv.externalHandle, message: body });
      }
      return msg;
    });
  }
}
