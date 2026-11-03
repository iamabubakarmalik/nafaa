/**
 * Gaming counter (web gaming/pos): the shared counter for games, consoles, gear
 * and snacks. A Stations tab puts a running session's time on the bill, and a
 * Cards tab adds digital cards; one bill carries all of them with snacks. After
 * the bill is saved the sessions are closed with that amount and the card codes
 * are shown to hand over. Shelf cards show platform and condition.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Timer } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { generalPos, registerPosIndustry, type PosIndustryConfig, type PosShelf, type PosShelfFilter } from '@/modules/pos/engine/industry';
import { gamingApi } from './api';
import { CardCodesSheet } from './CardCodesSheet';
import { CounterSessions } from './CounterSessions';
import { counterStore } from './counterStore';
import { CONDITIONS, GAMING_KEYS, PLATFORMS, platformOptions, conditionOptions, refreshGaming } from './meta';
import { errorText } from '../_shared/deskKit';

function useGamingShelf(): PosShelf {
  const q = useQuery({ queryKey: [GAMING_KEYS.profiles], queryFn: () => gamingApi.profiles.list(), staleTime: 5 * 60_000 });
  return useMemo(() => {
    const byProduct = new Map((q.data ?? []).map((p) => [p.productId, p]));
    return {
      filters: ([
        { key: 'platform', label: t('Platform'), options: platformOptions().filter((o) => (q.data ?? []).some((p) => p.platform === o.value)), match: (p, v) => byProduct.get(p.id)?.platform === v },
        { key: 'condition', label: t('Halat'), options: conditionOptions().filter((o) => (q.data ?? []).some((p) => p.conditionType === o.value)), match: (p, v) => byProduct.get(p.id)?.conditionType === v },
      ] as PosShelfFilter[]).filter((f) => f.options.length > 0),
      subline: (p) => {
        const x = byProduct.get(p.id);
        if (!x) return null;
        return [PLATFORMS[x.platform] ? t(PLATFORMS[x.platform]) : x.platform, x.conditionType !== 'NEW_SEALED' ? t(CONDITIONS[x.conditionType] ?? x.conditionType) : '', x.region].filter(Boolean).join(' · ') || null;
      },
    };
  }, [q.data]);
}

export const gamingPos: PosIndustryConfig = {
  ...generalPos, id: 'gaming', searchHint: msg('Game, console, card ya snack'), receiptFooter: 'Digital card ka code ek dafa istemal hota hai — bill sambhaal kar rakhein. Khula hua game wapas nahi hota.',
  extraView: { label: msg('Stations'), icon: Timer, Component: CounterSessions },
  Overlay: () => createElement(CardCodesSheet),
  useShelf: useGamingShelf,
  beforeCheckout: () => {
    const { sessions, cardProductIds } = counterStore.get();
    const lines = useBill.getState().lines;
    const cards = lines.some((l) => !!l.productId && cardProductIds.includes(l.productId));
    if ((cards || sessions.length) && !isOnline()) return t('Internet nahi — station ka bill aur digital card sirf online bante hain');
    return null;
  },
  afterSale: (sale) => {
    const { sessions, timeProductId, cardProductIds } = counterStore.get();
    const timeUnits = sale.productIds.filter((id) => id === timeProductId).length;
    const picked = sessions.slice(0, timeUnits);
    const hasCards = sale.productIds.some((id) => cardProductIds.includes(id));
    counterStore.set({ sessions: [] });
    if (picked.length) {
      void gamingApi.sessions.closeSale(sale.id, picked.map((s) => ({ id: s.id, amount: s.amount, minutes: s.minutes })))
        .then((r) => toast.success(t('{{count}} station band — bill {{saleNumber}}', { count: r.sessions.length, saleNumber: r.saleNumber })))
        .catch((e) => toast.error(errorText(e, t('Session band nahi hua — Cafe Live par {{value}} cancel karein (bill {{saleNumber}} ban chuka)', { value: picked.map((s) => s.sessionNumber).join(', '), saleNumber: sale.saleNumber }))))
        .finally(() => refreshGaming(true));
    }
    if (hasCards) {
      void gamingApi.topups.assignSale(sale.id)
        .then((r) => counterStore.set({ given: r, pendingSale: null }))
        .catch(() => counterStore.set({ pendingSale: { id: sale.id, saleNumber: sale.saleNumber } }))
        .finally(() => refreshGaming(true));
    }
  },
};
registerPosIndustry(gamingPos);
