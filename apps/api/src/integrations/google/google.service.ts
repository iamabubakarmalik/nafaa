import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { readForm } from '../online-orders/storefront.service';
import { readWebsiteConfig } from '../online-orders/website-config';
import { FeedItem, LocalRow, localInventoryTsv, productFeedXml, validGtin } from './feed';

/* ═════════════════════════════════════════════════════════════
   GOOGLE — Merchant Center (Shopping + "dukaan me maujood") aur
   Business Profile (review link). Feed URL ek khufia token wala
   public link hai; Merchant Center roz khud parhta hai.

   Har product ka "link" (landing page) zaroori hai:
     • dukaan ki website jori ho → us product ka website URL
     • warna Nafaa order form → app.nafaa.pk/order/<key>?product=<id>
   ═════════════════════════════════════════════════════════════ */

export interface GoogleSettings {
  feedToken: string | null;
  /** Kis channel se link bane (website ya order form wala) */
  channelId: string | null;
  /** Brand khana khali ho to ye (aksar dukaan ka naam) */
  defaultBrand: string;
  includeOutOfStock: boolean;
  /** Branch → Google Business Profile ka "store code" */
  storeCodes: Record<string, string>;
  /** Google Maps Place ID — review link ke liye */
  placeId: string;
  reviewOnBill: boolean;
}

const DEFAULTS: GoogleSettings = {
  feedToken: null, channelId: null, defaultBrand: '', includeOutOfStock: false, storeCodes: {}, placeId: '', reviewOnBill: false,
};
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const key = (t: string) => `google:${t}`;
const MAX_ITEMS = 5000;

