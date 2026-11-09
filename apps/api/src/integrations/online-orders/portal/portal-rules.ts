/**
 * Customer portal rules, kept pure for tests:
 * - token format and phone matching (a link only ever sees its own order,
 *   or the orders of its own phone number in its own business);
 * - which requests an order allows right now;
 * - the request state machine.
 */

export const PORTAL_TOKEN_RE = /^[A-Za-z0-9_-]{20,48}$/;

export const REQUEST_TYPES = ['RETURN', 'EXCHANGE', 'CANCEL', 'ADDRESS', 'REORDER'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const REQUEST_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'DONE', 'WITHDRAWN'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const OPEN_STATUSES: RequestStatus[] = ['REQUESTED', 'APPROVED'];

export const RETURN_WINDOW_DAYS = 14;
export const MAX_PHOTOS = 4;

export const isRequestType = (v: unknown): v is RequestType => typeof v === 'string' && (REQUEST_TYPES as readonly string[]).includes(v);

/** Last 10 digits of a phone, so 0300…, +92300… and 92300… match. */
export function phoneKey(phone: string | null | undefined): string | null {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 7 ? d.slice(-10) : null;
}

export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = phoneKey(a);
  return !!x && x === phoneKey(b);
}

export interface PortalLinkScope { tenantId: string; kind: string; channelOrderId: string | null; phone: string | null; revokedAt?: Date | null; expiresAt?: Date | null }
export interface PortalOrderScope { id: string; tenantId: string; customerPhone: string | null; deletedAt?: Date | null }

/** Whether a link may see an order. Never crosses businesses or phone numbers. */
export function linkCanSee(link: PortalLinkScope, order: PortalOrderScope, now = new Date()): boolean {
  if (link.revokedAt || (link.expiresAt && link.expiresAt <= now)) return false;
  if (order.tenantId !== link.tenantId || order.deletedAt) return false;
  if (link.kind === 'ORDER') return order.id === link.channelOrderId;
  if (link.kind === 'CUSTOMER') return !!link.phone && phoneKey(order.customerPhone) === link.phone;
  return false;
}

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];

export interface OrderState {
  orderStatus: string;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  hasProducts: boolean;
}

/** Requests the customer can make on this order now (open ones of the same type excluded). */
export function allowedRequests(o: OrderState, openTypes: string[], now = new Date()): RequestType[] {
  const out: RequestType[] = [];
  const closed = CLOSED.includes(o.orderStatus);
  const beforeDispatch = !closed && !o.dispatchedAt && o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'OUT_FOR_DELIVERY';
  if (beforeDispatch) out.push('CANCEL', 'ADDRESS');
  const delivered = o.orderStatus === 'DELIVERED' && !!o.deliveredAt;
  if (delivered && now.getTime() - o.deliveredAt!.getTime() <= RETURN_WINDOW_DAYS * 86_400_000) out.push('RETURN', 'EXCHANGE');
  if (o.hasProducts && o.orderStatus !== 'PENDING') out.push('REORDER');
  return out.filter((t) => !openTypes.includes(t));
}

/** Allowed moves. Approving a cancel, address change or reorder runs it at once, so it goes straight to DONE. */
const MOVES: Record<RequestStatus, RequestStatus[]> = {
  REQUESTED: ['APPROVED', 'DONE', 'REJECTED', 'WITHDRAWN'],
  APPROVED: ['DONE', 'REJECTED'],
  REJECTED: [],
  DONE: [],
  WITHDRAWN: [],
};

export function canMove(from: string, to: RequestStatus): boolean {
  return (MOVES[from as RequestStatus] ?? []).includes(to);
}

/** Status after the shop approves a request of this type. */
export function approvedStatus(type: RequestType): RequestStatus {
  return type === 'RETURN' || type === 'EXCHANGE' ? 'APPROVED' : 'DONE';
}

/** Cleans the lines a return or exchange is about: valid indexes, qty 1..ordered. */
export function pickLines(raw: unknown, lines: Array<{ quantity?: unknown }>): Array<{ index: number; qty: number }> {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: Array<{ index: number; qty: number }> = [];
  for (const r of raw.slice(0, 100)) {
    const index = Number((r as any)?.index);
    if (!Number.isInteger(index) || index < 0 || index >= lines.length || seen.has(index)) continue;
    const max = Math.max(1, Number(lines[index]?.quantity) || 1);
    const qty = Math.min(max, Math.max(1, Math.floor(Number((r as any)?.qty) || 1)));
    seen.add(index);
    out.push({ index, qty });
  }
  return out;
}
