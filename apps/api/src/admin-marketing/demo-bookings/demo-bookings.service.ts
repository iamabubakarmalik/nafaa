import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../modules/email/email.service';
import { SmsService } from '../../modules/sms/sms.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';
import { ListDemosDto } from './dto/list-demos.dto';
import { ScheduleDemoDto } from './dto/schedule-demo.dto';
import { CompleteDemoDto, DemoOutcome } from './dto/complete-demo.dto';

@Injectable()
export class DemoBookingsService {
  private readonly logger = new Logger(DemoBookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  private async log(userId: string, action: string, entityId: string, metadata?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: 'system', userId, action, description: action,
          entityType: 'DemoBooking', entityId, metadata,
        },
      });
    } catch { /* silent */ }
  }

  async list(dto: ListDemosDto) {
    const { page, limit, skip } = parsePagination(dto);
    const where: Prisma.DemoBookingWhereInput = {};
    if (dto.status) where.status = dto.status as any;
    if (dto.assignedTo) where.assignedTo = dto.assignedTo;
    if (dto.search) {
      where.OR = [
        { fullName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search } },
        { companyName: { contains: dto.search, mode: 'insensitive' } },
        { bookingNumber: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.from || dto.to) {
      where.createdAt = {};
      if (dto.from) (where.createdAt as any).gte = new Date(dto.from);
      if (dto.to) (where.createdAt as any).lte = new Date(dto.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.demoBooking.findMany({
        where, skip, take: limit,
        orderBy: [{ preferredDate: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.demoBooking.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  async getStats() {
    const now = new Date();
    const [total, pending, confirmed, completed, cancelled, noShow, upcoming, converted] =
      await Promise.all([
        this.prisma.demoBooking.count(),
        this.prisma.demoBooking.count({ where: { status: 'PENDING' } }),
        this.prisma.demoBooking.count({ where: { status: { in: ['CONFIRMED', 'RESCHEDULED'] } } }),
        this.prisma.demoBooking.count({ where: { status: 'COMPLETED' } }),
        this.prisma.demoBooking.count({ where: { status: 'CANCELLED' } }),
        this.prisma.demoBooking.count({ where: { status: 'NO_SHOW' } }),
        this.prisma.demoBooking.count({
          where: { status: { in: ['CONFIRMED', 'RESCHEDULED'] }, preferredDate: { gte: now } },
        }),
        this.prisma.demoBooking.count({ where: { interestLevel: 'READY_TO_BUY' } }),
      ]);

    return {
      total, requested: pending, scheduled: confirmed, completed,
      cancelled, noShow, upcoming, converted,
      conversionRate: completed > 0 ? `${((converted / completed) * 100).toFixed(1)}%` : '0%',
      noShowRate:
        confirmed + completed + noShow > 0
          ? `${((noShow / (confirmed + completed + noShow)) * 100).toFixed(1)}%`
          : '0%',
    };
  }

  async getOne(id: string) {
    const demo = await this.prisma.demoBooking.findUnique({ where: { id } });
    if (!demo) throw new NotFoundException('Demo booking not found');
    return demo;
  }

  async schedule(id: string, dto: ScheduleDemoDto, adminId: string) {
    const demo = await this.getOne(id);
    if (demo.status === 'COMPLETED' || demo.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot schedule ${demo.status} demo`);
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledAt date');
    }

    const updated = await this.prisma.demoBooking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        preferredDate: scheduledAt,
        preferredTime: scheduledAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
        meetingLink: dto.meetingLink,
        assignedTo: dto.assignedTo,
        internalNotes: dto.notes,
        confirmedAt: new Date(),
      },
    });

    try {
      await this.email.send({
        toEmail: demo.email,
        toName: demo.fullName,
        subject: `Demo Confirmed — Nafaa POS (${scheduledAt.toLocaleString('en-PK')})`,
        bodyHtml: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#0891b2;">Assalam-o-Alaikum ${demo.fullName}!</h2>
            <p>Aap ki Nafaa POS demo confirm ho gayi hai:</p>
            <div style="background:#f0fdfa;border-left:4px solid #0891b2;padding:16px;margin:16px 0;">
              <p><strong>Date & Time:</strong> ${scheduledAt.toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
              ${dto.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${dto.meetingLink}">${dto.meetingLink}</a></p>` : ''}
              <p><strong>Booking:</strong> ${demo.bookingNumber}</p>
            </div>
            <p>Demo se pehle koi sawal ho to iss email ka reply kar dein.</p>
            <p style="color:#999;font-size:12px;margin-top:24px;">— Nafaa POS Team</p>
          </div>
        `,
      } as any);
    } catch (e) {
      this.logger.warn(`Demo email failed: ${e}`);
    }

    if (demo.phone) {
      try {
        const timeStr = scheduledAt.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' });
        await this.sms.send({
          toPhone: demo.phone,
          message: `Nafaa POS: Aap ki demo confirm hai ${timeStr}. Booking: ${demo.bookingNumber}`,
        } as any);
      } catch (e) {
        this.logger.warn(`Demo SMS failed: ${e}`);
      }
    }

    await this.log(adminId, 'DEMO_SCHEDULED', id, { scheduledAt: scheduledAt.toISOString() });
    return updated;
  }

  async complete(id: string, dto: CompleteDemoDto, adminId: string) {
    const demo = await this.getOne(id);

    const interestMap: Record<DemoOutcome, string> = {
      CONVERTED: 'READY_TO_BUY',
      INTERESTED: 'HIGH',
      NEEDS_FOLLOWUP: 'MEDIUM',
      NOT_INTERESTED: 'LOW',
      WRONG_FIT: 'LOW',
    };

    const updated = await this.prisma.demoBooking.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        interestLevel: interestMap[dto.outcome],
        rating: dto.rating,
        feedback: dto.feedback,
        followUpNotes: dto.nextStep,
      },
    });

    if (dto.outcome === 'CONVERTED' || dto.outcome === 'INTERESTED') {
      const existing = await this.prisma.marketingLead.findFirst({ where: { email: demo.email } });
      if (existing) {
        await this.prisma.marketingLead.update({
          where: { id: existing.id },
          data: { demosAttended: { increment: 1 }, lastContactAt: new Date() },
        });
      } else {
        await this.prisma.marketingLead.create({
          data: {
            leadNumber: `LEAD-${Date.now()}`,
            fullName: demo.fullName,
            email: demo.email,
            phone: demo.phone,
            companyName: demo.companyName,
            source: 'DEMO_REQUEST',
            status: dto.outcome === 'CONVERTED' ? 'QUALIFIED' : 'CONTACTED',
            temperature: dto.outcome === 'CONVERTED' ? 'FIRE' : 'HOT',
            score: dto.outcome === 'CONVERTED' ? 85 : 65,
            demosAttended: 1,
          },
        });
      }
    }

    await this.log(adminId, 'DEMO_COMPLETED', id, dto as any);
    return updated;
  }

  async cancel(id: string, reason: string, adminId: string) {
    await this.getOne(id);
    const updated = await this.prisma.demoBooking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
    await this.log(adminId, 'DEMO_CANCELLED', id, { reason });
    return updated;
  }
}
