/**
 * Alerts for new support replies.
 *
 *  - Android channel `nafaa-support` plays the soft bell (`bell.wav`, bundled
 *    in binaries from 2.0.1). The server sends support pushes on that channel
 *    with `data: { kind: 'support', link: '/support' }`; tapping one opens the
 *    chat through the shared push-tap router (notifications/lib/links.ts).
 *    Older Android binaries have no tone files, so they use `default`.
 *  - In the app, a reply that arrives while the chat is not on screen shows a
 *    local notification on the same channel (sound + banner, tap opens the
 *    chat). Without notification permission it falls back to a toast.
 *  - While the chat is on screen, support pushes are not shown at all.
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { t } from '@/core/i18n';
import { haptic } from '@/core/device/haptics';
import { toast } from '@/design';
import { hasTones } from '@/modules/notifications/lib/usePushSetup';

export const SUPPORT_HREF = '/support';
export const SUPPORT_CHANNEL = 'nafaa-support';
const SUPPORT_SOUND = 'bell.wav';

export { markChatVisible, isSupportChatVisible, isSupportNotification } from './visibility';

let channelReady: Promise<string> | null = null;

/** Creates the support channel once (Android); resolves with the channel id to use. */
export function ensureSupportChannel(): Promise<string> {
  channelReady ??= (async () => {
    if (Platform.OS !== 'android') return SUPPORT_CHANNEL;
    if (!hasTones()) return 'default';
    await Notifications.setNotificationChannelAsync(SUPPORT_CHANNEL, {
      name: t('Support chat'),
      description: t('Nafaa Support team ke replies'),
      importance: Notifications.AndroidImportance.HIGH,
      sound: SUPPORT_SOUND,
      vibrationPattern: [0, 120, 80, 120],
      showBadge: true,
    });
    return SUPPORT_CHANNEL;
  })().catch(() => { channelReady = null; return 'default'; });
  return channelReady;
}

/** A reply arrived while the chat is not on screen (app in use). */
export async function alertSupportReply(title: string, body: string) {
  haptic('tap');
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (perm?.granted) {
    try {
      const channelId = await ensureSupportChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: body || t('Naya message'),
          data: { kind: 'support', link: SUPPORT_HREF },
          ...(Platform.OS === 'ios' ? { sound: SUPPORT_SOUND } : {}),
        },
        trigger: Platform.OS === 'android' ? { channelId } : null,
      });
      return;
    } catch { /* fall back to the toast */ }
  }
  toast.info(title, { message: body, action: { label: t('Kholein'), onPress: () => router.push(SUPPORT_HREF as never) } });
}
