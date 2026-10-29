/**
 * WhatsApp payment reminders for distribution customers. A wa.me link opens
 * WhatsApp with the message already typed; the user presses Send. No paid
 * WhatsApp API is involved.
 */

import { waLink, waNumber } from '@core/lib/whatsapp/templates';
import { rs } from './meta';

export interface ReminderParty {
  name: string;
  businessName?: string | null;
  phone?: string | null;
}

/** The reminder text: shop name, amount on the khata and how old the oldest bill is. */
export function reminderText(c: ReminderParty, balance: number, dueDays: number | null, shop: string): string {
  const who = c.name || c.businessName || 'Bhai';
  const lines = [
    `Assalam-o-Alaikum ${who},`,
    '',
    `${shop || 'Hamari dukaan'} ki taraf se yaad-dehani: aap ke khate me *${rs(balance)}* udhaar hai.`,
  ];
  if (dueDays != null && dueDays > 0) lines.push(`Sab se purana bill ${dueDays} din purana hai.`);
  lines.push('', 'Mehrbani karke jald payment kar dein. Shukriya 🙏');
  return lines.join('\n');
}

export function reminderLink(c: ReminderParty, balance: number, dueDays: number | null, shop: string): string | null {
  return waLink(c.phone, reminderText(c, balance, dueDays, shop));
}

export const hasWhatsapp = (phone?: string | null) => !!waNumber(phone);
