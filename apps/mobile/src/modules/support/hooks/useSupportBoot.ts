/**
 * Starts live support for the signed-in shop, once, from the main tabs:
 * connects the socket, wires the support events to the store, loads the team
 * status (and the unread badge) and re-joins the conversation room after a
 * reconnect.
 *
 * The socket is closed while the app is in the background (the server then
 * treats the shop as away and sends a push for new replies) and reconnects
 * when the app comes back, catching up on anything missed. While the socket
 * is down the badge is checked every minute.
 *
 * Calls cannot be answered in this app yet (see lib/capabilities.ts): an
 * incoming call from the team shows a note pointing to WhatsApp or the web
 * app, and is left ringing there.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { toast } from '@/design';
import { SUPPORT_EVENTS, supportApi } from '../api/support';
import { ensureSupportChannel, SUPPORT_HREF } from '../lib/notify';
import { closeSupportSocket, getSupportSocket, pauseSupportSocket, resumeSupportSocket } from '../lib/socket';
import { useSupportStore } from '../store';

function onCallInvite() {
  toast.info(t('Nafaa team call kar rahi hai'), {
    message: t('App mein call abhi nahi hoti. Web app par call uthayein, ya WhatsApp par call karein.'),
    action: { label: t('Chat kholein'), onPress: () => router.push(SUPPORT_HREF as never) },
    duration: 12_000,
  });
}

export function useSupportBoot() {
  const signedIn = useAuthStore((s) => s.isAuthenticated && !!s.accessToken && !!s.tenant);

  useEffect(() => {
    if (!signedIn) return;
    const socket = getSupportSocket();
    if (!socket) return;
    const chat = useSupportStore.getState();
    void ensureSupportChannel();

    const on: Array<[string, (...args: never[]) => void]> = [
      [SUPPORT_EVENTS.message, chat.handleMessage],
      [SUPPORT_EVENTS.messageUpdated, chat.handleMessageUpdated],
      [SUPPORT_EVENTS.conversation, chat.handleConversation],
      [SUPPORT_EVENTS.typingEvent, chat.handleTyping],
      [SUPPORT_EVENTS.readEvent, (e) => chat.handleRead(e, 'read')],
      [SUPPORT_EVENTS.deliveredEvent, (e) => chat.handleRead(e, 'delivered')],
      [SUPPORT_EVENTS.presence, chat.handlePresence],
      [SUPPORT_EVENTS.callInvite, onCallInvite],
    ];
    on.forEach(([name, fn]) => socket.on(name, fn as (...args: unknown[]) => void));

    const onConnect = () => {
      const s = useSupportStore.getState();
      s.joinRoom();
      // Catch up on anything missed while disconnected.
      if (s.loaded) void s.load(true);
      void s.refreshStatus();
    };
    socket.on('connect', onConnect);
    if (!socket.connected) socket.connect();

    void chat.refreshStatus();

    const poll = setInterval(() => {
      if (getSupportSocket()?.connected || AppState.currentState !== 'active') return;
      supportApi.unread().then((r) => useSupportStore.setState({ unread: r.unread })).catch(() => undefined);
    }, 60_000);

    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        resumeSupportSocket();
        useSupportStore.getState().markRead();
      } else if (state === 'background') {
        useSupportStore.getState().setTyping(false);
        pauseSupportSocket();
      }
    });

    return () => {
      on.forEach(([name, fn]) => socket.off(name, fn as (...args: unknown[]) => void));
      socket.off('connect', onConnect);
      clearInterval(poll);
      app.remove();
      // The tabs unmount on sign-out: nothing of this shop's chat may stay for the next person.
      if (!useAuthStore.getState().accessToken) {
        closeSupportSocket();
        useSupportStore.getState().reset();
      }
    };
  }, [signedIn]);

  // Signing out drops the chat and the connection.
  useEffect(() => {
    if (signedIn) return;
    closeSupportSocket();
    useSupportStore.getState().reset();
  }, [signedIn]);
}

/** Unread replies from the support team (badge on the entry points). */
export const useSupportUnread = () => useSupportStore((s) => s.unread);
