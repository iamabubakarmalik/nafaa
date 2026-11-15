/**
 * What this installed app can do for live support.
 *
 * Voice calls, screen share and voice-note recording need native modules
 * that the current store binaries do not contain (WebRTC, microphone
 * recording, audio playback), and Android builds block RECORD_AUDIO. Until a
 * store build adds them, the chat offers WhatsApp for calls, says that calls
 * and screen share work from the web app, and plays voice notes from the
 * team in the in-app browser.
 *
 * When a native build adds them, switch these checks to real availability
 * tests (for example `requireOptionalNativeModule('ExpoAudio')`), never to a
 * plain `true`: an EAS Update must keep working on older binaries.
 */

import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { APP_URL } from '@/core/api/client';
import { SUPPORT, supportWhatsapp } from '@/modules/help';

/** In-app voice and screen calls (needs react-native-webrtc). */
export const canCall = (): boolean => false;

/** Recording voice notes (needs expo-audio and the microphone permission). */
export const canRecordVoice = (): boolean => false;

/** The web app, where calls and screen share work. */
export const WEB_SUPPORT_URL = `${process.env.EXPO_PUBLIC_WEB_APP_URL || (APP_URL.includes('nafaa.pk') ? 'https://app.nafaa.pk' : APP_URL)}/support`;

/** Opens WhatsApp with the support number (the person can call from there). */
export function openWhatsappSupport(message: string) {
  void Linking.openURL(supportWhatsapp(message)).catch(() => void Linking.openURL(`tel:${SUPPORT.phoneIntl}`).catch(() => undefined));
}

export function callSupportPhone() {
  void Linking.openURL(`tel:${SUPPORT.phoneIntl}`).catch(() => undefined);
}

/** Opens a link (file, voice note) inside the app, or in the browser when that fails. */
export async function openInApp(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    void Linking.openURL(url).catch(() => undefined);
  }
}
