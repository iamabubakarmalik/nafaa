import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi } from '@/api/notifications.api';

// Foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.log('ℹ️  Push: requires real device (not simulator)');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any).easConfig?.projectId;

  if (!projectId || !UUID_RE.test(String(projectId))) {
    if (__DEV__) console.log('ℹ️  Skipping push: no valid EAS projectId. Run `npx eas-cli init`');
    return null;
  }

  // Android channel must be set BEFORE requesting permission
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
      sound: 'default',
      showBadge: true,
      enableVibrate: true,
    });

    // Additional channel for important alerts
    await Notifications.setNotificationChannelAsync('sales', {
      name: 'Sales & Orders',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#16a34a',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Stock & Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#f59e0b',
      sound: 'default',
    });
  }

  // Permission request
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('⚠️  Push permission denied by user');
    return null;
  }

  // Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) console.log('✅ Push token obtained:', tokenData.data.slice(0, 30) + '...');
    return tokenData.data;
  } catch (e: any) {
    if (__DEV__) console.log('ℹ️  Push token unavailable:', e?.message);
    return null;
  }
}

export function usePushNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      return;
    }

    // Register token (only once per session)
    if (!registeredRef.current) {
      registeredRef.current = true;
      (async () => {
        const token = await registerForPushNotifications();
        if (token) {
          try {
            await notificationsApi.registerPushToken(token);
            if (__DEV__) console.log('✅ Push token saved to backend');
          } catch (e: any) {
            if (__DEV__) console.log('⚠️  Failed to save token:', e?.message);
          }
        }
      })();
    }

    // Foreground: notification received
    receivedSub.current = Notifications.addNotificationReceivedListener((notif) => {
      if (__DEV__) {
        console.log('📬 Notification received:', notif.request.content.title);
      }
    });

    // User tapped notification (foreground OR background)
    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const link = data?.link;

      if (typeof link === 'string' && link.length > 0) {
        const path = link.startsWith('/') ? link : `/${link}`;
        try {
          router.push(path as any);
        } catch {
          router.push('/notifications');
        }
      } else {
        router.push('/notifications');
      }
    });

    return () => {
      if (receivedSub.current) {
        receivedSub.current.remove();
      }
      if (responseSub.current) {
        responseSub.current.remove();
      }
    };
  }, [isAuthenticated]);
}
