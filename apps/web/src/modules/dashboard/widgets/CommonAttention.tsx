/**
 * "Aaj ka kaam" items every shop has: stock out or low, incoming transfers,
 * register not opened. Industries pass their own items first; these follow.
 */

import { AlertTriangle, ArrowLeftRight, Banknote, PackageX } from 'lucide-react';
import { useMoneyMap, useOverview } from '../data/queries';
import { AttentionList, type AttentionItem } from './AttentionList';

export function useCommonAttention(): AttentionItem[] {
  const { data } = useOverview();
  const { data: money } = useMoneyMap();
  const s = data?.stats;
  const items: AttentionItem[] = [];
  if (s?.outOfStockCount) items.push({ icon: PackageX, level: 'danger', text: `${s.outOfStockCount} cheezein khatam ho gayin — customer khali haath lautega`, to: '/low-stock', cta: 'Restock' });
  if (s?.lowStockCount) items.push({ icon: AlertTriangle, level: 'warning', text: `${s.lowStockCount} cheezein kam reh gayin — mangwane ka waqt`, to: '/low-stock', cta: 'Dekhein' });
  if (s?.pendingTransfers) items.push({ icon: ArrowLeftRight, level: 'info', text: `${s.pendingTransfers} transfer aane wale hain`, to: '/transfers', cta: 'Receive' });
  if (money && !money.cash.registerOpen) items.push({ icon: Banknote, level: 'neutral', text: 'Cash register abhi nahi khula — galle ka hisaab register se banta hai', to: '/cash-register', cta: 'Register kholein' });
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
