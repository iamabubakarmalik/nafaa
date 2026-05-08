import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';

interface SendSmsParams {
  tenantId?: string;
  templateSlug?: string;
  toPhone: string;
  message?: string;
  variables?: Record<string, any>;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private provider: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.provider = this.configService.get<string>('SMS_PROVIDER') ?? 'disabled';
    this.logger.log(`📱 SMS provider: ${this.provider}`);
  }

  private normalizePhone(phone: string): string {
    let p = phone.trim().replace(/[\s-]/g, '');
    if (p.startsWith('+')) p = p.substring(1);
    if (p.startsWith('0')) p = '92' + p.substring(1);
    if (p.startsWith('3') && p.length === 10) p = '92' + p;
    return p;
  }

  async send(params: SendSmsParams) {
    let message = params.message ?? '';

    if (params.templateSlug) {
      const template = await this.prisma.smsTemplate.findUnique({
        where: { slug: params.templateSlug },
      });

      if (!template) {
        throw new Error(`SMS template not found: ${params.templateSlug}`);
      }
      if (!template.isActive) {
        this.logger.warn(`Template ${params.templateSlug} is inactive`);
        return { skipped: true, reason: 'template_inactive' };
      }

      message = template.message;
    }

    if (params.variables) {
      try {
        message = Handlebars.compile(message)(params.variables);
      } catch (e: any) {
        this.logger.error(`SMS template compilation failed: ${e.message}`);
      }
    }

    if (params.tenantId) {
      const prefs = await this.prisma.notificationPreference.findUnique({
        where: { tenantId: params.tenantId },
      });
      if (prefs && !prefs.smsEnabled) {
        this.logger.log(`SMS skipped — tenant ${params.tenantId} disabled SMS`);
        return { skipped: true, reason: 'tenant_opted_out' };
      }
    }

    const normalizedPhone = this.normalizePhone(params.toPhone);

    const log = await this.prisma.smsLog.create({
      data: {
        tenantId: params.tenantId,
        templateSlug: params.templateSlug,
        toPhone: normalizedPhone,
        message,
        variables: params.variables ?? Prisma.JsonNull,
        status: 'QUEUED',
      },
    });

    if (this.provider === 'disabled') {
      this.logger.warn(`📱 [DEV MODE] SMS to ${normalizedPhone}: ${message}`);
      await this.prisma.smsLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: 'SMS provider disabled' },
      });
      return { skipped: true, reason: 'no_provider' };
    }

    try {
      await this.prisma.smsLog.update({
        where: { id: log.id },
        data: { status: 'SENDING' },
      });

      let providerId: string | undefined;

      if (this.provider === 'lifetimesms') {
        providerId = await this.sendViaLifetimeSms(normalizedPhone, message);
      } else if (this.provider === 'twilio') {
        providerId = await this.sendViaTwilio(normalizedPhone, message);
      }

      await this.prisma.smsLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          providerId,
          sentAt: new Date(),
        },
      });

      this.logger.log(`✅ SMS sent to ${normalizedPhone}`);
      return { success: true, providerId, logId: log.id };
    } catch (e: any) {
      await this.prisma.smsLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: e.message,
          retryCount: { increment: 1 },
        },
      });
      this.logger.error(`❌ SMS send failed: ${e.message}`);
      throw e;
    }
  }

  private async sendViaLifetimeSms(phone: string, message: string): Promise<string> {
    const apiKey = this.configService.get<string>('LIFETIMESMS_API_KEY');
    const apiToken = this.configService.get<string>('LIFETIMESMS_API_TOKEN');
    const mask = this.configService.get<string>('LIFETIMESMS_MASK');
    const apiUrl = this.configService.get<string>('LIFETIMESMS_API_URL');

    const payload = {
      api_token: apiToken,
      api_secret: apiKey,
      to: phone,
      from: mask,
      message,
    };

    const res = await fetch(apiUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`LifetimeSMS error: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'error' || data.error) {
      throw new Error(data.message ?? 'LifetimeSMS unknown error');
    }

    return data.message_id ?? data.id ?? 'sent';
  }

  private async sendViaTwilio(phone: string, message: string): Promise<string> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', `+${phone}`);
    formData.append('From', fromNumber!);
    formData.append('Body', message);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio error: ${errText}`);
    }

    const data = await res.json();
    return data.sid;
  }

  async listLogs(params: {
    tenantId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.smsLog.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async stats() {
    const [total, sent, failed, queued, today, costAgg] = await Promise.all([
      this.prisma.smsLog.count(),
      this.prisma.smsLog.count({ where: { status: 'SENT' } }),
      this.prisma.smsLog.count({ where: { status: 'FAILED' } }),
      this.prisma.smsLog.count({ where: { status: 'QUEUED' } }),
      this.prisma.smsLog.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.smsLog.aggregate({
        where: { status: 'SENT' },
        _sum: { cost: true },
      }),
    ]);

    return {
      total,
      sent,
      failed,
      queued,
      today,
      totalCost: costAgg._sum.cost ?? 0,
      provider: this.provider,
    };
  }

  async retryFailed(id: string) {
    const log = await this.prisma.smsLog.findUnique({ where: { id } });
    if (!log) throw new Error('Log not found');

    return this.send({
      tenantId: log.tenantId ?? undefined,
      templateSlug: log.templateSlug ?? undefined,
      toPhone: log.toPhone,
      message: log.message,
      variables: (log.variables as any) ?? undefined,
    });
  }

  listTemplates() {
    return this.prisma.smsTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async createTemplate(data: { slug: string; name: string; message: string; variables?: any; isActive?: boolean }) {
    return this.prisma.smsTemplate.create({ data });
  }

  async updateTemplate(id: string, data: any) {
    return this.prisma.smsTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    await this.prisma.smsTemplate.delete({ where: { id } });
    return { message: 'Template deleted' };
  }

  async seedDefaultTemplates() {
    const existing = await this.prisma.smsTemplate.count();
    if (existing > 0) return { skipped: true };

    const templates = [
      {
        slug: 'welcome',
        name: 'Welcome SMS',
        message: 'Welcome to Nafaa, {{name}}! Apni dukan online manage karein. Login: {{loginUrl}}',
      },
      {
        slug: 'payment-approved',
        name: 'Payment Approved',
        message: 'Nafaa: Aap ka Rs {{amount}} payment approve ho gaya. Subscription active!',
      },
      {
        slug: 'payment-rejected',
        name: 'Payment Rejected',
        message: 'Nafaa: Aap ka payment reject ho gaya. Reason: {{reason}}. Dobara try karein.',
      },
      {
        slug: 'subscription-expiring',
        name: 'Subscription Expiring',
        message: 'Nafaa: Aap ki subscription {{days}} din mein expire ho jayegi. Abhi renew karein!',
      },
      {
        slug: 'low-stock-alert',
        name: 'Low Stock Alert',
        message: 'Nafaa Alert: {{productName}} ka stock kam ho raha hai ({{stock}} {{unit}} left).',
      },
      {
        slug: 'new-sale',
        name: 'New Sale',
        message: 'Nafaa: New sale Rs {{amount}} from {{customerName}}. Total today: Rs {{todayTotal}}',
      },
      {
        slug: 'otp',
        name: 'OTP Verification',
        message: 'Nafaa: Aap ka OTP code hai: {{otp}}. 10 minute mein expire ho jayega. Kisi ko mat dein.',
      },
    ];

    await this.prisma.smsTemplate.createMany({ data: templates });
    return { seeded: templates.length };
  }
}
