/**
 * Storefront cart and checkout. Carts live on the server (token in a cookie)
 * so an idle cart with a phone or email becomes an abandoned checkout. The
 * order goes through the same intake as every channel (ChannelOrder via
 * OnlineOrdersService.receive): auto-accept, risk, couriers and dispatch all
 * apply. Prices, stock and totals are always worked out here, never taken
 * from the browser.
 */
import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, StoreCart } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '../../core/system-control/cron.decorator';
import { ShopScope } from '../../common/shop-scope';
import { OnlineOrdersService } from '../online-orders/online-orders.service';
import { OrderToolsService } from '../online-orders/order-tools.service';
import { PaymentLinksService } from '../online-orders/payment-links.service';
import { PortalService } from '../online-orders/portal/portal.service';
import { AbandonedCartsService } from '../online-orders/abandoned-carts.service';
import { NormalizedOrder } from '../online-orders/order-normalizer';
import { couponDiscount, readForm } from '../online-orders/storefront.service';
import { findAutoCoupon, markCouponUsed } from '../online-orders/conversion/auto-coupon';
import { phoneKey } from '../online-orders/customer-risk';
import { courierLink, courierName } from '../online-orders/couriers';
import { journeyOf, publicJourney } from '../online-orders/tracking-map';
import { pkPhone } from '../online-orders/courier-api/postex.adapter';
import { LineInfo, StoreCatalogService } from './store-catalog.service';
import { PublicAccess, StoreAccessService, StoreCtx } from './store-access.service';
import { StoreAnalyticsService } from './store-analytics.service';
import { CheckoutSettings, PayCode, readCheckout, readShipping } from './store-settings';
import { freeShippingGap, quoteRates } from './lib/shipping';
import { randomToken, readToken, signToken } from './lib/tokens';
import { loadControls } from './store-controls';

export interface CartLine { productId: string; variantId: string | null; quantity: number }
const CART_DAYS = 30;
const ABANDON_AFTER_MS = 60 * 60_000;
const ORDER_TOKEN_TTL = 365 * 86_400_000;
const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const lineId = (l: { productId: string; variantId: string | null }) => `${l.productId}:${l.variantId ?? '-'}`;
const s = (v: unknown, max: number) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '');

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order received', ACCEPTING: 'Being confirmed', CONFIRMED: 'Confirmed', PREPARING: 'Being prepared', READY: 'Packed',
  OUT_FOR_DELIVERY: 'On the way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REJECTED: 'Cancelled', RETURNED: 'Returned',
};

@Injectable()
export class StoreCheckoutService {
  private readonly logger = new Logger(StoreCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly catalog: StoreCatalogService,
    private readonly orders: OnlineOrdersService,
    private readonly tools: OrderToolsService,
    private readonly payments: PaymentLinksService,
    private readonly portal: PortalService,
    private readonly abandoned: AbandonedCartsService,
    private readonly analytics: StoreAnalyticsService,
  ) {}

  // ═══ cart ═══

  private readLines(raw: unknown): CartLine[] {
    return (Array.isArray(raw) ? raw : []).slice(0, 50).map((l: any) => ({
      productId: String(l?.productId ?? ''), variantId: l?.variantId ? String(l.variantId) : null, quantity: Math.max(1, Math.min(99, Math.floor(n(l?.quantity) || 1))),
    })).filter((l) => /^[\w-]{8,64}$/.test(l.productId));
  }

  private async cartRow(ctx: StoreCtx, token: string): Promise<StoreCart> {
    const c = await this.prisma.storeCart.findUnique({ where: { token: String(token ?? '').slice(0, 80) } });
    if (!c || c.storeId !== ctx.store.id || c.status !== 'OPEN' || c.updatedAt.getTime() < Date.now() - CART_DAYS * 86_400_000) throw new NotFoundException('Cart not found');
    return c;
  }

