/**
 * Live support chat state, shared by the floating panel and the /support
 * page so a chat (and an upload in progress) survives switching between them.
 *
 * Holds the team status, the current conversation and its messages (with
 * drafts that are still sending), typing and presence, the unread badge and
 * the reply target. Socket events arrive through `handle*` (wired by
 * useSupportBoot); sending goes over REST and the server echoes the saved
 * message with our clientId so the draft is swapped in place.
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { t } from '@core/i18n';
import {
  SUPPORT_ALLOWED_MIME, SUPPORT_EVENTS, SUPPORT_LIMITS, supportApi,
  type SupportAttachment, type SupportConversation, type SupportConversationEvent, type SupportMessage, type SupportMessageEvent,
  type SupportPresenceEvent, type SupportReceiptEvent, type SupportSendBody, type SupportStatusInfo, type SupportTypingEvent,
} from './api/support.api';
import { getSupportSocket } from './lib/socket';
import { alertSupportMessage } from './lib/notify';
import { useCallStore } from './lib/call';
import type { VoiceRecording } from './lib/recorder';

export interface ChatMessage extends SupportMessage {
  /** Drafts only: still sending, or failed (tap to retry). */
  local?: 'sending' | 'failed';
  /** Upload progress 0-100 for drafts with files. */
  progress?: number;
}

/** What a draft needs to be sent again after a failure. */
interface PendingSend {
  text?: string;
  files?: File[];
  voice?: VoiceRecording;
  replyToId?: string;
}

interface SupportState {
  status: SupportStatusInfo | null;
  conversation: SupportConversation | null;
  messages: ChatMessage[];
  /** Cursor for older messages; null when everything is loaded. */
  olderCursor: string | null;
  loaded: boolean;
  loading: boolean;
  loadingOlder: boolean;
  loadError: boolean;
  unread: number;
  /** The floating panel. */
  panelOpen: boolean;
  /** Number of chat views on screen (panel and/or page). */
  views: number;
  /** The team is typing (name when known). */
  typing: { name: string | null } | null;
  replyTo: ChatMessage | null;
  /** Message being edited. */
  editing: ChatMessage | null;
  handingOver: boolean;
  /** A welcome / check-in message from the team waiting to pop up above the chat button. */
  peek: { conversationId: string; message: SupportMessage } | null;

  openPanel: () => void;
  /** The preview was put on screen: never pop this message again. */
  peekShown: (messageId: string) => void;
  dismissPeek: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  viewMounted: () => () => void;

  refreshStatus: () => Promise<void>;
  load: (force?: boolean) => Promise<void>;
  loadOlder: () => Promise<void>;
  joinRoom: () => void;

