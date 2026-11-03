/**
 * Notifications module: the list, read state, push set-up and the general
 * push-tap router. The shell mounts useNotifications() once when signed in.
 */

export { NotificationsScreen } from './screens/NotificationsScreen';
export { routeForNotificationLink } from './lib/links';
export { useNotificationLinks } from './lib/useNotificationLinks';

import { useNotificationLinks } from './lib/useNotificationLinks';
import { usePushSetup } from './lib/usePushSetup';

export function useNotifications(signedIn: boolean) {
  usePushSetup(signedIn);
  useNotificationLinks(signedIn);
}