  /** Whole cart with fresh prices, stock, shipping and totals. */
  async present(ctx: StoreCtx, c: StoreCart) {
    const lines = this.readLines(c.lines);
    const info = await this.catalog.lineInfo(ctx, lines);
    const shipping = readShipping(ctx.store.shipping);
    const checkout = readCheckout(ctx.store.checkout);
    const out = lines.map((l) => {
      const i = info.get(lineId(l));
      if (!i) return { lineId: lineId(l), productId: l.productId, variantId: l.variantId, handle: '', title: 'Item no longer available', variantTitle: null, image: null, url: '', quantity: l.quantity, price: 0, compareAtPrice: null, lineTotal: 0, availability: 'out_of_stock' as const, maxQty: 0, leadTime: null, problem: 'removed' as const };
      const qty = Math.min(l.quantity, Math.max(0, i.maxQty));
      return {
        lineId: lineId(l), productId: l.productId, variantId: l.variantId, handle: i.handle, title: i.title, variantTitle: i.variantTitle, image: i.image, url: `/products/${i.handle}`,
        quantity: l.quantity, price: i.price, compareAtPrice: i.compareAtPrice, lineTotal: r2(i.price * qty), availability: i.availability, maxQty: i.maxQty, leadTime: i.leadTime,
        problem: i.maxQty === 0 ? ('out_of_stock' as const) : qty < l.quantity ? ('reduced' as const) : null,
      };
    });
    const subtotal = r2(out.reduce((a, l) => a + l.lineTotal, 0));
    const contact = (c.contact ?? {}) as Record<string, string | null>;
    const address = (c.address ?? {}) as Record<string, string | null>;
    const weight = lines.reduce((a, l) => a + (info.get(lineId(l))?.weightKg ?? 0) * l.quantity, 0);
    const quote = quoteRates(shipping, { city: address.city, province: address.province, subtotal, weightKg: weight });
    const rate = quote.rates.find((r) => r.id === c.shippingRateId) ?? null;
    const coupon = c.couponCode ? await this.couponFor(ctx, c.couponCode, subtotal, contact.phone ?? null) : null;
    const discount = coupon && 'discount' in coupon ? coupon.discount : 0;
    const isCod = (c.paymentMethod ?? 'COD') === 'COD';
    const codFee = rate && isCod && checkout.payments.cod ? rate.codFee : 0;
    return {
      token: c.token,
      itemCount: out.reduce((a, l) => a + (l.problem === 'removed' ? 0 : l.quantity), 0),
      currency: 'PKR' as const,
      lines: out,
      subtotal,
      discount,
      coupon: coupon && 'discount' in coupon ? { code: coupon.code, message: coupon.message } : null,
      couponError: coupon && 'error' in coupon ? coupon.error : null,
      shipping: rate ? { rateId: rate.id, name: rate.name, price: rate.price, eta: rate.eta } : null,
      codFee,
      total: r2(Math.max(0, subtotal - discount) + (rate?.price ?? 0) + codFee),
      freeShipping: freeShippingGap(shipping, subtotal),
      contact: { name: contact.name ?? null, phone: contact.phone ?? null, email: contact.email ?? null },
      address: { address: address.address ?? null, city: address.city ?? null, province: address.province ?? null, postalCode: address.postalCode ?? null, landmark: address.landmark ?? null },
      notes: c.notes,
      paymentMethod: c.paymentMethod,
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  async createCart(storeId: string, access: PublicAccess, body: { lines?: unknown; utm?: unknown; referrer?: string; landingPage?: string }) {
    const ctx = await this.access.publicStore(storeId, access);
    const lines = this.merge([], this.readLines(body?.lines));
    const c = await this.prisma.storeCart.create({
      data: {
        storeId: ctx.store.id, tenantId: ctx.tenantId, token: randomToken(24), lines: lines as unknown as Prisma.InputJsonValue,
        attribution: this.attribution(body) as Prisma.InputJsonValue,
      },
    });
    return this.present(ctx, c);
  }

  private attribution(body: { utm?: unknown; referrer?: string; landingPage?: string }) {
    const u = (body?.utm && typeof body.utm === 'object' ? body.utm : {}) as Record<string, unknown>;
    const pick = (k: string) => (s(u[k], 200) || undefined);
    return {
      utmSource: pick('source'), utmMedium: pick('medium'), utmCampaign: pick('campaign'), utmContent: pick('content'), utmTerm: pick('term'),
      referrer: s(body?.referrer, 500) || undefined, landingPage: s(body?.landingPage, 500) || undefined,
      clickIds: { fbclid: pick('fbclid'), gclid: pick('gclid'), ttclid: pick('ttclid') },
    };
  }

  private merge(base: CartLine[], add: CartLine[]): CartLine[] {
    const out = [...base];
    for (const a of add) {
      const i = out.findIndex((l) => lineId(l) === lineId(a));
      if (i >= 0) out[i] = { ...out[i], quantity: Math.min(99, out[i].quantity + a.quantity) };
      else out.push(a);
    }
    return out.slice(0, 50);
  }

  async getCart(storeId: string, access: PublicAccess, token: string) {
    const ctx = await this.access.publicStore(storeId, access);
    return this.present(ctx, await this.cartRow(ctx, token));
  }

  async addLine(storeId: string, access: PublicAccess, token: string, body: { productId?: string; variantId?: string | null; quantity?: number }) {
    const ctx = await this.access.publicStore(storeId, access);
    const c = await this.cartRow(ctx, token);
    const add = this.readLines([body]);
    if (!add.length) throw new BadRequestException('Choose a product');
    const info = (await this.catalog.lineInfo(ctx, add)).get(lineId(add[0]));
    if (!info) {
      const hasVariants = (await this.catalog.lineInfo(ctx, [{ productId: add[0].productId, variantId: null }])).size === 0;
      throw new BadRequestException(hasVariants ? 'Choose a size or colour' : 'This item is no longer available');
    }
    const lines = this.merge(this.readLines(c.lines), add);
    const qty = lines.find((l) => lineId(l) === lineId(add[0]))!.quantity;
    if (info.maxQty <= 0 || qty > info.maxQty) {
      throw new ConflictException({ statusCode: 409, code: 'OUT_OF_STOCK', message: info.maxQty > 0 ? `Only ${info.maxQty} available` : 'This item is sold out', lines: [{ lineId: lineId(add[0]), available: info.maxQty }] });
    }
    return this.saveLines(ctx, c, lines);
  }

  async setLine(storeId: string, access: PublicAccess, token: string, id: string, quantity: number) {
    const ctx = await this.access.publicStore(storeId, access);
    const c = await this.cartRow(ctx, token);
    const qty = Math.max(0, Math.min(99, Math.floor(n(quantity))));
    let lines = this.readLines(c.lines);
    if (!lines.some((l) => lineId(l) === id)) throw new NotFoundException('Line not found');
    lines = qty === 0 ? lines.filter((l) => lineId(l) !== id) : lines.map((l) => (lineId(l) === id ? { ...l, quantity: qty } : l));
    if (qty > 0) {
      const l = lines.find((x) => lineId(x) === id)!;
      const info = (await this.catalog.lineInfo(ctx, [l])).get(id);
      if (info && qty > info.maxQty) throw new ConflictException({ statusCode: 409, code: 'OUT_OF_STOCK', message: info.maxQty > 0 ? `Only ${info.maxQty} available` : 'This item is sold out', lines: [{ lineId: id, available: info.maxQty }] });
    }
    return this.saveLines(ctx, c, lines);
  }

  private async saveLines(ctx: StoreCtx, c: StoreCart, lines: CartLine[]) {
    const saved = await this.prisma.storeCart.update({ where: { id: c.id }, data: { lines: lines as unknown as Prisma.InputJsonValue, lastActivityAt: new Date(), abandonedSentAt: null } });
    return this.present(ctx, saved);
  }

  async updateCart(storeId: string, access: PublicAccess, token: string, body: Record<string, any>) {
    const ctx = await this.access.publicStore(storeId, access);
    const c = await this.cartRow(ctx, token);
    const data: Prisma.StoreCartUpdateInput = { lastActivityAt: new Date(), abandonedSentAt: null };
    if (body?.contact && typeof body.contact === 'object') {
      const cur = (c.contact ?? {}) as Record<string, unknown>;
      const phone = body.contact.phone !== undefined ? pkPhone(s(body.contact.phone, 30)) || s(body.contact.phone, 30) || null : cur.phone;
      data.contact = { ...cur, ...(body.contact.name !== undefined && { name: s(body.contact.name, 100) || null }), phone, ...(body.contact.email !== undefined && { email: s(body.contact.email, 160).toLowerCase() || null }) } as Prisma.InputJsonValue;
    }
    if (body?.address && typeof body.address === 'object') {
      const cur = (c.address ?? {}) as Record<string, unknown>;
      const a = body.address;
      data.address = {
        ...cur,
        ...(a.address !== undefined && { address: s(a.address, 400) || null }), ...(a.city !== undefined && { city: s(a.city, 80) || null }),
        ...(a.province !== undefined && { province: s(a.province, 40) || null }), ...(a.postalCode !== undefined && { postalCode: s(a.postalCode, 12) || null }),
        ...(a.landmark !== undefined && { landmark: s(a.landmark, 200) || null }),
      } as Prisma.InputJsonValue;
    }
    if (body?.notes !== undefined) data.notes = s(body.notes, 500) || null;
    if (body?.shippingRateId !== undefined) data.shippingRateId = s(body.shippingRateId, 100) || null;
    if (body?.paymentMethod !== undefined) data.paymentMethod = ['COD', 'SAFEPAY', 'JAZZCASH', 'EASYPAISA'].includes(body.paymentMethod) ? body.paymentMethod : null;
    if (body?.couponCode !== undefined) data.couponCode = body.couponCode ? s(body.couponCode, 30).toUpperCase() : null;
    const saved = await this.prisma.storeCart.update({ where: { id: c.id }, data });
    return this.present(ctx, saved);
  }

  async applyCoupon(storeId: string, access: PublicAccess, token: string, code: string) {
    const ctx = await this.access.publicStore(storeId, access);
    const c = await this.cartRow(ctx, token);
    const cart = await this.present(ctx, c);
    const r = await this.couponFor(ctx, s(code, 30), cart.subtotal, cart.contact.phone);
    if ('error' in r) return { ok: false, message: r.error, cart };
    const saved = await this.prisma.storeCart.update({ where: { id: c.id }, data: { couponCode: r.code, lastActivityAt: new Date() } });
    return { ok: true, message: r.message, cart: await this.present(ctx, saved) };
  }

  /** Store coupons (channel form coupons) first, then a personal automation code. */
  private async couponFor(ctx: StoreCtx, raw: string, subtotal: number, phone: string | null): Promise<{ code: string; discount: number; message: string; auto: { id: string } | null } | { error: string }> {
    const code = String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    if (!code) return { error: 'Enter a code' };
    const coupons = readForm(ctx.integration.config).coupons;
    const own = couponDiscount(coupons, code, subtotal);
    if (!('error' in own)) return { code, discount: own.discount, message: `Rs ${own.discount.toLocaleString('en-PK')} off`, auto: null };
    if (coupons.some((x) => x.code === code)) return { error: 'This code cannot be used on this order' };
    const auto = await findAutoCoupon(this.prisma, ctx.tenantId, code, subtotal, phone);
    if (auto && !('error' in auto)) return { code: auto.row.code, discount: auto.discount, message: `Rs ${auto.discount.toLocaleString('en-PK')} off`, auto: { id: auto.row.id } };
    return { error: 'This code is not valid' };
  }

  async rates(storeId: string, access: PublicAccess, token: string, q: { city?: string; province?: string }) {
    const ctx = await this.access.publicStore(storeId, access);
    const c = await this.cartRow(ctx, token);
    const cart = await this.present(ctx, c);
    const address = (c.address ?? {}) as Record<string, string>;
    const lines = this.readLines(c.lines);
    const info = await this.catalog.lineInfo(ctx, lines);
    const weight = lines.reduce((a, l) => a + (info.get(lineId(l))?.weightKg ?? 0) * l.quantity, 0);
    const quote = quoteRates(readShipping(ctx.store.shipping), { city: q.city ?? address.city, province: q.province ?? address.province, subtotal: cart.subtotal, weightKg: weight });
    return { rates: quote.rates, zone: quote.zone?.name ?? null, reason: quote.rates.length ? null : 'Sorry, we do not deliver to this city yet' };
  }

  // ═══ checkout ═══

  async checkout(storeId: string, access: PublicAccess, body: Record<string, any>) {
    if (body?.hp) return { orderId: '—', orderNumber: '—', orderToken: '', total: 0, paymentMethod: 'COD', payment: { required: false, kind: null, amount: 0, url: null }, whatsappConfirmUrl: null, trackUrl: '/' };
    const ctx = await this.access.publicStore(storeId, access);
    const controls = await loadControls(this.prisma);
    if (controls.checkout.paused) throw new ServiceUnavailableException({ statusCode: 503, code: 'CHECKOUT_PAUSED', message: controls.checkout.message ?? 'Checkout is paused for a short while. Please try again later.' });
    const settings = readCheckout(ctx.store.checkout);
    const c = await this.cartRow(ctx, String(body?.cartToken ?? ''));

    const contact = body?.contact ?? {};
    const address = body?.address ?? {};
    const name = s(contact.name, 100);
    const phone = pkPhone(s(contact.phone, 30));
    const email = s(contact.email, 160).toLowerCase();
    if (name.length < 2) throw new BadRequestException('Please enter your name');
    if (!/^03\d{9}$/.test(phone)) throw new BadRequestException('Enter a mobile number like 03001234567');
    if (settings.fields.email === 'required' && !email) throw new BadRequestException('Please enter your email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Please check your email');
    const addr = s(address.address, 400);
    const city = s(address.city, 80);
    if (addr.length < 8) throw new BadRequestException('Please enter the full address (house, street, area)');
    if (city.length < 2) throw new BadRequestException('Please choose your city');
    if (settings.fields.province === 'required' && !s(address.province, 40)) throw new BadRequestException('Please choose your province');
    if (settings.fields.postalCode === 'required' && !s(address.postalCode, 12)) throw new BadRequestException('Please enter your postal code');
    let customerId: string | null = null;
    if (settings.loginMode === 'required') {
      const sess = readToken<{ s: string; c: string }>('customer', body?.customerToken);
      if (!sess || sess.s !== ctx.store.id) throw new HttpException({ statusCode: 401, code: 'LOGIN_REQUIRED', message: 'Please sign in to place an order' }, HttpStatus.UNAUTHORIZED);
      customerId = sess.c;
    }

    // Save what the buyer typed, then price everything again from Nafaa.
    await this.prisma.storeCart.update({
      where: { id: c.id },
      data: {
        contact: { name, phone, email: email || null } as Prisma.InputJsonValue,
        address: { address: addr, city, province: s(address.province, 40) || null, postalCode: s(address.postalCode, 12) || null, landmark: s(address.landmark, 200) || null } as Prisma.InputJsonValue,
        shippingRateId: s(body?.shippingRateId, 100) || null, paymentMethod: String(body?.paymentMethod ?? 'COD').toUpperCase(), notes: s(body?.notes, 500) || null, lastActivityAt: new Date(),
      },
    });
    const fresh = await this.cartRow(ctx, c.token);
    const cart = await this.present(ctx, fresh);
    const bad = cart.lines.filter((l) => l.problem);
    if (!cart.lines.length) throw new BadRequestException('Your cart is empty');
    if (bad.length) throw new ConflictException({ statusCode: 409, code: 'OUT_OF_STOCK', message: 'Some items in your cart changed. Please check your cart.', lines: bad.map((l) => ({ lineId: l.lineId, available: l.maxQty })) });
    if (!cart.shipping) throw new BadRequestException('Please choose a delivery option');
    if (settings.minOrder && cart.subtotal < settings.minOrder) throw new BadRequestException(`Minimum order is Rs ${settings.minOrder.toLocaleString('en-PK')}`);
    if (Number.isFinite(Number(body?.expectedTotal)) && Math.abs(Number(body.expectedTotal) - cart.total) > 0.5) {
      throw new ConflictException({ statusCode: 409, code: 'PRICE_CHANGED', message: 'Prices changed since you opened checkout. Please review the new total.', cart });
    }
    if (cart.couponError) throw new BadRequestException(cart.couponError);

    const method = String(body?.paymentMethod ?? 'COD').toUpperCase() as PayCode;
    const quote = (await this.rates(storeId, access, c.token, { city, province: s(address.province, 40) })).rates.find((r) => r.id === cart.shipping!.rateId);
    await this.assertPayment(ctx, settings, controls.payments, method, cart.total, quote?.codAvailable ?? false);

    const orderNo = `NS${Date.now().toString(36).toUpperCase().slice(-6)}${crypto.randomBytes(1).toString('hex').toUpperCase()}`;
    const attribution = { ...((c.attribution ?? {}) as Record<string, unknown>), ...(cart.coupon && { discountCodes: [cart.coupon.code] }) };
    const order: NormalizedOrder = {
      platform: 'custom',
      externalOrderId: orderNo,
      externalOrderNumber: orderNo,
      customerName: name,
      customerPhone: phone,
      customerEmail: email || undefined,
      customerAddress: [addr, s(address.landmark, 200)].filter(Boolean).join(', '),
      customerCity: city,
      items: cart.lines.map((l) => ({ name: l.title, variant: l.variantTitle ?? undefined, sku: undefined, quantity: l.quantity, price: l.price, image: l.image ?? undefined, productId: l.productId, variantId: l.variantId })) as any,
      subtotal: cart.subtotal,
      deliveryFee: r2(cart.shipping.price + cart.codFee),
      discount: cart.discount,
      total: cart.total,
      paymentMethod: method === 'COD' ? 'cod' : method.toLowerCase(),
      paymentStatus: 'PENDING',
      cancelled: false,
      notes: s(body?.notes, 500) || undefined,
      paymentTitle: method === 'COD' ? 'Cash on delivery' : `Online payment (${method})`,
      shippingMethod: `Nafaa Store · ${cart.shipping.name}`,
      attribution: attribution as any,
    };
    const saved = await this.orders.receive(ctx.integration, order, { signed: true });
    await this.prisma.channelOrder.update({
      where: { id: saved.id },
      data: { metadata: { ...((saved.metadata ?? {}) as object), platform: 'nafaa_store', storeId: ctx.store.id, cartId: c.id, codFee: cart.codFee } as Prisma.InputJsonValue },
    }).catch(() => null);

    const coupon = cart.coupon ? await this.couponFor(ctx, cart.coupon.code, cart.subtotal, phone) : null;
    if (coupon && 'auto' in coupon && coupon.auto) await markCouponUsed(this.prisma, coupon.auto.id, saved.id, order.total).catch(() => null);
    else if (coupon && 'code' in coupon) await this.bumpFormCoupon(ctx, coupon.code);

    await this.prisma.storeCart.update({ where: { id: c.id }, data: { status: 'CONVERTED', channelOrderId: saved.id } });
    await this.rememberCustomer(ctx, { name, phone, email: email || null, acceptsMarketing: body?.acceptsMarketing === true, customerId });
    this.analytics.purchase(ctx.store.id, ctx.tenantId, order.total);

    const payment = await this.paymentFor(ctx, settings, saved.id, method, order.total, phone);
    const token = signToken('order', { s: ctx.store.id, o: saved.id }, ORDER_TOKEN_TTL).token;
    return {
      orderId: saved.id,
      orderNumber: orderNo,
      orderToken: token,
      total: order.total,
      paymentMethod: method,
      payment,
      whatsappConfirmUrl: method === 'COD' && settings.codConfirmWhatsApp ? this.waLink(ctx, settings, `Assalam o Alaikum! I placed order #${orderNo} (Rs ${Math.round(order.total).toLocaleString('en-PK')}) on ${ctx.store.name}. Please confirm it.`) : null,
      trackUrl: `/account/track?no=${orderNo}`,
    };
  }

  private async assertPayment(ctx: StoreCtx, settings: CheckoutSettings, allowed: Record<PayCode, boolean>, method: PayCode, total: number, zoneCod: boolean) {
    if (method === 'COD') {
      if (!settings.payments.cod || !allowed.COD || !zoneCod) throw new BadRequestException('Cash on delivery is not available for this order');
      if (settings.maxCodOrder && total > settings.maxCodOrder) throw new BadRequestException(`Cash on delivery is available up to Rs ${settings.maxCodOrder.toLocaleString('en-PK')}. Please pay online.`);
      return;
    }
    if (!['SAFEPAY', 'JAZZCASH', 'EASYPAISA'].includes(method) || !settings.payments[method as 'SAFEPAY'] || !allowed[method]) throw new BadRequestException('This payment method is not available');
    const active = await this.payments.activeGateways(ctx.tenantId);
    if (!active.some((g) => g.code === method)) throw new BadRequestException('This payment method is not available');
  }

  /** Online payment link, or an advance for risky / always-advance COD orders. */
  private async paymentFor(ctx: StoreCtx, settings: CheckoutSettings, orderId: string, method: PayCode, total: number, phone: string) {
    const none = { required: false, kind: null as 'FULL' | 'ADVANCE' | null, amount: 0, url: null as string | null };
    try {
      if (method !== 'COD') {
        const link = await this.payments.createForCheckout(ctx.tenantId, orderId, method, total, 'FULL');
        return { required: true, kind: 'FULL' as const, amount: link.amount, url: link.url };
      }
      const adv = settings.advance;
      if (adv.mode === 'off' || (adv.minOrder && total < adv.minOrder)) return none;
      let percent = adv.percent;
      if (adv.mode === 'shop_rule') {
        const rule = await this.tools.riskSettings(ctx.tenantId);
        if (!rule.askAdvance) return none;
        const risk = (await this.orders.customerRisk(ctx.tenantId, [phone], [orderId]))?.get(phoneKey(phone) ?? '');
        if (!risk || (risk.level !== 'HIGH' && risk.level !== 'BLOCKED')) return none;
        percent = rule.advancePct;
      }
      const gateway = (await this.payments.activeGateways(ctx.tenantId)).find((g) => settings.payments[g.code as 'SAFEPAY']);
      if (!gateway) return none;
      const amount = Math.max(1, Math.round((total * percent) / 100));
      const link = await this.payments.createForCheckout(ctx.tenantId, orderId, gateway.code, amount, 'ADVANCE');
      return { required: true, kind: 'ADVANCE' as const, amount, url: link.url };
    } catch (e: any) {
      this.logger.warn(`Store payment link ${orderId}: ${e?.message}`);
      return none;
    }
  }

  private async bumpFormCoupon(ctx: StoreCtx, code: string) {
    const fresh = await this.prisma.integration.findUnique({ where: { id: ctx.integration.id }, select: { config: true } });
    const form = readForm(fresh?.config);
    if (!form.coupons.some((x) => x.code === code)) return;
    form.coupons = form.coupons.map((x) => (x.code === code ? { ...x, uses: x.uses + 1 } : x));
    await this.prisma.integration.update({ where: { id: ctx.integration.id }, data: { config: { ...((fresh?.config as object) ?? {}), form } as unknown as Prisma.InputJsonValue } }).catch(() => null);
  }

  /** Store customer by phone, linked to the shop's Customer with the same phone. */
  async rememberCustomer(ctx: StoreCtx, c: { name: string | null; phone: string | null; email: string | null; acceptsMarketing: boolean; customerId?: string | null; source?: string }) {
    try {
      const shopCustomer = c.phone ? await this.prisma.customer.findFirst({ where: { tenantId: ctx.tenantId, isActive: true, phone: { endsWith: c.phone.slice(-10) } }, select: { id: true } }) : null;
      const existing = c.customerId
        ? await this.prisma.storeCustomer.findFirst({ where: { id: c.customerId, storeId: ctx.store.id } })
        : await this.prisma.storeCustomer.findFirst({ where: { storeId: ctx.store.id, OR: [...(c.phone ? [{ phone: c.phone }] : []), ...(c.email ? [{ email: c.email }] : [])] } });
      if (existing) {
        await this.prisma.storeCustomer.update({
          where: { id: existing.id },
          data: {
            name: existing.name ?? c.name, phone: existing.phone ?? c.phone, email: existing.email ?? c.email,
            acceptsMarketing: existing.acceptsMarketing || c.acceptsMarketing, customerId: existing.customerId ?? shopCustomer?.id ?? null,
          },
        });
        return existing.id;
      }
      const row = await this.prisma.storeCustomer.create({
        data: { storeId: ctx.store.id, tenantId: ctx.tenantId, name: c.name, phone: c.phone, email: c.email, acceptsMarketing: c.acceptsMarketing, customerId: shopCustomer?.id ?? null, source: c.source ?? 'CHECKOUT' },
      });
      return row.id;
    } catch (e: any) {
      this.logger.warn(`Store customer: ${e?.message}`);
      return null;
    }
  }

  waLink(ctx: StoreCtx, settings: CheckoutSettings, text: string) {
    const raw = settings.whatsappNumber ?? ctx.settings.whatsappButton.number ?? ctx.settings.contact.whatsapp ?? ctx.settings.contact.phone;
    if (!raw) return null;
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('0')) d = `92${d.slice(1)}`;
    if (d.length < 10) return null;
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  }

  // ═══ orders ═══

  async orderByToken(storeId: string, access: PublicAccess, token: string) {
    const ctx = await this.access.publicStore(storeId, access, true);
    const t = readToken<{ s: string; o: string }>('order', token);
    if (!t || t.s !== ctx.store.id) throw new NotFoundException('Order not found');
    const o = await this.prisma.channelOrder.findFirst({ where: { id: t.o, integrationId: ctx.integration.id } });
    if (!o) throw new NotFoundException('Order not found');
    const settings = readCheckout(ctx.store.checkout);
    const meta = (o.metadata ?? {}) as Record<string, any>;
    const pending = ((meta.payments ?? []) as Array<{ status: string; amount: number; kind: 'FULL' | 'ADVANCE'; ref: string }>).find((p) => p.status === 'PENDING');
    const no = String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
    const codFee = n(meta.codFee);
    return {
      orderNumber: no,
      status: o.orderStatus,
      statusLabel: STATUS_LABEL[o.orderStatus] ?? o.orderStatus,
      createdAt: o.receivedAt.toISOString(),
      total: n(o.total), subtotal: n(o.subtotal), discount: n(o.discount), shipping: r2(n(o.deliveryFee) - codFee), codFee,
      paymentMethod: (o.paymentMethod ?? 'cod').toUpperCase(),
      paid: o.paymentStatus === 'PAID',
      payment: pending ? { required: true, kind: pending.kind, amount: pending.amount, url: null } : { required: false, kind: null, amount: 0, url: null },
      lines: ((o.items ?? []) as Array<any>).map((i) => ({ title: i.name, variantTitle: i.variant ?? null, quantity: n(i.quantity), price: n(i.price), image: i.image ?? null })),
      contact: { name: o.customerName, phone: o.customerPhone ? `${o.customerPhone.slice(0, 4)}•••${o.customerPhone.slice(-3)}` : null },
      address: { city: o.customerCity },
      whatsappConfirmUrl: (o.paymentMethod ?? 'cod') === 'cod' && settings.codConfirmWhatsApp ? this.waLink(ctx, settings, `Assalam o Alaikum! I placed order #${no} on ${ctx.store.name}. Please confirm it.`) : null,
      trackUrl: `/account/track?no=${no}`,
      thankYouMessage: settings.thankYouMessage,
    };
  }

  /** Order number + last 4 of the phone → status only (no address or items). */
  async track(storeId: string, access: PublicAccess, q: { no?: string; phone?: string }) {
    const ctx = await this.access.publicStore(storeId, access, true);
    const no = String(q?.no ?? '').trim().toUpperCase().replace(/^#/, '').slice(0, 40);
    const last4 = String(q?.phone ?? '').replace(/\D/g, '').slice(-4);
    if (!no || last4.length !== 4) throw new BadRequestException('Enter the order number and the last 4 digits of your phone');
    const o = await this.prisma.channelOrder.findFirst({
      where: { integrationId: ctx.integration.id, OR: [{ externalOrderId: no }, { externalOrderNumber: no }] },
      select: { orderStatus: true, paymentStatus: true, customerPhone: true, receivedAt: true, acceptedAt: true, dispatchedAt: true, deliveredAt: true, cancelledAt: true, returnedAt: true, total: true, courierCode: true, courierName: true, trackingNumber: true, customerCity: true, courierBookedAt: true, metadata: true },
    });
    if (!o || !String(o.customerPhone ?? '').replace(/\D/g, '').endsWith(last4)) throw new NotFoundException('Order not found. Please check the order number and phone.');
    return {
      status: o.orderStatus,
      label: STATUS_LABEL[o.orderStatus] ?? o.orderStatus,
      total: n(o.total),
      paid: o.paymentStatus === 'PAID',
      steps: [
        { key: 'received', label: 'Order received', at: o.receivedAt }, { key: 'confirmed', label: 'Confirmed', at: o.acceptedAt },
        { key: 'dispatched', label: 'Handed to courier', at: o.dispatchedAt }, { key: 'delivered', label: 'Delivered', at: o.deliveredAt },
      ],
      closed: o.cancelledAt || o.returnedAt ? { label: STATUS_LABEL[o.orderStatus], at: o.cancelledAt ?? o.returnedAt } : null,
      courier: o.trackingNumber ? { name: o.courierName ?? courierName(o.courierCode) ?? 'Courier', trackingNumber: o.trackingNumber, site: courierLink(o.courierCode, o.trackingNumber) } : null,
      journey: o.trackingNumber ? publicJourney(journeyOf({
        events: Array.isArray((o.metadata as any)?.courierTrail?.events) ? (o.metadata as any).courierTrail.events : [],
        orderStatus: o.orderStatus, bookedAt: o.courierBookedAt, dispatchedAt: o.dispatchedAt, deliveredAt: o.deliveredAt, returnedAt: o.returnedAt, originCity: null, destinationCity: o.customerCity,
      })) : null,
    };
  }

  /** Existing customer portal link (returns, exchanges, tracking) for one order. */
  async portalLink(ctx: StoreCtx, orderId: string) {
    const actor = await this.orders.systemActor(ctx.tenantId);
    const r = await this.portal.makeLink(actor, new ShopScope(null, true), { orderId, kind: 'ORDER' });
    return { url: r.url };
  }

  // ═══ abandoned carts ═══

  /** Idle carts with a phone or email go to Online orders → Abandoned carts. */
  @Cron('0 */10 * * * *')
  async abandonedSweep() {
    if (process.env.DISABLE_STORE_JOBS === '1') return;
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
    const carts = await this.prisma.storeCart.findMany({
      where: { status: 'OPEN', abandonedSentAt: null, lastActivityAt: { lt: cutoff, gt: new Date(Date.now() - 7 * 86_400_000) }, contact: { not: Prisma.DbNull } },
      take: 200,
    });
    for (const c of carts) {
      try {
        const contact = (c.contact ?? {}) as Record<string, string | null>;
        if (!contact.phone && !contact.email) {
          await this.prisma.storeCart.update({ where: { id: c.id }, data: { abandonedSentAt: new Date() } });
          continue;
        }
        const ctx = await this.access.publicStore(c.storeId, {}, true).catch(() => null);
        if (!ctx) continue;
        const cart = await this.present(ctx, c);
        if (!cart.lines.length) continue;
        const base = await this.access.storeBase(ctx.store);
        await this.abandoned.fromWebsite(ctx.integration, {
          checkout: {
            id: `store-${c.id}`, customer: { name: contact.name, phone: contact.phone, email: contact.email, city: ((c.address ?? {}) as any).city },
            items: cart.lines.map((l) => ({ name: l.title, quantity: l.quantity, price: l.price, variant: l.variantTitle })),
            total: cart.total, currency: 'PKR', recovery_url: `${base}/cart/${c.token}`, abandoned_at: c.lastActivityAt.toISOString(),
          },
        });
        await this.prisma.storeCart.update({ where: { id: c.id }, data: { abandonedSentAt: new Date() } });
      } catch (e: any) {
        this.logger.warn(`Abandoned store cart ${c.id}: ${e?.message}`);
      }
    }
  }
}
