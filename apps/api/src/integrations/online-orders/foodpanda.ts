import * as crypto from 'crypto';
import { NormalizedItem, NormalizedOrder } from './order-normalizer';

/* ═════════════════════════════════════════════════════════════
   FOODPANDA (Delivery Hero POS Middleware) — pure helpers.
   Spec: integration-middleware.stg.restaurant-partners.com/apidocs
   (pluginApi.yaml, middlewareExternalApi.yaml, pluginOrder.yaml)
   ═════════════════════════════════════════════════════════════ */

/** Delivery Hero hamein `Authorization: Bearer <JWT HS512>` bhejta hai, claim service = "middleware" */
export function verifyMiddlewareJwt(auth: string | undefined, secret: string): boolean {
  if (!secret || !auth?.startsWith('Bearer ')) return false;
  const parts = auth.slice(7).trim().split('.');
  if (parts.length !== 3) return false;
  const [h, p, sig] = parts;
  let header: any, payload: any;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch { return false; }
  if (header?.alg !== 'HS512') return false;
  const expected = crypto.createHmac('sha512', secret).update(`${h}.${p}`).digest('base64url');
  const a = Buffer.from(expected), b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  if (payload?.service !== 'middleware') return false;
  if (payload?.exp && Number(payload.exp) * 1000 < Date.now() - 60_000) return false;
  return true;
}

const n = (v: unknown, d = 0) => { const x = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(x) ? x : d; };
const s = (v: unknown) => { const t = String(v ?? '').trim(); return t ? t.slice(0, 500) : undefined; };

export interface FoodpandaMeta {
  token: string;
  code: string;
  shortCode?: string;
  expeditionType: string;
  /** Delivery Hero ka rider le jayega (own delivery) — warna vendor delivery / pickup */
  platformRider: boolean;
  callbackUrls: Record<string, string>;
  platformRestaurantId?: string;
  expiryDate?: string;
  riderPickupTime?: string;
  expectedTime?: string;
  test: boolean;
  payRestaurant: number;
  collectFromCustomer: number;
}

export type FoodpandaOrderType = 'pickup' | 'vendor_delivery' | 'platform_delivery';

export function foodpandaOrderType(o: any): FoodpandaOrderType {
  if (String(o?.expeditionType ?? '').toLowerCase() === 'pickup') return 'pickup';
  return o?.delivery?.riderPickupTime ? 'platform_delivery' : 'vendor_delivery';
}

