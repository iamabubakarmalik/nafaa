/**
 * WhatsApp Cloud API helpers (pure): message templates built from the shop's
 * WhatsApp texts, the send payloads, the webhook parser, the order
 * confirmation button mapping and the per-message cost estimate.
 */

/** Order events that can send a WhatsApp template, and the abandoned cart reminder. */
export const WA_CLOUD_KEYS = ['confirm', 'dispatched', 'delivered', 'cart'] as const;
export type WaCloudKey = (typeof WA_CLOUD_KEYS)[number];

/** Template names at Meta (lowercase, underscores, unique per WhatsApp account and language). */
export const WA_TEMPLATE_NAME: Record<WaCloudKey, string> = {
  confirm: 'nafaa_order_confirm',
  dispatched: 'nafaa_order_dispatched',
  delivered: 'nafaa_order_delivered',
  cart: 'nafaa_cart_reminder',
};

export const WA_CATEGORY: Record<WaCloudKey, 'UTILITY' | 'MARKETING'> = {
  confirm: 'UTILITY',
  dispatched: 'UTILITY',
  delivered: 'UTILITY',
  cart: 'MARKETING',
};

/**
 * Default texts. The confirmation asks the customer to tap a button instead
 * of typing, so the reply can set the order's confirmation by itself.
 */
export const WA_DEFAULT_TEXT: Record<WaCloudKey, string> = {
  confirm: 'Assalam o Alaikum {name}! {shop} se aap ka order #{no}: {items}. Total {total}. Kya hum ye order bhej dein? Neeche button dabayein.',
  dispatched: 'Assalam o Alaikum {name}! Aap ka order #{no} {courier} se bhej diya hai. Tracking number: {tracking}. Delivery par {cod} tayyar rakhein. Shukriya!',
  delivered: 'Shukriya {name}! Umeed hai order #{no} pasand aaya. Apni rai zaroor batayein, aap ki baat hamare liye ahem hai.',
  cart: 'Assalam o Alaikum {name}! Aap ne {shop} par {items} pasand kiye the. Aap ka cart abhi bhi tayyar hai: {cartUrl} Koi sawal ho to yahin poochein.',
};

/** Quick reply buttons on the confirmation template (index 0 = yes, 1 = cancel). */
export const CONFIRM_BUTTONS = ['Haan confirm', 'Cancel'] as const;

export const WA_PLACEHOLDERS = ['name', 'shop', 'no', 'items', 'total', 'cod', 'address', 'city', 'courier', 'tracking', 'trackingUrl', 'cartUrl'] as const;
export type WaPlaceholder = (typeof WA_PLACEHOLDERS)[number];
export type WaValues = Partial<Record<WaPlaceholder, string>>;

/** Sample values Meta needs to review a template. */
export const WA_EXAMPLES: Record<WaPlaceholder, string> = {
  name: 'Ayesha', shop: 'Nafaa Store', no: '1042', items: '1 × Lawn suit', total: 'Rs 3,450', cod: 'Rs 3,450',
  address: 'House 12, Street 4', city: 'Lahore', courier: 'TCS', tracking: '7700123456', trackingUrl: 'https://track.example.com/7700123456', cartUrl: 'https://shop.example.com/cart',
};

/**
 * Shop text with {name} style placeholders → Meta body with {{1}}, {{2}} …
 * and the placeholder for each number. Unknown placeholders are removed.
 * Meta refuses a body that starts or ends with a variable, so a greeting or
 * a full stop is added where needed. Bodies are capped at 1024 characters.
 */
export function toMetaBody(text: string): { body: string; params: WaPlaceholder[] } {
  const params: WaPlaceholder[] = [];
  let body = String(text ?? '')
    .replace(/\{(\w+)\}/g, (_m, k: string) => {
      if (!(WA_PLACEHOLDERS as readonly string[]).includes(k)) return '';
      params.push(k as WaPlaceholder);
      return `{{${params.length}}}`;
    })
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  if (body.startsWith('{{')) body = `Assalam o Alaikum, ${body}`;
  if (body.endsWith('}}')) body = `${body}.`;
  return { body: body.slice(0, 1024), params };
}

export interface TemplateDraft {
  key: WaCloudKey;
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING';
  body: string;
  params: WaPlaceholder[];
}

