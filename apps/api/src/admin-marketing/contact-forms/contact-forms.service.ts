import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../modules/email/email.service';
import { SmsService } from '../../modules/sms/sms.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';
import { ListFormsDto } from './dto/list-forms.dto';
import { ReplyFormDto } from './dto/reply-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

@Injectable()
export class ContactFormsService {
  private readonly logger = new Logger(ContactFormsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: EmailService,
    private readonly sms: SmsService,
  ) {}

  // ─────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────
  async list(dto: ListFormsDto) {
    const { page, limit, skip } = parsePagination(dto);

    const where: Prisma.ContactFormSubmissionWhereInput = {};
    if (dto.status) where.status = dto.status as any;
    if (dto.priority) where.priority = dto.priority;
    if (dto.assignedTo) where.assignedTo = dto.assignedTo;
    if (dto.search) {
      where.OR = [
        { fullName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search } },
        { message: { contains: dto.search, mode: 'insensitive' } },
        
      ];
    }
    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) (where.createdAt as any).gte = new Date(dto.from);
      if (dto.to) (where.createdAt as any).lte = new Date(dto.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.contactFormSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          replies: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.contactFormSubmission.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  // ─────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────
  async getStats() {
    const [total, newCount, inProgress, replied, resolved, spam, urgent] =
      await Promise.all([
        this.prisma.contactFormSubmission.count(),
        this.prisma.contactFormSubmission.count({ where: { status: 'NEW' } }),
        this.prisma.contactFormSubmission.count({
          where: { status: 'IN_PROGRESS' },
        }),
        this.prisma.contactFormSubmission.count({
          where: { status: 'REPLIED' },
        }),
        this.prisma.contactFormSubmission.count({
          where: { status: 'RESOLVED' },
        }),
        this.prisma.contactFormSubmission.count({ where: { status: 'SPAM' } }),
        this.prisma.contactFormSubmission.count({
          where: { priority: 'URGENT', status: { not: 'RESOLVED' } },
        }),
      ]);

    // Avg response time (in minutes)
    const responded = await this.prisma.contactFormSubmission.findMany({
      where: { firstResponseAt: { not: null } },
      select: { createdAt: true, firstResponseAt: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    let avgResponseMinutes = 0;
    if (responded.length > 0) {
      const sum = responded.reduce((acc, r) => {
        return acc + (r.firstResponseAt!.getTime() - r.createdAt.getTime());
      }, 0);
      avgResponseMinutes = Math.round(sum / responded.length / 60000);
    }

    return {
      total,
      new: newCount,
      inProgress,
      replied,
      resolved,
      spam,
      urgentOpen: urgent,
      avgResponseMinutes,
      resolvedRate:
        total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  // ─────────────────────────────────────────────────
  // GET ONE
  // ─────────────────────────────────────────────────
  async getOne(id: string) {
    const form = await this.prisma.contactFormSubmission.findUnique({
      where: { id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
          },
        },
      },
    });
    if (!form) throw new NotFoundException('Contact form not found');
    return form;
  }

  // ─────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────
  async update(id: string, dto: UpdateFormDto, adminId: string) {
    await this.getOne(id);

    const updated = await this.prisma.contactFormSubmission.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
        ...(dto.internalNotes !== undefined && {
          internalNotes: dto.internalNotes,
        }),
        updatedAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId, tenantId: "system",
        action: 'CONTACT_FORM_UPDATED',
        description: 'CONTACT_FORM_UPDATED',
        entityType: 'ContactFormSubmission',
        entityId: id,
        metadata: dto as any,
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────
  // REPLY
  // ─────────────────────────────────────────────────
  async reply(id: string, dto: ReplyFormDto, adminId: string) {
    const form = await this.getOne(id);

    if (form.status === 'SPAM' || form.status === 'ARCHIVED') {
      throw new BadRequestException(`Cannot reply to ${form.status} form`);
    }

    // 1. Send email via Resend
    await this.resend.send({
      toEmail: form.email,
      subject: dto.subject || 'Re: Your inquiry — Nafaa POS',
      bodyHtml: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p>Assalam-o-Alaikum ${form.fullName},</p>
          <div style="white-space:pre-wrap;line-height:1.6;color:#333;margin:16px 0;">
            ${dto.message.replace(/</g, '&lt;').replace(/\n/g, '<br>')}
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#666;font-size:13px;">
            Original message from you (Ticket: <strong>${form.ticketNumber}</strong>):<br>
            <em>${form.message.slice(0, 300).replace(/</g, '&lt;')}${form.message.length > 300 ? '...' : ''}</em>
          </p>
          <p style="margin-top:24px;color:#999;font-size:12px;">
            — Nafaa POS Team<br>
            <a href="https://nafaa.pk" style="color:#0891b2;">nafaa.pk</a>
          </p>
        </div>
      `,
    });

    // 2. Optional SMS
    if (dto.sendSms && form.phone) {
      try {
        await this.sms.send({
          toPhone: form.phone,
          message: `Nafaa: Hum ne aap ki inquiry ka jawab email par bhej diya hai. Ticket: ${form.ticketNumber}`,
        });
      } catch (e) {
        this.logger.warn(`SMS reply failed for form ${id}: ${e}`);
      }
    }

    // 3. Save reply
    const reply = await this.prisma.contactFormReply.create({
      data: {
        submissionId: id,
        senderType: 'ADMIN',
        senderId: adminId,
        senderName: 'Admin',
        message: dto.message,
      },
    });

    // 4. Update form status + firstResponseAt
    await this.prisma.contactFormSubmission.update({
      where: { id },
      data: {
        status: dto.markResolved ? 'RESOLVED' : 'REPLIED',
        firstResponseAt: form.firstResponseAt ?? new Date(),
        updatedAt: new Date(),
        repliesCount: { increment: 1 },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId, tenantId: "system",
        action: 'CONTACT_FORM_REPLIED',
        description: 'CONTACT_FORM_REPLIED',
        entityType: 'ContactFormSubmission',
        entityId: id,
        metadata: { subject: dto.subject, sms: !!dto.sendSms } as any,
      },
    });

    return { success: true, replyId: reply.id };
  }

  // ─────────────────────────────────────────────────
  // MARK SPAM
  // ─────────────────────────────────────────────────
  async markSpam(id: string, adminId: string) {
    await this.getOne(id);
    await this.prisma.contactFormSubmission.update({
      where: { id },
      data: { status: 'SPAM' },
    });
    await this.prisma.activityLog.create({
      data: {
        userId: adminId, tenantId: "system",
        action: 'CONTACT_FORM_SPAM',
        description: 'CONTACT_FORM_SPAM',
        entityType: 'ContactFormSubmission',
        entityId: id,
      },
    });
    return { success: true };
  }
}
