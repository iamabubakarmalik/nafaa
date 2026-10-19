/**
 * Layaway (qist) plans: a garment kept aside and paid in instalments.
 * Every rupee taken sits on the customer's khata until the plan is paid
 * off; the last payment makes the bill, and the garment leaves stock then.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GarmentLayawayStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { DAY_MS, findBill, garmentClock, opt, ownCustomer, ownProduct, paging, parseDay, payStatus, r2, withNextNumber } from '../common/garments-common';
import { billHeldGoods } from '../common/held-goods';
import { CreateLayawayDto, PayInstallmentDto } from './dto/layaway.dto';

type Db = Prisma.TransactionClient;
const VIEWS = ['active', 'overdue', 'week', 'completed', 'cancelled', 'all'] as const;
type View = (typeof VIEWS)[number];
const STEP_DAYS: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };

export interface LayawayQuery { view?: string; page?: string; limit?: string; search?: string }

@Injectable()
export class LayawayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly sales: SalesService,
  ) {}

  private get db() { return this.prisma as unknown as Db; }

  async create(user: AuthenticatedUser, dto: CreateLayawayDto, activeShopId?: string | null) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const total = r2(dto.totalAmount);
    const count = Math.floor(dto.installmentCount);
    const customer = await ownCustomer(this.db, user, opt(dto.customerId));
    const name = opt(dto.customerName) ?? customer?.name;
    if (!name) throw new BadRequestException('Customer ka naam zaroori hai');
    if (opt(dto.productId)) {
      const { product } = await ownProduct(this.db, user, dto.productId!, opt(dto.variantId));
      if (product.hasVariants && !opt(dto.variantId)) throw new BadRequestException(`${product.name} — size/rang chunein`);
    }
    if (opt(dto.tailoringOrderId)) {
      const o = await this.prisma.garmentTailoringOrder.findFirst({ where: { id: dto.tailoringOrderId, tenantId: user.tenantId }, select: { id: true } });
      if (!o) throw new NotFoundException('Silai order nahi mila');
    }
    const deposit = r2(Math.max(dto.depositAmount ?? 0, 0));
    if (deposit > total - 0.01) throw new BadRequestException('Deposit kul amount se kam hona chahiye — poora paisa ho to seedha bill banayein');
    const remaining = r2(total - deposit);
    // Equal instalments in whole rupees; the last one takes the rounding.
    const each = Math.floor(remaining / count);
    const amounts = Array.from({ length: count }, (_, i) => (i === count - 1 ? r2(remaining - each * (count - 1)) : each));
    const frequency = dto.frequency ?? 'MONTHLY';
    const step = STEP_DAYS[frequency] ?? 30;
    const startDate = parseDay(clock, dto.startDate) ?? clock.today().gte;
    // Monthly plans fall on the same date each month (the 31st becomes the month's last day).
    const startKey = clock.keyOf(startDate);
    const dueOn = (i: number) => {
      if (frequency !== 'MONTHLY') return new Date(startDate.getTime() + step * i * DAY_MS);
      const [y, m, d] = startKey.split('-').map(Number);
      const first = new Date(Date.UTC(y, m - 1 + i, 1));
      const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      const key = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
      return clock.dayStart(key);
    };
    const shopId = await resolveIndustryShopId(this.db, user, dto.shopId || activeShopId);

    const plan = await withNextNumber(
      async (prefix) => (await this.prisma.garmentLayawayPlan.findFirst({
        where: { tenantId: user.tenantId, planNumber: { startsWith: prefix } },
        orderBy: { planNumber: 'desc' }, select: { planNumber: true },
      }))?.planNumber,
      `LAY-${clock.year()}-`,
      (planNumber) => this.prisma.$transaction(async (tx) => {
        const customerId = await ensureCustomer(tx, user, { customerId: customer?.id, name, phone: dto.customerPhone, shopId });
        const created = await tx.garmentLayawayPlan.create({
          data: {
            tenantId: user.tenantId, shopId, planNumber, customerId,
            customerName: name, customerPhone: opt(dto.customerPhone) ?? customer?.phone ?? undefined,
            productId: opt(dto.productId), variantId: opt(dto.variantId), tailoringOrderId: opt(dto.tailoringOrderId),
            totalAmount: total, depositAmount: deposit, paidAmount: deposit, remainingAmount: remaining,
            installmentCount: count, installmentAmount: amounts[0], frequency, startDate,
            nextDueDate: dueOn(1), finalDueDate: dueOn(count), notes: opt(dto.notes), createdById: user.id,
          },
        });
        await tx.garmentLayawayInstallment.createMany({
          data: amounts.map((amount, i) => ({ planId: created.id, installmentNo: i + 1, dueDate: dueOn(i + 1), amount })),
        });
        if (deposit > 0) {
          await recordKhataPayment(tx, user, {
            customerId, shopId, amount: deposit, reference: planNumber, note: `Layaway deposit ${planNumber}`, method: dto.paymentMethod,
          });
        }
        return created;
      }),
    );
    return this.getOne(user, plan.id);
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string }) {
    return this.prisma.garmentLayawayPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as GarmentLayawayStatus }),
        ...(params.customerId && { customerId: params.customerId }),
      },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
      orderBy: { nextDueDate: 'asc' },
      take: 200,
    });
  }

  /** One page of plans for a view, with counts and money. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: LayawayQuery) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const view: View = VIEWS.includes(q.view as View) ? (q.view as View) : 'active';
    const { page, limit, skip } = paging(q);
    const s = q.search?.trim();
    const today = clock.today();
    const week = new Date(today.lt.getTime() + 7 * DAY_MS);
    const base: Prisma.GarmentLayawayPlanWhereInput = {
      tenantId: user.tenantId,
      AND: [scope.whereLoose, s ? { OR: [
        { planNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerPhone: { contains: s } },
        { notes: { contains: s, mode: 'insensitive' } },
      ] } : {}],
    };
    const where: Record<View, Prisma.GarmentLayawayPlanWhereInput> = {
      active: { ...base, status: 'ACTIVE' },
      overdue: { ...base, status: 'ACTIVE', nextDueDate: { lt: today.gte } },
      week: { ...base, status: 'ACTIVE', nextDueDate: { gte: today.gte, lt: week } },
      completed: { ...base, status: 'COMPLETED' },
      cancelled: { ...base, status: { in: ['CANCELLED', 'DEFAULTED', 'REFUNDED'] } },
      all: base,
    };
    const [items, total, counts, money] = await Promise.all([
      this.prisma.garmentLayawayPlan.findMany({
        where: where[view],
        include: { installments: { orderBy: { installmentNo: 'asc' } } },
        orderBy: view === 'completed' || view === 'all' || view === 'cancelled' ? { createdAt: 'desc' } : { nextDueDate: 'asc' },
        skip, take: limit,
      }),
      this.prisma.garmentLayawayPlan.count({ where: where[view] }),
      Promise.all(VIEWS.map((v) => this.prisma.garmentLayawayPlan.count({ where: where[v] }))),
      this.prisma.garmentLayawayPlan.aggregate({ where: where.active, _sum: { remainingAmount: true, paidAmount: true, totalAmount: true } }),
    ]);
    const products = await this.productNames(user, items);
    return {
      items: items.map((p) => ({ ...p, productName: p.productId ? products.get(`${p.productId}:${p.variantId ?? ''}`) ?? null : null })),
      total, page, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(VIEWS.map((v, i) => [v, counts[i]])),
      totals: { remaining: r2(money._sum.remainingAmount ?? 0), paid: r2(money._sum.paidAmount ?? 0), value: r2(money._sum.totalAmount ?? 0) },
    };
  }

  private async productNames(user: AuthenticatedUser, plans: Array<{ productId: string | null; variantId: string | null }>) {
    const ids = [...new Set(plans.map((p) => p.productId).filter((x): x is string => !!x))];
    const map = new Map<string, string>();
    if (!ids.length) return map;
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: ids } },
      select: { id: true, name: true, variants: { select: { id: true, name: true } } },
    });
    for (const p of products) {
      map.set(`${p.id}:`, p.name);
      for (const v of p.variants) map.set(`${p.id}:${v.id}`, `${p.name} (${v.name})`);
    }
    return map;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    const [names, bill] = await Promise.all([this.productNames(user, [plan]), findBill(this.db, user.tenantId, plan.planNumber)]);
    return { ...plan, productName: plan.productId ? names.get(`${plan.productId}:${plan.variantId ?? ''}`) ?? null : null, bill };
  }

  /** Pays the given instalment (kept for older screens); the money fills unpaid instalments in order. */
  payInstallment(user: AuthenticatedUser, planId: string, _installmentId: string, dto: PayInstallmentDto) {
    return this.pay(user, planId, dto);
  }

  /** Takes money on a plan: fills unpaid instalments in order; the last rupee makes the bill. */
  async pay(user: AuthenticatedUser, planId: string, dto: PayInstallmentDto) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({ where: { id: planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    if (plan.status !== 'ACTIVE') throw new BadRequestException('Yeh plan band ho chuka hai');
    const amount = r2(dto.amount);
    if (amount > r2(plan.remainingAmount) + 0.01) throw new BadRequestException(`Baqi sirf Rs ${r2(plan.remainingAmount)} hai`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const unpaid = await tx.garmentLayawayInstallment.findMany({
        where: { planId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        orderBy: { installmentNo: 'asc' },
      });
      let left = amount;
      for (const inst of unpaid) {
        if (left <= 0.001) break;
        const room = r2(inst.amount - inst.paidAmount);
        const take = r2(Math.min(room, left));
        if (take <= 0) continue;
        const paid = r2(inst.paidAmount + take);
        await tx.garmentLayawayInstallment.update({
          where: { id: inst.id },
          data: {
            paidAmount: paid, status: payStatus(paid, inst.amount), paidAt: new Date(),
            paymentMethod: dto.paymentMethod, reference: opt(dto.reference), notes: opt(dto.notes),
          },
        });
        left = r2(left - take);
      }

      const shopId = await resolveIndustryShopId(tx, user, plan.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: plan.customerId, name: plan.customerName, phone: plan.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: plan.planNumber, note: `Layaway qist ${plan.planNumber}`, method: dto.paymentMethod,
      });
      const planPaid = r2(plan.paidAmount + amount);
      const planRemaining = r2(Math.max(plan.totalAmount - planPaid, 0));
      const nextUnpaid = await tx.garmentLayawayInstallment.findFirst({
        where: { planId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        orderBy: { installmentNo: 'asc' },
      });
      return tx.garmentLayawayPlan.update({
        where: { id: planId },
        data: { customerId, shopId, paidAmount: planPaid, remainingAmount: planRemaining, nextDueDate: planRemaining <= 0.01 ? null : nextUnpaid?.dueDate ?? null },
      });
    });

    if (updated.remainingAmount <= 0.01) await this.finish(user, updated.id, dto.paymentMethod);
    return this.getOne(user, planId);
  }

  /** Paid-off plan → bill and hand-over. Safe to call again if the bill step failed earlier. */
  async complete(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    if (plan.status !== 'ACTIVE' || plan.remainingAmount > 0.01) throw new BadRequestException('Plan ka paisa abhi poora nahi hua');
    await this.finish(user, id);
    return this.getOne(user, id);
  }

  private async finish(user: AuthenticatedUser, id: string, method?: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirstOrThrow({ where: { id, tenantId: user.tenantId } });
    const shopId = await resolveIndustryShopId(this.db, user, plan.shopId);
    // Money recorded before khata posting existed counts as paid with the bill.
    const legacyPaid = r2(Math.max(plan.paidAmount - (await paidOnKhata(this.db, user.tenantId, plan.planNumber)), 0));
    const label = `Layaway ${plan.planNumber}${plan.notes ? ` — ${plan.notes}` : ''}`;
    if (plan.productId) {
      await billHeldGoods(this.db, this.sales, user, {
        ref: plan.planNumber, shopId, customerId: plan.customerId, productId: plan.productId, variantId: plan.variantId,
        quantity: 1, amount: plan.totalAmount, paidAmount: legacyPaid, method, note: label,
      });
    } else {
      await this.prisma.$transaction((tx) => postIndustrySale(tx, user, {
        saleNumber: plan.planNumber, sourceRef: plan.planNumber, shopId, customerId: plan.customerId,
        lines: [{ label, amount: r2(plan.totalAmount) }], paidAmount: legacyPaid, paymentMethod: method,
      }));
    }
    await this.prisma.garmentLayawayPlan.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), nextDueDate: null } });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.prisma.garmentLayawayPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    if (plan.status !== 'ACTIVE') throw new BadRequestException(plan.status === 'COMPLETED' ? 'Poora plan cancel nahi ho sakta — bill ki Return karein' : 'Plan pehle hi band hai');
    // Money already taken stays on the customer's khata as their advance.
    await this.prisma.garmentLayawayPlan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: opt(reason), nextDueDate: null },
    });
    return this.getOne(user, id);
  }
}
