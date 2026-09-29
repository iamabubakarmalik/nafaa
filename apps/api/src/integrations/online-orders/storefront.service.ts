import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Integration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { NormalizedOrder } from './order-normalizer';
import { readWebsiteConfig } from './website-config';
import { pkPhone } from './courier-api/postex.adapter';
import { COURIERS, courierName } from './couriers';

const courierLabel = (c?: string | null) => courierName(c) ?? 'Courier';
const courierSite = (c?: string | null) => COURIERS.find((x) => x.code === c)?.site ?? null;

export interface Coupon {
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minOrder: number | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
}

/** Order form / Buy button ki settings — Integration.config.form me */
export interface FormConfig {
  enabled: boolean;
  key: string | null;
  deliveryFee: number;
  freeAbove: number | null;
  onlyInStock: boolean;
  message: string | null;
  /** null = sab active products */
  productIds: string[] | null;
  /** Form ka rang (#hex) aur logo (https) */
  accent: string | null;
  logoUrl: string | null;
  /** Form par dukaan ka WhatsApp number dikhao (sawal ke liye) */
  showPhone: boolean;
  coupons: Coupon[];
}

const DEFAULT_FORM: FormConfig = {
  enabled: false, key: null, deliveryFee: 0, freeAbove: null, onlyInStock: true, message: null, productIds: null,
  accent: null, logoUrl: null, showPhone: false, coupons: [],
};
const INVITE_TTL_MS = 7 * 86_400_000;

export const readForm = (config: unknown): FormConfig => {
  const f = ((config as any)?.form ?? {}) as Partial<FormConfig>;
  return {
    ...DEFAULT_FORM,
    ...f,
    deliveryFee: Math.max(0, Number(f.deliveryFee ?? 0) || 0),
    freeAbove: f.freeAbove ? Math.max(0, Number(f.freeAbove) || 0) || null : null,
    onlyInStock: f.onlyInStock !== false,
    productIds: Array.isArray(f.productIds) && f.productIds.length ? f.productIds.slice(0, 500) : null,
    accent: typeof f.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(f.accent) ? f.accent : null,
    logoUrl: typeof f.logoUrl === 'string' && /^https:\/\//.test(f.logoUrl) ? f.logoUrl.slice(0, 500) : null,
    showPhone: f.showPhone === true,
    coupons: Array.isArray(f.coupons) ? f.coupons.slice(0, 50) : [],
  };
};

