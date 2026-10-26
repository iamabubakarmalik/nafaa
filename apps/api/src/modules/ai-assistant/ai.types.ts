/**
 * Nafaa AI wire contract, shared in spirit with the web client
 * (apps/web/src/modules/ai-assistant/api.ts keeps the same shapes).
 *
 * Endpoints (all under /api/ai, permission ai.use):
 *   GET    /ai/status                      AiStatus
 *   POST   /ai/chat                        Server-sent events, see AiStreamEvent
 *   GET    /ai/conversations?q=&limit=     AiConversationSummary[]
 *   GET    /ai/conversations/:id           AiConversationDetail
 *   PATCH  /ai/conversations/:id           { title?, pinned? } -> AiConversationSummary
 *   DELETE /ai/conversations/:id           soft delete -> { ok: true }
 *   POST   /ai/messages/:id/feedback       { value: -1 | 0 | 1 } -> { ok: true }
 *   GET    /ai/usage                       AiUsage
 *   GET    /ai/morning-summary             MorningSummary
 *   GET    /ai/reorder?leadDays=&coverDays= AiReorder
 *   GET    /ai/admin/usage?days=30         super admin only
 *   POST   /ai/actions/:id/confirm         { fields? } -> AiActionResult
 *   POST   /ai/actions/:id/cancel          -> { ok: true }
 */

export type AiMode = 'fast' | 'smart';

/** A small chart the client draws under an answer. Values are plain numbers. */
export interface AiChart {
  type: 'bar' | 'line';
  title: string;
  /** How to format values: money as Rs, count and qty as plain numbers, percent with %. */
  unit: 'money' | 'count' | 'qty' | 'percent';
  /** Each row has `label` plus one value per series key. */
  series: Array<{ key: string; label: string }>;
  data: Array<Record<string, string | number>>;
  /** Optional small table shown under the chart. */
  table?: { columns: string[]; rows: Array<Array<string | number>> };
}

/** "Report kholein" link to the matching app page. */
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
  /** Present only when the user may see cost. */
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

/** One editable field on an action card. */
export interface AiActionField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'select';
  value: string | number | null;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

/** A bill / purchase line shown on an action card. */
export interface AiActionLine {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
  /** Stock at the branch before this action. */
  stock: number | null;
}

/**
 * Something the assistant proposes to do. Nothing is written until the user
 * confirms; the id is single use, bound to the user, tenant and branch, and
 * expires after 10 minutes.
 */
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
  /** Optional other way to do it, e.g. "POS me kholein" with the cart. */
  alt?: { label: string; to: string; state?: Record<string, unknown> };
}

export interface AiActionResult {
  ok: boolean;
  message: string;
  links: AiLink[];
}

/** What the client sends with a question. */
export interface AiChatRequest {
  conversationId?: string;
  message: string;
  mode?: AiMode;
  /** Page the user is on, so "is page ke baare mein" questions have context. */
  context?: { path: string; title?: string; params?: Record<string, string> };
  /** Answer the last question again (the last answer is replaced). */
  regenerate?: boolean;
  /** Replace the last question with `message` and answer it again. */
  editLast?: boolean;
  /** How the question was entered. */
  via?: 'text' | 'voice';
}

/** Server-sent events of POST /ai/chat, in order: conversation, meta, (status | delta | chart | link | reorder)*, done | error. */
export type AiStreamEvent =
  | { event: 'conversation'; data: { id: string; title: string } }
  /** `model` is always the neutral label "nafaa-ai". */
  | { event: 'meta'; data: { model: string; mode: AiMode; route: 'template' | 'llm' } }
  | { event: 'status'; data: { text: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'chart'; data: AiChart }
  | { event: 'link'; data: AiLink }
  | { event: 'reorder'; data: AiReorder }
  | { event: 'action'; data: AiActionProposal }
  /** 2–3 follow-up questions, sent just before done. */
  | { event: 'suggestions'; data: { items: string[] } }
  | { event: 'done'; data: { messageId: string; userMessageId: string; remaining: number; costMicros: number } }
  | { event: 'error'; data: { code: AiErrorCode; message: string } };

export type AiErrorCode = 'NOT_CONFIGURED' | 'LIMIT' | 'RATE' | 'PROVIDER' | 'BAD_REQUEST' | 'NOT_FOUND' | 'EXPIRED' | 'FORBIDDEN';

export interface AiStatus {
  /** Always true: without a model the assistant answers from its rules. */
  configured: boolean;
  /** Super admin only. */
  provider?: 'anthropic' | 'rules' | 'mock';
  /** Super admin only, when no model is set. */
  providerHint?: string;
  /** False until the history tables exist; chats then live in server memory only. */
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
  /** "tenant" for the owner (shop totals), "me" for everyone else. */
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
