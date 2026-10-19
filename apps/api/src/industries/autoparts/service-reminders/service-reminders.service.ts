import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { Prisma } from '@prisma/client';
import { DEFAULT_TZ } from '../../../common/helpers/business-time.helper';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/** "12 Nov 2026" in Pakistan time. */
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: DEFAULT_TZ });

@Injectable()
export class ServiceRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const v = typeof dto?.vehicleId === 'string'
      ? await this.prisma.customerVehicle.findFirst({ where: { id: dto.vehicleId, tenantId: user.tenantId } })
      : null;
    if (!v) throw new NotFoundException('Vehicle not found');

    // The body is untyped: only reminder fields are kept, the shop comes from the login.
    const text = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : undefined);
    const km = Number(dto.dueOdometerKm);
    const due = dto.dueDate ? new Date(dto.dueDate) : null;
    if (due && Number.isNaN(due.getTime())) throw new BadRequestException('Date sahi likhein');
    return this.prisma.vehicleServiceReminder.create({
      data: {
        tenantId: user.tenantId,
        vehicleId: v.id,
        reminderType: text(dto.reminderType) ?? 'GENERAL',
        title: text(dto.title) ?? 'Service reminder',
        description: text(dto.description),
        dueDate: due,
        dueOdometerKm: Number.isFinite(km) && km > 0 ? Math.round(km) : undefined,
        notes: text(dto.notes),
        fromJobId: text(dto.fromJobId),
      },
    });
  }

  /**
   * Reminders with their vehicle and owner, for calling the customer.
   * Views: due (date passed or within 7 days), upcoming (next 30 days),
   * overdue, done, all. Without `page` the old plain array is returned.
   */
  async list(user: AuthenticatedUser, params: { status?: string; vehicleId?: string; upcoming?: boolean; overdue?: boolean; view?: string; search?: string; page?: number; limit?: number }) {
    const now = new Date();
    const open = { in: ['PENDING', 'SENT', 'SNOOZED'] };
    const and: Prisma.VehicleServiceReminderWhereInput[] = [{ tenantId: user.tenantId }];
    if (params.status) and.push({ status: params.status });
    if (params.vehicleId) and.push({ vehicleId: params.vehicleId });
    if (params.upcoming || params.view === 'upcoming') and.push({ dueDate: { gte: now, lte: addDays(now, 30) }, status: open });
    if (params.overdue || params.view === 'overdue') and.push({ dueDate: { lt: now }, status: open });
    if (params.view === 'due') and.push({ status: open, OR: [{ dueDate: { lte: addDays(now, 7) } }, { dueDate: null }] });
    if (params.view === 'open') and.push({ status: open });
    if (params.view === 'done') and.push({ status: { in: ['DONE', 'ACKNOWLEDGED'] } });
    const q = params.search?.trim();
    if (q) {
      const vehicles = await this.prisma.customerVehicle.findMany({
        where: { tenantId: user.tenantId, OR: [{ registrationNumber: { contains: q, mode: 'insensitive' } }, { ownerName: { contains: q, mode: 'insensitive' } }, { ownerPhone: { contains: q } }] },
        select: { id: true }, take: 500,
      });
      and.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { vehicleId: { in: vehicles.map((v) => v.id) } }] });
    }
    const where = { AND: and };
    const orderBy: Prisma.VehicleServiceReminderOrderByWithRelationInput[] = params.view === 'done' ? [{ doneAt: 'desc' }] : [{ dueDate: { sort: 'asc', nulls: 'last' } }];
    const limit = params.limit ?? 40;
    const [rows, total] = await Promise.all([
      this.prisma.vehicleServiceReminder.findMany({ where, orderBy, skip: params.page ? (params.page - 1) * limit : 0, take: params.page ? limit : 200 }),
      params.page ? this.prisma.vehicleServiceReminder.count({ where }) : Promise.resolve(0),
    ]);
    const vehicles = rows.length ? await this.prisma.customerVehicle.findMany({
      where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.vehicleId))] } },
      select: { id: true, registrationNumber: true, makeName: true, modelName: true, ownerName: true, ownerPhone: true, customerId: true, odometerKm: true, lastOdometerKm: true },
    }) : [];
    const vOf = new Map(vehicles.map((v) => [v.id, v]));
    const items = rows.map((r) => ({ ...r, vehicle: vOf.get(r.vehicleId) ?? null }));
    if (!params.page) return items;
    return { items, total, page: params.page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
  }

  /** Counts for the reminders page. */
  async stats(user: AuthenticatedUser) {
    const now = new Date();
    const open = { in: ['PENDING', 'SENT', 'SNOOZED'] };
    const base = { tenantId: user.tenantId };
    const [overdue, week, month, done] = await Promise.all([
      this.prisma.vehicleServiceReminder.count({ where: { ...base, status: open, dueDate: { lt: now } } }),
      this.prisma.vehicleServiceReminder.count({ where: { ...base, status: open, dueDate: { gte: now, lte: addDays(now, 7) } } }),
      this.prisma.vehicleServiceReminder.count({ where: { ...base, status: open, dueDate: { gte: now, lte: addDays(now, 30) } } }),
      this.prisma.vehicleServiceReminder.count({ where: { ...base, status: 'DONE', doneAt: { gte: addDays(now, -30) } } }),
    ]);
    return { overdue, week, month, done };
  }

  /** Puts a reminder off to a later date. */
  async snooze(user: AuthenticatedUser, id: string, until: string) {
    const r = await this.prisma.vehicleServiceReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reminder nahi mila');
    const due = new Date(until);
    if (Number.isNaN(due.getTime()) || due.getTime() < Date.now() - 86_400_000) throw new BadRequestException('Aage ki date likhein');
    return this.prisma.vehicleServiceReminder.update({ where: { id }, data: { status: 'SNOOZED', dueDate: due } });
  }

  async byVehicle(user: AuthenticatedUser, vehicleId: string) {
    return this.prisma.vehicleServiceReminder.findMany({
      where: { tenantId: user.tenantId, vehicleId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const r = await this.prisma.vehicleServiceReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reminder not found');
    if (!['PENDING', 'SENT', 'ACKNOWLEDGED', 'DONE', 'SNOOZED'].includes(status)) throw new BadRequestException('Status sahi nahi');
    const patch: any = { status };
    const now = new Date();
    if (status === 'SENT') patch.sentAt = now;
    if (status === 'ACKNOWLEDGED') patch.acknowledgedAt = now;
    if (status === 'DONE') patch.doneAt = now;
    return this.prisma.vehicleServiceReminder.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.vehicleServiceReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reminder not found');
    return this.prisma.vehicleServiceReminder.delete({ where: { id } });
  }

  async autoGenerate(user: AuthenticatedUser, vehicleId: string) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id: vehicleId, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');

    const created: any[] = [];

    // Insurance reminder
    if (v.insuranceExpiry) {
      const dueDate = addDays(v.insuranceExpiry, -15);
      const dup = await this.prisma.vehicleServiceReminder.findFirst({
        where: { tenantId: user.tenantId, vehicleId, reminderType: 'INSURANCE', status: { in: ['PENDING', 'SENT'] } },
      });
      if (!dup) {
        const r = await this.prisma.vehicleServiceReminder.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            reminderType: 'INSURANCE',
            title: 'Insurance renew karwani hai',
            description: `Insurance ${day(v.insuranceExpiry)} ko khatam`,
            dueDate,
            autoCreated: true,
          },
        });
        created.push(r);
      }
    }

    // Token tax reminder
    if (v.tokenTaxExpiry) {
      const dueDate = addDays(v.tokenTaxExpiry, -30);
      const dup = await this.prisma.vehicleServiceReminder.findFirst({
        where: { tenantId: user.tenantId, vehicleId, reminderType: 'TOKEN_TAX', status: { in: ['PENDING', 'SENT'] } },
      });
      if (!dup) {
        const r = await this.prisma.vehicleServiceReminder.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            reminderType: 'TOKEN_TAX',
            title: 'Token tax jama karwana hai',
            description: `Token tax ${day(v.tokenTaxExpiry)} ko khatam`,
            dueDate,
            autoCreated: true,
          },
        });
        created.push(r);
      }
    }

    // Fitness reminder
    if (v.fitnessExpiry) {
      const dueDate = addDays(v.fitnessExpiry, -30);
      const dup = await this.prisma.vehicleServiceReminder.findFirst({
        where: { tenantId: user.tenantId, vehicleId, reminderType: 'FITNESS', status: { in: ['PENDING', 'SENT'] } },
      });
      if (!dup) {
        const r = await this.prisma.vehicleServiceReminder.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            reminderType: 'FITNESS',
            title: 'Fitness certificate renew karwana hai',
            description: `Fitness ${day(v.fitnessExpiry)} ko khatam`,
            dueDate,
            autoCreated: true,
          },
        });
        created.push(r);
      }
    }

    return { created: created.length, reminders: created };
  }
}
