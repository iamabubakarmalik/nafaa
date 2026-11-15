/**
 * Always-on part of live support, mounted once by the admin shell for anyone
 * with support.view: keeps the socket connected, sends my online / away
 * state (auto-away after the idle time set in Support settings), plays the
 * support tones, shows desktop alerts while the tab is hidden, keeps the inbox
 * lists fresh, and shows incoming and running calls.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminSupportApi } from '@/api/admin-support.api';
import { useCan } from '@/lib/access';
import { useAuthStore } from '@/store/auth.store';
import { showDesktop } from '@/features/notifications/lib/alerts';
import { closeSupportSocket, emitAck, supportSocket } from '../lib/socket';
import { playSupportMessage, playSupportWaiting } from '../lib/tones';
import { incomingCall, wireCallEvents } from '../lib/call';
import { savedMyState, useSupportLive } from '../lib/live';
import { SUPPORT_EVENTS, type SupportAdminConversation, type SupportMessageEvent, type SupportPresenceEvent, type SupportTypingEvent } from '../lib/support.types';
import { CallOverlay } from './CallOverlay';

export const SUPPORT_KEYS = {
  list: ['support', 'list'] as const,
  counts: ['support', 'counts'] as const,
  conversation: (id: string) => ['support', 'conversation', id] as const,
  messages: (id: string) => ['support', 'messages', id] as const,
  settings: ['support', 'settings'] as const,
};

export function SupportLive() {
  const can = useCan();
  const enabled = can('support.view');
  const token = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const set = useSupportLive((s) => s.set);
  const settings = useQuery({ queryKey: SUPPORT_KEYS.settings, queryFn: adminSupportApi.settings, enabled, staleTime: 5 * 60_000 });
  const sounds = useRef({ newConversation: true, newMessage: true });
  sounds.current = settings.data?.sounds ?? sounds.current;
  const autoAwayMs = (settings.data?.autoAwayMinutes ?? 10) * 60_000;

  // Socket and events.
  useEffect(() => {
    if (!enabled || !token) return;
    const s = supportSocket();
    if (!s) return;
    const live = useSupportLive.getState;

    const onConnect = () => {
      set({ connected: true });
      const mine = savedMyState();
      set({ myState: mine, autoAway: false });
      if (mine === 'away') void emitAck(SUPPORT_EVENTS.setPresence, { state: 'away' });
    };
    const onDisconnect = () => set({ connected: false });
    const onPresence = (e: SupportPresenceEvent) => set({ team: e.team, ...(e.agents && { agents: e.agents }) });
    const onTyping = (e: SupportTypingEvent) => { if (e.side === 'MERCHANT') live().setTyping(e.conversationId, e.name, e.typing); };
    const onMessage = (e: SupportMessageEvent) => {
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.counts });
      if (e.message.sender !== 'MERCHANT') return;
      live().setTyping(e.conversationId, null, false);
      const viewing = live().openConversationId === e.conversationId && document.visibilityState === 'visible';
      if (viewing || live().myState === 'away') return;
      if (sounds.current.newMessage) playSupportMessage();
      if (document.visibilityState === 'hidden') {
        showDesktop({ id: e.message.id, title: `New message${e.message.senderName ? ` from ${e.message.senderName}` : ''}`, message: e.message.text ?? 'Sent an attachment', link: `/support?c=${e.conversationId}` }, (link) => navigate(link));
      }
    };
    const onConversation = (e: { conversation: SupportAdminConversation; assignedToYou?: boolean }) => {
      const c = e.conversation;
      qc.invalidateQueries({ queryKey: SUPPORT_KEYS.counts });
      const prev = qc.getQueryData<SupportAdminConversation>(SUPPORT_KEYS.conversation(c.id));
      qc.setQueryData(SUPPORT_KEYS.conversation(c.id), c);
      if (e.assignedToYou) {
        toast.info(`${c.tenant.name} was assigned to you`, { action: { label: 'Open', onClick: () => navigate(`/support?c=${c.id}`) } });
      }
      // A conversation just started waiting for the team.
      if (c.status === 'WAITING' && prev?.status !== 'WAITING' && live().myState === 'online' && (!c.assignedAdminId || c.assignedAdminId === me)) {
        if (sounds.current.newConversation) playSupportWaiting();
        if (document.visibilityState === 'hidden') showDesktop({ id: `wait-${c.id}`, title: `${c.tenant.name} wants to talk to the team`, message: c.lastMessagePreview ?? '', link: `/support?c=${c.id}` }, (link) => navigate(link));
      }
    };

    if (s.connected) onConnect();
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on(SUPPORT_EVENTS.presence, onPresence);
    s.on(SUPPORT_EVENTS.typingEvent, onTyping);
    s.on(SUPPORT_EVENTS.message, onMessage);
    s.on(SUPPORT_EVENTS.conversation, onConversation);
    const unwireCalls = wireCallEvents((inv) => {
      const conv = qc.getQueryData<SupportAdminConversation>(SUPPORT_KEYS.conversation(inv.conversationId));
      // Ring the agent on the chat, or everyone when nobody is assigned.
      if (conv?.assignedAdminId && conv.assignedAdminId !== me) return;
      incomingCall({ conversationId: inv.conversationId, callId: inv.callId, media: inv.media, peerName: inv.from.name, shopName: conv?.tenant.name ?? null });
      if (document.visibilityState === 'hidden') showDesktop({ id: `call-${inv.callId}`, title: 'Incoming support call', message: inv.from.name ?? 'A shop is calling', link: `/support?c=${inv.conversationId}` }, (link) => navigate(link));
    });
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off(SUPPORT_EVENTS.presence, onPresence);
      s.off(SUPPORT_EVENTS.typingEvent, onTyping);
      s.off(SUPPORT_EVENTS.message, onMessage);
      s.off(SUPPORT_EVENTS.conversation, onConversation);
      unwireCalls();
    };
  }, [enabled, token, me, qc, navigate, set]);

  // Sign-out closes the socket.
  useEffect(() => {
    if (!token) closeSupportSocket();
  }, [token]);

  // Auto-away after idle time; back online on the next activity.
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const activity = () => {
      last = Date.now();
      const st = useSupportLive.getState();
      if (st.autoAway && st.myState === 'away') {
        st.set({ myState: 'online', autoAway: false });
        void emitAck(SUPPORT_EVENTS.setPresence, { state: 'online' });
      }
    };
    const events = ['mousemove', 'keydown', 'pointerdown', 'focus'] as const;
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    const timer = window.setInterval(() => {
      const st = useSupportLive.getState();
      if (st.myState === 'online' && Date.now() - last > autoAwayMs) {
        st.set({ myState: 'away', autoAway: true });
        void emitAck(SUPPORT_EVENTS.setPresence, { state: 'away' });
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, activity));
      window.clearInterval(timer);
    };
  }, [enabled, autoAwayMs]);

  if (!enabled) return null;
  return <CallOverlay />;
}
