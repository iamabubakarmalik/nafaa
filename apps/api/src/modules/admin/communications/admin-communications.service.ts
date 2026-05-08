import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { SmsService } from '../../sms/sms.service';
import { BulkSendDto, BulkTarget, SendChannel } from './dto/bulk-send.dto';

@Injectable()
export class AdminCommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

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
