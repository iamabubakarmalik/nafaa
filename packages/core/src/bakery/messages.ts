/** WhatsApp texts for cake and bulk orders, in the shop's bill language. */

import type { MessageLang } from '../customers/messages';

export interface CakeMessageInput {
  customer: string;
  shop: string;
  number: string;
  /** False for draft and quoted orders. */
  confirmed: boolean;
  /** "Birthday · 2 Pound · Chocolate", already worded. */
  cake: string;
  messageOnCake?: string | null;
  delivered: boolean;
  /** Already formatted date and time. */
  when: string;
  address?: string | null;
  total: string;
  paid?: string | null;
  due?: string | null;
  status: string;
}

export interface BulkMessageInput {
  contact?: string | null;
  shop: string;
  number: string;
  confirmed: boolean;
  event: string;
  when: string;
  venue?: string | null;
  items: string[];
  total: string;
  paid?: string | null;
  due?: string | null;
}

const W: Record<MessageLang, {
  hi: (n: string) => string; booked: (shop: string, n: string) => string; confirmed: (shop: string, n: string) => string;
  onCake: string; arrives: string; collect: string; total: string; advance: string; due: string; allPaid: string; status: string; bye: string;
  event: string; venue: string;
}> = {
  roman: {
    hi: (n) => `Assalam o alaikum${n ? ` ${n}` : ''},`, booked: (s, n) => `${s} se aap ka order *${n}* darj hai.`, confirmed: (s, n) => `${s} se aap ka order *${n}* pakka hai.`,
    onCake: 'Cake par', arrives: 'Pahunchega', collect: 'Le sakte hain', total: 'Kul', advance: 'Advance mila', due: 'Baqi', allPaid: 'Poora paisa mil gaya ✅', status: 'Halat', bye: 'Shukriya!',
    event: 'Event', venue: 'Jagah',
  },
  en: {
    hi: (n) => `Hello${n ? ` ${n}` : ''},`, booked: (s, n) => `Your order *${n}* with ${s} is noted.`, confirmed: (s, n) => `Your order *${n}* with ${s} is confirmed.`,
    onCake: 'On the cake', arrives: 'Delivery', collect: 'Ready to collect', total: 'Total', advance: 'Advance received', due: 'Balance', allPaid: 'Fully paid ✅', status: 'Status', bye: 'Thank you!',
    event: 'Event', venue: 'Venue',
  },
  ur: {
    hi: (n) => `السلام علیکم${n ? ` ${n}` : ''}،`, booked: (s, n) => `${s} میں آپ کا آرڈر *${n}* درج ہے۔`, confirmed: (s, n) => `${s} میں آپ کا آرڈر *${n}* پکا ہے۔`,
    onCake: 'کیک پر', arrives: 'پہنچے گا', collect: 'لے سکتے ہیں', total: 'کل', advance: 'ایڈوانس ملا', due: 'باقی', allPaid: 'پورا پیسہ مل گیا ✅', status: 'حالت', bye: 'شکریہ!',
    event: 'تقریب', venue: 'جگہ',
  },
};

const tidy = (lines: string[]) => lines.filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n').trim();

export function cakeMessage(o: CakeMessageInput, lang: MessageLang = 'roman'): string {
  const w = W[lang];
  return tidy([
    w.hi(o.customer),
    o.confirmed ? w.confirmed(o.shop, o.number) : w.booked(o.shop, o.number),
    '',
    `🎂 ${o.cake}`,
    o.messageOnCake ? `✍️ ${w.onCake}: "${o.messageOnCake}"` : '',
    `🕒 ${o.delivered ? w.arrives : w.collect}: ${o.when}`,
    o.delivered && o.address ? `📍 ${o.address}` : '',
    '',
    `${w.total}: ${o.total}`,
    o.paid ? `${w.advance}: ${o.paid}` : '',
    o.due ? `${w.due}: ${o.due}` : w.allPaid,
    `${w.status}: ${o.status}`,
    '',
    w.bye,
  ]);
}

export function bulkMessage(o: BulkMessageInput, lang: MessageLang = 'roman'): string {
  const w = W[lang];
  return tidy([
    w.hi(o.contact ?? ''),
    o.confirmed ? w.confirmed(o.shop, o.number) : w.booked(o.shop, o.number),
    '',
    `🎉 ${w.event}: ${o.event} · ${o.when}`,
    o.venue ? `📍 ${w.venue}: ${o.venue}` : '',
    ...o.items.slice(0, 12).map((i) => `• ${i}`),
    '',
    `${w.total}: ${o.total}`,
    o.paid ? `${w.advance}: ${o.paid}` : '',
    o.due ? `${w.due}: ${o.due}` : w.allPaid,
    '',
    w.bye,
  ]);
}
