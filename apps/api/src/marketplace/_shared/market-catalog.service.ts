/**
 * Live price and stock for Nafaa Market lines.
 *
 * A product is on the Market when its ProductMarketplaceProfile is listed;
 * `isAvailable = false` means the merchant hid it. Price and stock come from
 * the POS at the profile's branch: ProductVariant / Product price, the
 * branch's ShopStock (shopPrice override, stock minus reserved) and the
 * backorder rule, the same way Nafaa Stores prices its lines. A profile
 * publicPrice above zero overrides the price of a product without sizes.
 *
 * Services, and dishes a restaurant makes to order, have no shelf stock and
 * are always available.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Availability, availability, backorderRoom, backorderRule, leadTimeText } from '../../integrations/online-orders/backorder';
import { isServiceProduct } from '../../common/shop-scope/shop-stock.helper';
import { gateForBusinessType, resolveGate } from './market-config';

export type LineProblem = 'NOT_LISTED' | 'HIDDEN' | 'VARIANT_REQUIRED' | 'OUT_OF_STOCK';

export interface MarketLine {
  key: string;
  productId: string;
  variantId: string | null;
  shopId: string;
  name: string;
  variantName: string | null;
  image: string | null;
  price: number;
  compareAtPrice: number | null;
  availability: Availability;
  /** Most units one order may take (0 when it cannot be sold). */
  maxQty: number;
  leadTime: string | null;
  /** Prescription-only medicine (pharmacy record: Rx flag or a non-OTC schedule). */
  requiresPrescription: boolean;
  problem: LineProblem | null;
}

export interface ProductOffer {
  productId: string;
  price: number;
  priceMax: number;
  availability: Availability;
  maxQty: number;
  leadTime: string | null;
  requiresPrescription: boolean;
  variants: MarketLine[];
}

const MAX_QTY = 99;
const n = (v: unknown) => Number(v ?? 0) || 0;
export const lineKey = (productId: string, variantId: string | null | undefined) => `${productId}:${variantId ?? '-'}`;

/** Restaurant gates whose dishes are cooked to order; bakeries and sweet shops sell from stock. */
const MADE_TO_ORDER_FILTERS = new Set(['fast-food', 'desi', 'bbq', 'pizza', 'cafe', 'chai']);

const PRODUCT_SELECT = {
  id: true, name: true, price: true, hasVariants: true, productType: true, unit: true, isActive: true, isRawMaterial: true,
  backorder: true, backorderMax: true, backorderLeadDays: true, backorderNote: true,
  pharmacyMedicine: { select: { requiresPrescription: true, scheduleClass: true } },
  images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1, select: { url: true } },
  variants: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }], select: { id: true, name: true, price: true, imageUrl: true, backorder: true } },
};