const cleanCode = (c: unknown) => String(c ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

/** Coupon ka discount — null = nahi chalta (wajah ke saath) */
export function couponDiscount(coupons: Coupon[], code: string, subtotal: number): { discount: number; coupon: Coupon } | { error: string } {
  const c = coupons.find((x) => x.code === cleanCode(code));
  if (!c || !c.active) return { error: 'Ye code sahi nahi' };
  if (c.maxUses && c.uses >= c.maxUses) return { error: 'Ye code khatam ho chuka' };
  if (c.minOrder && subtotal < c.minOrder) return { error: `Ye code Rs ${c.minOrder.toLocaleString('en-PK')} ya zyada ke order par chalta hai` };
  const d = c.type === 'PERCENT' ? Math.round((subtotal * Math.min(100, c.value)) / 100) : Math.round(c.value);
  return { discount: Math.max(0, Math.min(subtotal, d)), coupon: c };
}

const secret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-invite';
const sign = (s: string) => crypto.createHmac('sha256', secret()).update(s).digest('base64url').slice(0, 32);
/** Key badli to purana invite link khud band */
const keyPrint = (apiKey: string | null) => crypto.createHash('sha256').update(apiKey ?? '').digest('base64url').slice(0, 10);

/**
 * Custom website ke "code ke bina" raaste:
 *  1) Order form link + Buy button (embed) — qeemat hamesha Nafaa se
 *  2) Developer invite link — keys + tayyar code + live test, WhatsApp par
 */
@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly setup: WebsiteSetupService,
  ) {}

  webBase() {
    return (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN — form chalu / band / settings
  // ═══════════════════════════════════════════════════════════

  async formSettings(user: AuthenticatedUser, channelId: string) {
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    return this.presentForm(ch);
  }

  async updateForm(user: AuthenticatedUser, channelId: string, body: Partial<FormConfig> & { regenerate?: boolean }) {
    this.setup.assertCanManage(user);
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = (ch.config ?? {}) as any;
    const cur = readForm(cfg);
    const next: FormConfig = { ...cur };
    if (body.enabled !== undefined) next.enabled = !!body.enabled;
    if (body.deliveryFee !== undefined) next.deliveryFee = Math.min(5000, Math.max(0, Math.round(Number(body.deliveryFee) || 0)));
    if (body.freeAbove !== undefined) next.freeAbove = body.freeAbove ? Math.max(0, Math.round(Number(body.freeAbove) || 0)) || null : null;
    if (body.onlyInStock !== undefined) next.onlyInStock = !!body.onlyInStock;
    if (body.message !== undefined) next.message = body.message ? String(body.message).trim().slice(0, 300) || null : null;
    if (body.productIds !== undefined) next.productIds = Array.isArray(body.productIds) && body.productIds.length ? body.productIds.map(String).slice(0, 500) : null;
    if (body.accent !== undefined) next.accent = body.accent && /^#[0-9a-fA-F]{6}$/.test(String(body.accent)) ? String(body.accent) : null;
    if (body.logoUrl !== undefined) {
      if (body.logoUrl && !/^https:\/\//.test(String(body.logoUrl))) throw new BadRequestException('Logo ka link https:// se shuru ho');
      next.logoUrl = body.logoUrl ? String(body.logoUrl).slice(0, 500) : null;
    }
    if (body.showPhone !== undefined) next.showPhone = !!body.showPhone;
    if (body.coupons !== undefined) {
      const seen = new Set<string>();
      next.coupons = (Array.isArray(body.coupons) ? body.coupons : []).slice(0, 50).map((c: any) => {
        const code = cleanCode(c?.code);
        if (code.length < 3) throw new BadRequestException('Coupon code kam az kam 3 harf / number');
        if (seen.has(code)) throw new BadRequestException(`${code} do dafa likha hai`);
        seen.add(code);
        const type = c?.type === 'FLAT' ? 'FLAT' : 'PERCENT';
        const value = Number(c?.value);
        if (!(value > 0) || (type === 'PERCENT' && value > 90)) throw new BadRequestException(`${code}: discount ${type === 'PERCENT' ? '1–90%' : 'Rs 1 se zyada'} ho`);
        const old = cur.coupons.find((x) => x.code === code);
        return {
          code, type, value: Math.round(value),
          minOrder: c?.minOrder ? Math.max(0, Math.round(Number(c.minOrder))) || null : null,
          maxUses: c?.maxUses ? Math.max(1, Math.round(Number(c.maxUses))) || null : null,
          uses: old?.uses ?? 0,
          active: c?.active !== false,
        } as Coupon;
      });
    }
    if (!next.key || body.regenerate) next.key = `f_${crypto.randomBytes(12).toString('base64url')}`;
    const updated = await this.prisma.integration.update({ where: { id: ch.id }, data: { config: { ...cfg, form: next } as any } });
    return this.presentForm(updated);
  }

  private presentForm(ch: Integration) {
    const f = readForm(ch.config);
    const base = this.webBase();
    const api = this.setup.apiBase();
    return {
      ...f,
      formUrl: f.key ? `${base}/order/${f.key}` : null,
      embedCode: f.key
        ? `<script src="${api}/integrations/website/v1/embed.js" data-nafaa="${f.key}" defer></script>`
        : null,
      buttonCode: `<button data-nafaa-buy="PRODUCT-SKU">Order karein</button>`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC — order form (koi login nahi)
  // ═══════════════════════════════════════════════════════════

  private async channelByFormKey(key: string) {
    if (!key || !/^f_[A-Za-z0-9_-]{8,40}$/.test(key)) throw new NotFoundException('Ye order form nahi mila');
    const ch = await this.prisma.integration.findFirst({
      where: { isActive: true, config: { path: ['form', 'key'], equals: key } },
    });
    if (!ch || !readForm(ch.config).enabled) throw new NotFoundException('Ye order form band hai');
    return ch;
  }

  async publicCatalog(key: string) {
    const ch = await this.channelByFormKey(key);
    const f = readForm(ch.config);
    const cfg = readWebsiteConfig(ch.config);
    const shopId = cfg.shopId ?? ch.shopId;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: ch.tenantId }, select: { name: true, phone: true } as any });
    const products = await this.prisma.product.findMany({
      where: { tenantId: ch.tenantId, isActive: true, price: { gt: 0 }, ...(f.productIds ? { id: { in: f.productIds } } : {}) },
      select: {
        id: true, name: true, sku: true, price: true, description: true, hasVariants: true, category: { select: { name: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, sku: true, price: true } },
      },
      orderBy: { name: 'asc' },
      take: 400,
    });
    const stocks = shopId
      ? await this.prisma.shopStock.findMany({ where: { shopId, productId: { in: products.map((p) => p.id) } }, select: { productId: true, variantId: true, stock: true } })
      : [];
    const stockOf = (pid: string, vid: string | null) => Number(stocks.find((s) => s.productId === pid && (s.variantId ?? null) === vid)?.stock ?? 0);

    const list = products.flatMap((p) => {
      const opts = p.hasVariants && p.variants.length
        ? p.variants.map((v) => ({ variantId: v.id, name: v.name, sku: v.sku ?? p.sku, price: Number(v.price || p.price), stock: stockOf(p.id, v.id) }))
        : [{ variantId: null as string | null, name: null as string | null, sku: p.sku, price: Number(p.price), stock: stockOf(p.id, null) }];
      const shown = f.onlyInStock ? opts.filter((o) => o.stock > 0) : opts;
      if (!shown.length) return [];
      return [{
        id: p.id,
        name: p.name,
        category: p.category?.name ?? null,
        description: p.description ? p.description.slice(0, 300) : null,
        image: p.images[0]?.url ?? null,
        options: shown.map((o) => ({ variantId: o.variantId, name: o.name, sku: o.sku, price: o.price, inStock: o.stock > 0, maxQty: Math.max(1, Math.min(50, Math.floor(o.stock) || 50)) })),
      }];
    });
    return {
      shop: (tenant as any)?.name ?? ch.displayName,
      channel: ch.displayName,
      deliveryFee: f.deliveryFee,
      freeAbove: f.freeAbove,
      message: f.message,
      accent: f.accent,
      logoUrl: f.logoUrl,
      phone: f.showPhone ? (tenant as any)?.phone ?? null : null,
      hasCoupons: f.coupons.some((c) => c.active),
      categories: [...new Set(list.map((p) => p.category).filter(Boolean))].sort(),
      products: list,
    };
  }

  /** Form se order — qeemat DB se, customer ki bheji qeemat kabhi nahi */
  async publicOrder(key: string, body: any) {
    // Bots ke liye chhupa khana — bhara ho to chup chaap "ok" (bot ko pata na chale)
    if (body?.website || body?.hp) return { success: true, orderNumber: '—' };
    const ch = await this.channelByFormKey(key);
    const f = readForm(ch.config);

    const c = body?.customer ?? {};
    const name = String(c.name ?? '').trim().slice(0, 100);
    const phone = pkPhone(String(c.phone ?? ''));
    const address = String(c.address ?? '').trim().slice(0, 400);
    const city = String(c.city ?? '').trim().slice(0, 80);
    if (name.length < 2) throw new BadRequestException('Apna naam likhein');
    if (!/^03\d{9}$/.test(phone)) throw new BadRequestException('Mobile number 03xxxxxxxxx jaisa likhein');
    if (address.length < 8) throw new BadRequestException('Poora address likhein (ghar #, gali, area)');
    if (city.length < 2) throw new BadRequestException('Shehar likhein');

    const lines = (Array.isArray(body?.items) ? body.items : []).slice(0, 30);
    if (!lines.length) throw new BadRequestException('Koi cheez nahi chuni');
    const productIds = [...new Set(lines.map((l: any) => String(l?.productId ?? '')))].filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: ch.tenantId, isActive: true, ...(f.productIds ? { id: { in: productIds.filter((id) => f.productIds!.includes(id)) } } : {}) },
      select: { id: true, name: true, sku: true, price: true, hasVariants: true, variants: { where: { isActive: true }, select: { id: true, name: true, sku: true, price: true } }, images: { take: 1, select: { url: true } } },
    });
    const items = lines.map((l: any) => {
      const p = products.find((x) => x.id === String(l?.productId));
      if (!p) throw new BadRequestException('Ek cheez ab dastiyab nahi — page refresh karein');
      const qty = Math.min(50, Math.max(1, Math.floor(Number(l?.quantity) || 1)));
      const v = l?.variantId ? p.variants.find((x) => x.id === String(l.variantId)) : null;
      if (p.hasVariants && p.variants.length && !v) throw new BadRequestException(`${p.name}: size / rang chunein`);
      return {
        name: p.name,
        variant: v?.name,
        sku: v?.sku ?? p.sku ?? undefined,
        quantity: qty,
        price: Number(v?.price || p.price),
        image: p.images[0]?.url,
        productId: p.id,
        variantId: v?.id ?? null,
      };
    });

    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const deliveryFee = f.freeAbove && subtotal >= f.freeAbove ? 0 : f.deliveryFee;
    let discount = 0;
    let usedCoupon: Coupon | null = null;
    if (body?.coupon) {
      const r = couponDiscount(f.coupons, String(body.coupon), subtotal);
      if ('error' in r) throw new BadRequestException(r.error);
      discount = r.discount;
      usedCoupon = r.coupon;
    }
    const ref = `NF${Date.now().toString(36).toUpperCase().slice(-6)}${crypto.randomBytes(1).toString('hex').toUpperCase()}`;
    const order: NormalizedOrder = {
      platform: 'custom',
      externalOrderId: ref,
      externalOrderNumber: ref,
      customerName: name,
      customerPhone: phone,
      customerEmail: c.email ? String(c.email).trim().slice(0, 120) : undefined,
      customerAddress: address,
      customerCity: city,
      items: items as any,
      subtotal,
      deliveryFee,
      discount,
      total: subtotal - discount + deliveryFee,
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      cancelled: false,
      notes: body?.notes ? String(body.notes).trim().slice(0, 500) : undefined,
      paymentTitle: 'Cash on delivery',
      shippingMethod: usedCoupon ? `Nafaa order form · code ${usedCoupon.code}` : 'Nafaa order form',
    };
    const saved = await this.orders.receive(ch, order, { signed: false });
    if (usedCoupon) {
      // Coupon kitni dafa chala — maxUses ke liye
      const fresh = await this.prisma.integration.findUnique({ where: { id: ch.id }, select: { config: true } });
      const fc = readForm(fresh?.config);
      fc.coupons = fc.coupons.map((c) => (c.code === usedCoupon!.code ? { ...c, uses: c.uses + 1 } : c));
      await this.prisma.integration.update({ where: { id: ch.id }, data: { config: { ...((fresh?.config as any) ?? {}), form: fc } as any } }).catch(() => null);
    }
    await this.prisma.integration.update({ where: { id: ch.id }, data: { lastSyncAt: new Date(), webhookVerified: true } }).catch(() => null);
    return { success: true, orderNumber: ref, total: order.total, message: f.message, id: saved.id };
  }

  /** Checkout par code check — asal hisaab order ke waqt dobara hota hai */
  async checkCoupon(key: string, body: { code?: string; subtotal?: number }) {
    const ch = await this.channelByFormKey(key);
    const r = couponDiscount(readForm(ch.config).coupons, String(body?.code ?? ''), Math.max(0, Number(body?.subtotal) || 0));
    if ('error' in r) return { ok: false, message: r.error };
    return { ok: true, code: r.coupon.code, discount: r.discount, message: r.coupon.type === 'PERCENT' ? `${r.coupon.value}% discount laga` : `Rs ${r.coupon.value} discount laga` };
  }

  /**
   * Customer: "mera order kahan hai" — order # + phone ke aakhri 4 hindse.
   * Sirf wahi order, sirf status (address / items nahi) — koi aur ka data nahi.
   */
  async track(key: string, q: { no?: string; phone?: string }) {
    const ch = await this.channelByFormKey(key);
    const no = String(q?.no ?? '').trim().toUpperCase().replace(/^#/, '').slice(0, 40);
    const last4 = String(q?.phone ?? '').replace(/\D/g, '').slice(-4);
    if (!no || last4.length !== 4) throw new BadRequestException('Order # aur phone ke aakhri 4 hindse likhein');
    const o = await this.prisma.channelOrder.findFirst({
      where: { integrationId: ch.id, OR: [{ externalOrderId: no }, { externalOrderNumber: no }] },
      select: {
        orderStatus: true, paymentStatus: true, customerPhone: true, receivedAt: true, acceptedAt: true, dispatchedAt: true,
        deliveredAt: true, cancelledAt: true, returnedAt: true, total: true, courierCode: true, courierName: true, trackingNumber: true,
      },
    });
    const phoneOk = !!o && String(o.customerPhone ?? '').replace(/\D/g, '').endsWith(last4);
    if (!o || !phoneOk) throw new NotFoundException('Ye order nahi mila — order # aur phone check karein');
    const label: Record<string, string> = {
      PENDING: 'Order mil gaya — confirm ho raha hai', ACCEPTING: 'Confirm ho raha hai', CONFIRMED: 'Confirm ho gaya',
      PREPARING: 'Tayyar ho raha hai', READY: 'Pack ho gaya', OUT_FOR_DELIVERY: 'Raste me hai', DELIVERED: 'Deliver ho gaya',
      CANCELLED: 'Cancel ho gaya', REJECTED: 'Cancel ho gaya', RETURNED: 'Wapas chala gaya',
    };
    return {
      status: o.orderStatus,
      label: label[o.orderStatus] ?? o.orderStatus,
      total: Number(o.total),
      paid: o.paymentStatus === 'PAID',
      steps: [
        { key: 'received', label: 'Order mila', at: o.receivedAt },
        { key: 'confirmed', label: 'Confirm', at: o.acceptedAt },
        { key: 'dispatched', label: 'Courier ko diya', at: o.dispatchedAt },
        { key: 'delivered', label: 'Deliver', at: o.deliveredAt },
      ],
      closed: o.cancelledAt || o.returnedAt ? { label: label[o.orderStatus], at: o.cancelledAt ?? o.returnedAt } : null,
      courier: o.trackingNumber ? { name: o.courierName ?? courierLabel(o.courierCode), trackingNumber: o.trackingNumber, site: courierSite(o.courierCode) } : null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DEVELOPER INVITE — ek link me sab (7 din)
  // ═══════════════════════════════════════════════════════════

  async createInvite(user: AuthenticatedUser, channelId: string) {
    this.setup.assertCanManage(user);
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    if (!ch.apiKey) throw new BadRequestException('Is channel ki key nahi — pehle "Nayi key" banayein');
    const exp = Date.now() + INVITE_TTL_MS;
    const payload = `${ch.id}.${exp}.${keyPrint(ch.apiKey)}`;
    const token = `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
    return { url: `${this.webBase()}/connect/dev/${token}`, expiresAt: new Date(exp).toISOString() };
  }

  private async channelByInvite(token: string) {
    const [b64, sig] = String(token ?? '').split('.');
    if (!b64 || !sig) throw new UnauthorizedException('Link ghalat hai');
    const payload = Buffer.from(b64, 'base64url').toString();
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new UnauthorizedException('Link ghalat hai');
    const [id, exp, print] = payload.split('.');
    if (!id || Number(exp) < Date.now()) throw new UnauthorizedException('Link ki muddat khatam — dukandar se naya link maangein');
    const ch = await this.prisma.integration.findUnique({ where: { id } });
    if (!ch || !ch.isActive || keyPrint(ch.apiKey) !== print) throw new UnauthorizedException('Ye link band ho chuka (key badal gayi) — dukandar se naya link maangein');
    return ch;
  }

  /** Developer ka safha: keys, URLs, aur live haal (pehla order aaya?) */
  async inviteInfo(token: string) {
    const ch = await this.channelByInvite(token);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: ch.tenantId }, select: { name: true } as any });
    const last = await this.prisma.channelOrder.findFirst({ where: { integrationId: ch.id }, orderBy: { receivedAt: 'desc' }, select: { receivedAt: true, externalOrderNumber: true, metadata: true } });
    return {
      business: (tenant as any)?.name ?? null,
      channel: ch.displayName,
      apiKey: ch.apiKey,
      secret: ch.webhookSecret,
      urls: this.setup.urls(ch.apiKey),
      connected: !!ch.webhookVerified,
      lastOrder: last ? { at: last.receivedAt, number: last.externalOrderNumber, test: !!(last.metadata as any)?.test } : null,
    };
  }

  /** Developer "Test order bhejo" dabaye — Nafaa me test order, dukandar ko ghanti */
  async inviteTest(token: string) {
    const ch = await this.channelByInvite(token);
    const r = await this.orders.createTestOrder(ch.tenantId, ch);
    return { success: true, message: 'Test order Nafaa me pahunch gaya ✅ — dukandar ko ghanti baji', id: r };
  }
}
