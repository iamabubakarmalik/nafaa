/**
 * Catalogue lines the gaming counter sells through the shared POS.
 *
 * Station time and digital cards are not shelf stock, so each is a service
 * product (no stock check). Station time is one product whose rate is set
 * per bill line; each card kind (provider, type, value) is its own product
 * priced at its selling rate, with the average cost of the cards in hand so
 * the profit report sees the card cost.
 */

import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export const TIME_SKU = 'GAMING-TIME';
export const TOPUP_SKU_PREFIX = 'TOPUP-';
const SERVICE_TYPE = 'SERVICE';

/** Sale numbers of gaming bills posted outside the counter. */
export const BILL_PREFIX = { session: 'GMS-', topup: 'GMT-', rental: 'GMR-', tournament: 'GTN-' } as const;

const PROVIDER_NAMES: Record<string, string> = {
  PSN: 'PSN', XBOX_LIVE: 'Xbox', NINTENDO: 'Nintendo', STEAM: 'Steam', EPIC_GAMES: 'Epic Games', GOOGLE_PLAY: 'Google Play',
  APPLE_STORE: 'App Store', ITUNES: 'iTunes', ROBUX: 'Robux', FORTNITE_VBUCKS: 'V-Bucks', PUBG_UC: 'PUBG UC',
  MOBILE_LEGENDS_DIAMONDS: 'ML Diamonds', FREE_FIRE_DIAMONDS: 'Free Fire', DISCORD_NITRO: 'Discord Nitro', NETFLIX: 'Netflix', SPOTIFY: 'Spotify', OTHER: 'Card',
};

export const providerName = (p: string) => PROVIDER_NAMES[p] ?? p.replace(/_/g, ' ');

export interface TopupKind { provider: string; topupType: string; denominationValue: number }

/** Stable SKU for one card kind, e.g. TOPUP-PUBG_UC-UC-660. */
export function topupSku(k: TopupKind) {
  const type = k.topupType.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'CARD';
  return `${TOPUP_SKU_PREFIX}${k.provider}-${type}-${r2(k.denominationValue)}`;
}

export const topupName = (k: TopupKind) => `${providerName(k.provider)} ${k.topupType.trim()} ${r2(k.denominationValue)}`.replace(/\s+/g, ' ');

/** The station time product; made on first need. */
export async function ensureTimeProduct(db: Db, tenantId: string): Promise<string> {
  const found = await db.product.findFirst({ where: { tenantId, sku: TIME_SKU }, select: { id: true, isActive: true } });
  if (found) {
    if (!found.isActive) await db.product.update({ where: { id: found.id }, data: { isActive: true } });
    return found.id;
  }
  const made = await db.product.create({
    data: {
      tenantId, sku: TIME_SKU, name: 'Station time', unit: 'service', productType: SERVICE_TYPE,
      price: 0, costPrice: 0, stock: 0, lowStockAlert: 0, isActive: true,
      description: 'Gaming station ka waqt — rate har session ke bill par lagta hai',
    },
    select: { id: true },
  });
  return made.id;
}

/**
 * Keeps one product per card kind in step with the cards in hand: selling
 * rate of the newest card, average cost of the unsold ones. Returns its id.
 */
export async function syncTopupProduct(db: Db, tenantId: string, k: TopupKind): Promise<string> {
  const sku = topupSku(k);
  const where = { tenantId, provider: k.provider as any, topupType: k.topupType, denominationValue: k.denominationValue, soldAt: null, isRedeemed: false };
  const [agg, newest] = await Promise.all([
    db.gamingDigitalTopup.aggregate({ where, _avg: { costPrice: true }, _count: { _all: true } }),
    db.gamingDigitalTopup.findFirst({ where, orderBy: { createdAt: 'desc' }, select: { sellingPrice: true } }),
  ]);
  const found = await db.product.findFirst({ where: { tenantId, sku }, select: { id: true, price: true, costPrice: true, isActive: true } });
  const data = {
    name: topupName(k),
    price: r2(newest?.sellingPrice ?? found?.price ?? 0),
    costPrice: r2(agg._avg.costPrice ?? found?.costPrice ?? 0),
    isActive: true,
  };
  if (!found) {
    const made = await db.product.create({
      data: { tenantId, sku, unit: 'pcs', productType: SERVICE_TYPE, stock: 0, lowStockAlert: 0, description: 'Digital card — Top-ups page se card daalein', ...data },
      select: { id: true },
    });
    return made.id;
  }
  if (found.price !== data.price || found.costPrice !== data.costPrice || !found.isActive || agg._count._all === 0) {
    await db.product.update({ where: { id: found.id }, data: { ...data, price: agg._count._all ? data.price : found.price } });
  }
  return found.id;
}
