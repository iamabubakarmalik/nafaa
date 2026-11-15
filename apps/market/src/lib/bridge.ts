/**
 * Browser → API bridge table for /api/m/<action>. Each entry names one
 * action the browser may call, the HTTP method, and the client call it runs
 * with the signed-in customer's token. Nothing outside this table reaches
 * the API from the browser.
 */
import { api } from './api';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BridgeCtx {
  token: string;
  body: any;
  query: URLSearchParams;
  /** Captured path parts from the pattern. */
  args: string[];
}

interface Route {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: RegExp;
  run: (c: BridgeCtx) => Promise<unknown>;
}

const c = api.customer;
const ID = '([A-Za-z0-9_-]{1,64})';
const re = (s: string) => new RegExp(`^${s}$`);
const text = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const int = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};
/** Add-on picks: [{ groupId, optionIds[] }], at most 30 groups and 30 options each. */
const picks = (v: unknown) =>
  Array.isArray(v)
    ? v.slice(0, 30).filter((p) => p && typeof p.groupId === 'string' && Array.isArray(p.optionIds)).map((p) => ({
        groupId: String(p.groupId).slice(0, 64),
        optionIds: (p.optionIds as unknown[]).slice(0, 30).map((x) => String(x).slice(0, 64)),
      }))
    : undefined;
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

export const ROUTES: Route[] = [
  { method: 'GET', path: re('me'), run: ({ token }) => c.me(token) },
  { method: 'PATCH', path: re('me'), run: ({ token, body }) => c.updateMe(token, { fullName: text(body.fullName, 100), email: text(body.email, 120) || undefined, language: text(body.language, 10) }) },
  { method: 'DELETE', path: re('me'), run: ({ token, body }) => c.deleteAccount(token, text(body?.reason, 300)) },

  { method: 'GET', path: re('cart'), run: ({ token }) => c.cart(token) },
  {
    method: 'POST', path: re('cart/add'),
    run: ({ token, body }) => c.cartAdd(token, {
      productId: String(body.productId), variantId: text(body.variantId, 64), quantity: int(body.quantity, 1, 999) ?? 1,
      notes: text(body.notes) || undefined, options: obj(body.options), modifiers: picks(body.modifiers),
    }),
  },
  { method: 'PATCH', path: re(`cart/lines/${ID}`), run: ({ token, args, body }) => c.cartUpdate(token, args[0]!, { quantity: int(body.quantity, 1, 999), notes: text(body.notes), options: obj(body.options), modifiers: picks(body.modifiers) }) },
  { method: 'DELETE', path: re(`cart/lines/${ID}`), run: ({ token, args }) => c.cartRemove(token, args[0]!) },

  { method: 'POST', path: re('checkout/preview'), run: ({ token, body }) => c.preview(token, { addressId: text(body.addressId, 64), deliveryType: body.deliveryType, couponCode: text(body.couponCode, 40) || undefined }) },
  {
    method: 'POST', path: re('checkout/place'),
    run: ({ token, body }) => c.placeOrder(token, {
      addressId: text(body.addressId, 64), deliveryType: body.deliveryType, paymentMethod: body.paymentMethod,
      couponCode: text(body.couponCode, 40) || undefined, customerNotes: text(body.customerNotes) || undefined,
      deliverySlotStart: text(body.deliverySlotStart, 40), deliverySlotEnd: text(body.deliverySlotEnd, 40),
      slots: body.slots && typeof body.slots === 'object' && !Array.isArray(body.slots)
        ? Object.fromEntries(Object.entries(body.slots as Record<string, any>).slice(0, 20)
          .filter(([k, v]) => /^[\w-]{1,64}$/.test(k) && v && typeof v.start === 'string')
          .map(([k, v]) => [k, { start: String(v.start).slice(0, 40), end: v.end ? String(v.end).slice(0, 40) : null }]))
        : undefined,
      attachments: Array.isArray(body.attachments)
        ? body.attachments.slice(0, 10).map((a: any) => ({ kind: 'prescription' as const, url: String(a.url).slice(0, 1000), shopId: text(a.shopId, 64) }))
        : undefined,
      expectedTotal: typeof body.expectedTotal === 'number' ? body.expectedTotal : undefined,
    }),
  },
  { method: 'GET', path: re('checkout/slots'), run: ({ token, query }) => c.slots(token, query.get('shopId') ?? '') },

  { method: 'GET', path: re('orders'), run: ({ token, query }) => c.orders(token, { page: int(query.get('page'), 1, 500), active: query.get('active') === '1' }) },
  { method: 'GET', path: re(`orders/${ID}`), run: ({ token, args }) => c.order(token, args[0]!) },
  { method: 'POST', path: re(`orders/${ID}/cancel`), run: ({ token, args, body }) => c.cancelOrder(token, args[0]!, text(body?.reason, 300)) },
  { method: 'POST', path: re(`orders/${ID}/reorder`), run: ({ token, args }) => c.reorder(token, args[0]!) },
  {
    method: 'POST', path: re(`orders/${ID}/rate`),
    run: ({ token, args, body }) => c.rateOrder(token, args[0]!, { shopRating: int(body.shopRating, 1, 5) ?? 5, riderRating: int(body.riderRating, 1, 5), comment: text(body.comment, 1000) || undefined }),
  },

  { method: 'GET', path: re('addresses'), run: ({ token }) => c.addresses(token) },
  {
    method: 'POST', path: re('addresses'),
    run: ({ token, body }) => c.addAddress(token, {
      label: text(body.label, 50) ?? 'Home', fullName: text(body.fullName, 100) ?? '', phone: text(body.phone, 20) ?? '',
      addressLine1: text(body.addressLine1, 200) ?? '', landmark: text(body.landmark, 200) || undefined, city: text(body.city, 60) ?? '',
      area: text(body.area, 100) ?? '', addressType: ['HOME', 'OFFICE', 'OTHER'].includes(body.addressType) ? body.addressType : 'HOME',
      lat: typeof body.lat === 'number' ? body.lat : undefined, lng: typeof body.lng === 'number' ? body.lng : undefined, isDefault: !!body.isDefault,
    }),
  },
  { method: 'DELETE', path: re(`addresses/${ID}`), run: ({ token, args }) => c.deleteAddress(token, args[0]!) },
  { method: 'POST', path: re(`addresses/${ID}/default`), run: ({ token, args }) => c.defaultAddress(token, args[0]!) },

  { method: 'GET', path: re('wishlist'), run: ({ token }) => c.wishlist(token) },
  { method: 'POST', path: re(`wishlist/${ID}/toggle`), run: ({ token, args }) => c.toggleWish(token, args[0]!) },
  { method: 'GET', path: re('followed'), run: ({ token }) => c.followed(token) },
  { method: 'POST', path: re(`follow/${ID}`), run: ({ token, args, body }) => c.follow(token, args[0]!, body?.on !== false) },
  { method: 'GET', path: re('notifications'), run: ({ token }) => c.notifications(token) },
  { method: 'POST', path: re('notifications/read-all'), run: ({ token }) => c.readAllNotifications(token) },
  {
    method: 'POST', path: re('upload/presign'),
    run: ({ token, body }) => c.presignUpload(token, { fileName: text(body.fileName, 120) ?? 'file', contentType: text(body.contentType, 60) ?? 'image/jpeg', fileSize: int(body.fileSize, 1, 20_000_000) ?? 1 }),
  },
];

export function matchRoute(method: string, action: string): { route: Route; args: string[] } | null {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const m = action.match(route.path);
    if (m) return { route, args: m.slice(1) };
  }
  return null;
}
