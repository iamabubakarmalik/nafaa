/**
 * The one header of the online store screens: the design kit's PageHero
 * (it follows the owner's Appearance settings) with the store's live
 * numbers — today's orders and sale, orders to confirm and COD still due.
 * Screens with their own numbers pass `stats` (3–4 real numbers).
 */

import { useQuery } from '@tanstack/react-query';
import { isValidElement, type ReactNode } from 'react';
import { t } from '@/core/i18n';
import { Amount, HeroAmount, PageHero, type AmountProps, type HeroStat, type KpiItem } from '@/design';
import type { BoardList } from '../api/board';
import { boardApi } from '../api/board';
import { KEYS } from '../lib/online';

export function storeStats(list?: BoardList): HeroStat[] {
  const s = list?.stats;
  return [
    { label: t('Aaj ke orders'), value: s ? String(s.todayOrders) : '' },
    { label: t('Aaj ki sale'), value: <HeroAmount value={s?.todayValue ?? 0} size="lg" /> },
    { label: t('Confirm karne hain'), value: list ? String(list.boardCounts?.NEW ?? list.counts?.PENDING ?? 0) : '' },
    { label: t('COD baqi'), value: <HeroAmount value={s?.codDueValue ?? 0} size="lg" />, hint: s ? t('{{count}} order', { count: s.codDueCount }) : undefined },
  ];
}

/** Store numbers, read once and shared by every screen that shows them. */
export function useStoreList() {
  return useQuery({ queryKey: [...KEYS.orders, 'home-counts'], queryFn: () => boardApi.list({ limit: 1 }), refetchInterval: 30_000 });
}

export function CommerceHero({ list, loading, stats, chip, meta, title, actions, children }: {
  list?: BoardList; loading?: boolean; stats?: HeroStat[]; chip?: ReactNode; meta?: ReactNode; title?: string; actions?: ReactNode; children?: ReactNode;
}) {
  return <PageHero title={title} chip={chip} meta={meta} actions={actions} loading={loading} stats={stats ?? storeStats(list)}>{children}</PageHero>;
}

/**
 * The same hero for screens whose numbers were a KPI strip: the first four
 * items become hero stats (amounts take the hero's colors).
 */
export function KpiHero({ items, chip }: { items: KpiItem[]; chip?: ReactNode }) {
  const stats: HeroStat[] = items.slice(0, 4).map((k) => ({
    label: k.label, hint: k.hint, onPress: k.onPress,
    value: isValidElement(k.value) && k.value.type === Amount ? <HeroAmount {...(k.value.props as AmountProps)} /> : k.value,
  }));
  return <PageHero chip={chip} loading={items.some((k) => k.loading)} stats={stats} />;
}

/** Hero with the store's live numbers, for setting screens without their own. */
export function StoreHero({ chip }: { chip?: ReactNode }) {
  const q = useStoreList();
  return <CommerceHero list={q.data} loading={q.isLoading} chip={chip} />;
}
