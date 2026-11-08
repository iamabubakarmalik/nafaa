/**
 * Order status mapping between a sales channel and the Nafaa orders board.
 *
 * Inbound: a status the channel reports (Woo "completed", Daraz "shipped",
 * a Shopify fulfillment marked delivered …) → what Nafaa does with the order.
 * Outbound: a Nafaa board status → what Nafaa does on the channel (Shopify
 * fulfillment, Woo status, Daraz ready to ship, the status text a custom
 * website receives).
 *
 * The merchant's choices live in `Integration.config.statusMap`; anything
 * missing falls back to the defaults below, which match what Nafaa did
 * before the mapping existed. Inbound moves only go forward and only touch
 * accepted orders (a bill exists), so a channel can never create a bill or
 * pull an order backwards. Pure functions only, unit tested.
 */

export type StatusChannel = 'SHOPIFY' | 'WOOCOMMERCE' | 'DARAZ' | 'CUSTOM_WEBSITE';
export const STATUS_CHANNELS: StatusChannel[] = ['SHOPIFY', 'WOOCOMMERCE', 'DARAZ', 'CUSTOM_WEBSITE'];

/** What Nafaa does when the channel reports a status. */
export const INBOUND_TARGETS = ['NONE', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'CANCELLED', 'PAID'] as const;
export type InboundTarget = (typeof INBOUND_TARGETS)[number];

