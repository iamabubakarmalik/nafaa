/**
 * Digital cards (PSN, PUBG UC, Google Play…): stock-in one by one or in a
 * batch, sold at the counter through the shared POS (one product per card
 * kind, so a bill can carry cards, snacks and station time and be paid in
 * parts), and handed over by code once the bill is saved.
 *
 * Unsold codes are never sent to the screen; a sold card shows its code
 * again so it can be re-sent to the customer. A wrong card is taken off
 * stock (marked "hata diya"), never deleted, because its number may be on
 * a bill.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { BILL_PREFIX, TOPUP_SKU_PREFIX, r2, syncTopupProduct, topupName, topupSku } from '../common/gaming-catalog';
import { BulkCreateTopupDto, CreateTopupDto, SellTopupDto } from './dto/create-topup.dto';

/** Note on a card taken off stock by hand. */
const REMOVED = 'Hata diya';

type Card = Prisma.GamingDigitalTopupGetPayload<object>;

const masked = (t: Card) => (t.soldAt ? t : { ...t, cardCode: t.cardCode ? '••••••••' : null, cardPin: t.cardPin ? '••••' : null });

@Injectable()
export class DigitalTopupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumbers(db: Prisma.TransactionClient, tenantId: string, count: number) {
    // Follows the last number: a removed card never frees its number, because a bill may carry it.
    const prefix = `TOP-${new Date().getFullYear()}-`;
    const last = await db.gamingDigitalTopup.findFirst({
      where: { tenantId, topupNumber: { startsWith: prefix } },
      orderBy: { topupNumber: 'desc' },
      select: { topupNumber: true },
    });
    const from = (last ? Number(last.topupNumber.slice(prefix.length)) || 0 : 0) + 1;
    return Array.from({ length: count }, (_, i) => prefix + String(from + i).padStart(5, '0'));
  }

  private checkPrices(cost: number, sell: number, value: number) {
    if (!(value > 0)) throw new BadRequestException('Card ki value likhein (jaise 660 UC, 10 USD)');
    if (!(cost >= 0)) throw new BadRequestException('Cost manfi nahi ho sakti');
    if (!(sell > 0)) throw new BadRequestException('Bechne ka rate likhein');
  }

  async create(user: AuthenticatedUser, dto: CreateTopupDto) {
    this.checkPrices(dto.costPrice, dto.sellingPrice, dto.denominationValue);
    return this.prisma.$transaction(async (tx) => {
      const [topupNumber] = await this.nextNumbers(tx, user.tenantId, 1);
      const card = await tx.gamingDigitalTopup.create({
        data: {
          tenantId: user.tenantId,
          topupNumber,
          ...dto,
          topupType: dto.topupType.trim(),
          denominationCurrency: dto.denominationCurrency ?? 'USD',
          profit: r2(dto.sellingPrice - dto.costPrice),
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
      });
      await syncTopupProduct(tx, user.tenantId, card);
      return masked(card);
    });
  }

  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateTopupDto) {
    this.checkPrices(dto.costPrice, dto.sellingPrice, dto.denominationValue);
    const cards = (dto.cards ?? []).map((c) => ({ cardCode: String(c?.cardCode ?? '').trim(), cardPin: c?.cardPin?.trim() || undefined, cardSerial: c?.cardSerial?.trim() || undefined }));
    if (!cards.length) throw new BadRequestException('Kam se kam ek card code likhein');
    if (cards.length > 500) throw new BadRequestException('Ek baar me 500 se zyada card nahi');
    if (cards.some((c) => !c.cardCode)) throw new BadRequestException('Har card ka code likhein');
    const codes = cards.map((c) => c.cardCode);
    if (new Set(codes).size !== codes.length) throw new BadRequestException('Ek hi code do baar likha hai');
    const dup = await this.prisma.gamingDigitalTopup.findFirst({ where: { tenantId: user.tenantId, cardCode: { in: codes } }, select: { cardCode: true } });
    if (dup) throw new BadRequestException(`Code ${dup.cardCode} pehle se stock me hai`);

    return this.prisma.$transaction(async (tx) => {
      const numbers = await this.nextNumbers(tx, user.tenantId, cards.length);
      const topupType = dto.topupType.trim();
      await tx.gamingDigitalTopup.createMany({
        data: cards.map((c, i) => ({
          tenantId: user.tenantId,
          topupNumber: numbers[i],
          provider: dto.provider,
          topupType,
          denominationValue: dto.denominationValue,
          costPrice: dto.costPrice,
          sellingPrice: dto.sellingPrice,
          profit: r2(dto.sellingPrice - dto.costPrice),
          ...c,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          supplierRef: dto.supplierRef,
        })),
      });
      await syncTopupProduct(tx, user.tenantId, { provider: dto.provider, topupType, denominationValue: dto.denominationValue });
      return { created: cards.length, from: numbers[0], to: numbers[numbers.length - 1] };
    }, { timeout: 30_000 });
  }

  async list(user: AuthenticatedUser, params: { provider?: string; redeemed?: boolean; available?: boolean; status?: string; search?: string; page?: number; limit?: number }) {
    const where: Prisma.GamingDigitalTopupWhereInput = {
      tenantId: user.tenantId,
      ...(params.provider && { provider: params.provider as any }),
      ...(params.redeemed !== undefined && { isRedeemed: params.redeemed }),
      ...(params.available === true && { isRedeemed: false, soldAt: null }),
      ...(params.status === 'available' && { isRedeemed: false, soldAt: null }),
      ...(params.status === 'sold' && { soldAt: { not: null } }),
      ...(params.status === 'removed' && { soldAt: null, isRedeemed: true }),
      ...(params.search && {
        OR: [
          { topupNumber: { contains: params.search, mode: 'insensitive' } },
          { cardSerial: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { deliveryReference: { contains: params.search, mode: 'insensitive' } },
          { topupType: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
    if (!params.page) {
      const rows = await this.prisma.gamingDigitalTopup.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
      return rows.map(masked);
    }
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const [items, total] = await Promise.all([
      this.prisma.gamingDigitalTopup.findMany({ where, orderBy: [{ soldAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.gamingDigitalTopup.count({ where }),
    ]);
    return { items: items.map(masked), total, page, limit };
  }

  async availableInventory(user: AuthenticatedUser) {
    const groups = await this.prisma.gamingDigitalTopup.groupBy({
      by: ['provider', 'topupType', 'denominationValue'],
      where: { tenantId: user.tenantId, isRedeemed: false, soldAt: null },
      _count: { _all: true },
      _max: { sellingPrice: true },
      _avg: { costPrice: true },
      _min: { expiryDate: true },
    });
    return groups.map((g) => ({
      provider: g.provider, topupType: g.topupType, denomination: g.denominationValue, count: g._count._all,
      sellingPrice: Number(g._max.sellingPrice ?? 0), avgCost: r2(Number(g._avg.costPrice ?? 0)), nearestExpiry: g._min.expiryDate,
    }));
  }

  /**
   * Card kinds for the counter: one product per kind with the count in hand.
   * Products are made here for cards stocked before the counter sold them.
   */
  async counter(user: AuthenticatedUser) {
    const groups = await this.availableInventory(user);
    const out: Array<(typeof groups)[number] & { productId: string; name: string; sku: string }> = [];
    for (const g of groups) {
      const kind = { provider: g.provider, topupType: g.topupType, denominationValue: g.denomination };
      const productId = await this.prisma.$transaction((tx) => syncTopupProduct(tx, user.tenantId, kind));
      out.push({ ...g, productId, name: topupName(kind), sku: topupSku(kind) });
    }
    return out;
  }

  /**
   * Hands over the cards a counter bill sold: for every card product on the
   * bill, that many cards in hand (earliest expiry first) are marked sold to
   * the bill's customer with the bill's rate. Safe to call again: cards
   * already given to this bill count first. Returns the codes to give.
   */
  async assignSale(user: AuthenticatedUser, saleId: string) {
    if (!saleId) throw new BadRequestException('Bill nahi mila');
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenantId: user.tenantId },
        select: {
          id: true, saleNumber: true, status: true, customerId: true,
          customer: { select: { name: true, phone: true } },
          items: { select: { quantity: true, price: true, product: { select: { sku: true } } } },
        },
      });
      if (!sale) throw new NotFoundException('Bill nahi mila');
      if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill cancel ho chuka hai');
      const want = new Map<string, { qty: number; price: number }>();
      for (const it of sale.items) {
        const sku = it.product?.sku ?? '';
        if (!sku.startsWith(TOPUP_SKU_PREFIX)) continue;
        const w = want.get(sku) ?? { qty: 0, price: Number(it.price) || 0 };
        w.qty += Math.round(Number(it.quantity) || 0);
        want.set(sku, w);
      }
      const given: Card[] = [];
      let missing = 0;
      const pool = want.size ? await tx.gamingDigitalTopup.findMany({
        where: { tenantId: user.tenantId, OR: [{ deliveryReference: sale.saleNumber }, { soldAt: null, isRedeemed: false }] },
        orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      }) : [];
      for (const [sku, w] of want) {
        const mine = pool.filter((c) => topupSku(c) === sku);
        const already = mine.filter((c) => c.deliveryReference === sale.saleNumber && c.soldAt);
        given.push(...already);
        let need = w.qty - already.length;
        for (const c of mine.filter((x) => !x.soldAt)) {
          if (need <= 0) break;
          const claimed = await tx.gamingDigitalTopup.updateMany({
            where: { id: c.id, soldAt: null, isRedeemed: false },
            data: {
              soldAt: new Date(),
              soldToCustomerId: sale.customerId,
              customerName: sale.customer?.name ?? null,
              customerPhone: sale.customer?.phone ?? null,
              deliveredVia: 'COUNTER',
              deliveryReference: sale.saleNumber,
              sellingPrice: r2(w.price),
              profit: r2(w.price - c.costPrice),
            },
          });
          if (claimed.count) { given.push({ ...c, soldAt: new Date(), deliveryReference: sale.saleNumber }); need -= 1; }
        }
        missing += Math.max(need, 0);
        const first = mine[0];
        if (first) await syncTopupProduct(tx, user.tenantId, first);
      }
      return {
        saleNumber: sale.saleNumber,
        missing,
        cards: given.map((c) => ({
          id: c.id, topupNumber: c.topupNumber, provider: c.provider, topupType: c.topupType, denominationValue: c.denominationValue,
          denominationCurrency: c.denominationCurrency, cardCode: c.cardCode, cardPin: c.cardPin, cardSerial: c.cardSerial, expiryDate: c.expiryDate,
        })),
      };
    });
  }

  /** Codes of an unsold card stay hidden; a sold card can be shown again to re-send it. */
  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Card nahi mila');
    return { ...masked(t), billVoided: await this.billVoided(user.tenantId, t) };
  }

  /** The bill that sold this card was voided (or returned in full). */
  private async billVoided(tenantId: string, t: Card) {
    if (!t.soldAt || !t.deliveryReference) return false;
    const sale = await this.prisma.sale.findFirst({ where: { tenantId, saleNumber: t.deliveryReference }, select: { status: true } });
    return sale?.status === 'VOIDED' || sale?.status === 'FULLY_RETURNED';
  }

  /**
   * Sells one card as its own bill (kept for older screens; the counter
   * sells cards through the shared POS so a bill can carry several cards and
   * be paid in parts).
   */
  async sell(user: AuthenticatedUser, id: string, dto: SellTopupDto) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Card nahi mila');
    if (t.soldAt) throw new BadRequestException('Ye card bik chuka hai');
    if (t.isRedeemed) throw new BadRequestException('Ye card stock se hata diya gaya hai');

    const sellingPrice = r2(Math.max(Number(dto.actualSellingPrice ?? t.sellingPrice) || 0, 0));
    const paid = r2(Math.max(Number(dto.paidAmount ?? sellingPrice) || 0, 0));

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.gamingDigitalTopup.updateMany({
        where: { id, tenantId: user.tenantId, soldAt: null, isRedeemed: false },
        data: { soldAt: new Date() },
      });
      if (claimed.count === 0) throw new BadRequestException('Ye card bik chuka hai');
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId);
      let customerId = dto.customerId || null;
      if (!customerId && paid < sellingPrice - 0.01) {
        customerId = await ensureCustomer(tx, user, { name: dto.customerName, phone: dto.customerPhone, shopId });
      }
      const sale = await postIndustrySale(tx, user, {
        saleNumber: `${BILL_PREFIX.topup}${t.topupNumber}`,
        sourceRef: t.topupNumber,
        shopId,
        customerId,
        lines: [{ label: topupName(t), amount: sellingPrice, cost: t.costPrice }],
        paidAmount: paid,
        paymentMethod: dto.paymentMethod,
      });
      const sold = await tx.gamingDigitalTopup.update({
        where: { id },
        data: {
          soldToCustomerId: customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          deliveredVia: dto.deliveredVia,
          deliveryReference: dto.deliveryReference || sale.saleNumber,
          sellingPrice,
          profit: r2(sellingPrice - t.costPrice),
        },
      });
      await syncTopupProduct(tx, user.tenantId, t);
      return { ...sold, sale: { id: sale.id, saleNumber: sale.saleNumber } };
    });
  }

  /** The customer has loaded the card (only a sold card). */
  async markRedeemed(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Card nahi mila');
    if (!t.soldAt) throw new BadRequestException('Pehle card bechein — stock wala card yahan se use nahi hota');
    if (t.isRedeemed) return masked(t);
    return this.prisma.gamingDigitalTopup.update({ where: { id }, data: { isRedeemed: true, redeemedAt: new Date() } });
  }

  /** A wrong or dead card comes off stock; the record stays for the books. */
  async remove(user: AuthenticatedUser, id: string, reason?: string) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Card nahi mila');
    if (t.soldAt) throw new BadRequestException('Bika hua card stock se nahi hatta — bill wapas karein');
    if (t.isRedeemed) return masked(t);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.gamingDigitalTopup.update({
        where: { id },
        data: { isRedeemed: true, redeemedAt: new Date(), notes: [REMOVED, reason?.trim(), t.notes].filter(Boolean).join(' — ').slice(0, 500) },
      });
      await syncTopupProduct(tx, user.tenantId, t);
      return masked(row);
    });
  }

  /**
   * A card goes back on stock: one taken off by mistake, or one whose bill
   * was voided and whose code the shop has checked is still unused.
   */
  async restore(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Card nahi mila');
    const voided = await this.billVoided(user.tenantId, t);
    if (t.soldAt ? !voided || t.isRedeemed : !t.isRedeemed) {
      throw new BadRequestException(t.soldAt ? 'Sirf cancel bill ka na-istemal card wapas stock me aata hai' : 'Ye card pehle se stock me hai');
    }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.gamingDigitalTopup.update({
        where: { id },
        data: {
          isRedeemed: false, redeemedAt: null,
          ...(t.soldAt && { soldAt: null, soldToCustomerId: null, customerName: null, customerPhone: null, deliveredVia: null, deliveryReference: null, profit: r2(t.sellingPrice - t.costPrice) }),
          notes: `Wapas stock me${t.soldAt ? ` (bill ${t.deliveryReference} cancel)` : ''}${t.notes ? ` — ${t.notes}` : ''}`.slice(0, 500),
        },
      });
      await syncTopupProduct(tx, user.tenantId, t);
      return masked(row);
    });
  }

  async summary(user: AuthenticatedUser) {
    const t = user.tenantId;
    const [totalCards, available, sold, redeemed, removed, revenue, stockValue] = await Promise.all([
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: t } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: t, soldAt: null, isRedeemed: false } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: t, soldAt: { not: null } } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: t, soldAt: { not: null }, isRedeemed: true } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: t, soldAt: null, isRedeemed: true } }),
      this.prisma.gamingDigitalTopup.aggregate({ where: { tenantId: t, soldAt: { not: null } }, _sum: { sellingPrice: true, profit: true } }),
      this.prisma.gamingDigitalTopup.aggregate({ where: { tenantId: t, soldAt: null, isRedeemed: false }, _sum: { costPrice: true } }),
    ]);
    return {
      totalCards, available, sold, redeemed, removed,
      totalRevenue: r2(Number(revenue._sum.sellingPrice ?? 0)),
      totalProfit: r2(Number(revenue._sum.profit ?? 0)),
      stockValue: r2(Number(stockValue._sum.costPrice ?? 0)),
    };
  }
}
