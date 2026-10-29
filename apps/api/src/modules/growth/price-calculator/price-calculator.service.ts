/**
 * Price calculator ("Price nikalein"): the shop's defaults and own data for
 * the inputs, a quote per sales channel, and a bulk preview over a filtered
 * product list. Prices are applied by the web through the existing endpoints
 * (PATCH products/:id for the Nafaa retail price, PUT online-products/links/
 * :mappingId/price for a channel's own price), so their permissions apply.
 *
 * Defaults from the shop's data:
 *   RTO %            each channel's returned share of parcels sent in the last
 *                    90 days (at least 10 parcels), else the shop's typed value
 *   ads per order    ads spend ÷ online orders of the last 30 days
 *   courier          the courier rate card (courier-adapter), else typed values
 *   packaging        the online selling-cost setting, else typed value
 *   GST              the shop's tax rate when prices include tax
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { channelPrice } from '../../../integrations/online-orders/channel-price';
import { readWebsiteConfig } from '../../../integrations/online-orders/website-config';
import { COURIERS } from '../../../integrations/online-orders/couriers';
import { GrowthSettingsService } from '../growth-settings.service';
import { CHANNEL_KINDS, ChannelFees, ChannelKind, DEFAULT_CHANNEL_FEES, PriceDefaults, channelKind, normalizeFees } from '../growth-settings';
import { orderCostsKey, packagingFrom, rateCardCouriers, rateCardQuote, readOrderCosts } from './courier-adapter';
import { ChannelQuote, PriceInputs, at, quoteChannel, r2 } from './price-math';

const PRODUCT_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ', 'CUSTOM_WEBSITE'] as const;
/** Channels whose price Nafaa sends, so a channel price can be set. */
const PUSH_TYPES = new Set(['WOOCOMMERCE', 'SHOPIFY', 'DARAZ']);
const DAY = 86_400_000;
const MIN_PARCELS = 10;

const kg = (w: number | null | undefined, unit: string | null | undefined): number | null => {
  const n = Number(w);
  if (!(n > 0)) return null;
  switch ((unit ?? 'kg').toLowerCase()) {
    case 'g': case 'gm': case 'gram': case 'grams': return n / 1000;
    case 'lb': case 'lbs': return n * 0.4536;
    case 'oz': return n * 0.02835;
    default: return n;
  }
};

export interface QuoteBody {
  cost?: number;
  /** Courier pick; a typed charge, COD % or return % wins over the rate card. */
  courier?: { code?: string | null; city?: string | null; weightKg?: number | null; charge?: number | null; codPct?: number | null; codFixed?: number | null; returnPct?: number | null };
  packaging?: number | null;
  adsPerOrder?: number | null;
  deliveryCharge?: number | null;
  taxPct?: number | null;
  target?: { mode?: 'MARGIN' | 'RUPEES'; value?: number };
  endWith9?: boolean;
  /** Fee kinds to quote, with the screen's fees and RTO %. */
  channels?: Array<{ kind: ChannelKind; fees?: Partial<ChannelFees>; rtoPct?: number | null }>;
  /** A price to check on every channel. */
  checkPrice?: number | null;
}

