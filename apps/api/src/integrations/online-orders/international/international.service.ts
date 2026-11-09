/**
 * International selling on the custom storefront (order form / Buy button):
 * manual exchange rates, the countries a shop ships to, country price lists
 * and the per-product "ships abroad" flag. Settings live in the channel's
 * `Integration.config.international`; price list rows in CountryPrice.
 * Orders are always booked in PKR.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { WebsiteSetupService } from '../website-setup.service';
import {
  Currency, CountryRule, InternationalConfig, internationalNote, readInternational, shippingFor, shownPrice,
} from './currency';

export interface PriceRow { productId: string; variantId?: string | null; price: number }

/** A line from the order form as the storefront service sees it (PKR from the database). */
export interface IntlLine { productId: string; variantId: string | null; price: number; quantity: number }

const variantKey = (id?: string | null) => id ?? '';

@Injectable()
export class InternationalService {
  constructor(private readonly prisma: PrismaService, private readonly setup: WebsiteSetupService) {}

  // ── Admin ────────────────────────────────────────────────

  async settings(user: AuthenticatedUser, channelId: string) {
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readInternational((ch.config as any)?.international);
    const [priced, blocked, total] = await Promise.all([
      this.prisma.countryPrice.groupBy({ by: ['country'], where: { integrationId: ch.id, price: { gt: 0 } }, _count: { _all: true } }),
      this.prisma.product.count({ where: { tenantId: user.tenantId, isActive: true, shipsAbroad: false } }),
      this.prisma.product.count({ where: { tenantId: user.tenantId, isActive: true } }),
    ]);
    return {
      ...cfg,
      priceCounts: Object.fromEntries(priced.map((p) => [p.country, p._count._all])),
      products: { total, blocked },
    };
  }

  async saveSettings(user: AuthenticatedUser, channelId: string, body: Partial<InternationalConfig>) {
    this.setup.assertCanManage(user);
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    const next = readInternational({ ...readInternational((ch.config as any)?.international), ...body });
    if (body.enabled === true && !next.enabled) throw new BadRequestException('Pehle kam az kam ek mulk aur uski currency ka rate likhein');
    const fresh = await this.prisma.integration.findUnique({ where: { id: ch.id }, select: { config: true } });
    await this.prisma.integration.update({ where: { id: ch.id }, data: { config: { ...((fresh?.config as any) ?? {}), international: next } as any } });
    return this.settings(user, channelId);
  }

