/**
 * Shared bits of the combos pages: query keys, status labels and colours,
 * and quick tag lines that follow the shop's industry.
 */

import { useQuery } from '@tanstack/react-query';
import { CircleCheck, CircleDashed, CirclePause, CircleX, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import type { ComboStatus } from '../api/combos.api';

/** Every combos query lives under this key; the POS keeps its own copy. */
export const COMBO_KEY = 'combos';
export const COMBO_KEYS = [COMBO_KEY, 'pos-combos', 'retail-combos'];

export const STATUS: Record<ComboStatus, { label: string; icon: LucideIcon; color: string; tone: string }> = {
  ACTIVE: { label: 'Chalu', icon: CircleCheck, color: '#16a34a', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  DRAFT: { label: 'Kacha (draft)', icon: CircleDashed, color: '#64748b', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  INACTIVE: { label: 'Band', icon: CirclePause, color: '#d97706', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  EXPIRED: { label: 'Khatam', icon: CircleX, color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const STATUS_ORDER: ComboStatus[] = ['ACTIVE', 'DRAFT', 'INACTIVE', 'EXPIRED'];

const COMMON_TAGS = ['Best deal', 'Bachat pack', 'Limited time', 'Naya'];

/** Tag line ideas by industry id; anything else gets the common ones. */
const TAGS: Record<string, string[]> = {
  restaurant: ['Meal deal', 'Family deal', 'Lunch offer', 'Midnight deal'],
  bakery: ['Tea time pack', 'Party pack', 'Nashta deal', 'Eid box'],
  retail: ['Ghar ka saman', 'Mahine ka pack', 'Ramzan pack', 'Family pack'],
  pharmacy: ['Care kit', 'First aid kit', 'Baby care pack'],
  cosmetics: ['Gift set', 'Bridal kit', 'Skin care kit'],
  florist: ['Gift set', 'Birthday deal', 'Shaadi pack'],
  toystore: ['Gift set', 'Birthday deal', 'School pack'],
  bookstore: ['School pack', 'Exam kit', 'Class set'],
  electronics: ['Starter kit', 'Accessory pack', 'Warranty deal'],
  mobile: ['Accessory pack', 'Starter kit', 'Cover + glass deal'],
  hardware: ['Fitting kit', 'Plumber pack', 'Tool set'],
  autoparts: ['Service kit', 'Tuning kit', 'Oil change pack'],
  garments: ['Eid deal', '3 piece set', 'Family pack'],
  shoe: ['2 pair deal', 'Family pack', 'School pack'],
  salon: ['Bridal package', 'Grooming deal', 'Monthly package'],
  gym: ['Starter pack', 'Supplement deal'],
  petshop: ['Starter kit', 'Food + toy deal'],
  agri: ['Fasal pack', 'Spray kit', 'Beej + khaad deal'],
  sports: ['Team kit', 'Starter kit'],
};

export function tagIdeas(industryId?: string) {
  const own = industryId ? TAGS[industryId] ?? [] : [];
  return [...own, ...COMMON_TAGS.filter((t) => !own.includes(t))].slice(0, 6);
}

/** Example names for the name field, by industry. */
export function nameExample(industryId?: string) {
  switch (industryId) {
    case 'restaurant': return 'Misaal: Zinger + fries + drink';
    case 'bakery': return 'Misaal: Cake + 6 pastry box';
    case 'pharmacy': return 'Misaal: Fever care kit';
    case 'mobile':
    case 'electronics': return 'Misaal: Charger + cable + cover';
    case 'bookstore': return 'Misaal: Class 5 school pack';
    case 'cosmetics': return 'Misaal: Skin care gift set';
    case 'hardware': return 'Misaal: Bathroom fitting kit';
    default: return 'Misaal: Family pack — tel + chawal + cheeni';
  }
}

/** Up to three decimals, grouped. */
export const qtyText = (n: number) => Number(Number(n).toFixed(3)).toLocaleString('en-PK');

/** "1 dozen" or "2 pcs" for a combo part. */
export function partQty(it: { quantity: number; unitName?: string | null; unit?: { unitName: string } | null; product?: { unit: string } }) {
  return `${qtyText(it.quantity)} ${it.unit?.unitName ?? it.unitName ?? it.product?.unit ?? ''}`.trim();
}

export const dayText = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** Name of the branch in view, or "Sab branches", for print headers and hints. */
export function useBranchName() {
  const shopId = useAuthStore((s) => s.currentShopId);
  const q = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  if (!shopId || shopId === 'all') return 'Sab branches';
  return q.data?.find((s) => s.id === shopId)?.name ?? 'Yeh branch';
}
