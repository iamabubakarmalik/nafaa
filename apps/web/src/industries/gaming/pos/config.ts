/**
 * Gaming counter on the shared POS engine. One bill can carry station time,
 * digital cards, snacks and games, and is paid like any bill (cash, card,
 * wallet, split, udhaar on the player's khata).
 *
 * - Stations: every running session is a tile; a click puts its time so far
 *   on the bill as a "Station time" line. When the bill is saved the
 *   session is closed with that amount.
 * - Cards: one tile per card kind (PUBG 660 UC, PSN $10…) with the count in
 *   hand; after the bill is saved the cards are handed out and their codes
 *   shown to give the customer.
 * - Games, consoles and accessories show platform and condition marks.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, CreditCard, Disc3, Gamepad2, Headphones, Monitor, Recycle, Timer } from 'lucide-react';
import type { Product } from '@modules/inventory/products/api/products.api';
import { useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { queryClient } from '@core/lib/queryClient';
import { gamingProductsApi, type GamingProductProfile } from '../api/products.api';
import { gamingSessionsApi, type GamingCafeSession } from '../api/sessions.api';
import { gamingTopupsApi, type CounterCardKind } from '../api/topups.api';
import { CONDITIONS, GAMING_KEYS, MONEY_KEYS, PLATFORMS, TIME_SKU, TOPUP_SKU, categoryGroup, errorText, liveOf, minutesText, providerOf } from '../lib/meta';
import { CardCodes } from './CardCodes';
import { counterStore } from './counterStore';

type Kind = 'session' | 'card' | 'time' | 'item';
const kindOf = (i: PosItem) => i.meta?.kind as Kind | undefined;
const skuOf = (i: PosItem) => String(i.product?.sku ?? '');

/** Station time and cards hold no shelf stock; the counter never stops them for it. */
const NO_STOCK = 9999;

/** Catalog ids the checkout checks: the Station time product and the card products. */
const ids = { time: '', cards: new Set<string>() };

function timeItem(productId: string, base?: PosItem): PosItem {
  const product = base?.product ?? ({ id: productId, name: 'Station time', sku: TIME_SKU, unit: 'service', price: 0, costPrice: 0, isActive: true, images: [] } as unknown as Product);
  return { id: productId, product, name: 'Station time', price: 0, stock: NO_STOCK, unit: 'service', meta: { kind: 'time' satisfies Kind, service: true } };
}

function sessionItems(list: GamingCafeSession[], time: PosItem | null): PosItem[] {
  if (!time) return [];
  return list.map((s) => {
    const live = liveOf(s);
    const station = s.station?.name ?? 'Station';
    return {
      id: `session:${s.id}`,
      product: time.product,
      name: `${station}${s.customerName ? ` — ${s.customerName}` : ''}`,
      price: live.amount,
      stock: 1,
      unit: 'service',
      rank: 0,
      searchText: [s.sessionNumber, s.station?.stationNumber, station, s.customerName, s.customerPhone, s.gameSelected, 'station session time'].filter(Boolean).join(' '),
      badges: [{ label: s.status === 'PAUSED' ? 'Ruka hua' : 'Chal raha', tone: s.status === 'PAUSED' ? 'warning' as const : 'success' as const, icon: Timer }],
      subline: `${minutesText(live.minutes)} · ${Number(s.ratePerHour)}/ghanta`,
      meta: { kind: 'session' satisfies Kind, session: s, service: true },
    };
  });
}

function cardBadges(k: CounterCardKind | undefined) {
  if (!k) return [{ label: 'Stock khatam', tone: 'danger' as const, icon: CreditCard }];
  return [{ label: `${k.count} card`, tone: k.count <= 3 ? 'warning' as const : 'info' as const, icon: CreditCard }];
}