@Injectable()
export class MarketCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every sellable line of the given products, grouped per product. */
  async offers(productIds: string[]): Promise<Map<string, ProductOffer>> {
    const ids = [...new Set(productIds)].filter(Boolean);
    const out = new Map<string, ProductOffer>();
    if (!ids.length) return out;
    const all = await this.compute(ids);
    for (const id of ids) {
      const lines = all.get(id);
      if (!lines?.length) continue;
      const sellable = lines.filter((l) => !l.problem);
      const priced = sellable.length ? sellable : lines;
      const avail: Availability = lines.some((l) => l.availability === 'in_stock') ? 'in_stock' : lines.some((l) => l.availability === 'backorder') ? 'backorder' : 'out_of_stock';
      out.set(id, {
        productId: id,
        price: Math.min(...priced.map((l) => l.price)),
        priceMax: Math.max(...priced.map((l) => l.price)),
        availability: lines.every((l) => l.problem === 'HIDDEN' || l.problem === 'NOT_LISTED') ? 'out_of_stock' : avail,
        maxQty: Math.max(0, ...sellable.map((l) => l.maxQty)),
        leadTime: avail === 'backorder' ? lines.find((l) => l.availability === 'backorder')?.leadTime ?? null : null,
        requiresPrescription: lines[0].requiresPrescription,
        variants: lines,
      });
    }
    return out;
  }

  /**
   * Current price and stock for cart lines, keyed by lineKey(). A line that
   * cannot be sold comes back with a `problem` and maxQty 0; a product that
   * no longer exists is left out of the map.
   */
  async lines(refs: Array<{ productId: string; variantId?: string | null }>): Promise<Map<string, MarketLine>> {
    const out = new Map<string, MarketLine>();
    const all = await this.compute([...new Set(refs.map((r) => r.productId))]);
    for (const r of refs) {
      const lines = all.get(r.productId);
      if (!lines?.length) continue;
      const key = lineKey(r.productId, r.variantId);
      const hit = lines.find((l) => l.key === key);
      if (hit) out.set(key, hit);
      else if (!r.variantId && lines[0].variantId) {
        out.set(key, { ...lines[0], key, variantId: null, variantName: null, maxQty: 0, problem: lines[0].problem ?? 'VARIANT_REQUIRED' });
      }
    }
    return out;
  }

  private async compute(productIds: string[]): Promise<Map<string, MarketLine[]>> {
    const out = new Map<string, MarketLine[]>();
    if (!productIds.length) return out;
    const profiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true, shopId: true, isListedOnMarketplace: true, isAvailable: true, availableFrom: true, availableUntil: true,
        publicName: true, publicPrice: true, compareAtPrice: true, publicImages: true,
        product: { select: PRODUCT_SELECT },
      },
    });
    if (!profiles.length) return out;
    const shopIds = [...new Set(profiles.map((p) => p.shopId))];
    const [stocks, shops] = await Promise.all([
      this.prisma.shopStock.findMany({
        where: { shopId: { in: shopIds }, productId: { in: profiles.map((p) => p.productId) } },
        select: { shopId: true, productId: true, variantId: true, stock: true, reserved: true, shopPrice: true, isActive: true },
      }),
      this.prisma.shopMarketplaceProfile.findMany({
        where: { shopId: { in: shopIds } },
        select: { shopId: true, gate: true, isListedOnMarketplace: true, tenant: { select: { businessType: true } } },
      }),
    ]);
    const stockOf = new Map(stocks.map((s) => [`${s.shopId}:${lineKey(s.productId, s.variantId)}`, s]));
    const shopOf = new Map(shops.map((s) => [s.shopId, s]));
    const now = Date.now();

    for (const pr of profiles) {
      const p = pr.product;
      const shop = shopOf.get(pr.shopId);
      const gate = resolveGate(shop?.gate, shop?.tenant.businessType);
      const filter = gateForBusinessType(shop?.tenant.businessType).filter;
      const madeToOrder = gate === 'FOOD' && !!filter && MADE_TO_ORDER_FILTERS.has(filter) && (p.productType === 'MADE' || !p.productType);
      const unlimited = isServiceProduct(p) || madeToOrder;
      const inWindow = (!pr.availableFrom || pr.availableFrom.getTime() <= now) && (!pr.availableUntil || pr.availableUntil.getTime() >= now);
      const listed = pr.isListedOnMarketplace && p.isActive && !p.isRawMaterial && !!shop?.isListedOnMarketplace;
      const hidden = !pr.isAvailable || !inWindow;
      const image = pr.publicImages?.[0] ?? p.images[0]?.url ?? null;
      const publicPrice = n(pr.publicPrice);
      const compareAt = pr.compareAtPrice ? n(pr.compareAtPrice) : null;
      const variants = p.hasVariants && p.variants.length ? p.variants : null;
      const rx = !!p.pharmacyMedicine && (p.pharmacyMedicine.requiresPrescription || p.pharmacyMedicine.scheduleClass !== 'OTC');

      const make = (v: (typeof p.variants)[number] | null): MarketLine => {
        const row = stockOf.get(`${pr.shopId}:${lineKey(p.id, v?.id ?? null)}`);
        const stock = row && row.isActive !== false ? n(row.stock) - n(row.reserved) : 0;
        const rule = backorderRule(p, v, null, 'NAFAA_MARKET');
        const basePrice = v ? n(v.price) || n(p.price) : n(p.price);
        const branchPrice = row?.shopPrice && row.shopPrice > 0 ? row.shopPrice : basePrice;
        const price = !v && publicPrice > 0 ? publicPrice : branchPrice;
        let av: Availability;
        let maxQty: number;
        if (unlimited) {
          av = 'in_stock';
          maxQty = MAX_QTY;
        } else {
          av = availability(Math.max(0, stock), rule, stock);
          const room = av === 'backorder' ? backorderRoom(stock, rule) : Math.floor(stock);
          maxQty = av === 'out_of_stock' ? 0 : Math.max(1, Math.min(MAX_QTY, Number.isFinite(room) ? room : MAX_QTY));
        }
        const problem: LineProblem | null = !listed ? 'NOT_LISTED' : hidden ? 'HIDDEN' : av === 'out_of_stock' ? 'OUT_OF_STOCK' : null;
        return {
          key: lineKey(p.id, v?.id ?? null),
          productId: p.id,
          variantId: v?.id ?? null,
          shopId: pr.shopId,
          name: pr.publicName || p.name,
          variantName: v?.name ?? null,
          image: v?.imageUrl ?? image,
          price: Math.round(price * 100) / 100,
          compareAtPrice: compareAt && compareAt > price ? compareAt : null,
          availability: problem && problem !== 'OUT_OF_STOCK' ? 'out_of_stock' : av,
          maxQty: problem ? 0 : maxQty,
          leadTime: av === 'backorder' ? leadTimeText(rule) : null,
          requiresPrescription: rx,
          problem,
        };
      };
      out.set(p.id, variants ? variants.map(make) : [make(null)]);
    }
    return out;
  }
}
