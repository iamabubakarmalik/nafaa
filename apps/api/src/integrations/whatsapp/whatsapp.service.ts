import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  constructor(private readonly prisma: PrismaService) {}

  async configure(tenantId: string, dto: {
    phoneNumberId: string; businessId?: string; accessToken: string;
    verifyToken: string; webhookUrl?: string; displayName?: string;
  }) {
    return this.prisma.whatsappConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...dto, isActive: false, isVerified: false },
      update: dto,
    });
  }

  async activate(tenantId: string) {
    return this.prisma.whatsappConfig.update({
      where: { tenantId }, data: { isActive: true, isVerified: true },
    });
  }

  async sendMessage(tenantId: string, dto: {
    toPhone: string; body?: string; templateSlug?: string; variables?: Record<string, string>;
    mediaUrl?: string;
  }) {
    const config = await this.prisma.whatsappConfig.findUnique({ where: { tenantId } });
    if (!config || !config.isActive) throw new BadRequestException('WhatsApp not configured');

    let payload: any;
    let bodyText = dto.body ?? '';

    if (dto.templateSlug) {
      const template = await this.prisma.whatsappTemplate.findUnique({
        where: { tenantId_slug: { tenantId, slug: dto.templateSlug } },
      });
      if (!template || !template.isApproved) throw new BadRequestException('Template not approved');
      bodyText = template.bodyText;
      // Replace variables
      Object.entries(dto.variables ?? {}).forEach(([k, v]) => {
        bodyText = bodyText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });
      payload = {
        messaging_product: 'whatsapp',
        to: dto.toPhone.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: template.name, language: { code: template.language },
          components: [{
            type: 'body',
            parameters: Object.values(dto.variables ?? {}).map((v) => ({ type: 'text', text: v })),
          }],
        },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: dto.toPhone.replace(/\D/g, ''),
        type: 'text',
        text: { body: bodyText },
      };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      const isSuccess = res.ok && data.messages?.[0]?.id;
      const msgId = data.messages?.[0]?.id;

      const log = await this.prisma.whatsappMessage.create({
        data: {
          tenantId, toPhone: dto.toPhone, templateSlug: dto.templateSlug,
          body: bodyText, mediaUrl: dto.mediaUrl,
          status: isSuccess ? 'SENT' : 'FAILED',
          metaMessageId: msgId,
          errorMessage: isSuccess ? null : JSON.stringify(data.error),
        },
      });

      if (isSuccess) {
        await this.prisma.whatsappConfig.update({
          where: { tenantId }, data: { totalMessagesSent: { increment: 1 } },
        });
      }

      return { success: isSuccess, messageId: msgId, log, rawResponse: data };
    } catch (e: any) {
      this.logger.error(`WhatsApp send failed: ${e.message}`);
      throw new BadRequestException('Send failed: ' + e.message);
    }
  }

  async createTemplate(tenantId: string, dto: {
    name: string; slug: string; language?: string;
    category?: string; bodyText: string; headerText?: string; footerText?: string;
    variables?: string[];
  }) {
    return this.prisma.whatsappTemplate.create({
      data: {
        tenantId, name: dto.name, slug: dto.slug,
        language: dto.language ?? 'en_US',
        category: dto.category ?? 'MARKETING',
        bodyText: dto.bodyText,
        headerText: dto.headerText,
        footerText: dto.footerText,
        variables: dto.variables ?? [],
        isApproved: false,
      },
    });
  }

  async approveTemplate(tenantId: string, templateId: string, metaTemplateId: string) {
    return this.prisma.whatsappTemplate.update({
      where: { id: templateId },
      data: { isApproved: true, approvedAt: new Date(), metaTemplateId },
    });
  }

  async handleWebhook(payload: any) {
    // Meta sends status updates: delivered, read, failed
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const statuses = value?.statuses ?? [];

    for (const s of statuses) {
      const msgId = s.id;
      const status = s.status; // 'delivered', 'read', 'failed'
      await this.prisma.whatsappMessage.updateMany({
        where: { metaMessageId: msgId },
        data: {
          status: status.toUpperCase(),
          deliveredAt: status === 'delivered' ? new Date() : undefined,
          readAt: status === 'read' ? new Date() : undefined,
        },
      });
    }
    return { received: true };
  }

  async listMessages(tenantId: string, limit = 50) {
    return this.prisma.whatsappMessage.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: limit,
    });
  }

  async listTemplates(tenantId: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' },
    });
  }
}
