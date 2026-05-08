import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';

interface SendEmailParams {
  tenantId?: string;
  templateSlug?: string;
  toEmail: string;
  toName?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  variables?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey && !apiKey.includes('replace_me')) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend initialized');
    } else {
      this.logger.warn('⚠️ Resend not configured (missing RESEND_API_KEY)');
    }
  }

  async send(params: SendEmailParams) {
    let subject = params.subject ?? '';
    let bodyHtml = params.bodyHtml ?? '';
    let bodyText = params.bodyText ?? '';

    if (params.templateSlug) {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { slug: params.templateSlug },
      });

      if (!template) {
        throw new Error(`Email template not found: ${params.templateSlug}`);
      }
      if (!template.isActive) {
        this.logger.warn(`Template ${params.templateSlug} is inactive`);
        return { skipped: true, reason: 'template_inactive' };
      }

      subject = template.subject;
      bodyHtml = template.bodyHtml;
      bodyText = template.bodyText ?? '';
    }

    if (params.variables) {
      try {
        subject = Handlebars.compile(subject)(params.variables);
        bodyHtml = Handlebars.compile(bodyHtml)(params.variables);
        if (bodyText) {
          bodyText = Handlebars.compile(bodyText)(params.variables);
        }
      } catch (e: any) {
        this.logger.error(`Template compilation failed: ${e.message}`);
      }
    }

    if (params.tenantId) {
      const prefs = await this.prisma.notificationPreference.findUnique({
        where: { tenantId: params.tenantId },
      });
      if (prefs && !prefs.emailEnabled) {
        this.logger.log(`Email skipped — tenant ${params.tenantId} disabled email`);
        return { skipped: true, reason: 'tenant_opted_out' };
      }
    }

    const log = await this.prisma.emailLog.create({
      data: {
        tenantId: params.tenantId,
        templateSlug: params.templateSlug,
        toEmail: params.toEmail,
        toName: params.toName,
        subject,
        bodyHtml,
        bodyText,
        variables: params.variables ?? Prisma.JsonNull,
        status: 'QUEUED',
      },
    });

    if (!this.resend) {
      this.logger.warn(`📧 [DEV MODE] Email to ${params.toEmail}: ${subject}`);
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Resend not configured',
        },
      });
      return { skipped: true, reason: 'no_provider' };
    }

    try {
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENDING' },
      });

      const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
      const fromName = this.configService.get<string>('RESEND_FROM_NAME');

      const result = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: params.toName ? [`${params.toName} <${params.toEmail}>`] : [params.toEmail],
        subject,
        html: bodyHtml,
        text: bodyText || undefined,
      });

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          providerId: result.data?.id,
          sentAt: new Date(),
        },
      });

      this.logger.log(`✅ Email sent to ${params.toEmail}: ${subject}`);
      return { success: true, id: result.data?.id, logId: log.id };
    } catch (e: any) {
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: e.message,
          retryCount: { increment: 1 },
        },
      });
      this.logger.error(`❌ Email send failed: ${e.message}`);
      throw e;
    }
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
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async stats() {
    const [total, sent, failed, queued, today] = await Promise.all([
      this.prisma.emailLog.count(),
      this.prisma.emailLog.count({ where: { status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
      this.prisma.emailLog.count({ where: { status: 'QUEUED' } }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return { total, sent, failed, queued, today };
  }

  async retryFailed(id: string) {
    const log = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!log) throw new Error('Log not found');

    return this.send({
      tenantId: log.tenantId ?? undefined,
      templateSlug: log.templateSlug ?? undefined,
      toEmail: log.toEmail,
      toName: log.toName ?? undefined,
      subject: log.subject,
      bodyHtml: log.bodyHtml,
      bodyText: log.bodyText ?? undefined,
      variables: (log.variables as any) ?? undefined,
    });
  }
}