function useGamingCatalog() {
  const profilesQ = useQuery({ queryKey: [GAMING_KEYS.profiles], queryFn: () => gamingProductsApi.list(), staleTime: 5 * 60_000, retry: 1 });
  const cardsQ = useQuery({ queryKey: [GAMING_KEYS.counter, 'cards'], queryFn: () => gamingTopupsApi.counter(), staleTime: 15_000, retry: 1 });
  const sessionsQ = useQuery({ queryKey: [GAMING_KEYS.counter, 'sessions'], queryFn: () => gamingSessionsApi.counter(), refetchInterval: 30_000, staleTime: 10_000, retry: 1 });
  const profiles = useMemo(() => new Map<string, GamingProductProfile>((profilesQ.data ?? []).map((p) => [p.productId, p])), [profilesQ.data]);
  const cards = useMemo(() => new Map<string, CounterCardKind>((cardsQ.data ?? []).map((k) => [k.productId, k])), [cardsQ.data]);

  const catalog = useProductCatalog((it): PosItem => {
    const sku = skuOf(it);
    if (sku === TIME_SKU) return { ...it, stock: NO_STOCK, meta: { kind: 'time' satisfies Kind, service: true } };
    if (sku.startsWith(TOPUP_SKU)) {
      const k = cards.get(it.id);
      return {
        ...it, stock: k?.count ?? 0, dim: !k, rank: 1, badges: cardBadges(k),
        subline: k ? providerOf(k.provider) : 'Top-ups page par card daalein',
        searchText: [it.searchText, k?.provider, k && providerOf(k.provider), 'card topup top-up'].filter(Boolean).join(' '),
        meta: { kind: 'card' satisfies Kind, service: true },
      };
    }
    const p = profiles.get(it.id);
    if (!p) return { ...it, meta: { ...it.meta, kind: 'item' satisfies Kind } };
    const cond = p.conditionType !== 'NEW_SEALED' ? CONDITIONS[p.conditionType] : undefined;
    return {
      ...it,
      rank: 2,
      badges: [
        ...(cond ? [{ label: cond.label, tone: 'warning' as const, icon: Recycle }] : []),
        ...(p.isPreOrder ? [{ label: 'Pre-order', tone: 'brand' as const }] : []),
      ],
      subline: [PLATFORMS[p.platform] ?? p.platform, p.region].filter(Boolean).join(' · ') || undefined,
      searchText: [it.searchText, PLATFORMS[p.platform], p.publisher, ...(p.genre ?? [])].filter(Boolean).join(' '),
      meta: { ...it.meta, kind: 'item' satisfies Kind, group: categoryGroup(p.categoryType), used: !!cond },
    };
  }, [profiles, cards]);

  const time = useMemo(() => {
    const id = sessionsQ.data?.timeProductId;
    if (!id) return null;
    return timeItem(id, catalog.items.find((i) => i.id === id));
  }, [sessionsQ.data, catalog.items]);

  const items = useMemo(() => {
    ids.time = time?.id ?? '';
    ids.cards = new Set(catalog.items.filter((i) => kindOf(i) === 'card').map((i) => i.id));
    return [...catalog.items.filter((i) => kindOf(i) !== 'time'), ...sessionItems(sessionsQ.data?.sessions ?? [], time)];
  }, [catalog.items, sessionsQ.data, time]);

  return { items, loading: catalog.loading, refreshKeys: [...catalog.refreshKeys, GAMING_KEYS.counter, GAMING_KEYS.active] };
}

/** Keeps no more picked sessions than the bill has station-time units; the latest picks drop first. */
function trimSessions(timeUnits: number) {
  const picked = counterStore.get().sessions;
  if (picked.length > timeUnits) counterStore.set({ sessions: picked.slice(0, Math.max(timeUnits, 0)) });
}

const filters: PosFilter[] = [
  { id: 'stations', label: 'Stations', icon: Timer, match: (i) => kindOf(i) === 'session' },
  { id: 'cards', label: 'Top-up cards', icon: CreditCard, match: (i) => kindOf(i) === 'card' },
  { id: 'games', label: 'Games', icon: Disc3, match: (i) => i.meta?.group === 'game' },
  { id: 'consoles', label: 'Consoles', icon: Gamepad2, match: (i) => i.meta?.group === 'console' },
  { id: 'gear', label: 'Accessories', icon: Headphones, match: (i) => i.meta?.group === 'gear' },
  { id: 'pc', label: 'PC parts', icon: Monitor, match: (i) => i.meta?.group === 'pc' },
  { id: 'used', label: 'Used', icon: BadgeCheck, match: (i) => !!i.meta?.used },
];

