/**
 * WhatsApp (wa.me) message templates: the app's default texts, the shop's
 * own texts saved on the server, filling the {placeholders} from an order
 * or an abandoned cart, and which template fits an order right now.
 */

import { usePlatformControls } from '../hooks/usePlatformControls';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, CreditCard, Heart, MapPin, ShoppingCart, Truck } from 'lucide-react';
import { t } from '@core/i18n';
import type { OnlineOrder } from '../api/online-orders.api';
import { growthApi, type WaTemplateKey } from '../api/growth.api';
import { orderNo } from './orders';
import { rs } from './labels';

export interface WaTemplateInfo { key: WaTemplateKey; label: string; hint: string; icon: LucideIcon; color: string; text: () => string }

/** Default texts; {name} style placeholders are filled per order. */
export const WA_TEMPLATES: WaTemplateInfo[] = [
  {
    key: 'confirm', label: t('Order confirm'), hint: t('COD order bhejne se pehle'), icon: CheckCircle2, color: '#16a34a',
    text: () => t('Assalam o Alaikum {name}! {shop} se aap ka order #{no}: {items}. Total {total}. Kya hum ye order bhej dein? Jawab me "Haan" ya "Nahi" likh dein. Shukriya!'),
  },
  {
    key: 'address', label: t('Address check'), hint: t('Address adhoora ya shehar ghalat'), icon: MapPin, color: '#0284c7',
    text: () => t('Assalam o Alaikum {name}! Order #{no} ke liye address check kar lein: {address}, {city}. Kya ye theek hai? Ghar number aur qareeb ki koi nishani bhi likh dein.'),
  },
  {
    key: 'advance', label: t('Advance maangein'), hint: t('Risky COD order'), icon: CreditCard, color: '#7c3aed',
    text: () => t('Assalam o Alaikum {name}! Order #{no} ({total}) bhejne se pehle {advance} advance bhej dein. Baqi paisa delivery par dena hoga. Advance milte hi order bhej denge.'),
  },
  {
    key: 'dispatched', label: t('Dispatched'), hint: t('Tracking number ke saath'), icon: Truck, color: '#ea580c',
    text: () => t('Assalam o Alaikum {name}! Aap ka order #{no} {courier} se bhej diya hai. Tracking number: {tracking} {trackingUrl} Delivery par {cod} tayyar rakhein. Shukriya!'),
  },
  {
    key: 'delivered', label: t('Delivered — shukriya'), hint: t('Review maangein'), icon: Heart, color: '#db2777',
    text: () => t('Shukriya {name}! Umeed hai order #{no} pasand aaya. Apni rai zaroor batayein, aap ki baat hamare liye ahem hai. {shop}'),
  },
  {
    key: 'cart', label: t('Cart wapas'), hint: t('Abandoned cart ke liye'), icon: ShoppingCart, color: '#2563eb',
    text: () => t('Assalam o Alaikum {name}! Aap ne {shop} par {items} pasand kiye the. Aap ka cart abhi bhi tayyar hai: {cartUrl} Koi sawal ho to yahin poochein.'),
  },
];

export const waInfo = (key: WaTemplateKey) => WA_TEMPLATES.find((x) => x.key === key)!;

/** The shop's saved texts (empty keys use the defaults). */
export function useWaTemplates() {
  return useQuery({ queryKey: ['wa-templates'], queryFn: growthApi.waTemplates, staleTime: 10 * 60_000 });
}

export type WaValues = Partial<Record<'name' | 'shop' | 'no' | 'items' | 'total' | 'cod' | 'address' | 'city' | 'advance' | 'courier' | 'tracking' | 'trackingUrl' | 'cartUrl', string>>;

/** Replaces {placeholders}; unknown or empty ones drop out with their extra spaces. */
export function fillTemplate(text: string, v: WaValues): string {
  return text
    .replace(/\{(\w+)\}/g, (_m, k: string) => (v as Record<string, string | undefined>)[k] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .trim();
}

const qty = (n: number) => String(Number(Number(n).toFixed(2)));

export function orderValues(o: OnlineOrder, shop: string | undefined, money: (n: number) => string = rs, advancePct = 30): WaValues {
  const cod = o.money?.codDue ?? (o.isCod ? o.total : 0);
  return {
    name: o.customerName,
    shop: shop ?? '',
    no: orderNo(o),
    items: o.items.slice(0, 3).map((i) => `${qty(Number(i.quantity))} × ${i.name}`).join(', '),
    total: money(o.total),
    cod: money(cod),
    address: o.customerAddress ?? '',
    city: o.customerCity ?? '',
    advance: money(Math.ceil((o.total * advancePct) / 100 / 10) * 10),
    courier: o.courierLabel ?? o.courierName ?? '',
    tracking: o.trackingNumber ?? '',
    trackingUrl: o.courierSite ?? '',
  };
}

/** The template that fits an order now. */
export function suggestTemplate(o: OnlineOrder): WaTemplateKey {
  if (o.orderStatus === 'DELIVERED') return 'delivered';
  if (o.dispatchedAt || o.orderStatus === 'OUT_FOR_DELIVERY') return 'dispatched';
  if (o.isCod && o.risk?.level === 'HIGH' && o.confirmation?.result !== 'CONFIRMED') return 'advance';
  if (!o.customerAddress || !o.customerCity) return 'address';
  return 'confirm';
}

/** The text of a template: the shop's own, else the Nafaa admin's default, else the app default. */
export function templateText(key: WaTemplateKey, saved?: Partial<Record<WaTemplateKey, string>>, platform?: Array<{ key: string; text: string }>) {
  return saved?.[key]?.trim() || defaultTemplateText(key, platform);
}

/** The default text when the shop has none: the Nafaa admin's, else the app's. */
export function defaultTemplateText(key: WaTemplateKey, platform?: Array<{ key: string; text: string }>) {
  return platform?.find((x) => x.key === key)?.text.trim() || waInfo(key).text();
}

/** The admin's default WhatsApp texts (empty when none are set). */
export function usePlatformWaTemplates() {
  return usePlatformControls().data?.whatsappTemplates;
}
