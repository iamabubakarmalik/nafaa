/**
 * Texts sent to customers (WhatsApp) and printed for them (invoice). They
 * follow the shop's bill language (Settings → Language: settings.language),
 * not the language of the person using the app.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { apiKey } from '@/core/offline';
import { formatMoney } from '@/core/format';
import { normalizeLocale, type Locale } from '@/core/i18n';

export type DocLang = Locale;

/** Shop bill language from /settings (cached, shared with the settings screens). */
export function useShopLanguage(): DocLang {
  const q = useQuery({
    queryKey: apiKey('/settings'),
    queryFn: async () => (await apiClient.get('/settings')).data,
    staleTime: 10 * 60_000,
  });
  const raw = (q.data as { settings?: { language?: string } } | undefined)?.settings?.language;
  return normalizeLocale(raw) ?? 'roman';
}

const rs = (n: number) => formatMoney(n);
const first = (name: string) => (name || '').trim().split(/\s+/)[0] || name;

type Pick3 = Record<DocLang, string>;
const pick = (lang: DocLang, s: Pick3) => s[lang] ?? s.roman;

export interface MsgOrder {
  customerName: string; number: string; total: number; trackingNumber?: string | null; codDue?: number;
  items?: string; address?: string;
}

/** Confirm the order before dispatch (COD). */
export function confirmText(lang: DocLang, o: MsgOrder) {
  const cod = (o.codDue ?? 0) > 0;
  return pick(lang, {
    roman: `Assalam o Alaikum ${o.customerName}! 🙏\nAap ka order #${o.number} mila hai:\n${o.items ?? ''}\nTotal: ${rs(o.total)}\n${cod ? `Delivery par dena hai (COD): ${rs(o.codDue!)}` : 'Paisa mil chuka hai — delivery par kuch nahi dena'}\nAddress: ${o.address ?? ''}\n\nOrder confirm karne ke liye "Haan" likh kar confirm karein. Shukriya!`,
    en: `Hello ${o.customerName}! 🙏\nWe received your order #${o.number}:\n${o.items ?? ''}\nTotal: ${rs(o.total)}\n${cod ? `Pay on delivery (COD): ${rs(o.codDue!)}` : 'Already paid — nothing to pay on delivery'}\nAddress: ${o.address ?? ''}\n\nPlease reply "Yes" to confirm your order. Thank you!`,
    ur: `السلام علیکم ${o.customerName}! 🙏\nآپ کا آرڈر #${o.number} مل گیا ہے:\n${o.items ?? ''}\nٹوٹل: ${rs(o.total)}\n${cod ? `ڈیلیوری پر ادائیگی (COD): ${rs(o.codDue!)}` : 'ادائیگی ہو چکی ہے — ڈیلیوری پر کچھ نہیں دینا'}\nپتا: ${o.address ?? ''}\n\nآرڈر کنفرم کرنے کے لیے "ہاں" لکھ کر بھیجیں۔ شکریہ!`,
  });
}

/** Status message: order confirmed, on the way, or a general opener. */
export function statusText(lang: DocLang, kind: 'confirmed' | 'onTheWay' | 'other', o: MsgOrder) {
  if (kind === 'confirmed') {
    return pick(lang, {
      roman: `Assalam o Alaikum ${o.customerName}! Aap ka order #${o.number} confirm ho gaya hai. Total ${rs(o.total)}. Shukriya 🙏`,
      en: `Hello ${o.customerName}! Your order #${o.number} is confirmed. Total ${rs(o.total)}. Thank you 🙏`,
      ur: `السلام علیکم ${o.customerName}! آپ کا آرڈر #${o.number} کنفرم ہو گیا ہے۔ ٹوٹل ${rs(o.total)}۔ شکریہ 🙏`,
    });
  }
  if (kind === 'onTheWay') {
    const tn = o.trackingNumber;
    const cod = (o.codDue ?? 0) > 0;
    return pick(lang, {
      roman: `Assalam o Alaikum ${o.customerName}! Aap ka order #${o.number} raste me hai 🚚${tn ? ` Tracking: ${tn}` : ''}${cod ? ` — ${rs(o.codDue!)} cash tayyar rakhein.` : ''}`,
      en: `Hello ${o.customerName}! Your order #${o.number} is on the way 🚚${tn ? ` Tracking: ${tn}` : ''}${cod ? ` — please keep ${rs(o.codDue!)} cash ready.` : ''}`,
      ur: `السلام علیکم ${o.customerName}! آپ کا آرڈر #${o.number} راستے میں ہے 🚚${tn ? ` ٹریکنگ: ${tn}` : ''}${cod ? ` — ${rs(o.codDue!)} نقد تیار رکھیں۔` : ''}`,
    });
  }
  return pick(lang, {
    roman: `Assalam o Alaikum ${o.customerName}! Aap ke order #${o.number} ke baare me…`,
    en: `Hello ${o.customerName}! About your order #${o.number}…`,
    ur: `السلام علیکم ${o.customerName}! آپ کے آرڈر #${o.number} کے بارے میں…`,
  });
}

/** Ask a risky COD customer for an advance before dispatch. */
export function advanceAskText(lang: DocLang, o: MsgOrder, amount: number) {
  return pick(lang, {
    roman: `Assalam o Alaikum ${first(o.customerName)}! Aap ka order #${o.number} (${rs(o.total)}) tayyar hai. Bhejne se pehle ${rs(amount)} advance JazzCash / Easypaisa / bank se bhej dein — baqi paisa delivery par. Shukriya!`,
    en: `Hello ${first(o.customerName)}! Your order #${o.number} (${rs(o.total)}) is ready. Before we send it, please pay ${rs(amount)} in advance by JazzCash / Easypaisa / bank — the rest on delivery. Thank you!`,
    ur: `السلام علیکم ${first(o.customerName)}! آپ کا آرڈر #${o.number} (${rs(o.total)}) تیار ہے۔ بھیجنے سے پہلے ${rs(amount)} ایڈوانس جاز کیش / ایزی پیسہ / بینک سے بھیج دیں — باقی رقم ڈیلیوری پر۔ شکریہ!`,
  });
}