interface Resolved {
  base: Omit<PriceInputs, 'cost' | 'rtoPct'>;
  courier: ReturnType<typeof rateCardQuote>;
  channels: Array<{ kind: ChannelKind; fees: ChannelFees; rtoPct: number }>;
  checkPrice: number | null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

@Injectable()
export class PriceCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: GrowthSettingsService,
  ) {}

  /* ───────────────────────── shop data ───────────────────────── */

  private async orderCosts(tenantId: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: orderCostsKey(tenantId) }, select: { value: true } });
    return readOrderCosts(row?.value);
  }

  private async channels(tenantId: string) {
    const list = await this.prisma.integration.findMany({
      where: { tenantId, type: { in: [...PRODUCT_TYPES] }, status: { not: 'PENDING' } },
      select: { id: true, type: true, displayName: true, config: true },
      orderBy: { createdAt: 'asc' },
    });
    return list
      .map((i) => ({ id: i.id, type: i.type as string, name: i.displayName, kind: channelKind(i.type, (i.config as any)?.platform ?? null), config: i.config }))
      .filter((c): c is typeof c & { kind: ChannelKind } => !!c.kind);
  }

  /** Returned share of parcels sent in the last 90 days, per fee kind and overall. */
  private async rtoHistory(tenantId: string, channels: Array<{ id: string; kind: ChannelKind }>) {
    // Test orders are left out; metadata without a `test` key counts as live.
    const rows = (await this.prisma.$queryRaw<Array<{ integrationId: string; orderStatus: string; n: number }>>`
      SELECT "integrationId", "orderStatus", COUNT(*)::int AS n FROM channel_orders
      WHERE "tenantId" = ${tenantId} AND "dispatchedAt" >= ${new Date(Date.now() - 90 * DAY)}
        AND NOT COALESCE(metadata -> 'test' = 'true'::jsonb, false)
      GROUP BY 1, 2`).map((r) => ({ integrationId: r.integrationId, orderStatus: r.orderStatus, _count: { _all: Number(r.n) } }));
    const kindOf = new Map(channels.map((c) => [c.id, c.kind]));
    const agg = new Map<string, { sent: number; back: number }>();
    const add = (k: string, n: number, back: boolean) => {
      const a = agg.get(k) ?? { sent: 0, back: 0 };
      a.sent += n; if (back) a.back += n;
      agg.set(k, a);
    };
    for (const r of rows) {
      const kind = kindOf.get(r.integrationId);
      const back = r.orderStatus === 'RETURNED';
      add('ALL', r._count._all, back);
      if (kind) add(kind, r._count._all, back);
    }
    const out: Record<string, { pct: number | null; parcels: number }> = {};
    for (const k of ['ALL', ...CHANNEL_KINDS]) {
      const a = agg.get(k);
      out[k] = { pct: a && a.sent >= MIN_PARCELS ? Math.round((a.back / a.sent) * 1000) / 10 : null, parcels: a?.sent ?? 0 };
    }
    return out;
  }

  /** Ads spend ÷ online orders over the last 30 days. */
  private async adsPerOrder(tenantId: string) {
    const since = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
    const [spend, orders] = await Promise.all([
      this.prisma.adSpend.aggregate({ where: { tenantId, day: { gte: since } }, _sum: { amount: true } }),
      this.prisma.$queryRaw<Array<{ n: number }>>`
        SELECT COUNT(*)::int AS n FROM channel_orders
        WHERE "tenantId" = ${tenantId} AND "receivedAt" >= ${new Date(Date.now() - 30 * DAY)}
          AND NOT COALESCE(metadata -> 'test' = 'true'::jsonb, false)`.then((r) => Number(r[0]?.n ?? 0)),
    ]);
    const s = Number(spend._sum.amount ?? 0);
    return { value: s > 0 && orders > 0 ? r2(s / orders) : null, spend: r2(s), orders };
  }

  private async tax(tenantId: string) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { enableTax: true, taxRate: true, taxInclusive: true, taxLabel: true } });
    return {
      enabled: !!s?.enableTax, rate: Number(s?.taxRate ?? 0), inclusive: !!s?.taxInclusive, label: s?.taxLabel ?? 'GST',
      /** Only a price that includes tax carries it; an added tax is passed on to the customer. */
      pricePct: s?.enableTax && s.taxInclusive ? Number(s.taxRate) || 0 : 0,
    };
  }

  /** Most used courier of the last 90 days (own rider left out). */
  private async topCourier(tenantId: string) {
    const rows = await this.prisma.channelOrder.groupBy({
      by: ['courierCode'],
      where: { tenantId, courierCode: { notIn: ['RIDER', 'OTHER'] }, dispatchedAt: { gte: new Date(Date.now() - 90 * DAY) } },
      _count: { _all: true },
      orderBy: { _count: { courierCode: 'desc' } },
      take: 1,
    });
    return rows[0]?.courierCode ?? null;
  }

  /* ───────────────────────── context ───────────────────────── */

  /** Everything the calculator opens with, optionally for one product. */
  async context(user: AuthenticatedUser, productId?: string) {
    const tenantId = user.tenantId;
    const [settings, costs, channels, tax, ads, topCourier] = await Promise.all([
      this.settings.get(tenantId), this.orderCosts(tenantId), this.channels(tenantId), this.tax(tenantId), this.adsPerOrder(tenantId), this.topCourier(tenantId),
    ]);
    const rto = await this.rtoHistory(tenantId, channels);
    const product = productId ? await this.product(tenantId, productId, channels) : null;
    const rated = rateCardCouriers(costs);
    const courierCode = settings.price.courier.code ?? (topCourier && rated.includes(topCourier) ? topCourier : rated[0] ?? topCourier ?? null);
    return {
      settings,
      channels: channels.map(({ config: _c, ...c }) => ({ ...c, canSetPrice: PUSH_TYPES.has(c.type) })),
      kinds: [...new Set(channels.map((c) => c.kind))],
      rto,
      ads,
      tax,
      packaging: packagingFrom(costs),
      couriers: COURIERS.filter((c) => c.code !== 'RIDER' && c.code !== 'OTHER').map((c) => ({ code: c.code, name: c.name, rateCard: rated.includes(c.code) })),
      courierCode,
      presets: DEFAULT_CHANNEL_FEES,
      product,
    };
  }

  /** A product with its cost, weight and channel links. */
  private async product(tenantId: string, id: string, channels: Array<{ id: string; type: string; kind: ChannelKind; config: unknown }>) {
    const p = await this.prisma.product.findFirst({
      where: { id, tenantId },
      select: {
        id: true, name: true, sku: true, price: true, costPrice: true, weight: true, weightUnit: true, hasVariants: true,
        category: { select: { name: true } },
        channelMappings: { where: { integrationId: { in: channels.map((c) => c.id) } }, select: { id: true, integrationId: true, variantId: true, priceOverride: true } },
      },
    });
    if (!p) throw new NotFoundException('Product nahi mila');
    return this.productView(p, channels);
  }

  private productView(
    p: { id: string; name: string; sku: string | null; price: number; costPrice: number; weight: number | null; weightUnit: string | null; hasVariants: boolean; category: { name: string } | null; channelMappings: Array<{ id: string; integrationId: string; variantId: string | null; priceOverride: number | null }> },
    channels: Array<{ id: string; type: string; kind: ChannelKind; config: unknown }>,
  ) {
    const byId = new Map(channels.map((c) => [c.id, c]));
    return {
      id: p.id, name: p.name, sku: p.sku, price: Number(p.price), cost: Number(p.costPrice), weightKg: kg(p.weight, p.weightUnit),
      hasVariants: p.hasVariants, category: p.category?.name ?? null,
      links: p.channelMappings.flatMap((m) => {
        const c = byId.get(m.integrationId);
        if (!c) return [];
        const push = PUSH_TYPES.has(c.type);
        const rule = readWebsiteConfig(c.config).priceRule;
        return [{
          mappingId: m.id, integrationId: c.id, kind: c.kind, variantId: m.variantId, override: m.priceOverride,
          canSetPrice: push, price: push ? channelPrice(Number(p.price), rule, m.priceOverride) : Number(p.price),
        }];
      }),
    };
  }

  /* ───────────────────────── quotes ───────────────────────── */

  private async resolve(tenantId: string, body: QuoteBody): Promise<Resolved> {
    const [settings, costs, tax] = await Promise.all([this.settings.get(tenantId), this.orderCosts(tenantId), this.tax(tenantId)]);
    const d: PriceDefaults = settings.price;
    const pick = body.courier ?? {};
    const code = pick.code ?? d.courier.code ?? rateCardCouriers(costs)[0] ?? null;
    let courier = rateCardQuote(costs, { code, city: pick.city, weightKg: num(pick.weightKg) }, d.courier);
    const typed = num(pick.charge);
    if (typed !== null) courier = { ...courier, charge: typed, source: 'DEFAULT' };
    if (num(pick.codPct) !== null) courier = { ...courier, codPct: Math.min(20, num(pick.codPct)!) };
    if (num(pick.codFixed) !== null) courier = { ...courier, codFixed: num(pick.codFixed)! };
    if (num(pick.returnPct) !== null) courier = { ...courier, returnPct: Math.min(200, num(pick.returnPct)!) };
    const needHistory = (body.channels ?? []).some((c) => num(c.rtoPct) === null) && d.rtoPct === null;
    const needAds = num(body.adsPerOrder) === null && d.adsPerOrder === null;
    const [rto, ads] = await Promise.all([
      needHistory ? this.rtoHistory(tenantId, await this.channels(tenantId)) : Promise.resolve(null),
      needAds ? this.adsPerOrder(tenantId) : Promise.resolve(null),
    ]);
    const mode = body.target?.mode === 'RUPEES' ? 'RUPEES' : body.target?.mode === 'MARGIN' ? 'MARGIN' : d.target.mode;
    const kinds = (body.channels?.length ? body.channels : CHANNEL_KINDS.map((kind) => ({ kind }))).filter((c) => (CHANNEL_KINDS as readonly string[]).includes(c.kind));
    return {
      base: {
        packaging: num(body.packaging) ?? d.packaging ?? packagingFrom(costs) ?? 0,
        courier: courier.charge,
        returnPct: courier.returnPct,
        codPct: courier.codPct,
        codFixed: courier.codFixed,
        adsPerOrder: num(body.adsPerOrder) ?? d.adsPerOrder ?? ads?.value ?? 0,
        deliveryCharge: num(body.deliveryCharge) ?? d.deliveryCharge,
        taxPct: num(body.taxPct) ?? d.taxPct ?? tax.pricePct,
        target: { mode, value: num(body.target?.value) ?? d.target.value },
        endWith9: typeof body.endWith9 === 'boolean' ? body.endWith9 : d.endWith9,
      },
      courier,
      channels: kinds.map((c: any) => ({
        kind: c.kind as ChannelKind,
        fees: normalizeFees(c.fees ?? {}, d.channels[c.kind as ChannelKind]),
        rtoPct: num(c.rtoPct) ?? d.rtoPct ?? rto?.[c.kind]?.pct ?? rto?.ALL.pct ?? 0,
      })),
      checkPrice: num(body.checkPrice),
    };
  }

  private quoteAll(r: Resolved, cost: number) {
    return r.channels.map((c) => {
      const inputs: PriceInputs = { ...r.base, cost, rtoPct: c.rtoPct };
      const q: ChannelQuote = quoteChannel(inputs, c.fees);
      return {
        kind: c.kind,
        rtoPct: c.rtoPct,
        ...q,
        check: r.checkPrice ? at(r.checkPrice, inputs, c.fees) : null,
      };
    });
  }

  /** Suggested price, break-even and breakdown on every channel for one cost. */
  async quote(user: AuthenticatedUser, body: QuoteBody) {
    const cost = num(body.cost);
    if (cost === null) throw new BadRequestException('Product ki Cost likhein');
    const r = await this.resolve(user.tenantId, body);
    return { inputs: { ...r.base, cost }, courier: r.courier, results: this.quoteAll(r, cost) };
  }

  /** Suggested prices for a filtered product list, with each product's links, for the bulk preview. */
  async bulkPreview(user: AuthenticatedUser, body: QuoteBody & { search?: string; categoryId?: string; integrationId?: string; limit?: number }) {
    const tenantId = user.tenantId;
    const channels = await this.channels(tenantId);
    const r = await this.resolve(tenantId, body);
    const take = Math.min(200, Math.max(1, Number(body.limit) || 100));
    const where: Prisma.ProductWhereInput = {
      tenantId, isActive: true,
      ...(body.categoryId && { categoryId: body.categoryId }),
      ...(body.integrationId && { channelMappings: { some: { integrationId: body.integrationId } } }),
      ...(body.search?.trim() && {
        OR: [
          { name: { contains: body.search.trim(), mode: 'insensitive' } },
          { sku: { contains: body.search.trim(), mode: 'insensitive' } },
          { barcode: { contains: body.search.trim(), mode: 'insensitive' } },
        ],
      }),
    };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, take, orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true, name: true, sku: true, price: true, costPrice: true, weight: true, weightUnit: true, hasVariants: true,
          category: { select: { name: true } },
          channelMappings: { where: { integrationId: { in: channels.map((c) => c.id) } }, select: { id: true, integrationId: true, variantId: true, priceOverride: true } },
        },
      }),
    ]);
    return {
      total,
      shown: products.length,
      courier: r.courier,
      inputs: r.base,
      items: products.map((p) => {
        const view = this.productView(p, channels);
        return { ...view, results: view.cost > 0 ? this.quoteAll(r, view.cost) : [] };
      }),
    };
  }

  /* ───────────────────────── settings ───────────────────────── */

  saveDefaults(user: AuthenticatedUser, body: { price?: Record<string, unknown> }) {
    if (!body?.price || typeof body.price !== 'object') throw new BadRequestException('Kuch save karne ko nahi');
    return this.settings.save(user.tenantId, { price: body.price });
  }
}
