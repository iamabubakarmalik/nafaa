/**
 * Live support: chat with the Nafaa team (same API and socket events as the
 * web app). The tabs mount useSupportBoot() once when signed in.
 */

export { SupportScreen } from './screens/SupportScreen';
export { SupportNudge } from './components/SupportNudge';
export { useSupportBoot, useSupportUnread } from './hooks/useSupportBoot';
export { SUPPORT_HREF, isSupportChatVisible, isSupportNotification } from './lib/notify';