/** DH order → Nafaa ka NormalizedOrder + Foodpanda ka zaroori data */
export function normalizeFoodpanda(o: any): { order: NormalizedOrder; meta: FoodpandaMeta } {
  const type = foodpandaOrderType(o);
  const items: NormalizedItem[] = [];
  const notes: string[] = [];
  const addToppings = (tops: any[], parentQty: number, depth: number) => {
    for (const t of tops ?? []) {
      items.push({
        name: `${'+'.repeat(depth)} ${s(t.name) ?? 'Topping'}`,
        sku: s(t.remoteCode ?? t.sku),
        externalProductId: s(t.id),
        quantity: Math.max(1, n(t.quantity, 1)) * parentQty,
        price: n(t.price),
      });
      if (Array.isArray(t.children) && t.children.length) addToppings(t.children, parentQty, depth + 1);
    }
  };
  for (const p of o?.products ?? []) {
    const qty = Math.max(1, n(p.quantity, 1));
    items.push({
      name: s(p.name) ?? 'Item',
      sku: s(p.remoteCode ?? p.sku),
      externalProductId: s(p.id),
      variant: s(p.variation?.name) !== s(p.name) ? s(p.variation?.name) : undefined,
      quantity: qty,
      price: n(p.unitPrice, qty ? n(p.paidPrice) / qty : 0),
    });
    if (s(p.comment)) notes.push(`${s(p.name)}: ${s(p.comment)}`);
    addToppings(p.selectedToppings ?? [], qty, 1);
  }
  const price = o?.price ?? {};
  const deliveryFee = (Array.isArray(price.deliveryFees) ? price.deliveryFees : []).reduce((t: number, f: any) => t + n(f.value), 0);
  const discount = (Array.isArray(o?.discounts) ? o.discounts : []).reduce((t: number, d: any) => t + n(d.amount), 0);
  const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
  const c = o?.customer ?? {};
  const addr = o?.delivery?.address ?? null;
  const paid = String(o?.payment?.status ?? '').toLowerCase() === 'paid';
  const label = type === 'pickup' ? 'Pickup' : type === 'platform_delivery' ? 'Foodpanda rider' : 'Apni delivery';
  if (s(o?.comments?.customerComment)) notes.unshift(s(o.comments.customerComment)!);
  notes.unshift(`${label}${o?.shortCode ? ` · #${o.shortCode}` : ''}`);
  if (o?.preOrder) notes.push('Pre-order');
  if (o?.test) notes.push('TEST order');

  const order: NormalizedOrder = {
    platform: 'foodpanda',
    externalOrderId: String(o?.token ?? ''),
    externalOrderNumber: s(o?.code) ?? s(o?.shortCode),
    customerName: [s(c.firstName), s(c.lastName)].filter(Boolean).join(' ') || 'Foodpanda customer',
    customerPhone: s(c.mobilePhone),
    customerEmail: s(c.email),
    customerAddress: addr ? [s(addr.street), s(addr.number), s(addr.building), s(addr.flatNumber), s(addr.deliveryArea), s(addr.deliveryInstructions)].filter(Boolean).join(', ') || undefined : undefined,
    customerCity: s(addr?.city),
    customerLat: addr?.latitude !== undefined ? n(addr.latitude) : undefined,
    customerLng: addr?.longitude !== undefined ? n(addr.longitude) : undefined,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    discount,
    total: n(price.grandTotal, subtotal + deliveryFee - discount),
    paymentMethod: paid ? 'Foodpanda online' : 'Cash (Foodpanda)',
    paymentStatus: paid ? 'PAID' : 'PENDING',
    cancelled: false,
    notes: s(notes.join(' · ')),
    shippingMethod: label,
    paymentTitle: s(o?.payment?.type),
  };
  const meta: FoodpandaMeta = {
    token: String(o?.token ?? ''),
    code: String(o?.code ?? ''),
    shortCode: s(o?.shortCode),
    expeditionType: String(o?.expeditionType ?? ''),
    platformRider: type === 'platform_delivery',
    callbackUrls: Object.fromEntries(Object.entries(o?.callbackUrls ?? {}).filter(([, v]) => typeof v === 'string' && /^https:\/\//.test(v as string))) as Record<string, string>,
    platformRestaurantId: s(o?.platformRestaurant?.id),
    expiryDate: s(o?.expiryDate),
    riderPickupTime: s(o?.delivery?.riderPickupTime),
    expectedTime: s(type === 'pickup' ? o?.pickup?.pickupTime : o?.delivery?.expectedDeliveryTime),
    test: !!o?.test,
    payRestaurant: n(price.payRestaurant),
    collectFromCustomer: n(price.collectFromCustomer),
  };
  return { order, meta };
}

/**
 * Accept ka waqt: pickup / apni delivery me Foodpanda ka diya waqt (agar aage ho),
 * warna abhi + tayyari ke minute. Spec: kam az kam 2 minute aage.
 */
export function acceptanceTime(meta: Pick<FoodpandaMeta, 'expectedTime' | 'platformRider' | 'riderPickupTime'>, prepMinutes: number, now = new Date()): string {
  const min = now.getTime() + 3 * 60_000;
  const suggested = meta.platformRider ? meta.riderPickupTime : meta.expectedTime;
  const t = suggested && Date.parse(suggested) > min ? Date.parse(suggested) : now.getTime() + Math.max(3, prepMinutes) * 60_000;
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export const REJECT_REASONS = [
  'TOO_BUSY', 'ITEM_UNAVAILABLE', 'CLOSED', 'OUTSIDE_DELIVERY_AREA', 'NO_COURIER', 'ADDRESS_INCOMPLETE_MISSTATED',
  'MENU_ACCOUNT_SETTINGS', 'FRAUD_PRANK', 'BLACKLISTED', 'TECHNICAL_PROBLEM', 'TEST_ORDER', 'NO_PICKER', 'BAD_WEATHER', 'WILL_NOT_WORK_WITH_PLATFORM',
] as const;

/** Nafaa me likhi cancel wajah → Delivery Hero ka reason code */
export function rejectReason(text: string | null | undefined, test = false): string {
  const t = String(text ?? '').toUpperCase();
  const direct = REJECT_REASONS.find((r) => t.includes(r));
  if (direct) return direct;
  const l = t.toLowerCase();
  if (test) return 'TEST_ORDER';
  if (/stock|khatam|nahi hai|unavailable|item/.test(l)) return 'ITEM_UNAVAILABLE';
  if (/band|closed|chutti/.test(l)) return 'CLOSED';
  if (/area|door|dur|bahar/.test(l)) return 'OUTSIDE_DELIVERY_AREA';
  if (/rider|courier|delivery boy/.test(l)) return 'NO_COURIER';
  if (/address|pata/.test(l)) return 'ADDRESS_INCOMPLETE_MISSTATED';
  if (/fake|prank|fraud|jhoota/.test(l)) return 'FRAUD_PRANK';
  if (/block/.test(l)) return 'BLACKLISTED';
  if (/price|qeemat|menu/.test(l)) return 'MENU_ACCOUNT_SETTINGS';
  return 'TOO_BUSY';
}
