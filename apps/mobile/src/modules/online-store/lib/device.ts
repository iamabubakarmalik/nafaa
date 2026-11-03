/**
 * Phone actions used across the online store screens: WhatsApp, call, map,
 * copy, open a web page, and "do this on the web" links.
 */

import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { waNumber } from '@nafaa/core/online-store';
import { APP_URL } from '@/core/api/client';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { toast } from '@/design';

/** Web app address for "Connect on web" (app.nafaa.pk in production). */
export const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || (APP_URL.includes('nafaa.pk') ? 'https://app.nafaa.pk' : APP_URL);

/** Opens WhatsApp on this number with the text; falls back to wa.me in the browser. */
export async function openWhatsApp(phone: string | null | undefined, text: string) {
  const n = waNumber(phone);
  const encoded = encodeURIComponent(text);
  const app = n ? `whatsapp://send?phone=${n}&text=${encoded}` : `whatsapp://send?text=${encoded}`;
  try {
    if (await Linking.canOpenURL(app)) { await Linking.openURL(app); return; }
  } catch { /* fall through to the web link */ }
  await Linking.openURL(`https://wa.me/${n ?? ''}?text=${encoded}`).catch(() => toast.error(t('WhatsApp nahi khula')));
}

export function callPhone(phone?: string | null) {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => toast.error(t('Call nahi mili')));
}

export function openUrl(url?: string | null) {
  if (!url) return;
  Linking.openURL(url).catch(() => toast.error(t('Link nahi khula')));
}

/** Opens a page inside the app's browser sheet (portal pages, labels given as links). */
export async function openInApp(url?: string | null) {
  if (!url) return;
  try { await WebBrowser.openBrowserAsync(url); } catch { openUrl(url); }
}

export async function copyText(text: string, done: string) {
  await Clipboard.setStringAsync(text);
  haptic('success');
  toast.success(done);
}

/** A page of the web app (for things that stay on the web, like connecting channels). */
export const openOnWeb = (path: string) => openUrl(`${WEB_APP_URL}${path}`);