/** Nafaa board statuses that can send something to a channel ("PAID" = payment received). */
export const OUTBOUND_BOARDS = ['CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'CANCELLED', 'PAID'] as const;
export type OutboundBoard = (typeof OUTBOUND_BOARDS)[number];

export interface StatusMap {
  inbound: Record<string, InboundTarget>;
  outbound: Partial<Record<OutboundBoard, string>>;
}

interface ChannelStatusDef {
  /** Channel statuses with their default Nafaa target, in the order the UI lists them. */
  inbound: Array<{ key: string; target: InboundTarget }>;
  /** Merchant may add statuses of their own (Woo plugins, custom sites). */
  customInbound: boolean;
  /** Per board status: allowed actions, the first is the default. */
  outbound: Partial<Record<OutboundBoard, string[]>>;
  /** Outbound may also be any status slug the merchant types (Woo custom status, custom site text). */
  freeOutbound: boolean;
}

const SLUG = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export const STATUS_DEFS: Record<StatusChannel, ChannelStatusDef> = {
  SHOPIFY: {
    inbound: [
      { key: 'paid', target: 'PAID' },
      { key: 'fulfilled', target: 'NONE' },
      { key: 'delivered', target: 'NONE' },
      { key: 'delivery_failed', target: 'NONE' },
      { key: 'cancelled', target: 'CANCELLED' },
      { key: 'refunded', target: 'CANCELLED' },
      { key: 'voided', target: 'CANCELLED' },
    ],
    customInbound: false,
    outbound: {
      CONFIRMED: ['tag', 'none'],
      PACKED: ['tag', 'none'],
      DISPATCHED: ['fulfill', 'tag', 'none'],
      DELIVERED: ['delivered', 'fulfill', 'none'],
      RETURNED: ['tag', 'cancel', 'none'],
      CANCELLED: ['cancel', 'tag', 'none'],
      PAID: ['paid', 'none'],
    },
    freeOutbound: false,
  },
  WOOCOMMERCE: {
    inbound: [
      { key: 'pending', target: 'NONE' },
      { key: 'processing', target: 'NONE' },
      { key: 'on-hold', target: 'NONE' },
      { key: 'completed', target: 'NONE' },
      { key: 'cancelled', target: 'CANCELLED' },
      { key: 'refunded', target: 'CANCELLED' },
      { key: 'failed', target: 'CANCELLED' },
    ],
    customInbound: true,
    outbound: {
      CONFIRMED: ['processing', 'on-hold', 'note', 'none'],
      PACKED: ['note', 'processing', 'none'],
      DISPATCHED: ['note', 'completed', 'none'],
      DELIVERED: ['completed', 'note', 'none'],
      RETURNED: ['failed', 'refunded', 'cancelled', 'note', 'none'],
      CANCELLED: ['cancelled', 'note', 'none'],
      PAID: ['note', 'none'],
    },
    freeOutbound: true,
  },
  DARAZ: {
    inbound: [
      { key: 'ready_to_ship', target: 'NONE' },
      { key: 'shipped', target: 'DISPATCHED' },
      { key: 'delivered', target: 'DELIVERED' },
      { key: 'failed', target: 'RETURNED' },
      { key: 'returned', target: 'RETURNED' },
      { key: 'canceled', target: 'CANCELLED' },
    ],
    customInbound: false,
    // Daraz moves shipped / delivered / returned itself; a seller can pack (RTS) or cancel.
    outbound: {
      PACKED: ['none', 'rts'],
      DISPATCHED: ['none', 'rts'],
      CANCELLED: ['none', 'cancel'],
    },
    freeOutbound: false,
  },
  CUSTOM_WEBSITE: {
    inbound: [
      { key: 'paid', target: 'PAID' },
      { key: 'shipped', target: 'NONE' },
      { key: 'delivered', target: 'NONE' },
      { key: 'returned', target: 'NONE' },
      { key: 'cancelled', target: 'CANCELLED' },
      { key: 'refunded', target: 'CANCELLED' },
      { key: 'failed', target: 'CANCELLED' },
    ],
    customInbound: true,
    // "send" = the website gets the Nafaa status as it is.
    outbound: {
      CONFIRMED: ['send', 'none'],
      PACKED: ['send', 'none'],
      DISPATCHED: ['send', 'none'],
      DELIVERED: ['send', 'none'],
      RETURNED: ['send', 'none'],
      CANCELLED: ['send', 'none'],
      PAID: ['send', 'none'],
    },
    freeOutbound: true,
  },
};

export const isStatusChannel = (t: string): t is StatusChannel => (STATUS_CHANNELS as string[]).includes(t);

const cleanKey = (k: unknown) => String(k ?? '').trim().toLowerCase().replace(/^wc-/, '').replace(/\s+/g, '_').slice(0, 40);

/** The full map for a channel: stored choices that are valid, defaults for the rest. */
export function readStatusMap(type: StatusChannel, raw: unknown): StatusMap {
  const def = STATUS_DEFS[type];
  const r = (raw && typeof raw === 'object' ? raw : {}) as { inbound?: Record<string, unknown>; outbound?: Record<string, unknown> };
  const inbound: Record<string, InboundTarget> = {};
  for (const s of def.inbound) inbound[s.key] = s.target;
  for (const [k0, v] of Object.entries(r.inbound ?? {})) {
    const k = cleanKey(k0);
    if (!SLUG.test(k) || !(INBOUND_TARGETS as readonly string[]).includes(String(v))) continue;
    if (!(k in inbound) && !def.customInbound) continue;
    inbound[k] = v as InboundTarget;
  }
  const outbound: StatusMap['outbound'] = {};
  for (const b of OUTBOUND_BOARDS) {
    const allowed = def.outbound[b];
    if (!allowed) continue;
    const want = cleanKey(r.outbound?.[b]);
    outbound[b] = want && (allowed.includes(want) || (def.freeOutbound && SLUG.test(want))) ? want : allowed[0];
  }
  return { inbound, outbound };
}

/** Only the entries that differ from the defaults (what gets stored). */
export function compactStatusMap(type: StatusChannel, map: StatusMap): StatusMap {
  const d = readStatusMap(type, null);
  const inbound: StatusMap['inbound'] = {};
  for (const [k, v] of Object.entries(map.inbound)) if (d.inbound[k] !== v) inbound[k] = v;
  const outbound: StatusMap['outbound'] = {};
  for (const [k, v] of Object.entries(map.outbound) as [OutboundBoard, string][]) if (d.outbound[k] !== v) outbound[k] = v;
  return { inbound, outbound };
}

/** Lifecycle status → the board status whose outbound action applies. */
export function outboundBoardOf(orderStatus: string, event?: string): OutboundBoard | null {
  if (event === 'order.paid') return 'PAID';
  switch (orderStatus) {
    case 'CONFIRMED': case 'PREPARING': return 'CONFIRMED';
    case 'READY': return 'PACKED';
    case 'OUT_FOR_DELIVERY': return 'DISPATCHED';
    case 'DELIVERED': return 'DELIVERED';
    case 'RETURNED': return 'RETURNED';
    case 'CANCELLED': case 'REJECTED': return 'CANCELLED';
    default: return null;
  }
}

/** The channel action for an order's current status ('none' when nothing goes out). */
export function outboundAction(type: StatusChannel, map: StatusMap, orderStatus: string, event?: string): string {
  const board = outboundBoardOf(orderStatus, event);
  return (board && map.outbound[board]) || 'none';
}

// ─── Reading the channel's status from its payload ───

/** Shopify order webhook (REST shape) → the status keys it carries. */
export function shopifyStatusKeys(body: any): string[] {
  const keys: string[] = [];
  const fin = String(body?.financial_status ?? '').toLowerCase();
  if (fin === 'paid') keys.push('paid');
  if (fin === 'refunded' || fin === 'voided') keys.push(fin);
  if (body?.cancelled_at) keys.push('cancelled');
  if (String(body?.fulfillment_status ?? '').toLowerCase() === 'fulfilled') keys.push('fulfilled');
  const shipments = (Array.isArray(body?.fulfillments) ? body.fulfillments : [])
    .map((f: any) => String(f?.shipment_status ?? '').toLowerCase())
    .filter((s: string) => s && s !== 'cancelled');
  if (shipments.length && shipments.every((s: string) => s === 'delivered')) keys.push('delivered');
  else if (shipments.includes('failure')) keys.push('delivery_failed');
  return keys;
}

/** WooCommerce or custom website: one status field (plus payment for custom sites). */
export function plainStatusKeys(status: unknown, paymentStatus?: unknown): string[] {
  const keys: string[] = [];
  const s = cleanKey(status);
  if (s) keys.push(s === 'canceled' ? 'cancelled' : s);
  const p = cleanKey(paymentStatus);
  if (p === 'paid' || p === 'completed') keys.push('paid');
  return keys;
}

/**
 * Daraz keeps a status per unit; the order's status is the furthest one
 * the live units reached (cancelled units are ignored unless all are).
 */
export function darazStatusKey(statuses: string[]): string | null {
  const s = statuses.map((x) => String(x).toLowerCase());
  if (!s.length || s.every((x) => x === 'unpaid')) return null;
  if (s.every((x) => x === 'canceled' || x === 'cancelled')) return 'canceled';
  if (s.some((x) => x === 'returned' || x === 'lost' || x === 'damaged')) return 'returned';
  if (s.some((x) => x === 'failed' || x === 'failed_delivery')) return 'failed';
  const live = s.filter((x) => x !== 'canceled' && x !== 'cancelled');
  if (live.length && live.every((x) => x === 'delivered')) return 'delivered';
  if (live.some((x) => x === 'shipped' || x === 'shipping' || x === 'delivered')) return 'shipped';
  if (live.some((x) => x === 'ready_to_ship' || x === 'packed' || x === 'repacked')) return 'ready_to_ship';
  return 'pending';
}

// ─── Deciding what happens in Nafaa ───

export interface InboundOrder {
  orderStatus: string;
  paymentStatus: string;
  nafaaSaleId: string | null;
  dispatchedAt: Date | string | null;
}

/** One thing Nafaa does to the order. `status` steps go through the normal status change. */
export type InboundStep =
  | { kind: 'paid' }
  | { kind: 'cancel' }
  | { kind: 'returned' }
  | { kind: 'status'; status: 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' };

const RANK: Record<string, number> = { CONFIRMED: 1, PREPARING: 1, READY: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4 };
const TARGET_STATUS = { PACKED: 'READY', DISPATCHED: 'OUT_FOR_DELIVERY', DELIVERED: 'DELIVERED' } as const;
const DONE = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** The steps for one target. Forward only, accepted orders only (cancel and paid excepted). */
export function planInbound(o: InboundOrder, target: InboundTarget): InboundStep[] {
  switch (target) {
    case 'NONE':
      return [];
    case 'PAID':
      return o.paymentStatus === 'PAID' || DONE.includes(o.orderStatus) ? [] : [{ kind: 'paid' }];
    case 'CANCELLED':
      return DONE.includes(o.orderStatus) || o.orderStatus === 'DELIVERED' ? [] : [{ kind: 'cancel' }];
    case 'RETURNED':
      return o.nafaaSaleId && o.dispatchedAt && !DONE.includes(o.orderStatus) ? [{ kind: 'returned' }] : [];
    default: {
      if (!o.nafaaSaleId || DONE.includes(o.orderStatus)) return [];
      const now = RANK[o.orderStatus];
      const want = TARGET_STATUS[target];
      if (!now || RANK[want] <= now) return [];
      return [{ kind: 'status', status: want }];
    }
  }
}

/**
 * All steps for the keys a channel reported. Payment first, then the one
 * status move that goes furthest (a cancel or return wins over a forward move).
 */
export function inboundSteps(map: StatusMap, keys: string[], o: InboundOrder): InboundStep[] {
  const targets = [...new Set(keys.map((k) => map.inbound[cleanKey(k)]).filter((t): t is InboundTarget => !!t && t !== 'NONE'))];
  const steps: InboundStep[] = [];
  if (targets.includes('PAID')) steps.push(...planInbound(o, 'PAID'));
  const order: InboundTarget[] = ['CANCELLED', 'RETURNED', 'DELIVERED', 'DISPATCHED', 'PACKED'];
  const pick = order.find((t) => targets.includes(t) && planInbound(o, t).length);
  if (pick) steps.push(...planInbound(o, pick));
  return steps;
}

// ─── Tracking sent with a fulfillment / note ───

const COURIER_LABEL: Record<string, string> = {
  TCS: 'TCS', LEOPARDS: 'Leopards Courier', POSTEX: 'PostEx', TRAX: 'Trax', MNP: 'M&P', BLUE_EX: 'BlueEx',
  CALL_COURIER: 'Call Courier', DAEWOO: 'Daewoo FastEx', TPL_RIDER: 'Rider', PAKPOST: 'Pakistan Post',
};

/** Public tracking page for couriers whose page takes the number in the link. */
export function trackingUrl(courierCode: string | null | undefined, number: string | null | undefined): string | null {
  if (!number) return null;
  if (courierCode === 'PAKPOST') return `https://ep.gov.pk/emtts/EPTrack_Live.aspx?ArticleIDz=${encodeURIComponent(number)}`;
  return null;
}

/** Tracking company, number and link for a channel, or null when the order has none. */
export function trackingInfo(o: { courierName?: string | null; courierCode?: string | null; trackingNumber?: string | null }): { company?: string; number?: string; url?: string } | null {
  const number = o.trackingNumber?.trim() || undefined;
  const company = (o.courierCode && COURIER_LABEL[o.courierCode]) || o.courierName?.trim() || undefined;
  if (!number && !company) return null;
  const url = trackingUrl(o.courierCode, number) ?? undefined;
  return { ...(company && { company }), ...(number && { number }), ...(url && { url }) };
}