const webBase = () => (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
const apiOrigin = () => { try { return new URL(process.env.PUBLIC_API_URL || 'https://api.nafaa.pk/api').origin; } catch { return 'https://api.nafaa.pk'; } };
const absUrl = (u?: string | null) => (!u ? '' : /^https?:\/\//.test(u) ? u.replace(/^http:\/\//, 'https://') : u.startsWith('/') ? `${apiOrigin()}${u}` : '');
const stripHtml = (s?: string | null) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export const reviewLink = (placeId: string) => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

type Warn = { code: string; count: number; message: string };

@Injectable()
export class GoogleService {
  constructor(private readonly prisma: PrismaService) {}

  private assert(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Google settings sirf malik ya manager');
  }

  async read(tenantId: string): Promise<GoogleSettings> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: key(tenantId) } });
    let raw: Partial<GoogleSettings> = {};
    try { raw = row?.value ? JSON.parse(row.value) : {}; } catch { raw = {}; }
    return { ...DEFAULTS, ...raw, storeCodes: { ...(raw.storeCodes ?? {}) } };
  }

  private async write(tenantId: string, s: GoogleSettings) {
    const value = JSON.stringify(s);
    await this.prisma.systemSetting.upsert({
      where: { key: key(tenantId) },
      create: { key: key(tenantId), value, category: 'google', isPublic: false },
      update: { value },
    });
  }

  /** Channels jin se landing link ban sakta hai */
  private async landingChannels(tenantId: string) {
    const rows = await this.prisma.integration.findMany({
      where: { tenantId, isActive: true, type: { in: ['CUSTOM_WEBSITE', 'WOOCOMMERCE', 'SHOPIFY'] } },
      select: { id: true, displayName: true, type: true, config: true, shopId: true },
    });
    return rows.map((r) => {
      const form = readForm(r.config);
      return {
        id: r.id, name: r.displayName, type: r.type, shopId: readWebsiteConfig(r.config).shopId ?? r.shopId,
        form: form.enabled && form.key ? form : null,
        siteUrl: readWebsiteConfig(r.config).siteUrl,
      };
    });
  }

  async overview(user: AuthenticatedUser) {
    this.assert(user);
    const s = await this.read(user.tenantId);
    const [channels, shops] = await Promise.all([
      this.landingChannels(user.tenantId),
      this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true, address: true } }),
    ]);
    const base = s.feedToken ? `${apiOrigin()}/api/integrations/google/feed/${s.feedToken}` : null;
    let stats: { items: number; warnings: Warn[] } | null = null;
    if (s.feedToken) {
      const b = await this.buildItems(user.tenantId, s).catch((e) => ({ items: [], warnings: [{ code: 'error', count: 1, message: (e as Error).message }] }));
      stats = { items: b.items.length, warnings: b.warnings };
    }
    return {
      settings: { ...s, feedToken: undefined },
      enabled: !!s.feedToken,
      productFeedUrl: base ? `${base}/products.xml` : null,
      localInventoryUrl: base ? `${base}/local-inventory.txt` : null,
      reviewUrl: s.placeId ? reviewLink(s.placeId) : null,
      channels: channels.map((c) => ({ id: c.id, name: c.name, type: c.type, hasForm: !!c.form, siteUrl: c.siteUrl })),
      shops,
      stats,
    };
  }

  async update(user: AuthenticatedUser, body: Partial<GoogleSettings> & { enable?: boolean; rotate?: boolean }) {
    this.assert(user);
    const s = await this.read(user.tenantId);
    if (body.enable === true && !s.feedToken) s.feedToken = crypto.randomBytes(18).toString('base64url');
    if (body.enable === false) s.feedToken = null;
    if (body.rotate && s.feedToken) s.feedToken = crypto.randomBytes(18).toString('base64url');
    if (body.channelId !== undefined) {
      if (body.channelId && !(await this.landingChannels(user.tenantId)).some((c) => c.id === body.channelId)) throw new BadRequestException('Channel nahi mila');
      s.channelId = body.channelId || null;
    }
    if (body.defaultBrand !== undefined) s.defaultBrand = String(body.defaultBrand).trim().slice(0, 70);
    if (body.includeOutOfStock !== undefined) s.includeOutOfStock = !!body.includeOutOfStock;
    if (body.storeCodes !== undefined) {
      const shopIds = new Set((await this.prisma.shop.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })).map((x) => x.id));
      s.storeCodes = Object.fromEntries(Object.entries(body.storeCodes ?? {})
        .filter(([id, code]) => shopIds.has(id) && String(code ?? '').trim())
        .map(([id, code]) => [id, String(code).trim().slice(0, 64)]));
    }
    if (body.placeId !== undefined) {
      const p = String(body.placeId).trim();
      if (p && !/^[A-Za-z0-9_-]{10,200}$/.test(p)) throw new BadRequestException('Place ID sahi nahi (jaise ChIJ…)');
      s.placeId = p;
    }
    if (body.reviewOnBill !== undefined) s.reviewOnBill = !!body.reviewOnBill;
    await this.write(user.tenantId, s);
    return this.overview(user);
  }

  /** Bill par review QR (sab users ke liye — cashier bhi) */
  async review(tenantId: string) {
    const s = await this.read(tenantId);
    return { reviewUrl: s.placeId && s.reviewOnBill ? reviewLink(s.placeId) : null };
  }

  /* ─────────────────────────── FEED ─────────────────────────── */

  private async tenantByToken(token: string) {
    if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) throw new NotFoundException();
    const row = await this.prisma.systemSetting.findFirst({ where: { key: { startsWith: 'google:' }, value: { contains: `"feedToken":"${token}"` } } });
    if (!row) throw new NotFoundException();
    const tenantId = row.key.slice('google:'.length);
    const s = await this.read(tenantId);
    if (s.feedToken !== token) throw new NotFoundException();
    return { tenantId, s };
  }

  async buildItems(tenantId: string, s: GoogleSettings): Promise<{ items: FeedItem[]; warnings: Warn[]; title: string; link: string }> {
    const channels = await this.landingChannels(tenantId);
    const ch = channels.find((c) => c.id === s.channelId) ?? channels.find((c) => c.form) ?? channels[0];
    if (!ch) throw new BadRequestException('Pehle Online store me website ya order form jorein — Google ko har product ka safha chahiye');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } as any });
    const shopName = (tenant as any)?.name ?? ch.name;

    const form = ch.form;
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, price: { gt: 0 }, ...(form?.productIds ? { id: { in: form.productIds } } : {}) },
      select: {
        id: true, name: true, sku: true, barcode: true, price: true, description: true, shortDescription: true, hasVariants: true, stock: true,
        category: { select: { name: true } }, brand: { select: { name: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 6, select: { url: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, sku: true, barcode: true, price: true, stock: true, color: true, size: true, imageUrl: true } },
      },
      orderBy: { name: 'asc' },
      take: MAX_ITEMS,
    });
    const ids = products.map((p) => p.id);
    const [stocks, maps] = await Promise.all([
      this.prisma.shopStock.findMany({ where: { tenantId, productId: { in: ids }, ...(ch.shopId && { shopId: ch.shopId }) }, select: { productId: true, variantId: true, stock: true } }),
      form ? Promise.resolve([]) : this.prisma.productChannelMapping.findMany({ where: { integrationId: ch.id, productId: { in: ids } }, select: { productId: true, variantId: true, externalUrl: true } }),
    ]);
    const stockOf = (pid: string, vid: string | null, fallback: number) => {
      const rows = stocks.filter((x) => x.productId === pid && (x.variantId ?? null) === vid);
      return rows.length ? rows.reduce((t, r) => t + Number(r.stock), 0) : Number(fallback || 0);
    };
    const urlOf = (pid: string, vid: string | null) => {
      if (form) return `${webBase()}/order/${form.key}?product=${encodeURIComponent(pid)}`;
      const m = maps.find((x) => x.productId === pid && (x.variantId ?? null) === vid) ?? maps.find((x) => x.productId === pid);
      return m?.externalUrl ?? null;
    };

    const items: FeedItem[] = [];
    let noImage = 0, noLink = 0, outOfStock = 0;
    for (const p of products) {
      const images = p.images.map((i) => absUrl(i.url)).filter(Boolean);
      const opts = p.hasVariants && p.variants.length
        ? p.variants.map((v) => ({ id: `${p.id}_${v.id}`, vid: v.id as string | null, title: `${p.name} - ${v.name}`, sku: v.sku ?? p.sku, barcode: v.barcode ?? p.barcode, price: Number(v.price || p.price), stock: stockOf(p.id, v.id, v.stock), color: v.color, size: v.size, image: absUrl(v.imageUrl) }))
        : [{ id: p.id, vid: null as string | null, title: p.name, sku: p.sku, barcode: p.barcode, price: Number(p.price), stock: stockOf(p.id, null, p.stock), color: null as string | null, size: null as string | null, image: '' }];
      for (const o of opts) {
        const inStock = o.stock > 0;
        if (!inStock && (!s.includeOutOfStock || form?.onlyInStock)) { outOfStock++; continue; }
        const link = urlOf(p.id, o.vid);
        if (!link) { noLink++; continue; }
        const image = o.image || images[0];
        if (!image) { noImage++; continue; }
        items.push({
          id: o.id,
          groupId: opts.length > 1 ? p.id : undefined,
          title: o.title,
          description: stripHtml(p.description) || stripHtml(p.shortDescription) || o.title,
          link, image, extraImages: images.filter((u) => u !== image),
          price: o.price, inStock,
          brand: p.brand?.name || s.defaultBrand || shopName,
          gtin: validGtin(o.barcode),
          mpn: o.sku, productType: p.category?.name ?? null, color: o.color, size: o.size,
        });
      }
    }
    const warnings: Warn[] = [];
    if (noImage) warnings.push({ code: 'no_image', count: noImage, message: `${noImage} product ki tasveer nahi — Google tasveer ke baghair nahi leta` });
    if (noLink) warnings.push({ code: 'no_link', count: noLink, message: `${noLink} product website se jure nahi (link nahi) — Online store → Products link karein` });
    if (outOfStock) warnings.push({ code: 'out_of_stock', count: outOfStock, message: `${outOfStock} khatam stock wale shamil nahi` });
    if (products.length >= MAX_ITEMS) warnings.push({ code: 'limit', count: MAX_ITEMS, message: `Pehle ${MAX_ITEMS} products hi feed me` });
    return { items, warnings, title: shopName, link: form ? `${webBase()}/order/${form.key}` : ch.siteUrl ?? webBase() };
  }

  async productFeed(token: string) {
    const { tenantId, s } = await this.tenantByToken(token);
    const b = await this.buildItems(tenantId, s);
    return productFeedXml({ title: b.title, link: b.link, items: b.items });
  }

  async localInventory(token: string) {
    const { tenantId, s } = await this.tenantByToken(token);
    const codes = Object.entries(s.storeCodes);
    if (!codes.length) return localInventoryTsv([]);
    const { items } = await this.buildItems(tenantId, { ...s, includeOutOfStock: true });
    const shopIds = codes.map(([id]) => id);
    const stocks = await this.prisma.shopStock.findMany({
      where: { tenantId, shopId: { in: shopIds } },
      select: { shopId: true, productId: true, variantId: true, stock: true, shopPrice: true },
    });
    const byKey = new Map(stocks.map((r) => [`${r.shopId}|${r.variantId ? `${r.productId}_${r.variantId}` : r.productId}`, r]));
    const rows: LocalRow[] = [];
    for (const [shopId, storeCode] of codes) {
      for (const it of items) {
        const r = byKey.get(`${shopId}|${it.id}`);
        rows.push({ storeCode, id: it.id, quantity: r ? Number(r.stock) : 0, price: r?.shopPrice ?? it.price });
      }
    }
    return localInventoryTsv(rows);
  }
}
