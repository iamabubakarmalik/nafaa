import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MeatSubscriptionFreq, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { addDaysTz, dayKey, dayStart, parseDay, tzParts } from '../meat-common';
import { mustChange, positive, r2, r3, str, withNextNumber } from '../meat-money';
import { SUB_PREFIX, WeightOrdersService } from '../weight-orders/weight-orders.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
type Body = any;

const FREQ: MeatSubscriptionFreq[] = ['DAILY', 'ALTERNATE_DAY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
const DELIVERIES_PER_MONTH: Record<string, number> = { DAILY: 30, ALTERNATE_DAY: 15, WEEKLY: 4.3, BIWEEKLY: 2.15, MONTHLY: 1, CUSTOM: 4.3 };

interface StandardItem { productId: string; productName: string; kg: number }

/** Next delivery after `from` on shop time. */
function nextDate(from: Date, frequency: string): Date {
  if (frequency === 'MONTHLY') {
    const p = tzParts(from);
    const y = p.month === 12 ? p.year + 1 : p.year;
    const m = p.month === 12 ? 1 : p.month + 1;
    return dayStart(`${y}-${String(m).padStart(2, '0')}-${String(Math.min(p.day, 28)).padStart(2, '0')}`);
  }
  const days = frequency === 'DAILY' ? 1 : frequency === 'ALTERNATE_DAY' ? 2 : frequency === 'BIWEEKLY' ? 14 : 7;
  return dayStart(addDaysTz(from, days));
}

const items = (v: unknown): StandardItem[] => (Array.isArray(v) ? (v as StandardItem[]) : []);

/**
 * Regular supply: a hotel's daily chicken, a family's weekly mutton. Each
 * delivery becomes a normal weight order (prices of that day, the agreed
 * discount), billed through the order flow, so money and stock follow the
 * bill; the subscription counts deliveries when that bill is made.
 */
@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService, private readonly orders: WeightOrdersService) {}

  async create(user: AuthenticatedUser, dto: Body) {
    const data = await this.fields(user, dto, true);
    const startDate = parseDay(dto?.startDate) ?? dayStart();
    const year = dayKey().slice(0, 4);
    return withNextNumber(
      async (prefix) => (await this.prisma.meatSubscription.findFirst({ where: { tenantId: user.tenantId, subscriptionNumber: { startsWith: prefix } }, orderBy: { subscriptionNumber: 'desc' }, select: { subscriptionNumber: true } }))?.subscriptionNumber,
      `SUB-${year}-`, 4,
      (subscriptionNumber) => this.prisma.meatSubscription.create({
        data: {
          ...(data as Prisma.MeatSubscriptionUncheckedCreateInput),
          tenantId: user.tenantId, subscriptionNumber, startDate, nextDeliveryDate: startDate, status: 'ACTIVE',
        },
      }),
    );
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; frequency?: string; search?: string }) {
    const s = params.search?.trim();
    return this.prisma.meatSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.frequency && FREQ.includes(params.frequency as MeatSubscriptionFreq) && { frequency: params.frequency as MeatSubscriptionFreq }),
        ...(s && { OR: [{ subscriptionNumber: { contains: s, mode: 'insensitive' } }, { contactPerson: { contains: s, mode: 'insensitive' } }, { contactPhone: { contains: s } }, { deliveryAddress: { contains: s, mode: 'insensitive' } }] }),
      },
      orderBy: [{ status: 'asc' }, { nextDeliveryDate: 'asc' }],
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.meatSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription nahi mili');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const s = await this.getOne(user, id);
    if (s.status === 'CANCELLED') throw new BadRequestException('Band subscription badli nahi ja sakti');
    const data = await this.fields(user, dto, false);
    const done = await this.prisma.meatSubscription.updateMany({ where: { id, tenantId: user.tenantId, updatedAt: s.updatedAt }, data: data as Prisma.MeatSubscriptionUpdateManyMutationInput });
    mustChange(done.count);
    return this.getOne(user, id);
  }

  async pause(user: AuthenticatedUser, id: string, reason?: string) {
    const s = await this.getOne(user, id);
    if (s.status !== 'ACTIVE') throw new BadRequestException('Sirf chalti subscription rok sakte hain');
    return this.prisma.meatSubscription.update({ where: { id }, data: { status: 'PAUSED', pausedAt: new Date(), pauseReason: str(reason, 300) } });
  }

  async resume(user: AuthenticatedUser, id: string) {
    const s = await this.getOne(user, id);
    if (s.status !== 'PAUSED') throw new BadRequestException('Sirf ruki hui subscription dobara chalti hai');
    return this.prisma.meatSubscription.update({ where: { id }, data: { status: 'ACTIVE', pausedAt: null, pauseReason: null, nextDeliveryDate: dayStart() } });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const s = await this.getOne(user, id);
    if (s.status === 'CANCELLED') return s;
    return this.prisma.meatSubscription.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: str(reason, 300) } });
  }

  /** Today's delivery as a weight order at today's rates; the next date moves on. */
  async deliver(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const s = await this.getOne(user, id);
    if (s.status !== 'ACTIVE') throw new BadRequestException('Sirf chalti subscription ka order banta hai');
    const list = items(s.standardItems);
    if (!list.length) throw new BadRequestException('Subscription me koi item nahi — pehle items likhein');
    const open = await this.prisma.meatWeightOrder.findFirst({
      where: { tenantId: user.tenantId, occasion: `${SUB_PREFIX}${s.subscriptionNumber}`, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      select: { orderNumber: true },
    });
    if (open) throw new BadRequestException(`Is subscription ka order ${open.orderNumber} abhi khula hai — pehle wo de dein`);
    const products = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: list.map((i) => i.productId) }, isActive: true }, select: { id: true, price: true } });
    const price = new Map(products.map((p) => [p.id, p.price]));
    const subtotal = list.reduce((sum, i) => sum + i.kg * (price.get(i.productId) ?? 0), 0);
    const order = await this.orders.create(user, scope, {
      customerId: s.customerId, customerName: s.contactPerson, customerPhone: s.contactPhone,
      isDelivery: true, deliveryAddress: s.deliveryAddress, neededBy: dayKey(), occasion: `${SUB_PREFIX}${s.subscriptionNumber}`,
      specialInstructions: s.deliveryTimeSlot ? `Waqt: ${s.deliveryTimeSlot}` : undefined,
      discount: r2((subtotal * s.discountPct) / 100),
      items: list.map((i) => ({ productId: i.productId, requestedKg: i.kg })),
    });
    await this.prisma.meatSubscription.update({ where: { id }, data: { nextDeliveryDate: nextDate(new Date(), s.frequency) } });
    return order;
  }

  /** Validated subscription fields from a form. */
  private async fields(user: AuthenticatedUser, dto: Body, creating: boolean) {
    const out: Record<string, unknown> = {};
    if (creating || dto?.customerId !== undefined) {
      const c = await this.prisma.customer.findFirst({ where: { id: String(dto?.customerId ?? ''), tenantId: user.tenantId }, select: { id: true, name: true, phone: true } });
      if (!c) throw new BadRequestException('Customer chunein');
      out.customerId = c.id;
      if (creating && !str(dto?.contactPerson)) out.contactPerson = c.name;
      if (creating && !str(dto?.contactPhone)) out.contactPhone = c.phone;
    }
    if (creating || dto?.frequency !== undefined) {
      if (!FREQ.includes(dto?.frequency)) throw new BadRequestException('Kitni dafa — chunein');
      out.frequency = dto.frequency;
    }
    if (creating || dto?.deliveryAddress !== undefined) {
      const a = str(dto?.deliveryAddress, 1000);
      if (!a) throw new BadRequestException('Delivery ka pata likhein');
      out.deliveryAddress = a;
    }
    if (creating || dto?.standardItems !== undefined) {
      const raw = Array.isArray(dto?.standardItems) ? dto.standardItems : [];
      if (!raw.length) throw new BadRequestException('Kam se kam ek item aur us ke kg likhein');
      const ids = raw.map((r: Body) => String(r?.productId ?? ''));
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Ek item do baar likha hai');
      const products = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids }, isActive: true }, select: { id: true, name: true, price: true } });
      const P = new Map(products.map((p) => [p.id, p]));
      const list: StandardItem[] = raw.map((r: Body, i: number) => {
        const p = P.get(String(r?.productId));
        if (!p) throw new BadRequestException(`Line ${i + 1}: item nahi mila`);
        return { productId: p.id, productName: p.name, kg: r3(positive(r?.kg, `${p.name}: kitne kg — likhein`)) };
      });
      const freq = String(out.frequency ?? dto?.frequency ?? 'WEEKLY');
      const perDelivery = list.reduce((s, i) => s + i.kg * (P.get(i.productId)?.price ?? 0), 0);
      out.standardItems = list as unknown as Prisma.InputJsonValue;
      out.totalMonthlyKg = r3(list.reduce((s, i) => s + i.kg, 0) * (DELIVERIES_PER_MONTH[freq] ?? 4.3));
      out.monthlyEstimate = r2(perDelivery * (DELIVERIES_PER_MONTH[freq] ?? 4.3));
    }
    if (dto?.discountPct !== undefined) {
      const d = Number(dto.discountPct) || 0;
      if (d < 0 || d > 50) throw new BadRequestException('Discount 0 se 50% tak');
      out.discountPct = r2(d);
    }
    for (const k of ['deliveryTimeSlot', 'contactPerson', 'contactPhone', 'notes'] as const) if (dto?.[k] !== undefined) out[k] = str(dto[k], 500);
    if (dto?.endDate !== undefined) out.endDate = parseDay(dto.endDate);
    if (dto?.autoRenew !== undefined) out.autoRenew = !!dto.autoRenew;
    return out;
  }
}
