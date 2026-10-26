/**
 * Nafaa AI client: REST calls and the streaming chat request.
 *
 * Shapes mirror apps/api/src/modules/ai-assistant/ai.types.ts. REST answers
 * come wrapped as { success, data } by the API's response interceptor. The
 * chat answer is a server-sent event stream read with fetch, so it can be
 * stopped with an AbortController.
 */

import { apiClient } from '@core/api/client';
import { SHOP_HEADER } from '@core/lib/shopScope';
import { useAuthStore } from '@core/stores/auth.store';

export type AiMode = 'fast' | 'smart';

export interface AiChart {
  type: 'bar' | 'line';
  title: string;
  unit: 'money' | 'count' | 'qty' | 'percent';
  series: Array<{ key: string; label: string }>;
  data: Array<Record<string, string | number>>;
  table?: { columns: string[]; rows: Array<Array<string | number>> };
}

export interface AiLink {
  label: string;
  to: string;
  /** Router state for the page (e.g. a POS cart or purchase prefill). */
  state?: Record<string, unknown>;
  /** A navigation the user asked for ("POS kholo"): shown as a main button. */
  primary?: boolean;
}

export interface AiReorderRow {
  productId: string;
  name: string;
  unit: string;
  stock: number;
  perDay: number;
  daysLeft: number | null;
  suggestQty: number;
  onOrder: number;
  lastCost?: number;
}

export interface AiReorderGroup {
  shopId: string;
  shopName: string;
  supplier: { id: string; name: string } | null;
  rows: AiReorderRow[];
}

export interface AiReorder {
  leadDays: number;
  coverDays: number;
  historyDays: number;
  groups: AiReorderGroup[];
  count: number;
  /** Low or out of stock but no sale in the history window: not suggested, shown apart. */
  idle: Array<{ productId: string; name: string; unit: string; stock: number }>;
}

export interface AiActionField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'select';
  value: string | number | null;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

export interface AiActionLine {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
  stock: number | null;
}

/** Something the assistant proposes to do; nothing is written until the user confirms. */
export interface AiActionProposal {
  id: string;
  kind: 'create_product' | 'update_price' | 'adjust_stock' | 'create_sale' | 'create_customer' | 'receive_khata_payment' | 'create_expense' | 'create_purchase_draft';
  title: string;
  summary: string;
  fields: AiActionField[];
  lines?: AiActionLine[];
  totals?: { subtotal: number; total: number; paid?: number; credit?: number };
  warnings: string[];
  expiresAt: string;
  confirmLabel: string;
  alt?: { label: string; to: string; state?: Record<string, unknown> };
}

export interface AiActionResult {
  ok: boolean;
  message: string;
  links: AiLink[];
}

export interface AiChatRequest {
  conversationId?: string;
  message: string;
  mode?: AiMode;
  context?: { path: string; title?: string; params?: Record<string, string> };
  regenerate?: boolean;
  editLast?: boolean;
  via?: 'text' | 'voice';
}

export type AiErrorCode = 'NOT_CONFIGURED' | 'LIMIT' | 'RATE' | 'PROVIDER' | 'BAD_REQUEST' | 'NOT_FOUND' | 'EXPIRED' | 'FORBIDDEN';

