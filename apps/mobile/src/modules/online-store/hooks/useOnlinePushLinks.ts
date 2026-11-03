/**
 * Online store push links. Tapped notifications are handled by the general
 * handler in the notifications module, which asks `onlineRouteFor` first;
 * this hook only keeps the old entry point.
 */

import { useNotificationLinks } from '@/modules/notifications/lib/useNotificationLinks';

export { onlineRouteFor } from './onlineRoutes';

export function useOnlinePushLinks(enabled: boolean) {
  useNotificationLinks(enabled);
}
