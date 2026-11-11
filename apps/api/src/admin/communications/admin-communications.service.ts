import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { endOfDayTz, startOfDayTz } from '../../common/helpers/business-time.helper';
import { EmailService } from '../../modules/email/email.service';
import { SmsService } from '../../modules/sms/sms.service';
import { BulkSendDto, BulkTarget, SendChannel } from './dto/bulk-send.dto';

export interface LogQuery { tenantId?: string; status?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }

@Injectable()
export class AdminCommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  /** Day keys (YYYY-MM-DD) are Pakistan business days. */
  private dayRange(from?: string, to?: string) {
    const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const range: { gte?: Date; lte?: Date } = {};
    if (ok(from)) range.gte = startOfDayTz(new Date(`${from}T12:00:00+05:00`));
    if (ok(to)) range.lte = endOfDayTz(new Date(`${to}T12:00:00+05:00`));
    return range.gte || range.lte ? range : undefined;
  }

  private logWhere(q: LogQuery, searchFields: string[]) {
    const where: Record<string, any> = { NOT: { tenant: { slug: 'nafaa-system' } } };
    if (q.tenantId) where.tenantId = q.tenantId;
    if (q.status) where.status = q.status;
    const createdAt = this.dayRange(q.from, q.to);
    if (createdAt) where.createdAt = createdAt;
    const term = q.search?.trim();
    if (term) {
      where.OR = [
        ...searchFields.map((f) => ({ [f]: { contains: term, mode: 'insensitive' } })),
        { templateSlug: { contains: term, mode: 'insensitive' } },
        { tenant: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private page(q: LogQuery) {
    const limit = Math.min(100, Math.max(1, Math.floor(q.limit ?? 30)));
    const page = Math.max(1, Math.floor(q.page ?? 1));
    return { limit, page, skip: (page - 1) * limit };
  }

  async emailLogs(q: LogQuery) {
    const { limit, page, skip } = this.page(q);
    const where = this.logWhere(q, ['toEmail', 'subject']);
    const [items, total] = await Promise.all([
      this.prisma.emailLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { tenant: { select: { id: true, name: true } } } }),
      this.prisma.emailLog.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async smsLogs(q: LogQuery) {
    const { limit, page, skip } = this.page(q);
    const where = this.logWhere(q, ['toPhone', 'message']);
    const [items, total] = await Promise.all([
      this.prisma.smsLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { tenant: { select: { id: true, name: true } } } }),
      this.prisma.smsLog.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  /** Without `paged` this returns every template (old behavior). With it, one searched page plus counts. */
  async smsTemplates(q: { paged?: boolean; page?: number; limit?: number; search?: string; active?: string }) {
    if (!q.paged) return this.smsService.listTemplates();
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const page = Math.max(1, q.page ?? 1);
    const term = q.search?.trim();
    const where = {
      ...(q.active === 'yes' ? { isActive: true } : q.active === 'no' ? { isActive: false } : {}),
      ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' as const } }, { slug: { contains: term, mode: 'insensitive' as const } }, { message: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const [items, total, all, active] = await Promise.all([
      this.prisma.smsTemplate.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.smsTemplate.count({ where }),
      this.prisma.smsTemplate.count(),
      this.prisma.smsTemplate.count({ where: { isActive: true } }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, stats: { total: all, active, inactive: all - active } };
  }

  /** Header numbers; "today" starts at midnight Pakistan time, not server time. */
  async emailStats() {
    const base = await this.emailService.stats();
    const today = await this.prisma.emailLog.count({ where: { createdAt: { gte: startOfDayTz() } } });
    return { ...base, today };
  }

  async smsStats() {
    const base = await this.smsService.stats();
    const today = await this.prisma.smsLog.count({ where: { createdAt: { gte: startOfDayTz() } } });
    return { ...base, today };
  }

  async bulkSend(dto: BulkSendDto) {
    let tenants: any[] = [];

    if (dto.target === BulkTarget.ALL) {
      tenants = await this.prisma.tenant.findMany({
        where: { slug: { not: 'nafaa-system' } },
        include: {
          users: {
            where: { role: 'OWNER', isActive: true },
            take: 1,
          },
        },
      });
    } else if (dto.target === BulkTarget.ACTIVE) {
      tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE', slug: { not: 'nafaa-system' } },
        include: {
          users: { where: { role: 'OWNER', isActive: true }, take: 1 },
        },
      });
    } else if (dto.target === BulkTarget.TRIAL) {
      tenants = await this.prisma.tenant.findMany({
        where: { status: 'TRIAL' },
        include: {
          users: { where: { role: 'OWNER', isActive: true }, take: 1 },
        },
      });
    } else if (dto.target === BulkTarget.SUSPENDED) {
      tenants = await this.prisma.tenant.findMany({
        where: { status: 'SUSPENDED' },
        include: {
          users: { where: { role: 'OWNER', isActive: true }, take: 1 },
        },
      });
    } else if (dto.target === BulkTarget.SPECIFIC) {
      tenants = await this.prisma.tenant.findMany({
        where: { id: { in: dto.tenantIds ?? [] } },
        include: {
          users: { where: { role: 'OWNER', isActive: true }, take: 1 },
        },
      });
    }

    let emailsSent = 0;
    let smsSent = 0;
    let failed = 0;

    for (const tenant of tenants) {
      const owner = tenant.users[0];
      if (!owner) continue;

      const variables = {
        name: owner.fullName,
        shopName: tenant.name,
        email: owner.email,
        phone: tenant.phone,
      };

      try {
        if (dto.channel === SendChannel.EMAIL || dto.channel === SendChannel.BOTH) {
          await this.emailService.send({
            tenantId: tenant.id,
            templateSlug: dto.emailTemplateSlug,
            toEmail: owner.email,
            toName: owner.fullName,
            subject: dto.emailSubject,
            bodyHtml: dto.emailBody,
            variables,
          });
          emailsSent++;
        }

        if ((dto.channel === SendChannel.SMS || dto.channel === SendChannel.BOTH) && tenant.phone) {
          await this.smsService.send({
            tenantId: tenant.id,
            templateSlug: dto.smsTemplateSlug,
            toPhone: tenant.phone,
            message: dto.smsMessage,
            variables,
          });
          smsSent++;
        }
      } catch (e) {
        failed++;
      }
    }

    return {
      totalTenants: tenants.length,
      emailsSent,
      smsSent,
      failed,
    };
  }

  async testEmail(toEmail: string, templateSlug?: string) {
    return this.emailService.send({
      toEmail,
      toName: 'Admin Test',
      templateSlug,
      subject: templateSlug ? undefined : 'Test Email from Nafaa Admin',
      bodyHtml: templateSlug ? undefined : '<h1>Test Email</h1><p>This is a test email from Nafaa admin panel.</p>',
      variables: {
        name: 'Test User',
        shopName: 'Test Shop',
        amount: '1500',
        days: '7',
        reason: 'Test reason',
        productName: 'Test Product',
      },
    });
  }

  async testSms(toPhone: string, templateSlug?: string) {
    return this.smsService.send({
      toPhone,
      templateSlug,
      message: templateSlug ? undefined : 'Test SMS from Nafaa Admin Panel',
      variables: {
        name: 'Test User',
        amount: '1500',
        days: '7',
        reason: 'Test reason',
        productName: 'Test Product',
        otp: '123456',
        loginUrl: 'https://nafaa.pk/login',
      },
    });
  }
}
