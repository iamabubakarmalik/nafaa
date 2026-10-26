/**
 * Nafaa AI state, shared by the side drawer and the full /ai page so a chat
 * keeps streaming when the user expands or collapses it.
 *
 * Holds whether the drawer is open, the current conversation and its
 * messages, the streaming request (for Stop), the Fast/Smart mode and the
 * remaining messages for today. History lives on the server; this keeps
 * only the open conversation.
 */

import { create } from 'zustand';
import { AI_UNAVAILABLE, AiHttpError, aiApi, streamChat, type AiActionProposal, type AiChart, type AiChatRequest, type AiErrorCode, type AiLink, type AiMode, type AiReorder } from './api';

export interface ChatMessage {
  /** Server id once saved; a local id while streaming. */
  id: string;
  role: 'user' | 'assistant';
  content: string;
  charts: AiChart[];
  links: AiLink[];
  reorder: AiReorder | null;
  /** Things the assistant offers to do; each needs the user's confirm. */
  actions: AiActionProposal[];
  /** Follow-up questions shown as chips under the answer. */
  suggestions: string[];
  via: 'text' | 'voice' | null;
  model: string | null;
  feedback: number;
  createdAt: string;
  /** True while the answer is still coming in. */
  pending?: boolean;
  /** Progress line shown while tools run ("Sale dekh raha hoon…"). */
  status?: string;
  error?: { code: AiErrorCode; message: string };
  /** False until the server confirms the id (feedback needs a saved id). */
  saved?: boolean;
}

export type AiContext = AiChatRequest['context'];
export type AiVia = 'text' | 'voice';

/** What happened to an action card; kept here so it survives expand/collapse. */
export interface ActionOutcome {
  status: 'done' | 'cancelled' | 'expired' | 'failed';
  message: string;
  links: AiLink[];
}

interface AiState {
  open: boolean;
  /** Drawer hidden but chat kept (minimize). */
  setOpen: (open: boolean) => void;
  toggle: () => void;
  mode: AiMode;
  setMode: (mode: AiMode) => void;
  /** On very wide screens (>=1600px) the panel sits beside the page instead of over it. */
  pushPinned: boolean;
  setPushPinned: (on: boolean) => void;
  /** Send the current page as context with the next question. */
  withContext: boolean;
  setWithContext: (on: boolean) => void;

  conversationId: string | null;
  title: string;
  messages: ChatMessage[];
  loadingConversation: boolean;
  streaming: boolean;
  remaining: number | null;
  /** Bumped when the history list should refetch. */
  historyVersion: number;
  /** A question handed over by the command palette, sent when the chat mounts. */
  pendingAsk: string | null;
  /** Page to return to when the full /ai page collapses back into the drawer. */
  returnTo: string | null;
  setReturnTo: (path: string | null) => void;

  ask: (text: string) => void;
  takePendingAsk: () => string | null;
  send: (text: string, context?: AiContext, via?: AiVia) => Promise<void>;
  regenerate: (context?: AiContext) => Promise<void>;
  editLast: (text: string, context?: AiContext, via?: AiVia) => Promise<void>;
  /** Asks the last question again after an error. */
  retry: (context?: AiContext) => Promise<void>;
  actionOutcomes: Record<string, ActionOutcome>;
  setActionOutcome: (id: string, outcome: ActionOutcome) => void;
  stop: () => void;
  newChat: () => void;
  load: (id: string) => Promise<void>;
  setFeedback: (messageId: string, value: -1 | 0 | 1) => Promise<void>;
  setRemaining: (n: number | null) => void;
  bumpHistory: () => void;
}

const MODE_KEY = 'nafaa-ai-mode';
const PUSH_KEY = 'nafaa-ai-push';
const readPush = (): boolean => {
  try { return localStorage.getItem(PUSH_KEY) !== '0'; } catch { return true; }
};

/** Width from which the panel may push the page instead of covering it. */
export const PUSH_MIN_WIDTH = 1600;

/** True when the panel currently sits beside the page (wide screen and pinned). */
export function isPushLayout(): boolean {
  try { return useAiStore.getState().pushPinned && window.matchMedia(`(min-width: ${PUSH_MIN_WIDTH}px)`).matches; } catch { return false; }
}
const readMode = (): AiMode => {
  try { return localStorage.getItem(MODE_KEY) === 'smart' ? 'smart' : 'fast'; } catch { return 'fast'; }
};

