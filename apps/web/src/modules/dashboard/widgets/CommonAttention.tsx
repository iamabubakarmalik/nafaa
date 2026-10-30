/**
 * "Aaj ka kaam" items every shop has: stock out or low, incoming transfers,
 * register not opened. Industries pass their own items first; these follow.
 */

import { AlertTriangle, ArrowLeftRight, Banknote, PackageX } from 'lucide-react';
import { useMoneyMap, useOverview } from '../data/queries';
import { AttentionList, type AttentionItem } from './AttentionList';
import { t } from '@core/i18n';

export function useCommonAttention(): AttentionItem[] {
  const { data } = useOverview();
  const { data: money } = useMoneyMap();
  const s = data?.stats;
  const items: AttentionItem[] = [];
  if (s?.outOfStockCount) items.push({ icon: PackageX, level: 'danger', text: t('{{outOfStockCount}} cheezein khatam ho gayin — customer khali haath lautega', { outOfStockCount: s.outOfStockCount }), to: '/low-stock', cta: t('Restock') });
  if (s?.lowStockCount) items.push({ icon: AlertTriangle, level: 'warning', text: t('{{lowStockCount}} cheezein kam reh gayin — mangwane ka waqt', { lowStockCount: s.lowStockCount }), to: '/low-stock', cta: t('Dekhein') });
  if (s?.pendingTransfers) items.push({ icon: ArrowLeftRight, level: 'info', text: t('{{pendingTransfers}} transfer aane wale hain', { pendingTransfers: s.pendingTransfers }), to: '/transfers', cta: t('Receive') });
  if (money && !money.cash.registerOpen) items.push({ icon: Banknote, level: 'neutral', text: t('Cash register abhi nahi khula — galle ka hisaab register se banta hai'), to: '/cash-register', cta: t('Register kholein') });
  return items;
}

/** Attention list with industry items first, then the common ones. */
export function makeAttention(useItems?: () => AttentionItem[]) {
  const none = () => [] as AttentionItem[];
  const useIndustry = useItems ?? none;
  return function Attention() {
    const own = useIndustry();
    const common = useCommonAttention();
    const order = { danger: 0, warning: 1, info: 2, neutral: 3 } as const;
    // Stable sort keeps industry items ahead of common ones at the same level.
    const items = [...own, ...common].map((x, i) => ({ x, i }))
      .sort((a, b) => order[a.x.level] - order[b.x.level] || a.i - b.i).map(({ x }) => x);
    return <AttentionList items={items} />;
  };
}
