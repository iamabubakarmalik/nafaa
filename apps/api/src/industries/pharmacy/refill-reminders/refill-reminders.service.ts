import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { dayRange, todayStart } from '../common/pharmacy-time';
import { CreateRefillReminderDto } from './dto/create-refill-reminder.dto';

const STATUSES = ['PENDING', 'SENT', 'ACKNOWLEDGED', 'MISSED'];

@Injectable()
export class RefillRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateRefillReminderDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    if (dto.productId && !(await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Dawai nahi mili');
    }
    if (dto.prescriptionId && !(await this.prisma.prescription.findFirst({ where: { id: dto.prescriptionId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Nuskha nahi mila');
    }
    return this.prisma.refillReminder.create({
      data: {
        tenantId: user.tenantId,
        customerId: dto.customerId,
        productId: dto.productId,
        prescriptionId: dto.prescriptionId,
        medicineName: dto.medicineName.trim(),
        scheduledFor: new Date(dto.scheduledFor),
        reminderType: dto.reminderType ?? 'WHATSAPP',
        status: 'PENDING',
        notes: dto.notes,
      },
    });
  }

  /** `from`/`to` are the shop's business days (YYYY-MM-DD). */
  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string }) {
    if (params.status && !STATUSES.includes(params.status)) throw new BadRequestException('Status theek nahi');
    const range = await dayRange(this.tz, user.tenantId, params.from, params.to);
    return this.prisma.refillReminder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...((range.gte || range.lt) && { scheduledFor: range }),
      },
      orderBy: { scheduledFor: 'asc' },
      take: 500,
    });
  }

  /** Pending reminders up to the end of the shop's business day, overdue ones included. */
  async dueToday(user: AuthenticatedUser) {
    const start = await todayStart(this.tz, user.tenantId);
    return this.prisma.refillReminder.findMany({
      where: { tenantId: user.tenantId, status: 'PENDING', scheduledFor: { lt: new Date(start.getTime() + 86_400_000) } },
      orderBy: { scheduledFor: 'asc' },
      take: 500,
    });
  }

  private async own(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.refillReminder.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!r) throw new NotFoundException('Reminder nahi mila');
  }

  async markSent(user: AuthenticatedUser, id: string) {
    await this.own(user, id);
    return this.prisma.refillReminder.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
  }

  async acknowledge(user: AuthenticatedUser, id: string) {
    await this.own(user, id);
    return this.prisma.refillReminder.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() } });
  }

  /** A reminder is only a note to call the patient; removing it touches no sale or stock. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.own(user, id);
    return this.prisma.refillReminder.delete({ where: { id } });
  }
}
