import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../common/shop-scope';
import { WebsiteSetupService } from './website-setup.service';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { DarazService } from './daraz.service';
import { readWebsiteConfig } from './website-config';
import { mappingKey } from './mapping-key';
import { numericId } from './shopify.client';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { fetchIndoljMenu, IndoljCreds } from './indolj.client';
import { convertWeight, htmlToText, RemoteOption, sizeColor, variantName, weightUnit, planVariants } from './channel-import';
import { holdOnLink, HoldReason, StockHold } from './stock-handover';

/**
 * Channel ka "Products" safha:
 *
 *  • Website ke products + har variant (size/color) live laana
 *  • Har variant ke saamne: kis Nafaa product/variant se jura hai, ya salah (SKU/barcode/naam)
 *  • Jorna / hatana / sab salahen ek saath qubool
 *  • Website ke products Nafaa me (variants ke saath) — ya Nafaa ke website par
 *
 * Stock ka malik Nafaa hai: jore hue variant ka stock Nafaa se website par jata hai.
 */

export interface RemoteVariant {
  externalVariantId: string | null;   // simple WooCommerce product: null
  title: string;                      // "Small / Red", "Default"
  sku: string | null;
  barcode: string | null;
  price: number;
  /** Channel stock; null when the channel does not count it or it is unknown. */
  stock: number | null;
  image: string | null;
  /** Does the channel count stock for this item? false = untracked there; undefined = not read. */
  tracked?: boolean | null;
  /** Price customers pay now when a sale is running (Woo sale price, Daraz special price). */
  sellPrice?: number | null;
  /** Struck-out (regular) price while on sale. */
  compareAt?: number | null;
  /** Option values ("Size: M", "Color: Red"). */
  options?: RemoteOption[];
  /** Shopify inventory item id (recovery and tracking). */
  inventoryItemId?: string | null;
}

export interface RemoteProduct {
  externalProductId: string;
  title: string;
  image: string | null;
  status: string;
  hasVariants: boolean;
  variants: RemoteVariant[];
  /** Option names in order ("Size", "Color"). */
  optionNames?: string[];
}

/** Product details read only when an item is brought into Nafaa. */
export interface RemoteDetail {
  description: string | null;
  images: string[];
  brand: string | null;
  /** Category from the channel, top level first. */
  categoryPath: string[];
  tags: string[];
  weight: number | null;
  weightUnit: string | null;
  /** Per channel variant id (or '-' for a simple item). */
  variants: Record<string, { cost?: number | null; weight?: number | null; barcode?: string | null }>;
}

const emptyDetail = (): RemoteDetail => ({ description: null, images: [], brand: null, categoryPath: [], tags: [], weight: null, weightUnit: null, variants: {} });

const CACHE_MS = 2 * 60_000;

export interface LinkInput {
  externalProductId: string; externalVariantId?: string | null; productId: string; variantId?: string | null;
  externalTitle?: string | null; externalImage?: string | null; externalSku?: string | null;
  /** Channel stock the screen showed for this item (for the stock handover check). */
  externalStock?: number | null;
}

interface ImportCtx {
  tenantId: string;
  shopId: string;
  integration: Integration;
  categories: Map<string, string>;
  brands: Map<string, string>;
  tags: Map<string, string>;
}

@Injectable()
export class ChannelCatalogService {
  private readonly logger = new Logger(ChannelCatalogService.name);
  private cache = new Map<string, { at: number; data: RemoteProduct[]; holdUntil?: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
    private readonly daraz: DarazService,
  ) {}

  kind(i: Integration): 'woocommerce' | 'shopify' | 'daraz' | 'indolj' | null {
    if (this.woo.isConnected(i)) return 'woocommerce';
    if (this.shopify.isConnected(i)) return 'shopify';
    if (this.daraz.isConnected(i)) return 'daraz';
    if (this.indoljCreds(i)) return 'indolj';
    return null;
  }

  /** Drop the cached channel list (after links or imports change it). */
  /** Keeps the channel list read once for a running job (a big list is not read again per chunk). */
  holdCache(integrationId: string, ms: number) {
    const hit = this.cache.get(integrationId);
    if (hit) hit.holdUntil = Date.now() + ms;
  }

  forget(integrationId: string) {
    this.cache.delete(integrationId);
  }

  /* ─── Indolj (restaurant ordering platform) — menu ke liye keys ─── */

  private indoljCreds(i: Integration): IndoljCreds | null {
    const c = (i.config as any)?.indolj;
    if (!c?.activationToken || !c?.secret) return null;
    const secret = decrypt(c.secret);
    return secret ? { baseUrl: c.baseUrl || 'https://console.indolj.io', activationToken: c.activationToken, merchantId: String(c.merchantId ?? ''), secret, branchId: c.branchId ?? null } : null;
  }

