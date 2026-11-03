/**
 * Push set-up after sign-in: how notifications show while the app is open,
 * the Android channels, the permission (asked once, a few seconds after the
 * app is ready) and sending the Expo push token to the server. Simulators
 * and builds without a project id skip the token quietly.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true,
  }),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let registered = false;

async function setUpChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], sound: 'default', showBadge: true });
  await Notifications.setNotificationChannelAsync('sales', { name: 'Sales & Orders', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
  await Notifications.setNotificationChannelAsync('alerts', { name: 'Stock & Alerts', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
}

async function register(): Promise<void> {
  if (!Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId || !UUID.test(String(projectId))) return;
  await setUpChannels();
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted' && current.canAskAgain) status = (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })).status;
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (token) await notificationsApi.registerPushToken(token);
}

export function usePushSetup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) { registered = false; return; }
    if (registered) return;
    registered = true;
    const timer = setTimeout(() => { register().catch(() => { registered = false; }); }, 4000);
    return () => clearTimeout(timer);
  }, [enabled]);
}
