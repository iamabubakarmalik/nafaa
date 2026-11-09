/**
 * WhatsApp (wa.me) message templates: the default texts, the shop's own
 * texts saved on the server (same as the web WhatsApp messages page),
 * filling the {placeholders} from an order or a cart, and which template
 * fits an order right now.
 */

import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import { CheckCircle2, CreditCard, Heart, MapPin, ShoppingCart, Truck } from 'lucide-react-native';
import { orderNo } from '@nafaa/core/online-store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import { commerceApi, type BoardOrder, type WaTemplateKey } from '../api/board';

export interface WaTemplateInfo { key: WaTemplateKey; label: string; hint: string; icon: LucideIcon; tone: StatusTone; text: string }

/** Default texts (msg keys, translated when used); {name} style placeholders are filled per order. */
export const WA_TEMPLATES: WaTemplateInfo[] = [
  {
    key: 'confirm', label: msg('Order confirm'), hint: msg('COD order bhejne se pehle'), icon: CheckCircle2, tone: 'success',
    text: msg('Assalam o Alaikum {name}! {shop} se aap ka order #{no}: {items}. Total {total}. Kya hum ye order bhej dein? Jawab me "Haan" ya "Nahi" likh dein. Shukriya!'),
  },
  {
    key: 'address', label: msg('Address check'), hint: msg('Address adhoora ya shehar ghalat'), icon: MapPin, tone: 'info',
    text: msg('Assalam o Alaikum {name}! Order #{no} ke liye address check kar lein: {address}, {city}. Kya ye theek hai? Ghar number aur qareeb ki koi nishani bhi likh dein.'),
  },
  {
    key: 'advance', label: msg('Advance maangein'), hint: msg('Risky COD order'), icon: CreditCard, tone: 'accent',
    text: msg('Assalam o Alaikum {name}! Order #{no} ({total}) bhejne se pehle {advance} advance bhej dein. Baqi paisa delivery par dena hoga. Advance milte hi order bhej denge.'),
  },
  {
    key: 'dispatched', label: msg('Dispatched'), hint: msg('Tracking number ke saath'), icon: Truck, tone: 'warning',
    text: msg('Assalam o Alaikum {name}! Aap ka order #{no} {courier} se bhej diya hai. Tracking number: {tracking} {trackingUrl} Delivery par {cod} tayyar rakhein. Shukriya!'),
  },
  {
    key: 'delivered', label: msg('Delivered — shukriya'), hint: msg('Review maangein'), icon: Heart, tone: 'danger',
    text: msg('Shukriya {name}! Umeed hai order #{no} pasand aaya. Apni rai zaroor batayein, aap ki baat hamare liye ahem hai. {shop}'),
  },
  {
    key: 'cart', label: msg('Cart wapas'), hint: msg('Abandoned cart ke liye'), icon: ShoppingCart, tone: 'brand',
    text: msg('Assalam o Alaikum {name}! Aap ne {shop} par {items} pasand kiye the. Aap ka cart abhi bhi tayyar hai: {cartUrl} Koi sawal ho to yahin poochein.'),
  },
];

export const waInfo = (key: WaTemplateKey) => WA_TEMPLATES.find((x) => x.key === key)!;

export const WA_KEY = ['wa-templates'] as const;

/** The shop's saved texts (empty keys use the defaults). */
export function useWaTemplates(enabled = true) {
  return useQuery({ queryKey: WA_KEY, queryFn: commerceApi.waTemplates, staleTime: 10 * 60_000, enabled });
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

export function orderValues(o: BoardOrder, shop: string, advancePct = 30): WaValues {
  const cod = o.money?.codDue ?? (o.isCod ? o.total : 0);
  return {
    name: o.customerName,
    shop,
    no: orderNo(o),
    items: o.items.slice(0, 3).map((i) => `${qty(Number(i.quantity))} × ${i.name}`).join(', '),
    total: formatMoney(o.total),
    cod: formatMoney(cod),
    address: o.customerAddress ?? '',
    city: o.customerCity ?? '',
    advance: formatMoney(Math.ceil((o.total * advancePct) / 100 / 10) * 10),
    courier: o.courierLabel ?? o.courierName ?? '',
    tracking: o.trackingNumber ?? '',
    trackingUrl: o.courierSite ?? '',
  };
}

/** The template that fits an order now. */
export function suggestTemplate(o: BoardOrder): WaTemplateKey {
  if (o.orderStatus === 'DELIVERED') return 'delivered';
  if (o.dispatchedAt || o.orderStatus === 'OUT_FOR_DELIVERY') return 'dispatched';
  if (o.isCod && o.risk?.level === 'HIGH' && o.confirmation?.result !== 'CONFIRMED') return 'advance';
  if (!o.customerAddress || !o.customerCity) return 'address';
  return 'confirm';
}

/** The text of a template: the shop's own, else the default (translated). */
export function templateText(key: WaTemplateKey, saved?: Partial<Record<WaTemplateKey, string>>) {
  return saved?.[key]?.trim() || t(waInfo(key).text);
}
