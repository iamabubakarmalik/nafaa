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
}

const DEFAULT_FORM: FormConfig = { enabled: false, key: null, deliveryFee: 0, freeAbove: null, onlyInStock: true, message: null, productIds: null };
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
  };
};

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
    const tenant = await this.prisma.tenant.findUnique({ where: { id: ch.tenantId }, select: { name: true } as any });
    const products = await this.prisma.product.findMany({
      where: { tenantId: ch.tenantId, isActive: true, price: { gt: 0 }, ...(f.productIds ? { id: { in: f.productIds } } : {}) },
      select: {
        id: true, name: true, sku: true, price: true, description: true, hasVariants: true,
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
      discount: 0,
      total: subtotal + deliveryFee,
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      cancelled: false,
      notes: body?.notes ? String(body.notes).trim().slice(0, 500) : undefined,
      paymentTitle: 'Cash on delivery',
      shippingMethod: 'Nafaa order form',
    };
    const saved = await this.orders.receive(ch, order, { signed: false });
    await this.prisma.integration.update({ where: { id: ch.id }, data: { lastSyncAt: new Date(), webhookVerified: true } }).catch(() => null);
    return { success: true, orderNumber: ref, total: order.total, message: f.message, id: saved.id };
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
