import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi } from '@/api/notifications.api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('No EAS projectId — push token will not work');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.error('Push token error:', e);
    return null;
  }
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      const token = await registerForPushNotifications();
      if (token) {
        try {
          await notificationsApi.registerPushToken(token);
        } catch (e) {
          console.error('Failed to register push token:', e);
        }
      }
    })();

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    const respSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link;
      if (link) {
        // Navigate using router (handled in component)
      }
    });

    return () => {
      sub.remove();
      respSub.remove();
    };
  }, [isAuthenticated]);
}
