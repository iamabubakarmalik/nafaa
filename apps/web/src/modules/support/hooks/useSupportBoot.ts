/**
 * Starts live support for the signed-in shop, once, from the app shell:
 * connects the socket, wires support and call events to the stores, loads
 * the team status (and the unread badge), re-joins the conversation room
 * after a reconnect, and checks the badge every minute while the socket is
 * down. Also marks messages read when the tab comes back into view.
 */

import { useEffect } from 'react';
import { useAuthStore } from '@core/stores/auth.store';
import { SUPPORT_EVENTS, supportApi } from '../api/support.api';
import { closeSupportSocket, getSupportSocket } from '../lib/socket';
import { useCallStore } from '../lib/call';
import { useSupportStore } from '../store';

export function useSupportBoot() {
  const signedIn = useAuthStore((s) => !!s.accessToken && !!s.tenant);

  useEffect(() => {
    if (!signedIn) return;
    const socket = getSupportSocket();
    if (!socket) return;
    const chat = useSupportStore.getState();
    const call = useCallStore.getState();

    const on: Array<[string, (...args: never[]) => void]> = [
      [SUPPORT_EVENTS.message, chat.handleMessage],
      [SUPPORT_EVENTS.messageUpdated, chat.handleMessageUpdated],
      [SUPPORT_EVENTS.conversation, chat.handleConversation],
      [SUPPORT_EVENTS.typingEvent, chat.handleTyping],
      [SUPPORT_EVENTS.readEvent, (e) => chat.handleRead(e, 'read')],
      [SUPPORT_EVENTS.deliveredEvent, (e) => chat.handleRead(e, 'delivered')],
      [SUPPORT_EVENTS.presence, chat.handlePresence],
      [SUPPORT_EVENTS.callInvite, call.onInvite],
      [SUPPORT_EVENTS.callAccept, call.onAccept],
      [SUPPORT_EVENTS.callDecline, call.onDecline],
      [SUPPORT_EVENTS.callCancel, call.onCancel],
      [SUPPORT_EVENTS.callSignal, call.onSignal],
      [SUPPORT_EVENTS.callMedia, call.onMedia],
      [SUPPORT_EVENTS.callEnd, call.onEnd],
      [SUPPORT_EVENTS.callRecording, call.onRecording],
    ];
    on.forEach(([name, fn]) => socket.on(name, fn as (...args: unknown[]) => void));

    const onConnect = () => {
      useSupportStore.getState().joinRoom();
      // Catch up on anything missed while offline.
      if (useSupportStore.getState().loaded) void useSupportStore.getState().load(true);
      void useSupportStore.getState().refreshStatus();
    };
    socket.on('connect', onConnect);

    void chat.refreshStatus();

    const poll = window.setInterval(() => {
      if (getSupportSocket()?.connected) return;
      supportApi.unread().then((r) => {
        const s = useSupportStore.getState();
        if (r.unread > s.unread && !(s.views > 0 && !document.hidden)) useSupportStore.setState({ unread: r.unread });
      }).catch(() => undefined);
    }, 60_000);

    const onVisible = () => { if (!document.hidden) useSupportStore.getState().markRead(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      on.forEach(([name, fn]) => socket.off(name, fn as (...args: unknown[]) => void));
      socket.off('connect', onConnect);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn]);

  // Signing out drops the chat and the connection.
  useEffect(() => {
    if (signedIn) return;
    closeSupportSocket();
    useSupportStore.getState().reset();
    useCallStore.getState().dismiss();
  }, [signedIn]);
}
