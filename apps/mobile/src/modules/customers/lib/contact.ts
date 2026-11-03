/** Opening the phone's dialer, WhatsApp and share sheet for a customer. */

import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { waLink } from '@nafaa/core/customers';
import { t } from '@/core/i18n';
import { toast } from '@/design';

export const callPhone = (phone?: string | null) => { if (phone) void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`); };

/** Opens WhatsApp with the text ready; false when the customer has no phone. */
export function openWhatsApp(phone: string | null | undefined, text: string): boolean {
  const link = waLink(phone, text);
  if (!link) { toast.warning(t('Is customer ka phone number nahi hai')); return false; }
  void Linking.openURL(link);
  return true;
}

export async function copyText(text: string) {
  await Clipboard.setStringAsync(text);
  toast.success(t('Copy ho gaya'));
}