const refresh = () => [GAMING_KEYS.counter, GAMING_KEYS.active, GAMING_KEYS.sessions, GAMING_KEYS.topups, GAMING_KEYS.stations, ...MONEY_KEYS]
  .forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

export const gamingPos: PosIndustryConfig = {
  id: 'gaming',
  label: 'Gaming',
  useCatalog: useGamingCatalog,
  quickKeys: true,
  filters,
  CartExtra: () => createElement(CardCodes),
  searchHint: 'Station (PS-1), game, card (PUBG 660) ya barcode',
  receiptFooter: 'Digital card ka code ek dafa istemal hota hai — bill sambhaal kar rakhein. Khula hua game wapas nahi hota.',
  beforeAdd: (item, opts, api) => {
    const kind = kindOf(item);
    if (kind !== 'session') return 'continue';
    // A new bill starts with nothing picked.
    if (!api.cart.length) counterStore.set({ sessions: [] });
    const s = item.meta?.session as GamingCafeSession;
    if (counterStore.get().sessions.some((p) => p.id === s.id)) { toast.info('Ye session pehle se bill me hai'); return 'handled'; }
    const live = liveOf(s);
    if (!(live.amount > 0)) { toast.error(`${item.name} — abhi bill 0 hai`); return 'handled'; }
    const timeId = item.product.id;
    const base = api.itemById(timeId) ?? timeItem(timeId);
    counterStore.set({ sessions: [...counterStore.get().sessions, { id: s.id, sessionNumber: s.sessionNumber, amount: live.amount, minutes: live.minutes }] });
    api.addItem({ ...base, stock: NO_STOCK }, { ...opts, price: live.amount, confirmed: [...(opts.confirmed ?? []), 'session'], note: `${s.station?.name ?? 'Station'} · ${minutesText(live.minutes)} · ${s.sessionNumber}` });
    return 'handled';
  },
  beforeCheckout: (cart) => {
    trimSessions(cart.filter((l) => l.productId && l.productId === ids.time).reduce((a, l) => a + Math.round(l.quantity), 0));
    const cards = cart.some((l) => !!l.productId && ids.cards.has(l.productId));
    counterStore.set({ hasCards: cards });
    if ((cards || counterStore.get().sessions.length) && typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'Internet nahi — station ka bill aur digital card sirf online bante hain';
    }
    return null;
  },
  onSale: (sale) => {
    const { sessions, hasCards } = counterStore.get();
    counterStore.set({ sessions: [], hasCards: false });
    if (sessions.length) {
      void gamingSessionsApi.closeSale(sale.id, sessions.map((s) => ({ id: s.id, amount: s.amount, minutes: s.minutes })))
        .then((r) => toast.success(`${r.sessions.length} station band — bill ${r.saleNumber}`))
        .catch((e) => toast.error(errorText(e, `Session band nahi hua — Cafe Live par ${sessions.map((s) => s.sessionNumber).join(', ')} cancel karein (bill ${sale.saleNumber} ban chuka)`)))
        .finally(refresh);
    }
    if (hasCards) {
      void gamingTopupsApi.assignSale(sale.id)
        .then((r) => counterStore.set({ given: r, pendingSale: null }))
        .catch(() => counterStore.set({ pendingSale: { id: sale.id, saleNumber: sale.saleNumber } }))
        .finally(refresh);
    }
    if (!sessions.length && !hasCards) refresh();
  },
  voiceAliases: { pubg: 'pubg uc', uc: 'pubg uc', diamond: 'free fire', ps: 'ps5 playstation', cd: 'game disc', remote: 'controller' },
};
