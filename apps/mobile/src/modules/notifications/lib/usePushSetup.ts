/**
 * Push set-up after sign-in: how notifications show while the app is open,
 * the Android channels, the permission (asked once, a few seconds after the
 * app is ready) and sending the Expo push token to the server. Simulators
 * and builds without a project id skip the token quietly.
 *
 * Tones: Android fixes a channel's sound when the channel is first created,
 * so the tone channels are only made on builds that carry the tone files
 * (runtime 2.0.1 and later). Older builds get the silent and no-vibration
 * channels, which need no files; the server sends them the default sound.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { t } from '@/core/i18n';
import { notificationsApi, type AlertSound } from '../api/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true,
  }),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let registered = false;
let channelsReady: Promise<void> | null = null;

export const TONES: Exclude<AlertSound, 'silent'>[] = ['chime', 'cash', 'bell', 'alert'];

/** Whether this installed binary carries the bundled tones. */
export function hasTones(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS !== 'android') return false;
  const [a = 0, b = 0, c = 0] = String(Updates.runtimeVersion ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  return a > 2 || (a === 2 && (b > 0 || c >= 1));
}

export const toneLabel = (s: AlertSound): string =>
  ({ chime: t('Nafaa chime'), cash: t('Cash register'), bell: t('Soft bell'), alert: t('Alert'), silent: t('Silent') })[s];

/** Same channel ids the server picks (alert-rules.ts pushSound). */
export function channelFor(sound: AlertSound, vibrate: boolean): string {
  if (sound === 'silent') return 'nafaa-silent';
  if (!hasTones()) return vibrate ? 'default' : 'nafaa-default-novib';
  return `nafaa-${sound}${vibrate ? '' : '-novib'}`;
}

async function createChannels() {
  if (Platform.OS !== 'android') return;
  const { AndroidImportance: I } = Notifications;
  const buzz = [0, 250, 250, 250];
  await Notifications.setNotificationChannelAsync('default', { name: t('Default'), importance: I.MAX, vibrationPattern: buzz, sound: 'default', showBadge: true });
  await Notifications.setNotificationChannelAsync('sales', { name: t('Sales & Orders'), importance: I.HIGH, sound: 'default' });
  await Notifications.setNotificationChannelAsync('alerts', { name: t('Stock & Alerts'), importance: I.HIGH, sound: 'default' });
  await Notifications.setNotificationChannelAsync('nafaa-silent', { name: t('Silent'), importance: I.DEFAULT, sound: null, enableVibrate: false });
  await Notifications.setNotificationChannelAsync('nafaa-default-novib', { name: t('Phone sound, no vibration'), importance: I.HIGH, sound: 'default', enableVibrate: false });
  if (!hasTones()) return;
  for (const tone of TONES) {
    await Notifications.setNotificationChannelAsync(`nafaa-${tone}`, { name: toneLabel(tone), importance: I.HIGH, sound: `${tone}.wav`, vibrationPattern: buzz });
    await Notifications.setNotificationChannelAsync(`nafaa-${tone}-novib`, { name: t('{{tone}} (no vibration)', { tone: toneLabel(tone) }), importance: I.HIGH, sound: `${tone}.wav`, enableVibrate: false });
  }
}

export function setUpChannels(): Promise<void> {
  channelsReady ??= createChannels().catch(() => { channelsReady = null; });
  return channelsReady;
}

export type PushRegistration = 'ok' | 'denied' | 'unsupported' | 'error';

/** Asks (if still allowed), gets the token and saves it on the server. */
export async function registerPushNow(ask = true): Promise<PushRegistration> {
  if (!Device.isDevice) return 'unsupported';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId || !UUID.test(String(projectId))) return 'unsupported';
  try {
    await setUpChannels();
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted' && current.canAskAgain && ask) status = (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })).status;
    if (status !== 'granted') return 'denied';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token) return 'error';
    await notificationsApi.registerPushToken(token);
    return 'ok';
  } catch {
    return 'error';
  }
}

/** Plays a tone through its channel as a local notification (needs permission). */
export async function previewTone(sound: AlertSound, vibrate: boolean): Promise<boolean> {
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (!perm?.granted) return false;
  await setUpChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: toneLabel(sound),
      body: t('Notifications isi awaaz se aayengi.'),
      ...(Platform.OS === 'ios' ? { sound: sound === 'silent' ? false : `${sound}.wav` } : {}),
      data: { kind: 'tone-preview' },
    },
    trigger: Platform.OS === 'android' ? { channelId: channelFor(sound, vibrate) } : null,
  });
  return true;
}

export function usePushSetup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) { registered = false; return; }
    if (registered) return;
    registered = true;
    const timer = setTimeout(() => { registerPushNow().then((r) => { if (r === 'error') registered = false; }).catch(() => { registered = false; }); }, 4000);
    return () => clearTimeout(timer);
  }, [enabled]);
}