  sendText: (text: string) => Promise<void>;
  sendFiles: (files: File[], caption?: string) => Promise<void>;
  sendVoice: (rec: VoiceRecording) => Promise<void>;
  retry: (clientId: string) => Promise<void>;
  discard: (clientId: string) => void;
  editMessage: (id: string, text: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  setReplyTo: (m: ChatMessage | null) => void;
  setEditing: (m: ChatMessage | null) => void;
  setTyping: (typing: boolean) => void;
  handover: () => Promise<void>;
  rate: (rating: 'up' | 'down', note?: string) => Promise<void>;
  resolve: () => Promise<void>;
  newChat: () => void;
  markRead: () => void;

  handleMessage: (e: SupportMessageEvent) => void;
  handleMessageUpdated: (e: SupportMessageEvent) => void;
  handleConversation: (e: SupportConversationEvent) => void;
  handleTyping: (e: SupportTypingEvent) => void;
  handleRead: (e: SupportReceiptEvent, kind: 'read' | 'delivered') => void;
  handlePresence: (e: SupportPresenceEvent) => void;
  reset: () => void;
}

const pending = new Map<string, PendingSend>();
let typingTimer: number | null = null;
let ownTypingAt = 0;
let ownTypingStop: number | null = null;
let readTimer: number | null = null;
let seq = 0;

const newClientId = () => `c-${Date.now().toString(36)}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** True while a chat view is on screen and the tab is visible. */
const isWatching = (s: Pick<SupportState, 'views'>) => s.views > 0 && typeof document !== 'undefined' && !document.hidden;

/** Inserts or replaces messages (by id, or a draft by clientId) and keeps them in time order. */
function merge(list: ChatMessage[], incoming: SupportMessage[]): ChatMessage[] {
  const out = [...list];
  for (const m of incoming) {
    if (m.internal) continue;
    let i = out.findIndex((x) => x.id === m.id);
    if (i < 0 && m.clientId) i = out.findIndex((x) => x.local && x.clientId === m.clientId);
    if (i >= 0) {
      // Keep the local picture preview until the uploaded one is in the browser cache.
      out[i] = { ...m };
      if (m.clientId) pending.delete(m.clientId);
    } else {
      out.push({ ...m });
    }
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

const allowedMime = (s: SupportStatusInfo | null): readonly string[] => s?.allowedMime?.length ? s.allowedMime : SUPPORT_ALLOWED_MIME;
const maxBytes = (s: SupportStatusInfo | null) => s?.limits?.maxFileBytes ?? SUPPORT_LIMITS.maxFileBytes;

/** Width and height of a picture, for a stable bubble size. */
async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return size;
  } catch {
    return {};
  }
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { message?: unknown } } };
  if (e?.response?.status === 429) return t('Aap bohat tezi se message bhej rahe hain. Thora ruk kar bhejein.');
  const m = e?.response?.data?.message;
  return typeof m === 'string' && m ? m : fallback;
}

export const useSupportStore = create<SupportState>((set, get) => {
  const draft = (clientId: string, body: Partial<SupportMessage>): ChatMessage => ({
    id: clientId, conversationId: get().conversation?.id ?? '', sender: 'MERCHANT', senderUserId: null, senderName: null,
    kind: 'TEXT', text: null, attachments: [], replyTo: null, meta: null, clientId, deliveredAt: null, readAt: null,
    editedAt: null, deletedAt: null, internal: false, createdAt: new Date().toISOString(), local: 'sending', ...body,
  });

  const patchDraft = (clientId: string, patch: Partial<ChatMessage>) =>
    set((s) => ({ messages: s.messages.map((m) => (m.local && m.clientId === clientId ? { ...m, ...patch } : m)) }));

  const replyPreview = (m: ChatMessage | null): SupportMessage['replyTo'] =>
    m ? { id: m.id, sender: m.sender, kind: m.kind, text: m.text ? m.text.slice(0, 140) : null, deleted: !!m.deletedAt } : null;

  /** Current open conversation id, starting one when there is none (or the last one was closed). */
  const ensureConversation = async (): Promise<string> => {
    const c = get().conversation;
    if (c && c.status !== 'CLOSED') return c.id;
    const res = await supportApi.start({ source: 'web' });
    set((s) => ({ conversation: res.conversation, messages: merge(c?.status === 'CLOSED' ? [] : s.messages.filter((m) => m.local), res.messages ?? []) }));
    get().joinRoom();
    return res.conversation.id;
  };

  /** Uploads (if any) and sends one draft. */
  const deliver = async (clientId: string) => {
    const job = pending.get(clientId);
    if (!job) return;
    patchDraft(clientId, { local: 'sending', progress: job.files || job.voice ? 0 : undefined });
    try {
      // A first text message starts the conversation in one call.
      const current = get().conversation;
      if ((!current || current.status === 'CLOSED') && job.text && !job.files && !job.voice) {
        const res = await supportApi.start({ source: 'web', text: job.text });
        pending.delete(clientId);
        set((s) => ({
          conversation: res.conversation,
          messages: merge(s.messages.filter((m) => m.clientId !== clientId && (current?.status !== 'CLOSED' || m.local)), res.messages ?? []),
        }));
        get().joinRoom();
        return;
      }
      const conversationId = await ensureConversation();
      const attachments: SupportAttachment[] = [];
      if (job.voice) {
        const ext = job.voice.mime.includes('mp4') ? 'm4a' : job.voice.mime.includes('ogg') ? 'ogg' : 'webm';
        attachments.push(await supportApi.upload(job.voice.blob, `voice-note.${ext}`, { durationSec: job.voice.durationSec, waveform: job.voice.waveform },
          (p) => patchDraft(clientId, { progress: p })));
      }
      for (const [i, file] of (job.files ?? []).entries()) {
        const size = file.type.startsWith('image/') ? await imageSize(file) : {};
        const total = job.files!.length;
        attachments.push(await supportApi.upload(file, file.name || 'file', size,
          (p) => patchDraft(clientId, { progress: Math.round(((i + p / 100) / total) * 100) })));
      }
      const body: SupportSendBody = {
        clientId,
        text: job.text || undefined,
        attachments: attachments.length ? attachments : undefined,
        replyToId: job.replyToId,
        kind: job.voice ? 'VOICE' : attachments.length ? (attachments.every((a) => a.mime.startsWith('image/')) ? 'IMAGE' : 'FILE') : 'TEXT',
      };
      const saved = await supportApi.send(conversationId, body);
      set((s) => ({ messages: merge(s.messages, [{ ...saved, clientId: saved.clientId ?? clientId }]) }));
    } catch (err) {
      patchDraft(clientId, { local: 'failed', progress: undefined });
      toast.error(errorMessage(err, t('Message nahi gaya. Dobara try karein.')));
    }
  };

  const queue = (job: PendingSend, body: Partial<SupportMessage>) => {
    const clientId = newClientId();
    pending.set(clientId, job);
    const replyTo = replyPreview(get().replyTo);
    set((s) => ({ messages: [...s.messages, draft(clientId, { ...body, replyTo })], replyTo: null }));
    get().setTyping(false);
    void deliver(clientId);
  };

  return {
    status: null,
    conversation: null,
    messages: [],
    olderCursor: null,
    loaded: false,
    loading: false,
    loadingOlder: false,
    loadError: false,
    unread: 0,
    panelOpen: false,
    views: 0,
    typing: null,
    replyTo: null,
    editing: null,
    handingOver: false,
    peek: null,

    openPanel: () => set({ panelOpen: true, peek: null }),
    closePanel: () => set({ panelOpen: false }),
    togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen, peek: null })),
    peekShown: (messageId) => rememberPeek(messageId),
    dismissPeek: () => {
      const id = get().peek?.message.id;
      if (id) rememberPeek(id);
      set({ peek: null });
    },
    viewMounted: () => {
      set((s) => ({ views: s.views + 1 }));
      void get().load();
      get().markRead();
      return () => set((s) => ({ views: Math.max(0, s.views - 1) }));
    },

    refreshStatus: async () => {
      try {
        const status = await supportApi.status();
        const watching = isWatching(get());
        const latest = status.latestUnread;
        set({ status, unread: watching ? 0 : status.unread ?? get().unread });
        if (!watching && latest?.proactive && !peeked(latest.message.id)) set({ peek: { conversationId: latest.conversationId, message: latest.message } });
        useCallStore.getState().setIceServers(status.iceServers);
      } catch { /* keep the last status */ }
    },

    load: async (force) => {
      if ((get().loaded && !force) || get().loading) return;
      set({ loading: true, loadError: false });
      try {
        const [conversation] = await Promise.all([supportApi.current(), get().status ? Promise.resolve() : get().refreshStatus()]);
        let messages: SupportMessage[] = [];
        let olderCursor: string | null = null;
        if (conversation) {
          const page = await supportApi.messages(conversation.id);
          messages = page.items;
          olderCursor = page.nextCursor;
        }
        set((s) => ({ conversation, messages: merge(s.messages.filter((m) => m.local), messages), olderCursor, loaded: true }));
        get().joinRoom();
        get().markRead();
      } catch {
        set({ loadError: true });
      } finally {
        set({ loading: false });
      }
    },

    loadOlder: async () => {
      const { conversation, olderCursor, loadingOlder } = get();
      if (!conversation || !olderCursor || loadingOlder) return;
      set({ loadingOlder: true });
      try {
        const page = await supportApi.messages(conversation.id, olderCursor);
        set((s) => ({ messages: merge(s.messages, page.items), olderCursor: page.nextCursor }));
      } catch { /* the button stays to try again */ } finally {
        set({ loadingOlder: false });
      }
    },

    joinRoom: () => {
      const id = get().conversation?.id;
      const socket = getSupportSocket();
      if (!id || !socket) return;
      socket.timeout(8000).emit(SUPPORT_EVENTS.join, { conversationId: id }, (err: unknown, ack?: { ok?: boolean; presence?: SupportPresenceEvent }) => {
        if (!err && ack?.presence) get().handlePresence(ack.presence);
      });
    },

    sendText: async (raw) => {
      const text = raw.trim().slice(0, SUPPORT_LIMITS.maxTextChars);
      if (!text) return;
      queue({ text, replyToId: get().replyTo?.id }, { kind: 'TEXT', text });
    },

    sendFiles: async (files, caption) => {
      const allowed = allowedMime(get().status);
      const limit = maxBytes(get().status);
      const ok: File[] = [];
      for (const f of files) {
        if (!allowed.includes(f.type) || f.type.startsWith('audio/') || f.type.startsWith('video/')) {
          toast.error(t('{{name}}: sirf photo ya PDF bhej sakte hain', { name: f.name || t('File') }));
        } else if (f.size > limit) {
          toast.error(t('{{name}}: file {{mb}} MB se bari hai', { name: f.name || t('File'), mb: Math.round(limit / 1024 / 1024) }));
        } else {
          ok.push(f);
        }
      }
      if (!ok.length) return;
      // One message per batch of up to the attachment limit.
      const per = SUPPORT_LIMITS.maxAttachments;
      for (let i = 0; i < ok.length; i += per) {
        const batch = ok.slice(i, i + per);
        const text = i === 0 ? caption?.trim() || undefined : undefined;
        const attachments: SupportAttachment[] = batch.map((f) => ({ url: URL.createObjectURL(f), name: f.name || 'file', mime: f.type, bytes: f.size }));
        queue({ files: batch, text, replyToId: i === 0 ? get().replyTo?.id : undefined }, {
          kind: batch.every((f) => f.type.startsWith('image/')) ? 'IMAGE' : 'FILE', text: text ?? null, attachments,
        });
      }
    },

    sendVoice: async (rec) => {
      const attachments: SupportAttachment[] = [{
        url: URL.createObjectURL(rec.blob), name: 'voice-note', mime: rec.mime, bytes: rec.blob.size, durationSec: rec.durationSec, waveform: rec.waveform,
      }];
      queue({ voice: rec, replyToId: get().replyTo?.id }, { kind: 'VOICE', attachments });
    },

    retry: async (clientId) => { await deliver(clientId); },

    discard: (clientId) => {
      pending.delete(clientId);
      set((s) => ({ messages: s.messages.filter((m) => !(m.local && m.clientId === clientId)) }));
    },

    editMessage: async (id, text) => {
      const value = text.trim();
      if (!value) return;
      try {
        const saved = await supportApi.editMessage(id, value);
        set((s) => ({ messages: merge(s.messages, [saved]), editing: null }));
      } catch (err) {
        toast.error(errorMessage(err, t('Message edit nahi hua')));
      }
    },

    deleteMessage: async (id) => {
      try {
        const saved = await supportApi.deleteMessage(id);
        set((s) => ({ messages: merge(s.messages, [saved]) }));
      } catch (err) {
        toast.error(errorMessage(err, t('Message delete nahi hua')));
      }
    },

    setReplyTo: (replyTo) => set({ replyTo, editing: null }),
    setEditing: (editing) => set({ editing, replyTo: null }),

    setTyping: (typing) => {
      const id = get().conversation?.id;
      const socket = getSupportSocket();
      if (!id || !socket?.connected) return;
      if (ownTypingStop) window.clearTimeout(ownTypingStop);
      if (!typing) {
        if (ownTypingAt) socket.emit(SUPPORT_EVENTS.typing, { conversationId: id, typing: false });
        ownTypingAt = 0;
        return;
      }
      const now = Date.now();
      if (now - ownTypingAt > 3000) {
        socket.emit(SUPPORT_EVENTS.typing, { conversationId: id, typing: true });
        ownTypingAt = now;
      }
      ownTypingStop = window.setTimeout(() => get().setTyping(false), 4000);
    },

    handover: async () => {
      if (get().handingOver) return;
      set({ handingOver: true });
      try {
        const c = get().conversation;
        if (!c || c.status === 'CLOSED') {
          const res = await supportApi.start({ source: 'web', human: true });
          set((s) => ({ conversation: res.conversation, messages: merge(c ? [] : s.messages, res.messages ?? []) }));
          get().joinRoom();
        } else {
          const conversation = await supportApi.handover(c.id);
          set({ conversation });
        }
      } catch (err) {
        toast.error(errorMessage(err, t('Support team se connect nahi ho saka. Dobara try karein.')));
      } finally {
        set({ handingOver: false });
      }
    },

    rate: async (rating, note) => {
      const c = get().conversation;
      if (!c) return;
      const conversation = await supportApi.rate(c.id, { rating, note: note?.trim() || undefined });
      set({ conversation });
    },

    resolve: async () => {
      const c = get().conversation;
      if (!c) return;
      try {
        set({ conversation: await supportApi.resolve(c.id) });
      } catch (err) {
        toast.error(errorMessage(err, t('Abhi nahi ho saka. Dobara try karein.')));
      }
    },

    /** After a closed chat: show an empty chat; the next message starts a new conversation. */
    newChat: () => set({ conversation: null, messages: [], olderCursor: null, replyTo: null, editing: null }),

    markRead: () => {
      const s = get();
      if (!isWatching(s)) return;
      if (s.unread || s.peek) set({ unread: 0, peek: null });
      const c = s.conversation;
      if (!c || !c.unread) return;
      if (readTimer) window.clearTimeout(readTimer);
      readTimer = window.setTimeout(() => {
        readTimer = null;
        set((st) => ({ conversation: st.conversation && st.conversation.id === c.id ? { ...st.conversation, unread: 0 } : st.conversation }));
        void supportApi.markRead(c.id).catch(() => undefined);
      }, 300);
    },

    handleMessage: ({ conversationId, message }) => {
      if (message.internal) return;
      const s = get();
      const mine = message.sender === 'MERCHANT';
      const sameConversation = !s.conversation || s.conversation.id === conversationId || s.conversation.status === 'CLOSED';
      if (s.loaded && sameConversation) {
        if (s.conversation?.id !== conversationId) {
          // A new conversation (for example started by the team): load it fully.
          void get().load(true);
        } else {
          set((st) => ({ messages: merge(st.messages, [message]), typing: mine ? st.typing : null }));
        }
      }
      if (mine) return;
      if (isWatching(get())) {
        get().markRead();
        return;
      }
      set((st) => ({ unread: st.unread + 1 }));
      getSupportSocket()?.emit(SUPPORT_EVENTS.delivered, { conversationId });
      // Welcome and check-in messages come in quietly as a preview above the chat button.
      if (message.meta?.proactive) {
        if (!peeked(message.id)) set({ peek: { conversationId, message } });
        return;
      }
      const name = displayName(message);
      const who = message.sender === 'BOT' ? t('Nafaa AI') : name ? t('{{name}} (Nafaa team)', { name }) : t('Nafaa Support');
      alertSupportMessage(who, previewText(message), () => get().openPanel());
    },

    handleMessageUpdated: ({ conversationId, message }) => {
      if (get().conversation?.id !== conversationId) return;
      set((s) => ({ messages: merge(s.messages, [message]) }));
    },

    handleConversation: ({ conversation }) => {
      const s = get();
      const c = conversation as SupportConversation;
      if (s.conversation && s.conversation.id !== c.id && s.conversation.status !== 'CLOSED') {
        // Another conversation changed (an older one): only the badge may move.
        return;
      }
      const watching = isWatching(s);
      set({ conversation: watching ? { ...c, unread: 0 } : c, unread: watching ? 0 : c.unread });
      if (watching && c.unread) get().markRead();
    },

    handleTyping: (e) => {
      if (e.side === 'MERCHANT' || e.conversationId !== get().conversation?.id) return;
      if (typingTimer) window.clearTimeout(typingTimer);
      if (!e.typing) { set({ typing: null }); return; }
      set({ typing: { name: e.name } });
      typingTimer = window.setTimeout(() => set({ typing: null }), 7000);
    },

    handleRead: (e, kind) => {
      if (e.of !== 'MERCHANT' || e.conversationId !== get().conversation?.id) return;
      set((s) => ({
        messages: s.messages.map((m) => {
          if (m.sender !== 'MERCHANT' || m.local || m.createdAt > e.at) return m;
          if (kind === 'read') return m.readAt ? m : { ...m, readAt: e.at, deliveredAt: m.deliveredAt ?? e.at };
          return m.deliveredAt ? m : { ...m, deliveredAt: e.at };
        }),
      }));
    },

    handlePresence: (e) => {
      set((s) => ({
        status: s.status ? { ...s.status, team: e.team } : s.status,
        conversation: s.conversation && e.agent && s.conversation.assignedAgent?.id === e.agent.id
          ? { ...s.conversation, assignedAgent: e.agent }
          : s.conversation,
      }));
    },

    reset: () => {
      pending.clear();
      set({ peek: null, status: null, conversation: null, messages: [], olderCursor: null, loaded: false, unread: 0, panelOpen: false, typing: null, replyTo: null, editing: null });
    },
  };
});

/* Proactive previews pop once per message on this browser. */
const PEEK_KEY = 'nafaa-support-peeked';
function peekedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(PEEK_KEY) || '[]') as string[]; } catch { return []; }
}
function peeked(id: string): boolean {
  return peekedIds().includes(id);
}
function rememberPeek(id: string) {
  try {
    const ids = peekedIds().filter((x) => x !== id);
    localStorage.setItem(PEEK_KEY, JSON.stringify([...ids, id].slice(-50)));
  } catch { /* storage unavailable: it may pop once more */ }
}

/** Name to show for a team message (proactive messages carry the configured agent name). */
export function displayName(m: Pick<SupportMessage, 'senderName' | 'meta'>): string | null {
  return m.meta?.senderName || m.senderName || null;
}

/** One line for notifications and reply quotes. */
export function previewText(m: Pick<SupportMessage, 'kind' | 'text' | 'deletedAt'> & { attachments?: SupportAttachment[] }): string {
  if (m.deletedAt) return t('Ye message delete ho gaya');
  if (m.text) return m.text.length > 140 ? `${m.text.slice(0, 140)}…` : m.text;
  if (m.kind === 'VOICE') return t('Voice note');
  if (m.kind === 'IMAGE') return t('Photo');
  if (m.kind === 'FILE') return m.attachments?.[0]?.name || t('File');
  if (m.kind === 'CALL_EVENT') return t('Call');
  return '';
}
