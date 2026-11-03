/** WhatsApp text for a booking (ready, pickup reminder, late, plain update), in the shop's bill language. */

import type { MessageLang } from '../customers/messages';
import type { PickupState } from './index';

export interface BookingMessageInput {
  customer: string;
  shop: string;
  number: string;
  status: string;
  pickupState: PickupState;
  /** Already formatted, for example "Mon, 3 Nov 2026". */
  pickupDay?: string;
  /** One "Name × 2" per line, already formatted. */
  items: string[];
  total: string;
  paid: string;
  due: string;
}

const W: Record<MessageLang, {
  hi: (n: string) => string; ready: string; late: (d: string) => string; today: string; tomorrow: string; plain: string;
  booking: string; pickup: string; total: string; paid: string; due: string; bye: string;
}> = {
  roman: {
    hi: (n) => `Assalam-o-Alaikum ${n} 👋`, ready: 'Aap ka saman tayyar hai, jab chahein le jayein.',
    late: (d) => `Aap ki booking ka pickup ${d} tha. Jab suhulat ho tashreef layein.`, today: 'Yaad dihani: aaj aap ki booking ka pickup hai.',
    tomorrow: 'Yaad dihani: kal aap ki booking ka pickup hai.', plain: 'Aap ki booking ki details:', booking: 'Booking', pickup: 'Pickup', total: 'Kul', paid: 'Diya', due: 'Baqi', bye: 'Shukriya 🙏',
  },
  en: {
    hi: (n) => `Hello ${n} 👋`, ready: 'Your order is ready. Please collect it whenever you like.',
    late: (d) => `Your booking was due for pickup on ${d}. Please visit when you can.`, today: 'Reminder: your booking is due for pickup today.',
    tomorrow: 'Reminder: your booking is due for pickup tomorrow.', plain: 'Your booking details:', booking: 'Booking', pickup: 'Pickup', total: 'Total', paid: 'Paid', due: 'Due', bye: 'Thank you 🙏',
  },
  ur: {
    hi: (n) => `السلام علیکم ${n} 👋`, ready: 'آپ کا سامان تیار ہے، جب چاہیں لے جائیں۔',
    late: (d) => `آپ کی بکنگ کا پک اپ ${d} تھا۔ جب سہولت ہو تشریف لائیں۔`, today: 'یاد دہانی: آج آپ کی بکنگ کا پک اپ ہے۔',
    tomorrow: 'یاد دہانی: کل آپ کی بکنگ کا پک اپ ہے۔', plain: 'آپ کی بکنگ کی تفصیل:', booking: 'بکنگ', pickup: 'پک اپ', total: 'کل', paid: 'ادا', due: 'باقی', bye: 'شکریہ 🙏',
  },
};

export function bookingMessage(b: BookingMessageInput, lang: MessageLang = 'roman'): string {
  const w = W[lang];
  const opening = b.status === 'READY_FOR_PICKUP' ? w.ready
    : b.pickupState === 'overdue' ? w.late(b.pickupDay ?? '')
      : b.pickupState === 'today' ? w.today
        : b.pickupState === 'tomorrow' ? w.tomorrow : w.plain;
  const lines = b.items.slice(0, 6).map((i) => `• ${i}`).join('\n');
  return [
    w.hi(b.customer), '', opening, '', `📌 ${w.booking}: ${b.number}`, b.pickupDay ? `📅 ${w.pickup}: ${b.pickupDay}` : '', lines, '',
    `💰 ${w.total}: ${b.total}`, `✅ ${w.paid}: ${b.paid}`, `📖 ${w.due}: ${b.due}`, '', `${b.shop}`, w.bye,
  ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
}
