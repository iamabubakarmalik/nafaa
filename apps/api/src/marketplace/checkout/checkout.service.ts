/**
 * Nafaa Market checkout.
 *
 * A cart may hold several shops; each shop gets its own MarketplaceOrder (the
 * customer's record) and its own ChannelOrder in the shop's Online Orders
 * (OnlineOrdersService.receive on the shop's NAFAA_MARKET channel). Accepting
 * the ChannelOrder in the POS makes the bill, takes the stock and books the
 * profit; status changes come back through MarketStatusSyncService.
 *
 * Prices, stock, delivery fees and discounts are always worked out here from
 * the POS data, never taken from the client.
 */
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CustomerAddress, DeliveryType, MarketplaceOrderStatus, MarketplacePaymentMethod, MarketplacePaymentStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketplaceCartService, PROBLEM_TEXT, ShopGroup } from '../cart/cart.service';
import { MarketChannelService } from '../_shared/market-channel.service';
import { MarketIntakeService } from '../_shared/market-intake.service';
import { MarketSettingsService } from '../_shared/market-settings.service';
import { MarketPlatformConfig } from '../_shared/market-config';
import { deliverySlots, isOpenAt } from '../_shared/market-hours';
import { PlaceOrderDto } from './dto/place-order.dto';
import { PreviewCheckoutDto } from './dto/preview-checkout.dto';

const LOYALTY_POINT_VALUE = 0.5; // 1 point = Rs 0.5
const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const rs = (v: number) => `Rs ${Math.round(v).toLocaleString('en-PK')}`;

type Fulfilment = 'DELIVERY' | 'PICKUP' | 'DINE_IN';
const fulfilmentOf = (t?: DeliveryType | null): Fulfilment =>
  t === 'PICKUP' || t === 'SELF_PICKUP' ? 'PICKUP' : t === 'DINE_IN' ? 'DINE_IN' : 'DELIVERY';

/** Customer payment method → platform switch name in MarketPlatformConfig.payments. */
const PLATFORM_PAY: Partial<Record<MarketplacePaymentMethod, keyof MarketPlatformConfig['payments']>> = {
  COD: 'cod', JAZZCASH: 'jazzcash', EASYPAISA: 'easypaisa', CARD: 'card', BANK_TRANSFER: 'bankTransfer',
};

function generateOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(-2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `NM${ymd}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

interface Coupon { id: string; code: string; tenantId: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; minPurchase: number; maxDiscount: number | null; shopIds: string[] }

interface ShopQuote {
  group: ShopGroup;
  fulfilment: Fulfilment;
  subtotal: number;
  deliveryFee: number;
  couponDiscount: number;
  loyaltyPoints: number;
  loyaltyDiscount: number;
  wallet: number;
  total: number;
  errors: string[];
}

@Injectable()
export class MarketplaceCheckoutService {
  private readonly logger = new Logger(MarketplaceCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartSvc: MarketplaceCartService,
    private readonly channel: MarketChannelService,
    private readonly settings: MarketSettingsService,
    private readonly intake: MarketIntakeService,
  ) {}

  // ═══ quote ═══

  private async findCoupon(code: string | undefined, groups: ShopGroup[]): Promise<{ coupon: Coupon | null; error: string | null }> {
    const clean = String(code ?? '').trim();
    if (!clean) return { coupon: null, error: null };
    const tenants = [...new Set(groups.map((g) => g._profile?.tenantId).filter((t): t is string => !!t))];
    const now = new Date();
    const rows = await this.prisma.discountCode.findMany({
      where: { tenantId: { in: tenants }, code: { equals: clean, mode: 'insensitive' }, isActive: true },
      take: 5,
    });
    const row = rows.find((r) => (!r.validFrom || r.validFrom <= now) && (!r.validUntil || r.validUntil >= now) && (r.usageLimit === null || r.usageCount < r.usageLimit));
    if (!row) return { coupon: null, error: 'Ye coupon code sahi nahi ya expire ho chuka hai' };
    return {
      coupon: { id: row.id, code: row.code, tenantId: row.tenantId, type: row.type, value: row.value, minPurchase: row.minPurchase, maxDiscount: row.maxDiscount, shopIds: row.shopIds },
      error: null,
    };
  }

  private async couponUsedByCustomer(customerId: string, coupon: Coupon): Promise<number> {
    return this.prisma.marketplaceOrder.count({
      where: { customerId, tenantId: coupon.tenantId, couponCode: coupon.code, status: { notIn: ['CANCELLED'] } },
    });
  }

  private async quote(customerId: string, dto: PreviewCheckoutDto | PlaceOrderDto) {
    const cart = await this.cartSvc.getCart(customerId);
    if (!cart.shopGroups.length) throw new BadRequestException('Cart khali hai');
    const [customer, platform] = await Promise.all([
      this.prisma.marketplaceCustomer.findUnique({ where: { id: customerId }, select: { walletBalance: true, loyaltyPoints: true, fullName: true, phone: true, email: true } }),
      this.settings.platform(),
    ]);
    if (!customer) throw new NotFoundException('Account nahi mila');

    let address: CustomerAddress | null = null;
    if (dto.addressId) {
      address = await this.prisma.customerAddress.findFirst({ where: { id: dto.addressId, customerId } });
      if (!address) throw new NotFoundException('Address nahi mila');
    }

    const fulfilment = fulfilmentOf(dto.deliveryType);
    const { coupon, error: couponLookupError } = await this.findCoupon(dto.couponCode, cart.shopGroups);
    let couponError = couponLookupError;
    if (coupon) {
      const limit = (await this.prisma.discountCode.findUnique({ where: { id: coupon.id }, select: { perCustomerLimit: true } }))?.perCustomerLimit;
      if (limit && (await this.couponUsedByCustomer(customerId, coupon)) >= limit) couponError = 'Aap ye coupon pehle hi use kar chuke hain';
    }

    const quotes: ShopQuote[] = cart.shopGroups.map((g) => {
      const p = g._profile;
      const errors: string[] = [];
      const name = p?.publicName ?? 'Dukaan';
      if (!p || !p.isListedOnMarketplace || p.isPaused) errors.push(`${name} abhi orders nahi le rahi`);
      const bad = g.lines.filter((l) => l.problem);
      if (bad.length) errors.push(`${name}: ${bad.map((l) => `${l.productName} (${l.problemText})`).join(', ')}`);
      if (p && !g.meetsMinOrder) errors.push(`${name}: minimum order ${rs(g.minOrderAmount)} hai`);
      if (p?.maxOrderAmount && g.subtotal > n(p.maxOrderAmount)) errors.push(`${name}: ek order ${rs(n(p.maxOrderAmount))} tak ho sakta hai`);
      // A booking (salon, clinic, gym...) is a visit at a chosen time, not a delivery or pickup.
      const booking = g.gate === 'BOOKING';
      if (p && !booking && fulfilment === 'DELIVERY' && !p.offersDelivery) errors.push(`${name} delivery nahi karti, pickup chunein`);
      if (p && !booking && fulfilment === 'PICKUP' && !g.shop?.offersPickup) errors.push(`${name} se pickup nahi hota`);
      if (p && !booking && fulfilment === 'DINE_IN' && !g.shop?.offersDineIn) errors.push(`${name} me dine-in order nahi hota`);

      let couponDiscount = 0;
      if (coupon && !couponError && p && p.tenantId === coupon.tenantId && (!coupon.shopIds.length || coupon.shopIds.includes(g.shopId))) {
        if (g.subtotal >= coupon.minPurchase) {
          couponDiscount = coupon.type === 'PERCENTAGE' ? (g.subtotal * coupon.value) / 100 : coupon.value;
          if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
          couponDiscount = r2(Math.min(couponDiscount, g.subtotal));
        }
      }
      const deliveryFee = fulfilment === 'DELIVERY' ? g.deliveryFee : 0;
      return { group: g, fulfilment, subtotal: g.subtotal, deliveryFee, couponDiscount, loyaltyPoints: 0, loyaltyDiscount: 0, wallet: 0, total: 0, errors };
    });
    if (coupon && !couponError && !quotes.some((q) => q.couponDiscount > 0)) {
      couponError = coupon.minPurchase > 0 ? `Ye coupon ${rs(coupon.minPurchase)} ya zyada ke order par lagta hai` : 'Ye coupon in dukaanon par nahi lagta';
    }

    // Loyalty points and wallet are spread over the shops by their totals.
    const goods = quotes.reduce((s, q) => s + q.subtotal - q.couponDiscount, 0);
    // Spending is off until Nafaa pays shops back for it; asked amounts are ignored, not refused.
    const pointsAsked = platform.loyaltySpend ? Math.max(0, Math.floor(n(dto.loyaltyPointsToUse))) : 0;
    const points = Math.min(pointsAsked, customer.loyaltyPoints, Math.floor(goods / LOYALTY_POINT_VALUE));
    let pointsLeft = points;
    quotes.forEach((q, i) => {
      const share = i === quotes.length - 1 ? pointsLeft : Math.floor((points * (q.subtotal - q.couponDiscount)) / (goods || 1));
      q.loyaltyPoints = Math.max(0, Math.min(share, pointsLeft));
      pointsLeft -= q.loyaltyPoints;
      q.loyaltyDiscount = r2(q.loyaltyPoints * LOYALTY_POINT_VALUE);
    });
    const beforeWallet = quotes.reduce((s, q) => s + q.subtotal + q.deliveryFee - q.couponDiscount - q.loyaltyDiscount, 0);
    const walletAsked = platform.walletSpend ? n(dto.walletAmountToUse) : 0;
    const wallet = r2(Math.min(walletAsked, n(customer.walletBalance), Math.max(0, beforeWallet)));
    let walletLeft = wallet;
    quotes.forEach((q, i) => {
      const due = q.subtotal + q.deliveryFee - q.couponDiscount - q.loyaltyDiscount;
      const share = i === quotes.length - 1 ? walletLeft : r2((wallet * due) / (beforeWallet || 1));
      q.wallet = r2(Math.max(0, Math.min(share, walletLeft, due)));
      walletLeft = r2(walletLeft - q.wallet);
      q.total = r2(Math.max(0, due - q.wallet));
    });

    if (platform.launchCities.length && fulfilment === 'DELIVERY' && address) {
      const ok = platform.launchCities.some((c) => c.toLowerCase() === address!.city.trim().toLowerCase());
      if (!ok) quotes.forEach((q) => q.errors.push(`Nafaa Market abhi ${address!.city} me delivery nahi karta`));
    }

    return { cart, customer, address, fulfilment, coupon, couponError, quotes, platform, points, wallet };
  }

  /** Which payment methods this order may use (platform switch + every shop accepts it). */
  private paymentOptions(platform: MarketPlatformConfig, quotes: ShopQuote[], finalTotal: number) {
    const shopAccepts = (m: MarketplacePaymentMethod) => quotes.every((q) => {
      const p = q.group._profile;
      if (!p) return false;
      if (m === 'COD') return p.acceptsCod;
      if (m === 'CARD') return p.acceptsCard;
      if (m === 'JAZZCASH') return p.acceptsJazzcash;
      if (m === 'EASYPAISA') return p.acceptsEasypaisa;
      return true;
    });
    const out: MarketplacePaymentMethod[] = [];
    if (finalTotal <= 0) out.push('WALLET');
    for (const [method, key] of Object.entries(PLATFORM_PAY) as Array<[MarketplacePaymentMethod, keyof MarketPlatformConfig['payments']]>) {
      if (platform.payments[key] && shopAccepts(method)) out.push(method);
    }
    return out;
  }

  // ═══ preview ═══

  async preview(customerId: string, dto: PreviewCheckoutDto) {
    const q = await this.quote(customerId, { ...dto, deliveryType: dto.deliveryType ?? 'DELIVERY' } as PreviewCheckoutDto);
    const subtotal = r2(q.quotes.reduce((s, x) => s + x.subtotal, 0));
    const totalDeliveryFee = r2(q.quotes.reduce((s, x) => s + x.deliveryFee, 0));
    const couponDiscount = r2(q.quotes.reduce((s, x) => s + x.couponDiscount, 0));
    const loyaltyDiscount = r2(q.quotes.reduce((s, x) => s + x.loyaltyDiscount, 0));
    const finalTotal = r2(q.quotes.reduce((s, x) => s + x.total, 0));
    const warnings = q.quotes.flatMap((x) => x.errors);
    const payments = this.paymentOptions(q.platform, q.quotes, finalTotal);
    return {
      shopBreakdown: q.quotes.map((x) => ({
        shopId: x.group.shopId,
        shop: x.group.shop,
        gate: x.group.gate,
        flow: x.group.flow,
        itemCount: x.group.itemCount,
        subtotal: x.subtotal,
        deliveryFee: x.deliveryFee,
        couponDiscount: x.couponDiscount,
        loyaltyDiscount: x.loyaltyDiscount,
        walletUsed: x.wallet,
        minOrderAmount: x.group.minOrderAmount,
        meetsMinOrder: x.group.meetsMinOrder,
        needsPrescription: x.group.needsPrescription,
        total: x.total,
        errors: x.errors,
      })),
      subtotal,
      totalDeliveryFee,
      couponDiscount,
      couponError: q.couponError,
      walletSpendEnabled: q.platform.walletSpend,
      loyaltySpendEnabled: q.platform.loyaltySpend,
      loyaltyPoints: { available: q.customer.loyaltyPoints, used: q.points, pointValue: LOYALTY_POINT_VALUE, appliedDiscount: loyaltyDiscount },
      wallet: { balance: n(q.customer.walletBalance), used: q.wallet, remainingAfter: r2(n(q.customer.walletBalance) - q.wallet) },
      totalDiscount: r2(couponDiscount + loyaltyDiscount),
      grandTotalBeforeWallet: r2(finalTotal + q.wallet),
      finalTotal,
      paymentMethods: payments,
      canPlaceOrder: warnings.length === 0 && payments.length > 0,
      warnings,
    };
  }

  // ═══ place order ═══

  async placeOrder(customerId: string, dto: PlaceOrderDto) {
    const q = await this.quote(customerId, dto);
    const { cart, address, fulfilment, coupon, quotes } = q;

    const bad = cart.shopGroups.flatMap((g) => g.lines.filter((l) => l.problem));
    if (bad.length) {
      throw new ConflictException({
        statusCode: 409, code: 'OUT_OF_STOCK', message: 'Cart ki kuch cheezen badal gayi hain. Cart dobara dekhein.',
        lines: bad.map((l) => ({ lineId: l.id, productId: l.productId, variantId: l.variantId, available: l.maxQty, problem: l.problem, text: l.problemText ?? PROBLEM_TEXT.OUT_OF_STOCK })),
      });
    }
    const errors = quotes.flatMap((x) => x.errors);
    if (errors.length) throw new BadRequestException(errors[0]);
    if (dto.couponCode && q.couponError) throw new BadRequestException(q.couponError);
    if (fulfilment === 'DELIVERY' && !address) throw new BadRequestException('Delivery ka address chunein');
    for (const x of quotes) {
      if (!x.group.needsPrescription) continue;
      const has = (dto.attachments ?? []).some((a) => a.kind === 'prescription' && (!a.shopId || a.shopId === x.group.shopId) && /^https?:\/\//.test(a.url));
      if (!has) throw new BadRequestException('Is order me nuskha (prescription) ki photo lagayen');
    }

    const finalTotal = r2(quotes.reduce((s, x) => s + x.total, 0));
    if (dto.expectedTotal !== undefined && Math.abs(dto.expectedTotal - finalTotal) > 0.5) {
      throw new ConflictException({ statusCode: 409, code: 'PRICE_CHANGED', message: `Qeemat badal gayi hai. Naya total ${rs(finalTotal)} hai, dobara dekh lein.`, total: finalTotal });
    }
    const allowed = this.paymentOptions(q.platform, quotes, finalTotal);
    const method: MarketplacePaymentMethod = finalTotal <= 0 ? 'WALLET' : dto.paymentMethod;
    if (!allowed.includes(method)) {
      throw new BadRequestException(method === 'WALLET' ? 'Wallet me poore paise nahi hain, Cash on delivery chunein' : 'Ye payment tareeqa abhi available nahi. Cash on delivery chunein.');
    }

    // Time per shop: dto.slots[shopId], else the single slot for the whole order. It must be one of
    // the shop's open windows when the shop uses slots; a booking always needs one.
    const slotOf = (shopId: string): { start: Date; end: Date | null } | null => {
      const raw = dto.slots?.[shopId] ?? (dto.deliverySlotStart ? { start: dto.deliverySlotStart, end: dto.deliverySlotEnd ?? null } : null);
      if (!raw?.start) return null;
      const start = new Date(raw.start);
      if (Number.isNaN(start.getTime())) throw new BadRequestException('Delivery ka waqt sahi nahi');
      const end = raw.end ? new Date(raw.end) : null;
      return { start, end: end && !Number.isNaN(end.getTime()) ? end : null };
    };
    for (const x of quotes) {
      const p = x.group._profile!;
      const openNow = p.isOpen && isOpenAt(p.workingHours, p.holidayDates);
      const slot = slotOf(x.group.shopId);
      const slotStart = slot?.start ?? null;
      const booking = x.group.gate === 'BOOKING';
      if (booking && !slotStart) throw new BadRequestException(`${p.publicName}: booking ke liye waqt chunein`);
      if (slotStart && (x.group.flow?.deliverySlots || booking)) {
        const ok = deliverySlots(p.workingHours, p.holidayDates, { leadMinutes: 30 }).some((s) => s.start === slotStart.toISOString());
        if (!ok) throw new BadRequestException(`${p.publicName}: ye waqt ab available nahi, doosra waqt chunein`);
      } else if (!openNow) {
        throw new BadRequestException(x.group.flow?.deliverySlots ? `${p.publicName} abhi band hai. Delivery ka waqt chunein.` : `${p.publicName} abhi band hai`);
      }
    }

    // Make sure every shop has its Market channel before anything is written.
    for (const x of quotes) await this.channel.ensureChannel(x.group.shopId);

    const paymentStatus: MarketplacePaymentStatus = method === 'WALLET' ? 'PAID' : 'PENDING';

    // 1) Market orders, wallet, points and cart in one transaction.
    const created = await this.prisma.$transaction(async (tx) => {
      const out: Array<{ order: Prisma.MarketplaceOrderGetPayload<{ include: { items: true } }>; quote: ShopQuote }> = [];
      for (const x of quotes) {
        const g = x.group;
        const p = g._profile!;
        const attachments = (dto.attachments ?? []).filter((a) => !a.shopId || a.shopId === g.shopId).map((a) => ({ kind: a.kind, url: a.url, note: a.note ?? null }));
        const order = await tx.marketplaceOrder.create({
          data: {
            orderNumber: generateOrderNumber(),
            customerId,
            shopId: g.shopId,
            tenantId: p.tenantId,
            status: MarketplaceOrderStatus.PENDING,
            deliveryType: dto.deliveryType,
            subtotal: new Prisma.Decimal(x.subtotal),
            deliveryFee: new Prisma.Decimal(x.deliveryFee),
            discount: new Prisma.Decimal(r2(x.couponDiscount + x.loyaltyDiscount)),
            couponCode: x.couponDiscount > 0 ? coupon!.code : null,
            couponDiscount: new Prisma.Decimal(x.couponDiscount),
            walletUsed: new Prisma.Decimal(x.wallet),
            loyaltyPointsUsed: x.loyaltyPoints,
            loyaltyDiscount: new Prisma.Decimal(x.loyaltyDiscount),
            tipAmount: new Prisma.Decimal(0),
            total: new Prisma.Decimal(x.total),
            currency: 'PKR',
            paymentMethod: method,
            paymentStatus,
            paidAt: paymentStatus === 'PAID' ? new Date() : null,
            addressId: address?.id ?? null,
            addressSnapshot: address ? (address as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
            deliverySlotStart: slotOf(g.shopId)?.start ?? null,
            deliverySlotEnd: slotOf(g.shopId)?.end ?? null,
            customerNotes: dto.customerNotes,
            attachments: attachments.length ? (attachments as Prisma.InputJsonValue) : Prisma.DbNull,
            source: 'APP',
            items: {
              create: g.lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                productName: l.productName,
                variantName: l.variantName,
                imageUrl: l.imageUrl,
                unitPrice: new Prisma.Decimal(l.unitPrice),
                quantity: l.quantity,
                total: new Prisma.Decimal(l.lineTotal),
                notes: l.notes,
                options: (l.options ?? Prisma.DbNull) as Prisma.InputJsonValue,
                modifiers: (l.modifiers ?? Prisma.DbNull) as Prisma.InputJsonValue,
              })),
            },
            statusHistory: { create: { status: MarketplaceOrderStatus.PENDING, note: 'Order customer ne diya', changedBy: 'CUSTOMER' } },
          },
          include: { items: true },
        });
        out.push({ order, quote: x });
      }

      if (q.wallet > 0) {
        const c = await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { walletBalance: { decrement: q.wallet } },
          select: { walletBalance: true },
        });
        if (n(c.walletBalance) < -0.001) throw new BadRequestException('Wallet me itne paise nahi hain');
        await tx.customerWalletTxn.create({
          data: {
            customerId, type: 'DEBIT', amount: new Prisma.Decimal(q.wallet), balanceAfter: c.walletBalance,
            reason: `Order ${out.map((o) => o.order.orderNumber).join(', ')}`, referenceType: 'ORDER',
          },
        });
      }
      if (q.points > 0) {
        const res = await tx.marketplaceCustomer.updateMany({ where: { id: customerId, loyaltyPoints: { gte: q.points } }, data: { loyaltyPoints: { decrement: q.points } } });
        if (!res.count) throw new BadRequestException('Itne loyalty points nahi hain');
      }
      if (coupon && out.some((o) => o.quote.couponDiscount > 0)) {
        await tx.discountCode.updateMany({
          where: { id: coupon.id, OR: [{ usageLimit: null }, { usageCount: { lt: tx.discountCode.fields.usageLimit } }] },
          data: { usageCount: { increment: 1 } },
        });
      }
      await tx.marketplaceCartLine.deleteMany({ where: { cartId: cart.id } });
      return out;
    });

    // 2) One ChannelOrder per shop through the normal Online Orders intake.
    //    A failure here is retried by MarketStatusSyncService.sweep().
    for (const { order } of created) {
      await this.intake.push(order.id).catch((e: any) => {
        this.logger.error(`Market order ${order.orderNumber}: Online Orders intake failed, will retry: ${e?.message ?? e}`);
      });
    }

    return {
      success: true,
      orders: created.map(({ order }) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        shopId: order.shopId,
        total: n(order.total),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })),
      totalOrders: created.length,
      grandTotal: finalTotal,
    };
  }

  // ═══ delivery slots ═══

  /** One-hour delivery windows from the shop's working hours (Pakistan time). */
  async getDeliverySlots(shopId?: string) {
    if (!shopId) throw new BadRequestException('Dukaan chunein');
    const p = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId },
      select: { workingHours: true, holidayDates: true, isOpen: true, isPaused: true, isListedOnMarketplace: true, estimatedDeliveryMinutes: true },
    });
    if (!p || !p.isListedOnMarketplace) throw new NotFoundException('Dukaan nahi mili');
    if (p.isPaused || !p.isOpen) return { slots: [] };
    return { slots: deliverySlots(p.workingHours, p.holidayDates, { days: 3, leadMinutes: Math.max(30, p.estimatedDeliveryMinutes ?? 60) }) };
  }
}