export function templateDraft(key: WaCloudKey, shopText: string | null | undefined, language = 'en'): TemplateDraft {
  const { body, params } = toMetaBody(shopText?.trim() || WA_DEFAULT_TEXT[key]);
  return { key, name: WA_TEMPLATE_NAME[key], language, category: WA_CATEGORY[key], body, params };
}

export interface WaOrder {
  externalOrderId: string;
  externalOrderNumber: string | null;
  customerName: string;
  customerAddress: string | null;
  customerCity: string | null;
  items: unknown;
  total: unknown;
  courierName: string | null;
  trackingNumber: string | null;
}

const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-US')}`;

/** Placeholder values for an order (`cod` = cash still to collect). */
export function orderValues(o: WaOrder, shop: string, codDue: number): WaValues {
  const items = (Array.isArray(o.items) ? o.items : []) as Array<{ name?: string; title?: string; quantity?: unknown; qty?: unknown }>;
  return {
    name: (o.customerName || '').split(/\s+/)[0] || 'Customer',
    shop,
    no: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''),
    items: items.slice(0, 3).map((i) => `${Number(i.quantity ?? i.qty ?? 1)} × ${i.name ?? i.title ?? ''}`.trim()).join(', ').slice(0, 200) || '-',
    total: money(Number(o.total) || 0),
    cod: money(codDue),
    address: o.customerAddress ?? '',
    city: o.customerCity ?? '',
    courier: o.courierName ?? '',
    tracking: o.trackingNumber ?? '',
  };
}

/** Body for POST /{waba-id}/message_templates. */
export function templateCreatePayload(d: TemplateDraft) {
  const components: any[] = [
    { type: 'BODY', text: d.body, ...(d.params.length && { example: { body_text: [d.params.map((p) => WA_EXAMPLES[p])] } }) },
  ];
  if (d.key === 'confirm') {
    components.push({ type: 'BUTTONS', buttons: CONFIRM_BUTTONS.map((text) => ({ type: 'QUICK_REPLY', text })) });
  }
  return { name: d.name, language: d.language, category: d.category, components };
}

/** WhatsApp number in international digits (Pakistan by default); null when it is not a phone. */
export function waNumber(raw: string | null | undefined): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** Button payload that carries the order and the answer. */
export const confirmPayload = (orderId: string, answer: 'yes' | 'no') => `nafaa:${answer}:${orderId}`;

export function parseButtonPayload(p: unknown): { orderId: string; result: 'CONFIRMED' | 'REFUSED' } | null {
  const m = /^nafaa:(yes|no):([A-Za-z0-9_-]{6,64})$/.exec(String(p ?? ''));
  if (!m) return null;
  return { orderId: m[2], result: m[1] === 'yes' ? 'CONFIRMED' : 'REFUSED' };
}

/** Body for POST /{phone-number-id}/messages with a template. */
export function templateSendPayload(to: string, t: { name: string; language: string }, values: string[], buttonPayloads: string[] = []) {
  const components: any[] = [];
  if (values.length) components.push({ type: 'body', parameters: values.map((text) => ({ type: 'text', text: text.trim() || '-' })) });
  buttonPayloads.forEach((payload, i) => components.push({ type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload }] }));
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: { name: t.name, language: { code: t.language }, ...(components.length && { components }) },
  };
}

/** Free text reply (only inside the customer's 24 hour window). */
export function textSendPayload(to: string, body: string) {
  return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body: body.slice(0, 4096) } };
}

/* ───────────────────────── webhook ───────────────────────── */

export interface WaInbound {
  phoneNumberId: string;
  from: string;
  name: string | null;
  messageId: string;
  type: string;
  text: string | null;
  /** Quick reply button payload (template) or interactive reply id. */
  payload: string | null;
  /** Id of our message this one answers. */
  contextId: string | null;
  at: Date;
}

export interface WaStatus {
  phoneNumberId: string;
  messageId: string;
  status: string;
  recipient: string | null;
  error: string | null;
  category: string | null;
  billable: boolean | null;
  at: Date;
}

export interface WaTemplateUpdate { templateId: string; name: string | null; language: string | null; event: string; reason: string | null }

const tsDate = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : new Date(); };