  /** Products with their PKR price and the country's list price, for the price list screen. */
  async priceList(user: AuthenticatedUser, channelId: string, q: { country?: string; search?: string; page?: string }) {
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readInternational((ch.config as any)?.international);
    const country = cfg.countries.find((c) => c.code === String(q.country ?? '').toUpperCase());
    if (!country) throw new BadRequestException('Ye mulk list me nahi');
    const cur = cfg.currencies.find((c) => c.code === country.currency)!;
    const take = 40;
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const where: Prisma.ProductWhereInput = {
      tenantId: user.tenantId, isActive: true, price: { gt: 0 },
      ...(q.search ? { OR: [{ name: { contains: String(q.search).slice(0, 60), mode: 'insensitive' } }, { sku: { contains: String(q.search).slice(0, 60), mode: 'insensitive' } }] } : {}),
    };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, orderBy: { name: 'asc' }, skip: (page - 1) * take, take,
        select: {
          id: true, name: true, sku: true, price: true, shipsAbroad: true, hasVariants: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
          variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
        },
      }),
    ]);
    const rows = await this.prisma.countryPrice.findMany({ where: { integrationId: ch.id, country: country.code, productId: { in: products.map((p) => p.id) } } });
    const listed = new Map(rows.map((r) => [`${r.productId}|${r.variantKey}`, r.price]));
    return {
      country, currency: cur, page, pages: Math.max(1, Math.ceil(total / take)), total,
      products: products.map((p) => {
        const lines = p.hasVariants && p.variants.length
          ? p.variants.map((v) => ({ variantId: v.id, name: v.name as string | null, pricePkr: Number(v.price || p.price) }))
          : [{ variantId: null as string | null, name: null as string | null, pricePkr: Number(p.price) }];
        return {
          id: p.id, name: p.name, sku: p.sku, image: p.images[0]?.url ?? null, shipsAbroad: p.shipsAbroad,
          lines: lines.map((l) => {
            const own = listed.get(`${p.id}|${variantKey(l.variantId)}`) ?? 0;
            return { ...l, listPrice: own > 0 ? own : null, shown: shownPrice(l.pricePkr, own, cur).amount };
          }),
        };
      }),
    };
  }

  /** Saves list prices; 0 or empty keeps the row but means "use the exchange rate" (nothing is deleted). */
  async savePrices(user: AuthenticatedUser, channelId: string, countryCode: string, rows: PriceRow[]) {
    this.setup.assertCanManage(user);
    const ch = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readInternational((ch.config as any)?.international);
    const country = cfg.countries.find((c) => c.code === String(countryCode ?? '').toUpperCase());
    if (!country) throw new BadRequestException('Ye mulk list me nahi');
    const clean = (Array.isArray(rows) ? rows : []).slice(0, 500).map((r) => ({
      productId: String(r?.productId ?? ''), variantKey: variantKey(r?.variantId), price: Math.max(0, Math.round((Number(r?.price) || 0) * 100) / 100),
    })).filter((r) => r.productId);
    const owned = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(clean.map((r) => r.productId))] } }, select: { id: true } });
    const ok = new Set(owned.map((p) => p.id));
    const valid = clean.filter((r) => ok.has(r.productId));
    await this.prisma.$transaction(valid.map((r) => this.prisma.countryPrice.upsert({
      where: { integrationId_country_productId_variantKey: { integrationId: ch.id, country: country.code, productId: r.productId, variantKey: r.variantKey } },
      create: { tenantId: user.tenantId, integrationId: ch.id, country: country.code, productId: r.productId, variantKey: r.variantKey, price: r.price, updatedById: user.id },
      update: { price: r.price, updatedById: user.id },
    })));
    return { saved: valid.length };
  }

  /** International shipping flag for products. */
  async setShipsAbroad(user: AuthenticatedUser, ids: string[], value: boolean) {
    this.setup.assertCanManage(user);
    const list = (Array.isArray(ids) ? ids : []).map(String).slice(0, 500);
    const r = await this.prisma.product.updateMany({ where: { tenantId: user.tenantId, id: { in: list } }, data: { shipsAbroad: !!value } });
    return { updated: r.count };
  }

  // ── Public ───────────────────────────────────────────────

  /** What the order form needs to offer countries; null when international is off. */
  publicInfo(ch: Integration) {
    const cfg = readInternational((ch.config as any)?.international);
    if (!cfg.enabled) return null;
    return {
      defaultCountry: cfg.defaultCountry,
      countries: cfg.countries.map((c) => ({ code: c.code, name: c.name, currency: c.currency, shippingFee: c.shippingFee, freeAbove: c.freeAbove })),
      currencies: cfg.currencies.map((c) => ({ code: c.code, rate: c.rate, decimals: c.decimals })),
    };
  }

  /** Prices for one country, keyed "productId|variantId": the form shows these in that currency. */
  async publicPrices(ch: Integration, countryCode: string) {
    const { country, cur } = this.countryOf(ch, countryCode);
    const rows = await this.prisma.countryPrice.findMany({ where: { integrationId: ch.id, country: country.code, price: { gt: 0 } }, select: { productId: true, variantKey: true, price: true } });
    return {
      country: country.code, currency: cur.code, decimals: cur.decimals, rate: cur.rate,
      prices: Object.fromEntries(rows.map((r) => [`${r.productId}|${r.variantKey}`, r.price])),
    };
  }

  private countryOf(ch: Integration, countryCode: string): { country: CountryRule; cur: Currency; cfg: InternationalConfig } {
    const cfg = readInternational((ch.config as any)?.international);
    const country = cfg.enabled ? cfg.countries.find((c) => c.code === String(countryCode ?? '').toUpperCase()) : undefined;
    const cur = country ? cfg.currencies.find((c) => c.code === country.currency) : undefined;
    if (!country || !cur) throw new BadRequestException('Is mulk me abhi delivery nahi hoti');
    return { country, cur, cfg };
  }

  /**
   * Reprices an international order. `lines` carry the database PKR price; each
   * becomes the price the customer saw (list or converted), booked in PKR.
   * Products that do not ship abroad stop the order.
   */
  async priceOrder(ch: Integration, countryCode: string, lines: IntlLine[]) {
    const { country, cur } = this.countryOf(ch, countryCode);
    const ids = [...new Set(lines.map((l) => l.productId))];
    const [blocked, rows] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: ids }, tenantId: ch.tenantId, shipsAbroad: false }, select: { name: true } }),
      this.prisma.countryPrice.findMany({ where: { integrationId: ch.id, country: country.code, productId: { in: ids }, price: { gt: 0 } }, select: { productId: true, variantKey: true, price: true } }),
    ]);
    if (blocked.length) throw new BadRequestException(`${blocked[0].name} abhi bahar ke mulk nahi bhejte — isay hata dein`);
    const listed = new Map(rows.map((r) => [`${r.productId}|${r.variantKey}`, r.price]));
    const priced = lines.map((l) => {
      const s = shownPrice(l.price, listed.get(`${l.productId}|${variantKey(l.variantId)}`), cur);
      return { price: s.pkr, shownAmount: s.amount };
    });
    const subtotal = priced.reduce((s, p, i) => s + p.price * lines[i].quantity, 0);
    const shownSubtotal = priced.reduce((s, p, i) => s + p.shownAmount * lines[i].quantity, 0);
    const deliveryFee = shippingFor(country, subtotal);
    return {
      prices: priced.map((p) => p.price),
      deliveryFee,
      country, currency: cur,
      note: internationalNote(country, cur, shownSubtotal + deliveryFee / cur.rate),
    };
  }
}