export type AiStreamEvent =
  | { event: 'conversation'; data: { id: string; title: string } }
  | { event: 'meta'; data: { model: string; mode: AiMode; route: 'template' | 'llm' } }
  | { event: 'status'; data: { text: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'chart'; data: AiChart }
  | { event: 'link'; data: AiLink }
  | { event: 'reorder'; data: AiReorder }
  | { event: 'action'; data: AiActionProposal }
  | { event: 'suggestions'; data: { items: string[] } }
  | { event: 'done'; data: { messageId: string; userMessageId: string; remaining: number; costMicros: number } }
  | { event: 'error'; data: { code: AiErrorCode; message: string } };

export interface AiStatus {
  configured: boolean;
  /** Super admin only; never shown to shop users. */
  provider?: 'anthropic' | 'rules' | 'mock';
  providerHint?: string;
  historySaved: boolean;
  limit: number;
  used: number;
  remaining: number;
  deepCost: number;
  message: string | null;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  lastMessageAt: string;
}

export interface AiMessageView {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  charts: AiChart[];
  links: AiLink[];
  reorder: AiReorder | null;
  actions: AiActionProposal[];
  suggestions: string[];
  via: 'text' | 'voice' | null;
  model: string | null;
  feedback: number;
  createdAt: string;
}

export interface AiConversationDetail extends AiConversationSummary {
  messages: AiMessageView[];
}

export interface AiUsage {
  scope: 'tenant' | 'me';
  today: { messages: number; limit: number; remaining: number };
  month: { messages: number; costMicros: number; tokens: number };
}

export interface MorningSummary {
  allowed: boolean;
  day: string;
  title: string;
  text: string;
  figures: {
    sales: number;
    bills: number;
    average: number;
    previousDay: number;
    change: number | null;
    grossProfit?: number;
    netProfit?: number;
    expenses?: number;
    khata?: { given: number; collected: number; outstanding: number };
    lowStock: { out: number; low: number };
    topItem: string | null;
  } | null;
}

/** The one message shop users see when an answer fails for a technical reason. */
export const AI_UNAVAILABLE = 'Nafaa AI abhi jawab nahi de pa raha. Thori der baad dobara poochein.';

const unwrap = <T,>(res: { data: unknown }): T => (res.data as { data: T }).data;

export const aiApi = {
  status: async () => unwrap<AiStatus>(await apiClient.get('/ai/status')),
  conversations: async (q?: string) => unwrap<AiConversationSummary[]>(await apiClient.get('/ai/conversations', { params: { q: q || undefined, limit: 100 } })),
  conversation: async (id: string) => unwrap<AiConversationDetail>(await apiClient.get(`/ai/conversations/${id}`)),
  update: async (id: string, body: { title?: string; pinned?: boolean }) => unwrap<AiConversationSummary>(await apiClient.patch(`/ai/conversations/${id}`, body)),
  remove: async (id: string) => unwrap<{ ok: true }>(await apiClient.delete(`/ai/conversations/${id}`)),
  feedback: async (messageId: string, value: -1 | 0 | 1) => unwrap<{ ok: true }>(await apiClient.post(`/ai/messages/${messageId}/feedback`, { value })),
  usage: async () => unwrap<AiUsage>(await apiClient.get('/ai/usage')),
  morning: async () => unwrap<MorningSummary>(await apiClient.get('/ai/morning-summary')),
  reorder: async (leadDays?: number, coverDays?: number) => unwrap<AiReorder>(await apiClient.get('/ai/reorder', { params: { leadDays, coverDays } })),
  confirmAction: async (id: string, fields?: Record<string, string | number>) => unwrap<AiActionResult>(await apiClient.post(`/ai/actions/${id}/confirm`, fields && Object.keys(fields).length ? { fields } : {})),
  cancelAction: async (id: string) => unwrap<{ ok: true }>(await apiClient.post(`/ai/actions/${id}/cancel`)),
};

/** HTTP failure of the chat request, mapped to the stream's error codes. */
export class AiHttpError extends Error {
  constructor(readonly code: AiErrorCode, message: string) { super(message); }
}

function codeForStatus(status: number): AiErrorCode {
  if (status === 503 || status === 501) return 'NOT_CONFIGURED';
  if (status === 429) return 'LIMIT';
  if (status === 404) return 'NOT_FOUND';
  if (status === 410) return 'EXPIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 400) return 'BAD_REQUEST';
  return 'PROVIDER';
}

/**
 * Sends a question and calls `onEvent` for every server-sent event until the
 * stream ends. Throws AiHttpError when the request itself is refused.
 */
export async function streamChat(body: AiChatRequest, onEvent: (e: AiStreamEvent) => void, signal: AbortSignal): Promise<void> {
  // A cheap authenticated call first: the axios client refreshes an expired token on 401.
  await apiClient.get('/ai/status').catch(() => undefined);
  const { accessToken, currentShopId } = useAuthStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (currentShopId) headers[SHOP_HEADER] = currentShopId;

  const res = await fetch(`${apiClient.defaults.baseURL}/ai/chat`, {
    method: 'POST', headers, body: JSON.stringify(body), signal, credentials: 'include',
  });
  if (!res.ok || !res.body) {
    let message = '';
    try {
      const j = await res.json();
      message = j?.message ?? j?.error?.message ?? j?.data?.message ?? '';
      if (Array.isArray(message)) message = message.join(', ');
    } catch { /* not JSON */ }
    const code = codeForStatus(res.status);
    if (res.status === 403) message = message || 'Is kaam ki permission aap ke paas nahi';
    // Server-side and setup failures get the product message, never technical text.
    const technical = code === 'NOT_CONFIGURED' || code === 'PROVIDER' || res.status >= 500;
    throw new AiHttpError(code, technical ? AI_UNAVAILABLE : message || AI_UNAVAILABLE);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = (chunk: string) => {
    let name = 'message';
    const data: string[] = [];
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (!data.length) return;
    try {
      onEvent({ event: name, data: JSON.parse(data.join('\n')) } as AiStreamEvent);
    } catch { /* ignore a malformed event */ }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let at = buffer.indexOf('\n\n');
    while (at >= 0) {
      flush(buffer.slice(0, at));
      buffer = buffer.slice(at + 2);
      at = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) flush(buffer);
}
