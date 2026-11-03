/** Combo labels, tag ideas by industry and small text helpers (same as the web combos meta). */

import { msg } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { ComboStatus } from '../api/combos';

export const COMBO_STATUS: Record<ComboStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' },
  DRAFT: { label: msg('Kacha (draft)'), tone: 'neutral' },
  INACTIVE: { label: msg('Band'), tone: 'warning' },
  EXPIRED: { label: msg('Khatam'), tone: 'danger' },
};
export const STATUS_ORDER: ComboStatus[] = ['ACTIVE', 'DRAFT', 'INACTIVE', 'EXPIRED'];

const COMMON_TAGS = ['Best deal', 'Bachat pack', 'Limited time', 'Naya'];
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

/** Tag line ideas; saved as typed (they are the shop's own words on the POS card). */
export function tagIdeas(industryId?: string | null) {
  const own = industryId ? TAGS[industryId] ?? [] : [];
  return [...own, ...COMMON_TAGS.filter((x) => !own.includes(x))].slice(0, 6);
}

export function nameExample(industryId?: string | null) {
  switch (industryId) {
    case 'restaurant': return msg('Misaal: Zinger + fries + drink');
    case 'bakery': return msg('Misaal: Cake + 6 pastry box');
    case 'pharmacy': return msg('Misaal: Fever care kit');
    case 'mobile':
    case 'electronics': return msg('Misaal: Charger + cable + cover');
    case 'bookstore': return msg('Misaal: Class 5 school pack');
    case 'cosmetics': return msg('Misaal: Skin care gift set');
    case 'hardware': return msg('Misaal: Bathroom fitting kit');
    default: return msg('Misaal: Family pack — tel + chawal + cheeni');
  }
}

export const WEEKDAYS = [msg('Itwaar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];
