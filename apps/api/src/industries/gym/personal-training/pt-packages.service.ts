/**
 * PT packages: a block of personal training sessions sold together
 * (e.g. 12 sessions for Rs 18,000). The package is billed when sold; the
 * unpaid part goes on the member's khata. Each session booked from it
 * carries the package's saleId, and completing a session counts it as used.
 * A package ends when all sessions are used, its end date passes, or its
 * bill is voided or returned.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { GYM_SALE, assertCan, gymClock, nextNumber, opt, paging, r2 } from '../common/gym-common';
import { CancelPtPackageDto, SellPtPackageDto } from './dto/pt.dto';

const P = PERMISSIONS;
type Db = Prisma.TransactionClient;
const OPEN_SESSION = ['SCHEDULED', 'IN_PROGRESS'];

export const ptPackageSaleNumber = (packageNumber: string) => `${GYM_SALE}${packageNumber}`;

@Injectable()
export class PtPackagesService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async sell(user: AuthenticatedUser, dto: SellPtPackageDto) {
    assertCan(user, [P.POS_USE], 'PT package ka bill banane');
    const tenantId = user.tenantId;
    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId, isActive: true } });
    if (!member) throw new NotFoundException('Member nahi mila');
    if (member.status === 'BANNED') throw new BadRequestException('Ye member banned hai');
    if (dto.trainerId) {
      const trainer = await this.prisma.gymTrainer.findFirst({ where: { id: dto.trainerId, tenantId, isActive: true }, select: { id: true } });
      if (!trainer) throw new NotFoundException('Trainer nahi mila');
    }
    const price = r2(dto.price);
    const paid = r2(Math.max(Number(dto.paidAmount) || 0, 0));
    if (paid > price + 0.01) throw new BadRequestException(`Package sirf Rs ${price} ka hai`);
    const clock = await gymClock(this.tz, tenantId);
    const startDate = clock.dayStart(dto.startDate);
    const endDate = clock.periodEnd(startDate, dto.validDays ?? 90);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, member.shopId);
      const prefix = `PTP-${clock.year()}-`;
      const packageNumber = await nextNumber(tx, tenantId, prefix, async () => (await tx.gymPersonalTrainingPackage.findFirst({
        where: { tenantId, packageNumber: { startsWith: prefix } }, orderBy: { packageNumber: 'desc' }, select: { packageNumber: true },
      }))?.packageNumber);
      const sale = await postIndustrySale(tx, user, {
        saleNumber: ptPackageSaleNumber(packageNumber),
        sourceRef: packageNumber,
        shopId,
        customerId: member.customerId,
        lines: [{ label: `PT package: ${dto.sessions} sessions`, amount: price }],
        paidAmount: paid,
        paymentMethod: dto.paymentMethod,
      });
      await tx.gymMember.update({ where: { id: member.id }, data: { totalSpent: { increment: price } } });
      return tx.gymPersonalTrainingPackage.create({
        data: {
          tenantId, shopId, memberId: member.id, trainerId: dto.trainerId || null, packageNumber,
          sessionsTotal: dto.sessions, price, saleId: sale.id, startDate, endDate,
          notes: opt(dto.notes), createdById: user.id,
        },
      });
    });
  }

  /** Packages past their end date close as expired before any read. */
  private expire(tenantId: string) {
    return this.prisma.gymPersonalTrainingPackage.updateMany({
      where: { tenantId, status: 'ACTIVE', endDate: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  async list(user: AuthenticatedUser, params: { memberId?: string; trainerId?: string; status?: string; search?: string; page?: string; limit?: string }) {
    const tenantId = user.tenantId;
    await this.expire(tenantId);
    const q = params.search?.trim();
    const matched = q
      ? await this.prisma.customer.findMany({ where: { tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }, select: { id: true }, take: 500 })
      : [];
    const memberIds = q ? (await this.prisma.gymMember.findMany({ where: { tenantId, customerId: { in: matched.map((c) => c.id) } }, select: { id: true } })).map((m) => m.id) : [];
    const where: Prisma.GymPersonalTrainingPackageWhereInput = {
      tenantId,
      ...(params.memberId && { memberId: params.memberId }),
      ...(params.trainerId && { trainerId: params.trainerId }),
      ...(params.status && { status: params.status as Prisma.GymPersonalTrainingPackageWhereInput['status'] }),
      ...(q && { OR: [{ packageNumber: { contains: q, mode: 'insensitive' } }, { memberId: { in: memberIds } }] }),
    };
    const { page, limit, skip } = paging(params.page, params.limit);
    const [rows, total, money] = await Promise.all([
      this.prisma.gymPersonalTrainingPackage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.gymPersonalTrainingPackage.count({ where }),
      this.prisma.gymPersonalTrainingPackage.aggregate({ where, _sum: { price: true, sessionsTotal: true, sessionsUsed: true } }),
    ]);
    return { items: await this.decorate(tenantId, rows), total, page, pages: Math.max(1, Math.ceil(total / limit)), totals: { price: r2(money._sum.price ?? 0), sessions: money._sum.sessionsTotal ?? 0, used: money._sum.sessionsUsed ?? 0 } };
  }

  /** Member name, trainer name, sessions booked but not done, and what is still unpaid on the bill. */
  private async decorate<T extends { memberId: string; trainerId: string | null; saleId: string | null; sessionsTotal: number; sessionsUsed: number }>(tenantId: string, rows: T[]) {
    const members = await this.prisma.gymMember.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.memberId))] } }, select: { id: true, memberNumber: true, customerId: true } });
    const [people, trainers, booked, sales] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, id: { in: members.map((m) => m.customerId) } }, select: { id: true, name: true, phone: true } }),
      this.prisma.gymTrainer.findMany({ where: { tenantId, id: { in: rows.map((r) => r.trainerId).filter((x): x is string => !!x) } }, select: { id: true, trainerNumber: true, staffId: true } }),
      this.prisma.gymPersonalTraining.groupBy({ by: ['saleId'], where: { tenantId, isFromPackage: true, saleId: { in: rows.map((r) => r.saleId).filter((x): x is string => !!x) }, status: { in: OPEN_SESSION } }, _count: { _all: true } }),
      this.prisma.sale.findMany({ where: { tenantId, id: { in: rows.map((r) => r.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true, status: true, creditAmount: true, paidAmount: true } }),
    ]);
    const staff = await this.prisma.staff.findMany({ where: { tenantId, id: { in: trainers.map((t) => t.staffId) } }, select: { id: true, fullName: true } });
    const personOf = new Map(people.map((c) => [c.id, c]));
    const memberOf = new Map(members.map((m) => [m.id, { id: m.id, memberNumber: m.memberNumber, customerId: m.customerId, customer: personOf.get(m.customerId) ?? null }]));
    const staffOf = new Map(staff.map((s) => [s.id, s.fullName]));
    const trainerOf = new Map(trainers.map((t) => [t.id, { id: t.id, trainerNumber: t.trainerNumber, name: staffOf.get(t.staffId) ?? null }]));
    const bookedOf = new Map(booked.map((b) => [b.saleId, b._count._all]));
    const saleOf = new Map(sales.map((s) => [s.id, s]));
    return rows.map((r) => {
      const pending = (r.saleId && bookedOf.get(r.saleId)) || 0;
      return {
        ...r,
        member: memberOf.get(r.memberId) ?? null,
        trainer: r.trainerId ? trainerOf.get(r.trainerId) ?? null : null,
        sessionsBooked: pending,
        sessionsLeft: Math.max(r.sessionsTotal - r.sessionsUsed - pending, 0),
        sale: r.saleId ? saleOf.get(r.saleId) ?? null : null,
      };
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    await this.expire(user.tenantId);
    const row = await this.prisma.gymPersonalTrainingPackage.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('PT package nahi mila');
    const [item] = await this.decorate(user.tenantId, [row]);
    const sessions = row.saleId
      ? await this.prisma.gymPersonalTraining.findMany({
        where: { tenantId: user.tenantId, saleId: row.saleId, isFromPackage: true },
        select: { id: true, sessionNumber: true, scheduledStart: true, status: true, trainerId: true, commissionAmount: true },
        orderBy: { scheduledStart: 'asc' },
      })
      : [];
    return { ...item, sessions };
  }

  /**
   * Stops a package without moving money; sessions booked from it are
   * cancelled. Money goes back through a Return of its bill, which cancels
   * the package by itself.
   */
  async cancel(user: AuthenticatedUser, id: string, dto: CancelPtPackageDto) {
    const row = await this.prisma.gymPersonalTrainingPackage.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('PT package nahi mila');
    if (row.status === 'CANCELLED') throw new BadRequestException('Ye package pehle hi cancel hai');
    return this.prisma.$transaction((tx) => this.close(tx, user.tenantId, row.id, opt(dto.reason) ?? 'Package cancel'));
  }

  /** Cancels a package and its open sessions; runs once (a second call changes nothing and returns null). */
  async close(tx: Db, tenantId: string, id: string, reason: string) {
    const row = await tx.gymPersonalTrainingPackage.findFirst({ where: { id, tenantId } });
    if (!row) return null;
    const done = await tx.gymPersonalTrainingPackage.updateMany({
      where: { id, status: { not: 'CANCELLED' } },
      data: { status: 'CANCELLED', notes: [row.notes, reason].filter(Boolean).join(' · ').slice(0, 500) },
    });
    if (done.count && row.saleId) {
      await tx.gymPersonalTraining.updateMany({
        where: { tenantId, saleId: row.saleId, isFromPackage: true, status: { in: OPEN_SESSION } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
      });
    }
    return done.count ? { ...row, status: 'CANCELLED' as const } : null;
  }

  /**
   * The package a new session is taken from: the one asked for, or the
   * member's oldest running package with sessions left (booked ones count).
   */
  async pick(tx: Db, tenantId: string, memberId: string, trainerId: string, at: Date, packageId?: string) {
    const rows = await tx.gymPersonalTrainingPackage.findMany({
      where: {
        tenantId, memberId, status: 'ACTIVE', saleId: { not: null },
        ...(packageId && { id: packageId }),
        OR: [{ endDate: null }, { endDate: { gte: at } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const pkg of rows) {
      if (pkg.trainerId && pkg.trainerId !== trainerId) continue;
      const booked = await tx.gymPersonalTraining.count({ where: { tenantId, saleId: pkg.saleId, isFromPackage: true, status: { in: OPEN_SESSION } } });
      const left = pkg.sessionsTotal - pkg.sessionsUsed - booked;
      if (left > 0) return { pkg, left };
    }
    if (packageId) {
      const asked = await tx.gymPersonalTrainingPackage.findFirst({ where: { id: packageId, tenantId, memberId } });
      if (!asked) throw new NotFoundException('PT package nahi mila');
      if (asked.status !== 'ACTIVE') throw new BadRequestException(`Package ${asked.packageNumber} band hai`);
      if (asked.trainerId && asked.trainerId !== trainerId) throw new BadRequestException(`Package ${asked.packageNumber} doosre trainer ka hai`);
      if (asked.endDate && asked.endDate < at) throw new BadRequestException(`Package ${asked.packageNumber} is date se pehle khatam ho jata hai`);
      throw new BadRequestException(`Package ${asked.packageNumber} ke sessions khatam (booked bhi shamil)`);
    }
    return null;
  }

  /** A package session was completed: one session used; the last one closes the package. Returns the per-session value. */
  async useOne(tx: Db, tenantId: string, saleId: string) {
    const pkg = await tx.gymPersonalTrainingPackage.findFirst({ where: { tenantId, saleId } });
    if (!pkg) return null;
    if (pkg.status === 'CANCELLED') throw new BadRequestException(`Package ${pkg.packageNumber} cancel ho chuka`);
    const done = await tx.gymPersonalTrainingPackage.updateMany({
      where: { id: pkg.id, sessionsUsed: { lt: pkg.sessionsTotal } },
      data: { sessionsUsed: { increment: 1 } },
    });
    if (!done.count) throw new BadRequestException(`Package ${pkg.packageNumber} ke sab sessions use ho chuke`);
    if (pkg.sessionsUsed + 1 >= pkg.sessionsTotal) await tx.gymPersonalTrainingPackage.update({ where: { id: pkg.id }, data: { status: 'COMPLETED' } });
    return r2(pkg.price / Math.max(pkg.sessionsTotal, 1));
  }
}