/** Reads a WhatsApp Business Account webhook body into messages, statuses and template updates. */
export function parseWaWebhook(body: any): { inbound: WaInbound[]; statuses: WaStatus[]; templates: WaTemplateUpdate[] } {
  const inbound: WaInbound[] = [];
  const statuses: WaStatus[] = [];
  const templates: WaTemplateUpdate[] = [];
  if (body?.object !== 'whatsapp_business_account') return { inbound, statuses, templates };
  for (const entry of Array.isArray(body.entry) ? body.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const v = change?.value ?? {};
      if (change?.field === 'message_template_status_update') {
        if (v.message_template_id) templates.push({ templateId: String(v.message_template_id), name: v.message_template_name ?? null, language: v.message_template_language ?? null, event: String(v.event ?? ''), reason: v.reason && v.reason !== 'NONE' ? String(v.reason) : null });
        continue;
      }
      if (change?.field !== 'messages') continue;
      const phoneNumberId = String(v.metadata?.phone_number_id ?? '');
      if (!phoneNumberId) continue;
      const contacts: any[] = Array.isArray(v.contacts) ? v.contacts : [];
      for (const m of Array.isArray(v.messages) ? v.messages : []) {
        const contact = contacts.find((c) => c?.wa_id === m?.from);
        const payload = m?.type === 'button' ? m.button?.payload ?? null
          : m?.type === 'interactive' ? m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id ?? null : null;
        const text = m?.type === 'text' ? m.text?.body ?? null
          : m?.type === 'button' ? m.button?.text ?? null
            : m?.type === 'interactive' ? m.interactive?.button_reply?.title ?? null : null;
        if (!m?.id || !m?.from) continue;
        inbound.push({
          phoneNumberId, from: String(m.from), name: contact?.profile?.name ?? null, messageId: String(m.id), type: String(m.type ?? 'unknown'),
          text: text ? String(text).slice(0, 4096) : null, payload: payload ? String(payload) : null, contextId: m.context?.id ?? null, at: tsDate(m.timestamp),
        });
      }
      for (const st of Array.isArray(v.statuses) ? v.statuses : []) {
        if (!st?.id) continue;
        const err = Array.isArray(st.errors) && st.errors[0] ? `${st.errors[0].code ?? ''} ${st.errors[0].title ?? st.errors[0].message ?? ''}`.trim() : null;
        statuses.push({
          phoneNumberId, messageId: String(st.id), status: String(st.status ?? '').toUpperCase(), recipient: st.recipient_id ?? null, error: err,
          category: st.pricing?.category ? String(st.pricing.category).toUpperCase() : null, billable: typeof st.pricing?.billable === 'boolean' ? st.pricing.billable : null, at: tsDate(st.timestamp),
        });
      }
    }
  }
  return { inbound, statuses, templates };
}

/** The confirmation result a reply carries, from a button tap only (free text goes to the inbox). */
export function replyResult(m: Pick<WaInbound, 'payload'>): { orderId: string; result: 'CONFIRMED' | 'REFUSED' } | null {
  return m.payload ? parseButtonPayload(m.payload) : null;
}

/* ───────────────────────── cost ───────────────────────── */

/**
 * Meta's per-message price for Pakistan numbers, USD. A rough guide only: the
 * shop pays Meta directly on its own WhatsApp account and Meta's rate card
 * decides. Utility templates sent while the customer's 24 hour window is
 * open are free, so the estimate is an upper bound.
 */
export const WA_RATE_USD = { MARKETING: 0.0473, UTILITY: 0.0054 } as const;
export const USD_TO_PKR = 280;

export function costEstimate(perMonth: Partial<Record<WaCloudKey, number>>, usdToPkr = USD_TO_PKR) {
  let usd = 0;
  for (const k of WA_CLOUD_KEYS) usd += (perMonth[k] ?? 0) * WA_RATE_USD[WA_CATEGORY[k]];
  return { usd: Math.round(usd * 100) / 100, pkr: Math.round(usd * usdToPkr), perMessagePkr: { UTILITY: Math.round(WA_RATE_USD.UTILITY * usdToPkr * 100) / 100, MARKETING: Math.round(WA_RATE_USD.MARKETING * usdToPkr * 100) / 100 } };
}
