import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { assertCan, gymClock, nextNumber, opt, r2 } from '../common/gym-common';
import { CreateTrainerDto, TrainerPayoutDto, UpdateTrainerDto } from './dto/trainer.dto';

const P = PERMISSIONS;
const CATEGORY = { name: 'Trainer commission', icon: '💪', color: '#dc2626' };
/** Payout expenses carry the trainer number in the title: "Trainer commission · TR-0001 · Ali". */
const payoutTitle = (trainerNumber: string) => `${CATEGORY.name} · ${trainerNumber} · `;

@Injectable()
export class TrainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly expenses: ExpensesService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateTrainerDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId } });
    if (!staff) throw new NotFoundException('Staff nahi mila');
    const existing = await this.prisma.gymTrainer.findUnique({ where: { staffId: dto.staffId } });
    if (existing) {
      if (existing.isActive) throw new BadRequestException(`${staff.fullName} pehle se trainer ${existing.trainerNumber} hain`);
      // A trainer who left and came back keeps the old number and history.
      return this.prisma.gymTrainer.update({ where: { id: existing.id }, data: { ...dto, staffId: undefined, isActive: true } });
    }
    return this.prisma.$transaction(async (tx) => {
      const trainerNumber = await nextNumber(tx, user.tenantId, 'TR-', async () => (await tx.gymTrainer.findFirst({
        where: { tenantId: user.tenantId, trainerNumber: { startsWith: 'TR-' } },
        orderBy: { trainerNumber: 'desc' },
        select: { trainerNumber: true },
      }))?.trainerNumber, 4);
      return tx.gymTrainer.create({ data: { ...dto, tenantId: user.tenantId, shopId: staff.shopId, trainerNumber } });
    });
  }

  async list(user: AuthenticatedUser, params: { role?: string; available?: boolean; search?: string; includeLeft?: boolean }) {
    const q = params.search?.trim();
    const trainers = await this.prisma.gymTrainer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(!params.includeLeft && { isActive: true }),
        ...(params.role && { role: params.role as Prisma.GymTrainerWhereInput['role'] }),
        ...(params.available !== undefined && { isAvailable: params.available }),
      },
      orderBy: { updatedAt: 'desc' },
    });
    const staffs = await this.prisma.staff.findMany({
      where: { tenantId: user.tenantId, id: { in: trainers.map((t) => t.staffId) } },
      select: { id: true, fullName: true, phone: true, designation: true, baseSalary: true, status: true, shopId: true },
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));
    const rows = trainers.map((t) => ({ ...t, staff: staffMap.get(t.staffId) ?? null }));
    return q ? rows.filter((t) => `${t.staff?.fullName ?? ''} ${t.staff?.phone ?? ''} ${t.trainerNumber}`.toLowerCase().includes(q.toLowerCase())) : rows;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Trainer nahi mila');
    const staff = await this.prisma.staff.findFirst({ where: { id: t.staffId, tenantId: user.tenantId } });
    return { ...t, staff };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTrainerDto) {
    const t = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Trainer nahi mila');
    return this.prisma.gymTrainer.update({ where: { id }, data: dto });
  }

  /** Classes and PT sessions booked for the trainer on one calendar day. */
  async availability(user: AuthenticatedUser, id: string, date: string) {
    const trainer = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!trainer) throw new NotFoundException('Trainer nahi mila');
    const clock = await gymClock(this.tz, user.tenantId);
    const dayStart = clock.dayStart(date);
    const dayEnd = clock.periodEnd(dayStart, 1);
    const weekday = new Date(`${clock.keyOf(dayStart)}T12:00:00Z`).getUTCDay();
    if (!trainer.workingDays.includes(weekday)) return { available: false, reason: 'Is din chutti hai' };
    const [classes, ptSessions] = await Promise.all([
      this.prisma.gymClass.findMany({ where: { tenantId: user.tenantId, trainerId: id, scheduledStart: { gte: dayStart, lte: dayEnd }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
      this.prisma.gymPersonalTraining.findMany({ where: { tenantId: user.tenantId, trainerId: id, scheduledStart: { gte: dayStart, lte: dayEnd }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
    ]);
    return { available: true, workingHours: { start: trainer.workStartTime, end: trainer.workEndTime }, classes, ptSessions };
  }

  /** Trainer left: the profile and its history stay, hidden from lists. */
  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!t) throw new NotFoundException('Trainer nahi mila');
    return this.prisma.gymTrainer.update({ where: { id }, data: { isActive: false, isAvailable: false } });
  }

  /* ───────────── Commission ───────────── */

  private async trainer(tenantId: string, id: string) {
    const t = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Trainer nahi mila');
    const staff = await this.prisma.staff.findFirst({ where: { id: t.staffId, tenantId }, select: { fullName: true, phone: true, baseSalary: true } });
    return { ...t, name: staff?.fullName ?? 'Trainer', phone: staff?.phone ?? null, baseSalary: staff?.baseSalary ?? 0 };
  }

  private async paidSoFar(tenantId: string, trainerNumber: string) {
    const agg = await this.prisma.expense.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' }, title: { startsWith: payoutTitle(trainerNumber) } },
      _sum: { amount: true },
    });
    return r2(agg._sum.amount ?? 0);
  }

  /**
   * Commission a trainer earned: completed PT sessions (single and package),
   * each with the commission worked out when it was completed. What is owed
   * is everything earned minus every payout not cancelled, so a payout can
   * be any amount (weekly, monthly, an advance).
   */
  async commission(user: AuthenticatedUser, id: string, from?: string, to?: string) {
    assertCan(user, [P.COMMISSION_VIEW, P.COMMISSION_MANAGE], 'Commission dekhne');
    const tenantId = user.tenantId;
    const t = await this.trainer(tenantId, id);
    const clock = await gymClock(this.tz, tenantId);
    const range = clock.range(from, to);
    const done: Prisma.GymPersonalTrainingWhereInput = { tenantId, trainerId: id, status: 'COMPLETED' };
    const [lines, earned, paid] = await Promise.all([
      this.prisma.gymPersonalTraining.findMany({
        where: { ...done, ...(range && { actualEnd: { gte: range.gte, lt: range.lt } }) },
        select: { id: true, sessionNumber: true, memberId: true, actualEnd: true, scheduledStart: true, price: true, isFromPackage: true, commissionAmount: true, focusArea: true },
        orderBy: { actualEnd: 'desc' },
        take: 1000,
      }),
      this.prisma.gymPersonalTraining.aggregate({ where: done, _sum: { commissionAmount: true }, _count: { _all: true } }),
      this.paidSoFar(tenantId, t.trainerNumber),
    ]);
    const members = await this.prisma.gymMember.findMany({ where: { tenantId, id: { in: [...new Set(lines.map((l) => l.memberId))] } }, select: { id: true, memberNumber: true, customerId: true } });
    const people = await this.prisma.customer.findMany({ where: { tenantId, id: { in: members.map((m) => m.customerId) } }, select: { id: true, name: true } });
    const nameOf = new Map(people.map((c) => [c.id, c.name]));
    const memberOf = new Map(members.map((m) => [m.id, { memberNumber: m.memberNumber, name: nameOf.get(m.customerId) ?? null }]));
    const totalEarned = r2(earned._sum.commissionAmount ?? 0);
    return {
      trainer: { id: t.id, trainerNumber: t.trainerNumber, name: t.name, commissionPct: t.commissionPct, commissionFixed: t.commissionFixed, perSessionRate: t.perSessionRate, baseSalary: t.baseSalary },
      from: from ?? null,
      to: to ?? null,
      period: {
        sessions: lines.length,
        revenue: r2(lines.reduce((s, l) => s + l.price, 0)),
        commission: r2(lines.reduce((s, l) => s + l.commissionAmount, 0)),
      },
      earned: totalEarned,
      sessions: earned._count._all,
      paid,
      owed: r2(totalEarned - paid),
      lines: lines.map((l) => ({ ...l, member: memberOf.get(l.memberId) ?? null })),
    };
  }

  /** Commission paid from the drawer (or bank) as an expense, so drawer, day book and profit show it. */
  async pay(user: AuthenticatedUser, scope: ShopScope, id: string, dto: TrainerPayoutDto) {
    assertCan(user, [P.COMMISSION_MANAGE], 'Commission dene');
    assertCan(user, [P.EXPENSES_CREATE], 'Drawer se kharcha likhne');
    const tenantId = user.tenantId;
    const t = await this.trainer(tenantId, id);
    const amount = r2(dto.amount);
    const owed = r2((await this.prisma.gymPersonalTraining.aggregate({ where: { tenantId, trainerId: id, status: 'COMPLETED' }, _sum: { commissionAmount: true } }))._sum.commissionAmount ?? 0)
      - (await this.paidSoFar(tenantId, t.trainerNumber));
    if (amount > r2(owed) + 0.01) throw new BadRequestException(owed > 0 ? `Baqi commission sirf Rs ${r2(owed)} hai` : 'Is trainer ki koi baqi commission nahi');
    const expense = await this.expenses.create(user, scope, {
      title: `${payoutTitle(t.trainerNumber)}${t.name}`.slice(0, 120),
      description: opt(dto.note)?.slice(0, 500),
      amount,
      paymentMethod: (dto.paymentMethod as PaymentMethod) ?? 'CASH',
      status: 'PAID',
      categoryId: await this.category(tenantId),
      expenseDate: dto.expenseDate,
      ...(t.shopId && { shopId: t.shopId }),
    });
    return expense;
  }

  /** Earlier payouts, newest first (cancelled ones stay listed with their status). */
  async payouts(user: AuthenticatedUser, id: string) {
    assertCan(user, [P.COMMISSION_VIEW, P.COMMISSION_MANAGE], 'Commission dekhne');
    const t = await this.trainer(user.tenantId, id);
    return this.prisma.expense.findMany({
      where: { tenantId: user.tenantId, title: { startsWith: payoutTitle(t.trainerNumber) } },
      select: { id: true, expenseNumber: true, title: true, description: true, amount: true, paymentMethod: true, status: true, expenseDate: true, createdAt: true },
      orderBy: { expenseDate: 'desc' },
      take: 200,
    });
  }

  private async category(tenantId: string) {
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: CATEGORY.name } },
      update: {},
      create: { tenantId, ...CATEGORY },
      select: { id: true },
    });
    return made.id;
  }
}
