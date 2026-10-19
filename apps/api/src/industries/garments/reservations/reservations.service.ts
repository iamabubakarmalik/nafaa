/**
 * Holds: a piece kept aside for a customer for a few days, usually with a
 * deposit. The deposit goes on the customer's khata the day it is taken;
 * "Sell" makes the bill (stock leaves, the deposit pays part of it).
 * Cancelled or expired holds leave the deposit on the khata as an advance.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GarmentReservationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, readShopStock } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ensureCustomer, paidOnKhata, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { DAY_MS, findBill, garmentClock, opt, ownCustomer, ownProduct, paging, parseDay, r2, withNextNumber } from '../common/garments-common';
import { billHeldGoods } from '../common/held-goods';
import { CreateReservationDto, SellReservationDto } from './dto/reservation.dto';

type Db = Prisma.TransactionClient;
const VIEWS = ['active', 'today', 'expired', 'sold', 'cancelled', 'all'] as const;
type View = (typeof VIEWS)[number];

export interface ReservationQuery { view?: string; page?: string; limit?: string; search?: string; productId?: string }

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly sales: SalesService,
  ) {}

  private get db() { return this.prisma as unknown as Db; }

  /** Pieces of a product/variant already held in a branch. */
  private async held(shopId: string, productId: string, variantId: string | null, exceptId?: string) {
    const agg = await this.prisma.garmentReservation.aggregate({
      where: { shopId, productId, variantId, status: 'ACTIVE', expiresAt: { gt: new Date() }, ...(exceptId && { id: { not: exceptId } }) },
      _sum: { quantity: true },
    });
    return Number(agg._sum.quantity ?? 0);
  }

  async create(user: AuthenticatedUser, dto: CreateReservationDto, activeShopId?: string | null) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const customer = await ownCustomer(this.db, user, opt(dto.customerId));
    const name = opt(dto.customerName) ?? customer?.name;
    if (!name) throw new BadRequestException('Customer ka naam likhein');
    const { product, variant } = await ownProduct(this.db, user, dto.productId, opt(dto.variantId));
    if (product.hasVariants && !variant) throw new BadRequestException(`${product.name} — size/rang chunein`);
    const quantity = Math.max(Math.floor(dto.quantity ?? 1), 1);
    const unitPrice = r2(dto.unitPrice ?? variant?.price ?? product.price);
    const deposit = r2(dto.depositAmount ?? 0);
    if (deposit > unitPrice * quantity + 0.01) throw new BadRequestException('Deposit kul amount se zyada nahi ho sakta');
    const shopId = await resolveIndustryShopId(this.db, user, dto.shopId || activeShopId);

    const stock = await readShopStock(this.prisma, shopId, product.id, variant?.id ?? null);
    const held = await this.held(shopId, product.id, variant?.id ?? null);
    if (stock - held < quantity) {
      throw new BadRequestException(`Is branch me ${Math.max(stock - held, 0)} hi khaali hain${held ? ` (${held} pehle se hold par)` : ''}`);
    }
    const expiresAt = parseDay(clock, dto.expiresAt)
      ?? new Date(clock.today().lt.getTime() + ((dto.holdDays ?? 7) - 1) * DAY_MS - 1);

    const r = await withNextNumber(
      async (prefix) => (await this.prisma.garmentReservation.findFirst({
        where: { tenantId: user.tenantId, reservationNumber: { startsWith: prefix } },
        orderBy: { reservationNumber: 'desc' }, select: { reservationNumber: true },
      }))?.reservationNumber,
      `RES-${clock.year()}-`,
      (reservationNumber) => this.prisma.$transaction(async (tx) => {
        const customerId = deposit > 0 || customer
          ? await ensureCustomer(tx, user, { customerId: customer?.id, name, phone: dto.customerPhone, shopId })
          : null;
        const created = await tx.garmentReservation.create({
          data: {
            tenantId: user.tenantId, shopId, reservationNumber, customerId,
            productId: product.id, variantId: variant?.id ?? null,
            customerName: name, customerPhone: opt(dto.customerPhone) ?? customer?.phone ?? undefined,
            quantity, unitPrice, depositAmount: deposit, expiresAt, notes: opt(dto.notes), createdById: user.id,
          },
        });
        if (deposit > 0 && customerId) {
          await recordKhataPayment(tx, user, {
            customerId, shopId, amount: deposit, reference: reservationNumber, note: `Hold deposit ${reservationNumber}`, method: dto.paymentMethod,
          });
        }
        return created;
      }),
    );
    return this.getOne(user, r.id);
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; productId?: string }) {
    return this.prisma.garmentReservation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as GarmentReservationStatus }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.productId && { productId: params.productId }),
      },
      orderBy: { expiresAt: 'asc' },
      take: 200,
    });
  }

  /** One page of holds for a view, with counts and money. Holds past their date show as expired. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: ReservationQuery) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const view: View = VIEWS.includes(q.view as View) ? (q.view as View) : 'active';
    const { page, limit, skip } = paging(q);
    const now = new Date();
    const today = clock.today();
    const s = q.search?.trim();
    const base: Prisma.GarmentReservationWhereInput = {
      tenantId: user.tenantId,
      ...(q.productId && { productId: q.productId }),
      AND: [scope.whereLoose, s ? { OR: [
        { reservationNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerPhone: { contains: s } },
      ] } : {}],
    };
    const where: Record<View, Prisma.GarmentReservationWhereInput> = {
      active: { ...base, status: 'ACTIVE', expiresAt: { gt: now } },
      today: { ...base, status: 'ACTIVE', expiresAt: { gt: now, lt: today.lt } },
      expired: { ...base, OR: [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiresAt: { lte: now } }] },
      sold: { ...base, status: 'CONVERTED_TO_SALE' },
      cancelled: { ...base, status: 'CANCELLED' },
      all: base,
    };
    const [rows, total, counts, held] = await Promise.all([
      this.prisma.garmentReservation.findMany({
        where: where[view],
        orderBy: view === 'active' || view === 'today' ? { expiresAt: 'asc' } : { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.garmentReservation.count({ where: where[view] }),
      Promise.all(VIEWS.map((v) => this.prisma.garmentReservation.count({ where: where[v] }))),
      this.prisma.garmentReservation.findMany({ where: where.active, select: { quantity: true, unitPrice: true, depositAmount: true }, take: 5000 }),
    ]);
    const names = await this.productNames(user, rows);
    return {
      items: rows.map((r) => this.decorate(r, names, now)),
      total, page, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(VIEWS.map((v, i) => [v, counts[i]])),
      totals: {
        pieces: held.reduce((s2, r) => s2 + r.quantity, 0),
        value: r2(held.reduce((s2, r) => s2 + r.quantity * r.unitPrice, 0)),
        deposits: r2(held.reduce((s2, r) => s2 + r.depositAmount, 0)),
      },
    };
  }

  private decorate<T extends { productId: string; variantId: string | null; status: GarmentReservationStatus; expiresAt: Date; quantity: number; unitPrice: number; depositAmount: number }>(
    r: T, names: Map<string, string>, now: Date,
  ) {
    return {
      ...r,
      // A hold past its date is expired even before the nightly sweep marks it.
      status: r.status === 'ACTIVE' && r.expiresAt <= now ? ('EXPIRED' as GarmentReservationStatus) : r.status,
      productName: names.get(`${r.productId}:${r.variantId ?? ''}`) ?? names.get(`${r.productId}:`) ?? null,
      total: r2(r.quantity * r.unitPrice),
      balance: r2(Math.max(r.quantity * r.unitPrice - r.depositAmount, 0)),
    };
  }

  private async productNames(user: AuthenticatedUser, rows: Array<{ productId: string; variantId: string | null }>) {
    const ids = [...new Set(rows.map((r) => r.productId))];
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
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Hold nahi mila');
    const [names, bill] = await Promise.all([this.productNames(user, [r]), findBill(this.db, user.tenantId, r.reservationNumber)]);
    return { ...this.decorate(r, names, new Date()), bill };
  }

  /** Customer came back: the bill is made here, the deposit on khata pays part of it. */
  async sell(user: AuthenticatedUser, id: string, dto: SellReservationDto) {
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Hold nahi mila');
    if (r.status === 'CONVERTED_TO_SALE') return this.getOne(user, id);
    if (r.status === 'CANCELLED') throw new BadRequestException('Cancel shuda hold bechi nahi ja sakti — nayi sale POS se karein');
    const total = r2(r.quantity * r.unitPrice);
    const deposit = r2(r.depositAmount);
    const balance = r2(Math.max(total - deposit, 0));
    const paidNow = r2(Math.max(dto.paidNow ?? balance, 0));
    if (paidNow > balance + 0.01) throw new BadRequestException(`Baqi sirf Rs ${balance} hai`);
    const shopId = await resolveIndustryShopId(this.db, user, r.shopId);
    let customerId = r.customerId;
    if (!customerId && paidNow < balance - 0.01) {
      customerId = await ensureCustomer(this.db, user, { name: r.customerName, phone: r.customerPhone, shopId });
    }
    const legacyPaid = r2(Math.max(deposit - (await paidOnKhata(this.db, user.tenantId, r.reservationNumber)), 0));
    const sale = await billHeldGoods(this.db, this.sales, user, {
      ref: r.reservationNumber, shopId, customerId, productId: r.productId, variantId: r.variantId,
      quantity: r.quantity, amount: total, paidAmount: r2(paidNow + legacyPaid), method: dto.paymentMethod,
      note: `Hold ${r.reservationNumber}`,
    });
    await this.prisma.garmentReservation.update({
      where: { id },
      data: { status: 'CONVERTED_TO_SALE', convertedSaleId: sale.id, customerId },
    });
    return this.getOne(user, id);
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Hold nahi mila');
    if (r.status === 'CONVERTED_TO_SALE') throw new BadRequestException('Ye hold bik chuka — bill ki Return karein');
    if (r.status === 'CANCELLED') return this.getOne(user, id);
    // The deposit stays on the customer's khata as their advance.
    await this.prisma.garmentReservation.update({
      where: { id },
      data: { status: 'CANCELLED', notes: [r.notes, opt(reason) && `Cancel: ${reason!.trim()}`].filter(Boolean).join('\n') || null },
    });
    return this.getOne(user, id);
  }

  /** Links a bill already made at the POS to the hold. */
  async convert(user: AuthenticatedUser, id: string, saleId: string) {
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Hold nahi mila');
    if (r.status !== 'ACTIVE' && r.status !== 'EXPIRED') throw new BadRequestException('Ye hold band ho chuka hai');
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId: user.tenantId, status: { not: 'VOIDED' }, items: { some: { productId: r.productId } } },
      select: { id: true },
    });
    if (!sale) throw new BadRequestException('Is bill me hold wala product nahi');
    await this.prisma.garmentReservation.update({ where: { id }, data: { status: 'CONVERTED_TO_SALE', convertedSaleId: sale.id } });
    return this.getOne(user, id);
  }

  /** Gives a hold more days (also brings back one that just expired). */
  async extend(user: AuthenticatedUser, id: string, days: number) {
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Hold nahi mila');
    if (r.status !== 'ACTIVE' && r.status !== 'EXPIRED') throw new BadRequestException('Ye hold band ho chuka hai');
    const from = Math.max(r.expiresAt.getTime(), Date.now());
    await this.prisma.garmentReservation.update({ where: { id }, data: { status: 'ACTIVE', expiresAt: new Date(from + days * DAY_MS) } });
    return this.getOne(user, id);
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.garmentReservation.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }
}