  async connectIndolj(user: AuthenticatedUser, channelId: string, body: { baseUrl?: string; activationToken?: string; merchantId?: string; secret?: string; branchId?: string }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const prev = (integration.config as any)?.indolj ?? {};
    const baseUrl = String(body.baseUrl || prev.baseUrl || 'https://console.indolj.io').trim().replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(baseUrl)) throw new BadRequestException('Indolj ka URL https:// wala hona chahiye');
    const activationToken = String(body.activationToken ?? prev.activationToken ?? '').trim();
    const merchantId = String(body.merchantId ?? prev.merchantId ?? '').trim();
    const secret = String(body.secret ?? '').trim() || (prev.secret ? decrypt(prev.secret) ?? '' : '');
    if (!activationToken || !secret) throw new BadRequestException('Activation token aur JWT secret key zaroori (Indolj team se milte hain)');
    const creds: IndoljCreds = { baseUrl, activationToken, merchantId, secret, branchId: String(body.branchId ?? prev.branchId ?? '').trim() || null };
    // Pehle check: menu aata hai?
    const products = await fetchIndoljMenu(creds).catch((e) => { throw new BadRequestException(e?.message ?? 'Indolj se menu nahi aaya'); });
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: integration.id }, select: { config: true } });
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { config: { ...((fresh.config as any) ?? {}), indolj: { baseUrl, activationToken, merchantId, branchId: creds.branchId, secret: encrypt(secret), connectedAt: prev.connectedAt ?? new Date().toISOString() } } as any },
    });
    this.cache.delete(integration.id);
    return { ok: true, items: products.length };
  }

  async disconnectIndolj(user: AuthenticatedUser, channelId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const { indolj: _x, ...rest } = ((integration.config as any) ?? {});
    await this.prisma.integration.update({ where: { id: integration.id }, data: { config: rest as any } });
    this.cache.delete(integration.id);
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // WEBSITE KE PRODUCTS (live)
  // ═══════════════════════════════════════════════════════════

  async remoteProducts(integration: Integration, refresh = false): Promise<RemoteProduct[]> {
    const hit = this.cache.get(integration.id);
    if (!refresh && hit && (Date.now() - hit.at < CACHE_MS || Date.now() < (hit.holdUntil ?? 0))) return hit.data;
    const kind = this.kind(integration);
    // The time the read started: a price read before a push must not count as newer than that push.
    const started = Date.now();
    const data = kind === 'woocommerce' ? await this.wooProducts(integration)
      : kind === 'shopify' ? await this.shopifyProducts(integration)
        : kind === 'daraz' ? await this.daraz.remoteProducts(integration)
        : kind === 'indolj' ? await fetchIndoljMenu(this.indoljCreds(integration)!)
          : [];
    this.cache.set(integration.id, { at: started, data });
    return data;
  }

  /** When the cached channel list was read (start of the read), or null. */
  readAt(integrationId: string): number | null {
    return this.cache.get(integrationId)?.at ?? null;
  }

  /**
   * Reads a few channel products by id (after a product webhook) and puts them
   * into the cached list, so a new product is known without reading the whole
   * catalog. Without a cached list the whole list is read once. Returns the
   * products read; removed ones are dropped from the cache.
   */
  async refreshSome(integration: Integration, externalProductIds: string[]): Promise<RemoteProduct[]> {
    const ids = [...new Set(externalProductIds.map(String))].filter((x) => /^\d+$/.test(x)).slice(0, 50);
    if (!ids.length) return [];
    const hit = this.cache.get(integration.id);
    const kind = this.kind(integration);
    if (!hit || (kind !== 'shopify' && kind !== 'woocommerce')) {
      const all = await this.remoteProducts(integration, true);
      return all.filter((p) => ids.includes(p.externalProductId));
    }
    const started = Date.now();
    const fresh = kind === 'shopify' ? await this.shopifyProducts(integration, ids) : await this.wooProducts(integration, ids);
    const byId = new Map(fresh.map((p) => [p.externalProductId, p]));
    const data = hit.data.filter((p) => !ids.includes(p.externalProductId) || byId.has(p.externalProductId)).map((p) => byId.get(p.externalProductId) ?? p);
    for (const p of fresh) if (!hit.data.some((x) => x.externalProductId === p.externalProductId)) data.push(p);
    // The list keeps its old read time (older items were read then); these few are newer.
    this.cache.set(integration.id, { ...hit, data, at: Math.min(hit.at, started) });
    return fresh;
  }

  private async wooProducts(integration: Integration, onlyIds?: string[]): Promise<RemoteProduct[]> {
    const client = this.woo.client(integration);
    if (!client) return [];
    const products = await client.all<any>('/products', {
      status: 'any',
      ...(onlyIds?.length && { include: onlyIds.join(',') }),
      _fields: 'id,name,type,status,sku,price,regular_price,sale_price,stock_quantity,manage_stock,images,attributes,global_unique_id',
    });
    const out: RemoteProduct[] = [];
    for (const p of products) {
      const image = p.images?.[0]?.src ?? null;
      const optionNames = ((p.attributes ?? []) as any[]).filter((a) => a?.variation).map((a) => String(a.name));
      if (p.type === 'variable') {
        const vars = await client.all<any>(`/products/${p.id}/variations`, {
          _fields: 'id,sku,price,regular_price,sale_price,stock_quantity,manage_stock,attributes,image,global_unique_id',
        }, 10).catch(() => []);
        out.push({
          externalProductId: String(p.id), title: p.name, image, status: p.status, hasVariants: true, optionNames,
          variants: vars.map((v: any) => ({
            externalVariantId: String(v.id),
            title: (v.attributes ?? []).map((a: any) => a.option).filter(Boolean).join(' / ') || `#${v.id}`,
            sku: v.sku || null,
            barcode: v.global_unique_id || null,
            ...wooPrices(v),
            stock: v.manage_stock ? Number(v.stock_quantity ?? 0) : null,
            tracked: !!v.manage_stock,
            image: v.image?.src ?? image,
            options: (v.attributes ?? []).filter((a: any) => a?.option).map((a: any) => ({ name: String(a.name), value: String(a.option) })),
          })),
        });
      } else {
        out.push({
          externalProductId: String(p.id), title: p.name, image, status: p.status, hasVariants: false,
          variants: [{
            externalVariantId: null, title: 'Default', sku: p.sku || null, barcode: p.global_unique_id || null,
            ...wooPrices(p),
            stock: p.manage_stock ? Number(p.stock_quantity ?? 0) : null, tracked: !!p.manage_stock, image,
          }],
        });
      }
    }
    return out;
  }

  private async shopifyProducts(integration: Integration, onlyIds?: string[]): Promise<RemoteProduct[]> {
    const client = await this.shopify.client(integration);
    if (!client) return [];
    // A few products by id (webhook): Shopify's product search takes "id:1 OR id:2".
    const query = onlyIds?.length ? onlyIds.map((id) => `id:${id}`).join(' OR ') : null;
    // 25 per page: the inventory item per variant keeps each page inside Shopify's query cost.
    const products = await client.paginate<any>(`query($after: String, $query: String) {
      products(first: 25, after: $after, query: $query) {
        nodes {
          id title status
          options { name }
          featuredMedia { preview { image { url } } }
          variants(first: 100) { nodes { id title sku barcode price compareAtPrice inventoryQuantity selectedOptions { name value } image { url } inventoryItem { id tracked } } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`, 'products', { query });
    return products.map((p: any) => {
      const vars: any[] = p.variants?.nodes ?? [];
      const image = p.featuredMedia?.preview?.image?.url ?? null;
      const single = vars.length <= 1 && (vars[0]?.title === 'Default Title' || !vars[0]);
      return {
        externalProductId: numericId(p.id),
        title: p.title,
        image,
        status: String(p.status ?? '').toLowerCase(),
        hasVariants: !single,
        optionNames: single ? [] : ((p.options ?? []) as any[]).map((o) => String(o.name)),
        variants: vars.map((v) => {
          const tracked = v.inventoryItem ? v.inventoryItem.tracked !== false : null;
          const price = Number(v.price ?? 0);
          const compare = Number(v.compareAtPrice ?? 0);
          return {
            externalVariantId: numericId(v.id),
            title: v.title === 'Default Title' ? 'Default' : v.title,
            sku: v.sku || null,
            barcode: v.barcode || null,
            price,
            compareAt: compare > price ? compare : null,
            // An item Shopify does not count has no stock: never read its 0 as real.
            stock: tracked === false ? null : v.inventoryQuantity ?? null,
            tracked,
            inventoryItemId: v.inventoryItem?.id ? numericId(v.inventoryItem.id) : null,
            image: v.image?.url ?? image,
            options: single ? [] : ((v.selectedOptions ?? []) as any[]).map((o) => ({ name: String(o.name), value: String(o.value) })),
          };
        }),
      };
    });
  }

  /**
   * Full details (description, every image, brand, category, tags, weight,
   * cost) for the products being brought into Nafaa. A failed read leaves
   * the item with what the list gave; it never stops the import.
   */
  async remoteDetails(integration: Integration, ids: string[]): Promise<Map<string, RemoteDetail>> {
    const out = new Map<string, RemoteDetail>();
    if (!ids.length) return out;
    const kind = this.kind(integration);
    try {
      if (kind === 'shopify') await this.shopifyDetails(integration, ids, out);
      else if (kind === 'woocommerce') await this.wooDetails(integration, ids, out);
      else if (kind === 'daraz') {
        for (const [id, d] of await this.daraz.productDetails(integration, ids)) out.set(id, d);
      }
    } catch (e: any) {
      this.logger.warn(`Details ${integration.displayName}: ${e?.message}`);
    }
    return out;
  }

  private async shopifyDetails(integration: Integration, ids: string[], out: Map<string, RemoteDetail>) {
    const client = await this.shopify.client(integration);
    if (!client) return;
    const body = (cost: boolean) => `query($ids: [ID!]!) { nodes(ids: $ids) { ... on Product {
      id descriptionHtml vendor productType tags category { fullName }
      media(first: 20) { nodes { ... on MediaImage { image { url } } } }
      variants(first: 100) { nodes { id barcode inventoryItem { measurement { weight { unit value } } ${cost ? 'unitCost { amount }' : ''} } } }
    } } }`;
    let withCost = true;
    for (let k = 0; k < ids.length; k += 5) {
      const gids = ids.slice(k, k + 5).map((id) => `gid://shopify/Product/${id}`);
      // Cost needs the inventory permission on cost; without it the same read runs without cost.
      let data: any = withCost ? await client.graphql<any>(body(true), { ids: gids }).catch(() => null) : null;
      if (!data) { withCost = false; data = await client.graphql<any>(body(false), { ids: gids }).catch(() => null); }
      for (const n of data?.nodes ?? []) {
        if (!n?.id) continue;
        const d = emptyDetail();
        d.description = htmlToText(n.descriptionHtml);
        d.images = ((n.media?.nodes ?? []) as any[]).map((m) => m?.image?.url).filter(Boolean);
        d.brand = n.vendor ? String(n.vendor).trim() || null : null;
        const type = String(n.productType ?? '').trim();
        d.categoryPath = type ? [type] : n.category?.fullName ? [String(n.category.fullName).split('>').pop()!.trim()] : [];
        d.tags = ((n.tags ?? []) as string[]).map((x) => String(x).trim()).filter(Boolean);
        for (const v of (n.variants?.nodes ?? []) as any[]) {
          const w = v.inventoryItem?.measurement?.weight;
          const unit = weightUnit(w?.unit);
          const value = Number(w?.value ?? 0);
          if (unit && value > 0 && !d.weightUnit) d.weightUnit = unit;
          const cost = Number(v.inventoryItem?.unitCost?.amount ?? 0);
          d.variants[numericId(v.id)] = {
            cost: cost > 0 ? cost : null,
            weight: unit && value > 0 ? convertWeight(value, unit, d.weightUnit ?? unit) : null,
            barcode: v.barcode || null,
          };
        }
        const first = Object.values(d.variants)[0];
        d.weight = first?.weight ?? null;
        out.set(numericId(n.id), d);
      }
    }
  }

  private async wooDetails(integration: Integration, ids: string[], out: Map<string, RemoteDetail>) {
    const client = this.woo.client(integration);
    if (!client) return;
    for (let k = 0; k < ids.length; k += 50) {
      const rows = await client.request<any[]>('GET', '/products', { query: { include: ids.slice(k, k + 50).join(','), per_page: '50' } }).catch(() => []);
      for (const p of rows ?? []) {
        const d = emptyDetail();
        d.description = htmlToText(p.description) ?? htmlToText(p.short_description);
        d.images = ((p.images ?? []) as any[]).map((i) => i?.src).filter(Boolean);
        const brand = ((p.brands ?? []) as any[])[0]?.name
          ?? ((p.attributes ?? []) as any[]).find((a) => /brand/i.test(String(a?.name)))?.options?.[0];
        d.brand = brand ? String(brand).trim() || null : null;
        const cat = ((p.categories ?? []) as any[]).find((c) => !/^uncategori[sz]ed$/i.test(String(c?.name)));
        d.categoryPath = cat?.name ? [htmlToText(String(cat.name)) ?? String(cat.name)] : [];
        d.tags = ((p.tags ?? []) as any[]).map((x) => String(x?.name ?? '').trim()).filter(Boolean);
        const w = Number(p.weight ?? 0);
        if (w > 0) { d.weight = w; d.weightUnit = 'kg'; }
        const cogs = Number(p.cost_of_goods_sold?.values?.[0]?.defined_value ?? p.cost_of_goods_sold?.total_value ?? 0);
        d.variants['-'] = { cost: cogs > 0 ? cogs : null, weight: w > 0 ? w : null, barcode: p.global_unique_id || null };
        if (p.type === 'variable') {
          const vars = await client.all<any>(`/products/${p.id}/variations`, { _fields: 'id,weight,global_unique_id,cost_of_goods_sold' }, 10).catch(() => []);
          for (const v of vars) {
            const vw = Number(v.weight ?? 0);
            const vc = Number(v.cost_of_goods_sold?.values?.[0]?.defined_value ?? v.cost_of_goods_sold?.total_value ?? 0);
            d.variants[String(v.id)] = { cost: vc > 0 ? vc : null, weight: vw > 0 ? vw : null, barcode: v.global_unique_id || null };
          }
        }
        out.set(String(p.id), d);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CATALOG + LINKS — Products safhe ka data
  // ═══════════════════════════════════════════════════════════

  async catalog(user: AuthenticatedUser, channelId: string, refresh = false) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const kind = this.kind(integration);
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;

    let remote: RemoteProduct[] = [];
    let remoteError: string | null = null;
    if (kind) {
      try {
        remote = await this.remoteProducts(integration, refresh);
      } catch (e: any) {
        remoteError = e?.message ?? 'Website ke products nahi aaye';
      }
    }

    // Purane test orders ne "TEST-…" link banaye the — wo asli nahi, saaf kar do
    await this.prisma.productChannelMapping.deleteMany({
      where: { integrationId: integration.id, externalProductId: { startsWith: 'TEST-' } },
    });

    const mappings = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: integration.id },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true, isActive: true, images: { take: 1, select: { url: true } } } },
        variant: { select: { id: true, name: true, sku: true, price: true } },
      },
    });

    // Nafaa ka branch stock — jore hue items ke liye
    const stockRows = shopId && mappings.length
      ? await this.prisma.shopStock.findMany({
          where: { shopId, productId: { in: [...new Set(mappings.map((m) => m.productId))] } },
          select: { productId: true, variantId: true, stock: true },
        })
      : [];
    const stockOf = (productId: string, variantId: string | null) =>
      Number(stockRows.find((r) => r.productId === productId && (r.variantId ?? null) === (variantId ?? null))?.stock ?? 0);

    // Salah ke liye Nafaa ke SKU/barcode/naam
    const allSkus = remote.flatMap((p) => p.variants.flatMap((v) => [v.sku, v.barcode])).filter(Boolean) as string[];
    const [skuProducts, skuVariants, nameProducts] = await Promise.all([
      allSkus.length
        ? this.prisma.product.findMany({
            where: { tenantId: user.tenantId, isActive: true, OR: [{ sku: { in: allSkus } }, { barcode: { in: allSkus } }] },
            select: { id: true, name: true, sku: true, barcode: true, hasVariants: true },
          })
        : [],
      allSkus.length
        ? this.prisma.productVariant.findMany({
            where: { isActive: true, product: { tenantId: user.tenantId, isActive: true }, OR: [{ sku: { in: allSkus } }, { barcode: { in: allSkus } }] },
            select: { id: true, name: true, sku: true, barcode: true, product: { select: { id: true, name: true } } },
          })
        : [],
      remote.length
        ? this.prisma.product.findMany({
            where: { tenantId: user.tenantId, isActive: true, name: { in: [...new Set(remote.map((p) => p.title))], mode: 'insensitive' } },
            select: { id: true, name: true, hasVariants: true },
          })
        : [],
    ]);

    const findLink = (p: RemoteProduct, v: RemoteVariant) =>
      mappings.find((m) => v.externalVariantId
        ? m.externalVariantId === v.externalVariantId
        : m.externalProductId === p.externalProductId && !m.externalVariantId);

    let linked = 0;
    let suggested = 0;
    let unlinked = 0;
    const usedMappingIds = new Set<string>();

    const rows = remote.map((p) => ({
      ...p,
      variants: p.variants.map((v) => {
        const m = findLink(p, v);
        if (m) {
          usedMappingIds.add(m.id);
          linked++;
          return {
            ...v,
            link: {
              mappingId: m.id,
              productId: m.productId,
              variantId: m.variantId,
              name: m.product?.name ?? '—',
              variantName: m.variant?.name ?? null,
              sku: m.variant?.sku ?? m.product?.sku ?? null,
              price: Number(m.variant?.price ?? m.product?.price ?? 0),
              stock: stockOf(m.productId, m.variantId),
              image: m.product?.images?.[0]?.url ?? null,
              inactive: m.product ? !m.product.isActive : true,
            },
            suggestion: null,
          };
        }
        // Salah: variant SKU → product SKU → bilkul same naam (simple product)
        const key = [v.sku, v.barcode].filter(Boolean) as string[];
        const sv = skuVariants.find((x) => key.includes(x.sku ?? '') || key.includes(x.barcode ?? ''));
        const sp = !sv ? skuProducts.find((x) => !x.hasVariants && (key.includes(x.sku ?? '') || key.includes(x.barcode ?? ''))) : undefined;
        const np = !sv && !sp && !p.hasVariants
          ? nameProducts.filter((x) => !x.hasVariants && x.name.toLowerCase() === p.title.toLowerCase())
          : [];
        const suggestion = sv
          ? { productId: sv.product.id, variantId: sv.id, name: sv.product.name, variantName: sv.name, reason: 'sku' as const }
          : sp
            ? { productId: sp.id, variantId: null, name: sp.name, variantName: null, reason: 'sku' as const }
            : np.length === 1
              ? { productId: np[0].id, variantId: null, name: np[0].name, variantName: null, reason: 'name' as const }
              : null;
        if (suggestion) suggested++;
        else unlinked++;
        return { ...v, link: null, suggestion };
      }),
    }));

    // Jo link website par ab nahi mila (product delete ho gaya) — alag dikhao
    const orphans = mappings
      .filter((m) => !usedMappingIds.has(m.id) && remote.length > 0)
      .map((m) => ({
        mappingId: m.id,
        externalProductId: m.externalProductId,
        externalVariantId: m.externalVariantId,
        externalTitle: m.externalTitle ?? m.externalSku ?? m.externalProductId,
        name: m.product?.name ?? '—',
        variantName: m.variant?.name ?? null,
      }));

    const nafaaUnlisted = await this.prisma.product.count({
      where: { tenantId: user.tenantId, isActive: true, channelMappings: { none: { integrationId: integration.id } } },
    });

    return {
      kind,
      canFetch: !!kind,
      remoteError,
      fetchedAt: new Date().toISOString(),
      stats: { products: remote.length, variants: linked + suggested + unlinked, linked, suggested, unlinked, nafaaUnlisted, orphans: orphans.length },
      products: rows,
      orphans,
      // Custom website: website ke products hum nahi dekh sakte — sirf bane hue links
      links: kind ? [] : mappings.map((m) => ({
        mappingId: m.id, externalProductId: m.externalProductId, externalVariantId: m.externalVariantId, externalSku: m.externalSku,
        externalTitle: m.externalTitle, name: m.product?.name ?? '—', variantName: m.variant?.name ?? null,
        stock: stockOf(m.productId, m.variantId),
      })),
    };
  }

  /** Nafaa ke products jo is channel par abhi nahi (website par bhejne ke liye) */
  async nafaaUnlisted(user: AuthenticatedUser, channelId: string, search?: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;
    const items = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        channelMappings: { none: { integrationId: integration.id } },
        ...(search?.trim() && {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { sku: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true, name: true, sku: true, price: true, hasVariants: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, sku: true, price: true } },
        ...(shopId && { shopStocks: { where: { shopId }, select: { variantId: true, stock: true } } }),
      },
    });
    return items.map((p: any) => ({
      id: p.id, name: p.name, sku: p.sku, price: Number(p.price), image: p.images?.[0]?.url ?? null,
      category: p.category?.name ?? null,
      variants: p.variants.map((v: any) => ({ id: v.id, name: v.name, sku: v.sku, price: Number(v.price) })),
      stock: (p.shopStocks ?? []).reduce((s: number, r: any) => s + Number(r.stock ?? 0), 0),
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // JORNA / HATANA
  // ═══════════════════════════════════════════════════════════

  async saveLinks(user: AuthenticatedUser, channelId: string, links: LinkInput[]) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    return this.saveLinksFor(integration, user.tenantId, links);
  }

  /** Branch whose stock the channel uses: the channel's own, else the main branch; null when the business has none. */
  async stockShop(integration: Integration): Promise<string | null> {
    const cfg = readWebsiteConfig(integration.config);
    const own = cfg.shopId ?? integration.shopId;
    if (own) return own;
    const main = await this.prisma.shop.findFirst({
      where: { tenantId: integration.tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    return main?.id ?? null;
  }

  /** Same as stockShop, but an import cannot go on without a branch for the opening stock. */
  async importShop(integration: Integration): Promise<string> {
    const id = await this.stockShop(integration);
    if (!id) throw new BadRequestException('Koi branch nahi mili — pehle Shops me branch banayein, phir channel ki branch chunein. Bina branch ke Stock nahi aa sakta.');
    return id;
  }

  /** Nafaa branch stock per product/size key. */
  private async branchStock(db: any, shopId: string | null, productIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!shopId || !productIds.length) return out;
    for (let k = 0; k < productIds.length; k += 5000) {
      const rows: Array<{ productId: string; variantId: string | null; stock: number }> = await db.shopStock.findMany({
        where: { shopId, productId: { in: productIds.slice(k, k + 5000) } },
        select: { productId: true, variantId: true, stock: true },
      });
      for (const r of rows) out.set(mappingKey(r.productId, r.variantId), Number(r.stock ?? 0));
    }
    return out;
  }

  /** Channel item from the cached list (no channel read). */
  private cachedVariant(integrationId: string, externalProductId: string, externalVariantId: string | null) {
    const hit = this.cache.get(integrationId);
    const p = hit?.data.find((x) => x.externalProductId === String(externalProductId));
    if (!p) return null;
    const v = externalVariantId ? p.variants.find((x) => x.externalVariantId === String(externalVariantId)) : p.variants[0];
    return v ? { p, v } : null;
  }

  /**
   * Link channel items to Nafaa products/sizes. Callers check permission and
   * channel ownership. A new link whose Nafaa and channel stock differ starts
   * on hold ("Stock milana baqi"): nothing is pushed until the merchant picks a side.
   */
  async saveLinksFor(integration: Integration, tenantId: string, links: LinkInput[]) {
    if (!Array.isArray(links) || !links.length) throw new BadRequestException('Kuch chuna nahi');
    const user = { tenantId };

    // Sirf apni dukaan ke products/variants
    const productIds = [...new Set(links.map((l) => l.productId))];
    const variantIds = [...new Set(links.map((l) => l.variantId).filter(Boolean))] as string[];
    const [okProducts, okVariants] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, hasVariants: true } }),
      variantIds.length
        ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, product: { tenantId: user.tenantId } }, select: { id: true, productId: true } })
        : [],
    ]);
    const shopId = await this.stockShop(integration);
    const stock = await this.branchStock(this.prisma, shopId, okProducts.map((p) => p.id));

    let saved = 0;
    let held = 0;
    const errors: string[] = [];
    for (const l of links.slice(0, 500)) {
      const p = okProducts.find((x) => x.id === l.productId);
      if (!p) { errors.push(`${l.externalTitle ?? l.externalProductId}: Nafaa product nahi mila`); continue; }
      if (l.variantId && !okVariants.find((v) => v.id === l.variantId && v.productId === l.productId)) {
        errors.push(`${l.externalTitle ?? l.externalProductId}: variant is product ka nahi`); continue;
      }
      // A product with sizes is linked per size; a size-less link bills "Available: 0".
      if (!l.variantId && p.hasVariants) {
        errors.push(`${l.externalTitle ?? l.externalProductId}: is product ke sizes hain — size chunein`); continue;
      }
      const externalVariantId = l.externalVariantId || null;
      const key = mappingKey(l.productId, l.variantId);
      // Ek website variant ek hi Nafaa cheez se — purana link (agar kisi aur se tha) hatao
      await this.prisma.productChannelMapping.deleteMany({
        where: {
          integrationId: integration.id,
          ...(externalVariantId
            ? { externalVariantId }
            : { externalProductId: String(l.externalProductId), externalVariantId: null }),
          NOT: { linkKey: key },
        },
      });
      const prev = await this.prisma.productChannelMapping.findUnique({
        where: { integrationId_linkKey: { integrationId: integration.id, linkKey: key } },
        select: { externalProductId: true, externalVariantId: true, externalData: true, stockHold: true, tracksStock: true },
      });
      const same = !!prev && prev.externalProductId === String(l.externalProductId) && (prev.externalVariantId ?? null) === externalVariantId;
      const seen = this.cachedVariant(integration.id, String(l.externalProductId), externalVariantId);
      const tracks = seen?.v.tracked ?? (same ? prev!.tracksStock : null) ?? null;
      const given = l.externalStock === undefined || l.externalStock === null ? null : Number(l.externalStock);
      const channelStock = tracks === false ? null : Number.isFinite(given as number) ? given : seen?.v.stock ?? null;
      // A link that already pointed here keeps its state; a new one is checked.
      const hold = same ? undefined : holdOnLink({ nafaaStock: stock.get(key) ?? 0, channelStock, tracks, reason: 'link' });
      const externalData = linkData(prev?.externalData, channelStock, seen?.v);
      const common = {
        externalProductId: String(l.externalProductId), externalVariantId,
        externalSku: l.externalSku ?? null, externalTitle: l.externalTitle?.slice(0, 250) ?? null, externalImage: l.externalImage ?? null,
        syncStatus: 'SUCCESS' as const, lastSyncedAt: new Date(), externalData,
        ...(tracks !== null && { tracksStock: tracks }),
        ...(hold !== undefined && { stockHold: hold ? (hold as any) : Prisma.DbNull }),
        // A new target has not been pushed yet: the first push is checked again.
        ...(!same && prev && { lastPush: Prisma.DbNull }),
      };
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: integration.id, linkKey: key } },
        create: { integrationId: integration.id, linkKey: key, productId: l.productId, variantId: l.variantId || null, ...common },
        update: common,
      });
      if (hold) held++;
      saved++;
    }
    this.cache.delete(integration.id);
    return { saved, held, errors };
  }

  async removeLink(user: AuthenticatedUser, channelId: string, mappingId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    await this.prisma.productChannelMapping.deleteMany({ where: { id: mappingId, integrationId: integration.id } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // WEBSITE → NAFAA (chune hue, variants ke saath)
  // ═══════════════════════════════════════════════════════════

  async importSelected(user: AuthenticatedUser, channelId: string, externalProductIds: string[]) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    return this.importFor(integration, user.tenantId, externalProductIds);
  }

  /**
   * Channel items → Nafaa products with everything the channel gives (text,
   * images, prices, cost, SKU, barcode, weight, brand, category, tags,
   * variants with options) and opening stock = channel stock, linked. An item
   * already in Nafaa is linked; its stock is never overwritten (the link waits
   * for the merchant when the two differ). One path for "Bring in all" and
   * single imports. Without a branch for the stock, nothing is imported.
   */
  async importFor(integration: Integration, tenantId: string, externalProductIds: string[]) {
    const shopId = await this.importShop(integration);
    const remote = await this.remoteProducts(integration);
    const pick = remote.filter((p) => externalProductIds.includes(p.externalProductId)).slice(0, 200);
    if (!pick.length) throw new BadRequestException('Koi product nahi chuna');
    const details = await this.remoteDetails(integration, pick.map((p) => p.externalProductId));
    const ctx: ImportCtx = { tenantId, shopId, integration, categories: new Map(), brands: new Map(), tags: new Map() };

    let created = 0;
    let linkedExisting = 0;
    let held = 0;
    let untracked = 0;
    const errors: string[] = [];

    for (const p of pick) {
      const detail = details.get(p.externalProductId) ?? null;
      try {
        await this.prisma.$transaction(async (tx) => {
          const existing = await this.findExisting(tx, tenantId, p);
          if (existing) {
            const r = await this.intoExistingTx(tx, ctx, existing.id, p, detail, null);
            held += r.held;
            linkedExisting++;
          } else {
            await this.createProductTx(tx, ctx, p, detail);
            created++;
          }
          untracked += p.variants.filter((v) => v.tracked === false).length;
        }, { timeout: 60_000 });
      } catch (e: any) {
        if (errors.length < 20) errors.push(`${p.title}: ${e?.message ?? 'Error'}`);
      }
    }
    this.cache.delete(integration.id);
    return { created, linkedExisting, held, untracked, failed: errors.length, errors };
  }

  /** An item already in Nafaa: by a size SKU, the product SKU/barcode, or exactly the same name. */
  private async findExisting(tx: any, tenantId: string, p: RemoteProduct): Promise<{ id: string } | null> {
    const codes = [...new Set(p.variants.flatMap((v) => [v.sku, v.barcode]).filter(Boolean))] as string[];
    if (p.hasVariants && codes.length) {
      const v = await tx.productVariant.findFirst({ where: { isActive: true, product: { tenantId, isActive: true }, OR: [{ sku: { in: codes } }, { barcode: { in: codes } }] }, select: { productId: true } });
      if (v) return { id: v.productId };
    }
    if (!p.hasVariants && codes.length) {
      const hit = await tx.product.findFirst({ where: { tenantId, isActive: true, OR: [{ sku: { in: codes } }, { barcode: { in: codes } }] }, select: { id: true } });
      if (hit) return hit;
    }
    return tx.product.findFirst({ where: { tenantId, isActive: true, name: { equals: p.title.trim(), mode: 'insensitive' } }, select: { id: true } });
  }

  /** New Nafaa product (and sizes) from a channel item, with opening stock = channel stock. */
  private async createProductTx(tx: any, ctx: ImportCtx, p: RemoteProduct, detail: RemoteDetail | null) {
    const d = detail ?? emptyDetail();
    const sell = (v: RemoteVariant) => Number(v.sellPrice ?? v.price ?? 0) || 0;
    const v0 = p.variants[0];
    const prices = p.variants.map(sell).filter((n) => n > 0);
    const [categoryId, brandId] = await Promise.all([
      this.ensureCategory(tx, ctx, d.categoryPath),
      this.ensureBrand(tx, ctx, d.brand),
    ]);
    const vd = (v: RemoteVariant) => d.variants[v.externalVariantId ?? '-'] ?? d.variants['-'] ?? {};
    const product = await tx.product.create({
      data: {
        tenantId: ctx.tenantId,
        name: p.title.slice(0, 250),
        sku: p.hasVariants ? null : v0?.sku ?? null,
        barcode: p.hasVariants ? null : v0?.barcode ?? vd(v0).barcode ?? null,
        // With sizes: the lowest size price is the product's "from" price.
        price: p.hasVariants ? (prices.length ? Math.min(...prices) : 0) : sell(v0),
        costPrice: p.hasVariants ? 0 : Number(vd(v0).cost ?? 0) || 0,
        hasVariants: p.hasVariants,
        isActive: true,
        description: d.description,
        categoryId,
        brandId,
        weight: d.weight,
        weightUnit: d.weight ? d.weightUnit : null,
      },
      select: { id: true },
    });
    const images = [...new Set([...d.images, ...(p.image ? [p.image] : [])].filter((u) => /^https?:\/\//i.test(u)))].slice(0, 20);
    if (images.length) {
      await tx.productImage.createMany({ data: images.map((url, i) => ({ productId: product.id, url, sortOrder: i, isPrimary: i === 0 })) });
    }
    await this.addTags(tx, ctx, product.id, d.tags);

    const note = `${ctx.integration.displayName} se import`;
    const opening = async (variantId: string | null, v: RemoteVariant) => {
      // Not counted on the channel: no stock to bring; the link is marked untracked.
      if (v.tracked === false || v.stock === null || v.stock === undefined) return;
      await applyStockDelta({
        tx, tenantId: ctx.tenantId, shopId: ctx.shopId, productId: product.id, variantId, delta: Math.max(0, Number(v.stock) || 0),
        movementType: 'OPENING_BALANCE', reference: 'WEBSITE-IMPORT', note,
      });
    };
    if (!p.hasVariants) {
      await opening(null, v0);
      await this.linkTx(tx, ctx.integration.id, product.id, null, p, v0, { channelStock: v0?.stock ?? null, hold: null });
      return product.id;
    }
    let order = 0;
    for (const v of p.variants) {
      const { size, color } = sizeColor(v.options);
      const x = vd(v);
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id, name: variantName(v.title, v.options), sku: v.sku, barcode: v.barcode ?? x.barcode ?? null,
          size, color, price: sell(v), costPrice: Number(x.cost ?? 0) || 0, weight: x.weight ?? null,
          sortOrder: order++, imageUrl: v.image, isActive: true,
        },
        select: { id: true },
      });
      await opening(variant.id, v);
      await this.linkTx(tx, ctx.integration.id, product.id, variant.id, p, v, { channelStock: v.stock, hold: null });
    }
    return product.id;
  }

  /**
   * Channel item into an existing Nafaa product. Each channel SKU goes to the
   * size picked in `plan` (null = make a new size) or, without a plan, to the
   * size found by SKU, options or name; missing sizes are made with opening
   * stock = channel stock. Existing sizes keep their stock: if it differs from
   * the channel, the link waits ("Stock milana baqi").
   */
  private async intoExistingTx(tx: any, ctx: ImportCtx, productId: string, p: RemoteProduct, detail: RemoteDetail | null,
    plan: Array<{ externalVariantId: string | null; variantId: string | null }> | null) {
    const product = await tx.product.findFirst({ where: { id: productId, tenantId: ctx.tenantId }, select: { id: true, name: true, hasVariants: true } });
    if (!product) throw new BadRequestException('Nafaa product nahi mila');
    const stock = await this.branchStock(tx, ctx.shopId, [productId]);
    let held = 0;
    let createdVariants = 0;
    let linked = 0;
    const link = async (variantId: string | null, v: RemoteVariant) => {
      const hold = holdOnLink({ nafaaStock: stock.get(mappingKey(productId, variantId)) ?? 0, channelStock: v.stock, tracks: v.tracked, reason: 'import' });
      await this.linkTx(tx, ctx.integration.id, productId, variantId, p, v, { channelStock: v.stock, hold });
      if (hold) held++;
      linked++;
    };

    // One channel item on a product without sizes: a plain link.
    if (!p.hasVariants && !product.hasVariants) {
      await link(null, p.variants[0]);
      return { held, createdVariants, linked };
    }

    const existing: Array<{ id: string; name: string; sku: string | null; barcode: string | null; size: string | null; color: string | null }> =
      await tx.productVariant.findMany({ where: { productId, isActive: true }, select: { id: true, name: true, sku: true, barcode: true, size: true, color: true } });
    if (!product.hasVariants) await this.assertCanConvert(tx, ctx.integration.id, productId, product.name);

    const keyOf = (v: RemoteVariant) => v.externalVariantId ?? '-';
    let wanted: Array<{ v: RemoteVariant; variantId: string | null }>;
    if (plan) {
      const byKey = new Map(plan.map((x) => [x.externalVariantId ?? '-', x.variantId]));
      wanted = p.variants.filter((v) => byKey.has(keyOf(v))).map((v) => ({ v, variantId: byKey.get(keyOf(v)) ?? null }));
      for (const w of wanted) {
        if (w.variantId && !existing.some((e) => e.id === w.variantId)) throw new BadRequestException(`${w.v.title}: variant is product ka nahi`);
      }
      const ids = wanted.map((w) => w.variantId).filter(Boolean);
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Do SKU ek hi variant se nahi jur sakte');
    } else {
      const found = planVariants(p.variants.map((v) => ({ key: keyOf(v), title: v.title, sku: v.sku, barcode: v.barcode, options: v.options })), existing);
      wanted = p.variants.map((v) => ({ v, variantId: found.get(keyOf(v))?.variantId ?? null }));
    }

    const d = detail ?? emptyDetail();
    let order = existing.length;
    for (const { v, variantId } of wanted) {
      if (variantId) { await link(variantId, v); continue; }
      const { size, color } = sizeColor(v.options);
      const x = d.variants[keyOf(v)] ?? {};
      const nv = await tx.productVariant.create({
        data: {
          productId, name: variantName(v.title === 'Default' ? p.title : v.title, v.options), sku: v.sku, barcode: v.barcode ?? x.barcode ?? null,
          size, color, price: Number(v.sellPrice ?? v.price ?? 0) || 0, costPrice: Number(x.cost ?? 0) || 0, weight: x.weight ?? null,
          sortOrder: order++, imageUrl: v.image, isActive: true,
        },
        select: { id: true },
      });
      createdVariants++;
      if (v.tracked !== false && v.stock !== null && v.stock !== undefined) {
        await applyStockDelta({
          tx, tenantId: ctx.tenantId, shopId: ctx.shopId, productId, variantId: nv.id, delta: Math.max(0, Number(v.stock) || 0),
          movementType: 'OPENING_BALANCE', reference: 'WEBSITE-IMPORT', note: `${ctx.integration.displayName} se variant`,
        });
      }
      await this.linkTx(tx, ctx.integration.id, productId, nv.id, p, v, { channelStock: v.stock, hold: null });
      linked++;
    }
    if (!product.hasVariants) await tx.product.update({ where: { id: productId }, data: { hasVariants: true } });
    // Tasveer na ho to website wali laga do
    const img = d.images[0] ?? p.image;
    if (img && !(await tx.productImage.findFirst({ where: { productId }, select: { id: true } }))) {
      await tx.productImage.create({ data: { productId, url: img, sortOrder: 0, isPrimary: true } }).catch(() => null);
    }
    return { held, createdVariants, linked };
  }

  /** Why a product without sizes cannot get sizes from a channel item, or null when it can. */
  private async convertBlock(db: any, integrationId: string, productId: string): Promise<string | null> {
    const [stocked, links] = await Promise.all([
      db.shopStock.count({ where: { productId, variantId: null, stock: { not: 0 } } }),
      db.productChannelMapping.count({ where: { productId, variantId: null, NOT: { integrationId } } }),
    ]);
    if (stocked) return 'Is product ka Stock bina variant ke rakha hai — pehle Nafaa me is ke variants banayein, phir har SKU jorein';
    if (links) return 'Ye product kisi aur channel se bina variant jura hai — pehle wahan variant ke hisaab se jorein';
    return null;
  }

  private async assertCanConvert(db: any, integrationId: string, productId: string, name: string) {
    const why = await this.convertBlock(db, integrationId, productId);
    if (why) throw new BadRequestException(`${name}: ${why}`);
  }

  /** "Is Nafaa product me jorein" — channel product (and its SKUs) into the picked Nafaa product. */
  async importInto(user: AuthenticatedUser, channelId: string, externalProductId: string, productId: string,
    plan?: Array<{ externalVariantId: string | null; variantId: string | null }>) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    return this.importIntoFor(integration, user.tenantId, externalProductId, productId, plan ?? null);
  }

  async importIntoFor(integration: Integration, tenantId: string, externalProductId: string, productId: string,
    plan: Array<{ externalVariantId: string | null; variantId: string | null }> | null) {
    const shopId = await this.importShop(integration);
    const p = (await this.remoteProducts(integration)).find((x) => x.externalProductId === externalProductId);
    if (!p) throw new BadRequestException('Channel ka product nahi mila — "Channel se taaza" dabayein');
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true, name: true } });
    if (!product) throw new BadRequestException('Nafaa product nahi mila');
    if (plan && !plan.length) throw new BadRequestException('Koi SKU nahi chuna');
    const details = await this.remoteDetails(integration, [externalProductId]);
    const ctx: ImportCtx = { tenantId, shopId, integration, categories: new Map(), brands: new Map(), tags: new Map() };
    const r = await this.prisma.$transaction((tx) => this.intoExistingTx(tx, ctx, product.id, p, details.get(externalProductId) ?? null, plan), { timeout: 60_000 });
    this.cache.delete(integration.id);
    return { ok: true, product: product.name, variantsCreated: r.createdVariants, linked: r.linked, held: r.held };
  }

  /**
   * Which Nafaa size each channel SKU would go to (SKU, then options, then
   * name), for the per-SKU linking screen.
   */
  async linkPlan(integration: Integration, tenantId: string, externalProductId: string, productId: string) {
    const p = (await this.remoteProducts(integration)).find((x) => x.externalProductId === externalProductId);
    if (!p) throw new BadRequestException('Channel ka product nahi mila — "Channel se taaza" dabayein');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, hasVariants: true, variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sku: true, barcode: true, size: true, color: true } } },
    });
    if (!product) throw new BadRequestException('Nafaa product nahi mila');
    const shopId = await this.stockShop(integration);
    const [stock, maps, block] = await Promise.all([
      this.branchStock(this.prisma, shopId, [product.id]),
      this.prisma.productChannelMapping.findMany({ where: { integrationId: integration.id, externalProductId }, select: { id: true, productId: true, variantId: true, externalVariantId: true } }),
      product.hasVariants ? Promise.resolve(null) : this.convertBlock(this.prisma, integration.id, product.id),
    ]);
    const keyOf = (v: RemoteVariant) => v.externalVariantId ?? '-';
    const found = planVariants(p.variants.map((v) => ({ key: keyOf(v), title: v.title, sku: v.sku, barcode: v.barcode, options: v.options })), product.variants);
    return {
      product: { id: product.id, name: product.name, hasVariants: product.hasVariants },
      remote: { externalProductId: p.externalProductId, title: p.title, hasVariants: p.hasVariants, optionNames: p.optionNames ?? [] },
      rows: p.variants.map((v) => {
        const m = maps.find((x) => (v.externalVariantId ? x.externalVariantId === v.externalVariantId : !x.externalVariantId));
        return {
          externalVariantId: v.externalVariantId, title: v.title, sku: v.sku, price: Number(v.sellPrice ?? v.price ?? 0), stock: v.tracked === false ? null : v.stock,
          tracked: v.tracked ?? null, options: v.options ?? [],
          linked: m ? { mappingId: m.id, productId: m.productId, variantId: m.variantId } : null,
          match: found.get(keyOf(v)) ?? null,
        };
      }),
      variants: product.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, size: v.size, color: v.color, stock: stock.get(mappingKey(product.id, v.id)) ?? 0 })),
      canConvert: !product.hasVariants && !block,
      convertBlock: block,
    };
  }

  private async ensureCategory(tx: any, ctx: ImportCtx, path: string[]): Promise<string | null> {
    const names = path.map((x) => String(x ?? '').trim().slice(0, 100)).filter(Boolean);
    if (!names.length) return null;
    const cacheKey = names.join('>').toLowerCase();
    if (ctx.categories.has(cacheKey)) return ctx.categories.get(cacheKey)!;
    // Names are unique per business: an existing name is used wherever it sits in the tree.
    let parentId: string | null = null;
    for (const name of names) {
      const hit: { id: string } | null = await tx.category.findFirst({ where: { tenantId: ctx.tenantId, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
      parentId = hit?.id ?? (await tx.category.create({ data: { tenantId: ctx.tenantId, name, parentId }, select: { id: true } })).id;
    }
    ctx.categories.set(cacheKey, parentId!);
    return parentId;
  }

  private async ensureBrand(tx: any, ctx: ImportCtx, name: string | null): Promise<string | null> {
    const n = String(name ?? '').trim().slice(0, 100);
    if (!n) return null;
    const k = n.toLowerCase();
    if (ctx.brands.has(k)) return ctx.brands.get(k)!;
    const hit = await tx.brand.findFirst({ where: { tenantId: ctx.tenantId, name: { equals: n, mode: 'insensitive' } }, select: { id: true } });
    let id = hit?.id as string | undefined;
    if (!id) {
      const base = n.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'brand';
      const taken = new Set(((await tx.brand.findMany({ where: { tenantId: ctx.tenantId, slug: { startsWith: base } }, select: { slug: true } })) as Array<{ slug: string }>).map((b) => b.slug));
      let slug = base;
      for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
      id = (await tx.brand.create({ data: { tenantId: ctx.tenantId, name: n, slug }, select: { id: true } })).id as string;
    }
    ctx.brands.set(k, id);
    return id;
  }

  private async addTags(tx: any, ctx: ImportCtx, productId: string, tags: string[]) {
    const names = [...new Set(tags.map((t) => t.trim().slice(0, 60)).filter(Boolean))].slice(0, 30);
    for (const name of names) {
      const k = name.toLowerCase();
      let id = ctx.tags.get(k);
      if (!id) {
        const hit = await tx.tag.findFirst({ where: { tenantId: ctx.tenantId, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
        id = hit?.id ?? (await tx.tag.create({ data: { tenantId: ctx.tenantId, name }, select: { id: true } })).id;
        ctx.tags.set(k, id!);
      }
      await tx.productTag.create({ data: { productId, tagId: id! } }).catch(() => null);
    }
  }

  private async linkTx(tx: any, integrationId: string, productId: string, variantId: string | null, p: RemoteProduct, v: RemoteVariant | undefined,
    opts: { channelStock: number | null; hold: StockHold | null }) {
    const key = mappingKey(productId, variantId);
    const prev = await tx.productChannelMapping.findUnique({ where: { integrationId_linkKey: { integrationId, linkKey: key } }, select: { externalData: true, externalProductId: true, externalVariantId: true } });
    const same = !!prev && prev.externalProductId === p.externalProductId && (prev.externalVariantId ?? null) === (v?.externalVariantId ?? null);
    const tracks = v?.tracked === undefined ? undefined : v.tracked;
    const channelStock = tracks === false ? null : opts.channelStock;
    const externalData = linkData(prev?.externalData, channelStock, v);
    const sale = v?.compareAt && v.compareAt > Number(v.sellPrice ?? v.price ?? 0) ? v.compareAt : null;
    await tx.productChannelMapping.upsert({
      where: { integrationId_linkKey: { integrationId, linkKey: key } },
      create: {
        integrationId, linkKey: key, productId, variantId,
        externalProductId: p.externalProductId, externalVariantId: v?.externalVariantId ?? null,
        externalSku: v?.sku ?? null, externalTitle: v && p.hasVariants ? `${p.title} — ${v.title}` : p.title,
        externalImage: v?.image ?? p.image, syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
        externalData, compareAtPrice: sale, stockHold: opts.hold ? (opts.hold as any) : Prisma.DbNull,
        ...(tracks !== undefined && { tracksStock: tracks }),
      },
      update: {
        externalProductId: p.externalProductId, externalVariantId: v?.externalVariantId ?? null,
        externalSku: v?.sku ?? null, syncStatus: 'SUCCESS', lastSyncedAt: new Date(), externalData,
        ...(tracks !== undefined && { tracksStock: tracks }),
        // Same channel item again: its state stays; a new one is checked like any new link.
        ...(!same && { stockHold: opts.hold ? (opts.hold as any) : Prisma.DbNull, lastPush: Prisma.DbNull }),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // NAFAA → WEBSITE (chune hue)
  // ═══════════════════════════════════════════════════════════

  async exportSelected(user: AuthenticatedUser, channelId: string, productIds: string[]) {
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const kind = this.kind(integration);
    if (!kind) throw new BadRequestException('Is website par seedha nahi bhej sakte — CSV istemal karein');
    if (kind === 'indolj') throw new BadRequestException('Indolj par menu Indolj ke panel se banta hai — Nafaa se wahan product nahi bhej sakte');
    if (kind === 'daraz') throw new BadRequestException('Daraz par naya product Seller Center se banta hai — phir yahan jorein');
    if (!productIds?.length) throw new BadRequestException('Koi product nahi chuna');
    const res = kind === 'woocommerce'
      ? await this.woo.exportToWoo(user, channelId, { productIds })
      : await this.shopify.exportToShopify(user, channelId, { productIds });
    this.cache.delete(integration.id);
    return res;
  }
}

/** WooCommerce regular price, the sale price customers pay now, and the struck-out price. */
function wooPrices(p: any): { price: number; sellPrice: number | null; compareAt: number | null } {
  const regular = Number(p.regular_price || 0);
  const now = Number(p.price || 0);
  const sale = Number(p.sale_price || 0);
  const price = regular || now;
  const onSale = sale > 0 && regular > 0 && sale < regular;
  return { price, sellPrice: onSale ? sale : null, compareAt: onSale ? regular : null };
}

/**
 * Link data with the channel stock seen now. The first stock seen is kept
 * (recovery reads it); the latest is updated.
 */
export function linkData(prev: unknown, channelStock: number | null | undefined, v?: RemoteVariant | null) {
  const d = { ...((prev as Record<string, unknown>) ?? {}) };
  const at = new Date().toISOString();
  if (channelStock !== null && channelStock !== undefined && Number.isFinite(Number(channelStock))) {
    d.channelStock = Number(channelStock);
    d.channelStockAt = at;
    if (!d.firstChannelStock) d.firstChannelStock = { qty: Number(channelStock), at };
  }
  if (v?.inventoryItemId) d.inventoryItemId = v.inventoryItemId;
  if (v && v.price > 0 && d.channelPrice === undefined) { d.channelPrice = v.price; d.channelPriceAt = at; }
  return d as Prisma.InputJsonValue;
}