let controller: AbortController | null = null;
let localSeq = 0;
const localId = (p: string) => `local-${p}-${Date.now()}-${++localSeq}`;

const blank = (role: ChatMessage['role'], content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: localId(role), role, content, charts: [], links: [], reorder: null, actions: [], suggestions: [], via: null, model: null, feedback: 0,
  createdAt: new Date().toISOString(), ...extra,
});

export const useAiStore = create<AiState>((set, get) => {
  /** Updates the streaming answer (always the last message). */
  const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
    set((s) => {
      const list = [...s.messages];
      const i = list.length - 1;
      if (i < 0 || list[i].role !== 'assistant') return s;
      list[i] = fn(list[i]);
      return { messages: list };
    });

  // Streamed text is gathered and painted once per frame, so long answers scroll smoothly.
  let buffered = '';
  let frame = 0;
  const flushText = () => {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    if (!buffered) return;
    const text = buffered;
    buffered = '';
    patchLast((m) => ({ ...m, content: m.content + text, status: undefined }));
  };
  const queueText = (text: string) => {
    buffered += text;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; flushText(); });
  };

  /** Runs one request and fills the last (assistant) message from the stream. */
  const run = async (body: AiChatRequest) => {
    controller?.abort();
    const ctrl = new AbortController();
    controller = ctrl;
    set({ streaming: true });
    try {
      await streamChat(body, (e) => {
        switch (e.event) {
          case 'conversation':
            if (get().conversationId !== e.data.id) set({ conversationId: e.data.id, historyVersion: get().historyVersion + 1 });
            set({ title: e.data.title });
            break;
          case 'meta':
            patchLast((m) => ({ ...m, model: e.data.model }));
            break;
          case 'status':
            patchLast((m) => ({ ...m, status: e.data.text }));
            break;
          case 'delta':
            queueText(e.data.text);
            break;
          case 'action':
            flushText();
            patchLast((m) => (m.actions.some((a) => a.id === e.data.id) ? m : { ...m, actions: [...m.actions, e.data] }));
            break;
          case 'suggestions':
            patchLast((m) => ({ ...m, suggestions: (e.data.items ?? []).slice(0, 3) }));
            break;
          case 'chart':
            patchLast((m) => ({ ...m, charts: [...m.charts, e.data] }));
            break;
          case 'link':
            patchLast((m) => (m.links.some((l) => l.to === e.data.to) ? m : { ...m, links: [...m.links, e.data] }));
            break;
          case 'reorder':
            patchLast((m) => ({ ...m, reorder: e.data }));
            break;
          case 'done':
            flushText();
            set((s) => {
              const list = [...s.messages];
              const a = list.length - 1;
              if (a >= 0 && list[a].role === 'assistant') list[a] = { ...list[a], id: e.data.messageId, pending: false, status: undefined, saved: true };
              const u = a - 1;
              if (u >= 0 && list[u].role === 'user') list[u] = { ...list[u], id: e.data.userMessageId, saved: true };
              return { messages: list, remaining: e.data.remaining, historyVersion: s.historyVersion + 1 };
            });
            break;
          case 'error':
            flushText();
            patchLast((m) => ({
              ...m, pending: false, status: undefined,
              // Setup or service failures always read the same for shop users.
              error: e.data.code === 'NOT_CONFIGURED' || e.data.code === 'PROVIDER' ? { code: e.data.code, message: AI_UNAVAILABLE } : e.data,
            }));
            break;
        }
      }, ctrl.signal);
    } catch (err) {
      if (ctrl.signal.aborted) {
        patchLast((m) => ({ ...m, pending: false, status: undefined, content: m.content || '_Ruk gaya._' }));
      } else if (err instanceof AiHttpError) {
        patchLast((m) => ({ ...m, pending: false, status: undefined, error: { code: err.code, message: err.message } }));
      } else {
        patchLast((m) => ({ ...m, pending: false, status: undefined, error: { code: 'PROVIDER', message: AI_UNAVAILABLE } }));
      }
    } finally {
      flushText();
      if (controller === ctrl) controller = null;
      patchLast((m) => (m.pending ? { ...m, pending: false, status: undefined } : m));
      set({ streaming: false });
    }
  };

  return {
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((s) => ({ open: !s.open })),
    mode: readMode(),
    setMode: (mode) => {
      try { localStorage.setItem(MODE_KEY, mode); } catch { /* storage unavailable */ }
      set({ mode });
    },
    pushPinned: readPush(),
    setPushPinned: (pushPinned) => {
      try { localStorage.setItem(PUSH_KEY, pushPinned ? '1' : '0'); } catch { /* storage unavailable */ }
      set({ pushPinned });
    },
    withContext: true,
    setWithContext: (withContext) => set({ withContext }),

    conversationId: null,
    title: '',
    messages: [],
    loadingConversation: false,
    streaming: false,
    remaining: null,
    historyVersion: 0,
    pendingAsk: null,
    returnTo: null,
    setReturnTo: (returnTo) => set({ returnTo }),

    ask: (text) => set({ pendingAsk: text, open: true }),
    takePendingAsk: () => {
      const q = get().pendingAsk;
      if (q) set({ pendingAsk: null });
      return q;
    },

    send: async (text, context, via = 'text') => {
      const message = text.trim();
      if (!message || get().streaming) return;
      set((s) => ({ messages: [...s.messages, blank('user', message, { via }), blank('assistant', '', { pending: true })] }));
      const { conversationId, mode } = get();
      await run({ conversationId: conversationId ?? undefined, message, mode, context, via });
    },

    regenerate: async (context) => {
      const { messages, conversationId, mode, streaming } = get();
      if (streaming || !conversationId) return;
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUser) return;
      const cut = messages[messages.length - 1]?.role === 'assistant' ? messages.slice(0, -1) : messages;
      set({ messages: [...cut, blank('assistant', '', { pending: true })] });
      await run({ conversationId, message: lastUser.content, mode, context, regenerate: true });
    },

    editLast: async (text, context, via = 'text') => {
      const message = text.trim();
      const { messages, conversationId, mode, streaming } = get();
      if (!message || streaming) return;
      let i = messages.length - 1;
      while (i >= 0 && messages[i].role !== 'user') i--;
      if (i < 0 || !conversationId) { await get().send(message, context, via); return; }
      set({ messages: [...messages.slice(0, i), blank('user', message, { via }), blank('assistant', '', { pending: true })] });
      await run({ conversationId, message, mode, context, editLast: true, via });
    },

    retry: async (context) => {
      const { messages, conversationId, streaming } = get();
      if (streaming) return;
      if (conversationId) { await get().regenerate(context); return; }
      // Never saved: drop the failed pair and ask again.
      let i = messages.length - 1;
      while (i >= 0 && messages[i].role !== 'user') i--;
      if (i < 0) return;
      const q = messages[i];
      set({ messages: messages.slice(0, i) });
      await get().send(q.content, context, q.via ?? 'text');
    },

    actionOutcomes: {},
    setActionOutcome: (id, outcome) => set((s) => ({ actionOutcomes: { ...s.actionOutcomes, [id]: outcome } })),

    stop: () => { controller?.abort(); },

    newChat: () => {
      controller?.abort();
      set({ conversationId: null, title: '', messages: [], streaming: false });
    },

    load: async (id) => {
      controller?.abort();
      set({ loadingConversation: true, conversationId: id, messages: [], title: '' });
      try {
        const c = await aiApi.conversation(id);
        if (get().conversationId !== id) return;
        set({
          title: c.title,
          messages: c.messages.map((m) => ({ ...m, actions: m.actions ?? [], suggestions: m.suggestions ?? [], via: m.via ?? null, saved: true })),
        });
      } catch {
        set({ conversationId: null, messages: [], title: '' });
        throw new Error('Chat nahi khul saki');
      } finally {
        set({ loadingConversation: false });
      }
    },

    setFeedback: async (messageId, value) => {
      const before = get().messages.find((m) => m.id === messageId)?.feedback ?? 0;
      set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, feedback: value } : m)) }));
      try {
        await aiApi.feedback(messageId, value);
      } catch {
        set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, feedback: before } : m)) }));
        throw new Error('Feedback save nahi hua');
      }
    },

    setRemaining: (remaining) => set({ remaining }),
    bumpHistory: () => set((s) => ({ historyVersion: s.historyVersion + 1 })),
  };
});