/** Payment link for the full amount or an advance. */
export function payLinkText(lang: DocLang, o: MsgOrder, amount: number, advance: boolean, url: string) {
  return pick(lang, {
    roman: `Assalam o Alaikum ${first(o.customerName)}! Order #${o.number} ke ${advance ? 'advance ' : ''}${rs(amount)} yahan se pay karein (card / wallet): ${url}`,
    en: `Hello ${first(o.customerName)}! Please pay ${advance ? 'the advance of ' : ''}${rs(amount)} for order #${o.number} here (card / wallet): ${url}`,
    ur: `السلام علیکم ${first(o.customerName)}! آرڈر #${o.number} کے ${advance ? 'ایڈوانس ' : ''}${rs(amount)} یہاں سے ادا کریں (کارڈ / والٹ): ${url}`,
  });
}

/** Ready message per customer segment; {naam} {dukaan} {link} are filled in. */
export const SEGMENT_TEMPLATES: Record<DocLang, Record<string, string>> = {
  roman: {
    all: 'Assalam o Alaikum {naam}! {dukaan} ki taraf se shukriya 🙏 Naya maal aa gaya hai — dekhne ke liye: {link}',
    vip: 'Assalam o Alaikum {naam}! Aap hamare khaas customer hain ⭐ Sirf aap ke liye 10% discount — code: VIP10. Order: {link}',
    repeat: 'Assalam o Alaikum {naam}! Hamesha {dukaan} par bharosa karne ka shukriya 🙏 Naya stock aa gaya: {link}',
    inactive30: 'Assalam o Alaikum {naam}! Kafi din ho gaye 😊 {dukaan} me naya maal aaya hai — aap ke liye: {link}',
    inactive60: 'Assalam o Alaikum {naam}! Hum aap ko yaad kar rahe hain 🙂 Wapas aane par khaas discount — code: WAPAS10. {link}',
    inactive90: 'Assalam o Alaikum {naam}! {dukaan} ki taraf se aap ke liye 15% discount — code: WAPAS15. Order: {link}',
    new: 'Assalam o Alaikum {naam}! {dukaan} se pehla order karne ka shukriya 🙏 Kaisa laga? Agli dafa ke liye: {link}',
    risky: 'Assalam o Alaikum {naam}! {dukaan} se order ke liye shukriya. Agla order confirm karne ke liye isi number par reply karein.',
    blocked: '',
  },
  en: {
    all: 'Hello {naam}! Thank you from {dukaan} 🙏 New stock has arrived — have a look: {link}',
    vip: 'Hello {naam}! You are one of our special customers ⭐ 10% off just for you — code: VIP10. Order: {link}',
    repeat: 'Hello {naam}! Thank you for always trusting {dukaan} 🙏 New stock is here: {link}',
    inactive30: 'Hello {naam}! It has been a while 😊 New items at {dukaan} — for you: {link}',
    inactive60: 'Hello {naam}! We miss you 🙂 A special discount when you come back — code: WAPAS10. {link}',
    inactive90: 'Hello {naam}! 15% off for you from {dukaan} — code: WAPAS15. Order: {link}',
    new: 'Hello {naam}! Thank you for your first order with {dukaan} 🙏 How did you like it? Next time: {link}',
    risky: 'Hello {naam}! Thank you for ordering from {dukaan}. Please reply on this number to confirm your next order.',
    blocked: '',
  },
  ur: {
    all: 'السلام علیکم {naam}! {dukaan} کی طرف سے شکریہ 🙏 نیا مال آ گیا ہے — دیکھنے کے لیے: {link}',
    vip: 'السلام علیکم {naam}! آپ ہمارے خاص کسٹمر ہیں ⭐ صرف آپ کے لیے 10% ڈسکاؤنٹ — کوڈ: VIP10۔ آرڈر: {link}',
    repeat: 'السلام علیکم {naam}! ہمیشہ {dukaan} پر بھروسہ کرنے کا شکریہ 🙏 نیا اسٹاک آ گیا: {link}',
    inactive30: 'السلام علیکم {naam}! کافی دن ہو گئے 😊 {dukaan} میں نیا مال آیا ہے — آپ کے لیے: {link}',
    inactive60: 'السلام علیکم {naam}! ہم آپ کو یاد کر رہے ہیں 🙂 واپس آنے پر خاص ڈسکاؤنٹ — کوڈ: WAPAS10۔ {link}',
    inactive90: 'السلام علیکم {naam}! {dukaan} کی طرف سے آپ کے لیے 15% ڈسکاؤنٹ — کوڈ: WAPAS15۔ آرڈر: {link}',
    new: 'السلام علیکم {naam}! {dukaan} سے پہلا آرڈر کرنے کا شکریہ 🙏 کیسا لگا؟ اگلی دفعہ کے لیے: {link}',
    risky: 'السلام علیکم {naam}! {dukaan} سے آرڈر کا شکریہ۔ اگلا آرڈر کنفرم کرنے کے لیے اسی نمبر پر جواب دیں۔',
    blocked: '',
  },
};

export const fillTemplate = (tpl: string, v: { naam: string; dukaan: string; link: string }) =>
  tpl.replace(/\{naam\}/g, first(v.naam)).replace(/\{dukaan\}/g, v.dukaan).replace(/\{link\}/g, v.link).replace(/\s+\n/g, '\n').trim();
