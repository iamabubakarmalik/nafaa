/**
 * Shared words for retention pages: customer segments, RFM labels and the
 * WhatsApp campaign templates (default texts, filled per customer on the
 * server with {name} {shop} {code} {link} {product}).
 */

import type { LucideIcon } from 'lucide-react';
import { Cake, Gift, PackageCheck, Pencil, Sparkles, Star } from 'lucide-react';
import { t } from '@core/i18n';
import type { RfmLabel } from '../api/online-orders.api';
import type { CampaignTemplate } from '../api/retention.api';

export interface SegmentInfo { value: string; label: string; hint: string }

/** Segments shown on the customers page and when starting a campaign. */
export const SEGMENTS: SegmentInfo[] = [
  { value: 'all', label: t('Sab'), hint: t('Saare online customers (2 saal)') },
  { value: 'vip', label: t('VIP'), hint: t('Sab se zyada kharchne wale 10%') },
  { value: 'repeat', label: t('Dobara lene wale'), hint: t('2 ya zyada order deliver') },
  { value: 'new', label: t('Naye'), hint: t('Pehla order pichhle 30 din me') },
  { value: 'at_risk', label: t('Khatre me'), hint: t('60 se 119 din se koi order nahi') },
  { value: 'lost', label: t('Chale gaye'), hint: t('120 din ya zyada se koi order nahi') },
  { value: 'high_rto', label: t('Zyada RTO'), hint: t('2+ parcel wapas, ya aadhe se zyada wapas') },
  { value: 'blocked', label: t('Blocked'), hint: t('Block list me') },
];

export const segmentLabel = (v: string) => (v === 'birthday' ? t('Salgirah (agle 7 din)') : SEGMENTS.find((s) => s.value === v)?.label ?? v);

export const RFM_INFO: Record<RfmLabel, { label: string; hint: string; tone: string }> = {
  CHAMPION: { label: t('Champion'), hint: t('Haal hi me, baar baar, zyada kharch'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  LOYAL: { label: t('Pakka customer'), hint: t('Baqaidgi se leta hai'), tone: 'bg-teal-50 text-teal-800 ring-teal-200' },
  PROMISING: { label: t('Achha aaghaz'), hint: t('Haal hi me liya, abhi kam dafa'), tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  NEW: { label: t('Naya'), hint: t('Pehla order 30 din me'), tone: 'bg-blue-50 text-blue-800 ring-blue-200' },
  NEED_ATTENTION: { label: t('Dhyan dein'), hint: t('30–60 din se khamosh'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  AT_RISK: { label: t('Khatre me'), hint: t('60–119 din se khamosh'), tone: 'bg-orange-50 text-orange-800 ring-orange-200' },
  LOST: { label: t('Chala gaya'), hint: t('120+ din se khamosh'), tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  NO_BUY: { label: t('Abhi tak nahi liya'), hint: t('Koi parcel deliver nahi hua'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export interface TemplateInfo { key: CampaignTemplate; label: string; hint: string; icon: LucideIcon; color: string; segment: string; needs: Array<'code' | 'link' | 'product'>; text: () => string }

export const CAMPAIGN_TEMPLATES: TemplateInfo[] = [
  {
    key: 'WIN_BACK', label: t('Wapas bulayein'), hint: t('Khamosh customers ke liye discount code'), icon: Gift, color: '#7c3aed', segment: 'at_risk', needs: ['code', 'link'],
    text: () => t('Assalam o Alaikum {name}! Kafi din ho gaye 🙂 {shop} me aap ke liye khaas discount — code: {code}. Order yahan se: {link}'),
  },
  {
    key: 'NEW_ARRIVAL', label: t('Naya maal'), hint: t('Naye products ki khabar'), icon: Sparkles, color: '#2563eb', segment: 'repeat', needs: ['link'],
    text: () => t('Assalam o Alaikum {name}! {shop} me naya maal aa gaya hai. Pehle aap dekhein: {link}'),
  },
  {
    key: 'REVIEW', label: t('Review maangein'), hint: t('Google / Facebook par rai'), icon: Star, color: '#db2777', segment: 'repeat', needs: ['link'],
    text: () => t('Assalam o Alaikum {name}! {shop} se shopping ka shukriya 🙏 Aap ka tajurba kaisa raha? 1 minute me yahan bata dein: {link}'),
  },
  {
    key: 'RESTOCK', label: t('Stock wapas'), hint: t('Khatam hua product dobara aa gaya'), icon: PackageCheck, color: '#0d9488', segment: 'all', needs: ['product', 'link'],
    text: () => t('Assalam o Alaikum {name}! {product} dobara stock me aa gaya hai. Jaldi order karein, kam pieces hain: {link}'),
  },
  {
    key: 'BIRTHDAY', label: t('Salgirah'), hint: t('Agle 7 din me salgirah wale customers'), icon: Cake, color: '#ea580c', segment: 'birthday', needs: ['code'],
    text: () => t('Salgirah mubarak {name}! 🎂 {shop} ki taraf se aap ke liye tohfa — code: {code}. {link}'),
  },
  {
    key: 'CUSTOM', label: t('Apna message'), hint: t('Khud likhein'), icon: Pencil, color: '#475569', segment: 'all', needs: [],
    text: () => t('Assalam o Alaikum {name}! {shop}'),
  },
];

export const templateInfo = (k: CampaignTemplate) => CAMPAIGN_TEMPLATES.find((x) => x.key === k) ?? CAMPAIGN_TEMPLATES[CAMPAIGN_TEMPLATES.length - 1];

/** wa.me link with the text filled in; null when the phone is not usable. */
export function waLink(wa: string | null, text: string): string | null {
  return wa ? `https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
}
