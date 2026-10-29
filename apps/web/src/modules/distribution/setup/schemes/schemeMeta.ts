/** Scheme types: labels, colours and the one-line rule text shown on cards and in the editor. */

import { BadgePercent, Gift, Layers, Coins, type LucideIcon } from 'lucide-react';
import type { SaveScheme, SchemeSlab, SchemeType } from '../../api/distribution.api';
import { rs } from '../../lib/meta';

export const SCHEME_TYPE: Record<SchemeType, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  FREE_QTY: { label: 'Free maal', hint: '10 lein, 1 free (10+1)', icon: Gift, color: '#16a34a' },
  PERCENT_OFF: { label: '% Discount', hint: 'Itne pack se zyada par % kam', icon: BadgePercent, color: '#2563eb' },
  AMOUNT_PER_UNIT: { label: 'Rs per pack', hint: 'Har pack par itne rupay kam', icon: Coins, color: '#d97706' },
  SLAB: { label: 'Slab', hint: '5 par 2%, 10 par 4%', icon: Layers, color: '#7c3aed' },
};

const n = (v: number | null | undefined) => String(Number(Number(v ?? 0).toFixed(3)));

/** "10 Carton par 1 Carton free", "2 Carton se 3% Discount", "5 Carton: 2% · 10 Carton: 4%". */
export function schemeRuleText(s: Pick<SaveScheme, 'type' | 'buyQty' | 'buyUnitName' | 'freeQty' | 'freeProductId' | 'value' | 'minOrderValue'> & { slabs?: SchemeSlab[] | null }, freeProductName?: string | null) {
  const unit = s.buyUnitName?.trim() || 'pcs';
  const buy = Number(s.buyQty) || 0;
  let text = '';
  if (s.type === 'FREE_QTY') {
    const free = s.freeProductId ? `${n(s.freeQty)} ${freeProductName ?? 'doosra item'} (khule)` : `${n(s.freeQty)} ${unit}`;
    text = buy > 0 ? `Har ${n(buy)} ${unit} par ${free} free` : `${free} free`;
  } else if (s.type === 'PERCENT_OFF') {
    text = `${buy > 0 ? `${n(buy)} ${unit} ya zyada par ` : ''}${n(s.value)}% Discount`;
  } else if (s.type === 'AMOUNT_PER_UNIT') {
    text = `Har ${unit} par ${rs(s.value)} kam${buy > 0 ? ` (${n(buy)} ${unit} se)` : ''}`;
  } else {
    text = (s.slabs ?? []).filter((x) => x.minQty > 0).sort((a, b) => a.minQty - b.minQty).map((x) => {
      const parts = [x.percent ? `${n(x.percent)}%` : '', x.amountPerUnit ? `${rs(x.amountPerUnit)}/${unit}` : '', x.freeQty ? `${n(x.freeQty)} ${unit} free` : ''].filter(Boolean);
      return `${n(x.minQty)} ${unit}: ${parts.join(' + ') || '—'}`;
    }).join(' · ') || 'Slab nahi likhe';
  }
  if (s.minOrderValue) text += ` · order kam az kam ${rs(s.minOrderValue)}`;
  return text;
}

/** ISO from the API → YYYY-MM-DD in the browser's (shop's) day. */
export function isoToDayKey(iso: string | null | undefined) {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
