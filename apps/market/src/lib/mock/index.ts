/**
 * In-memory stand-in for the Market API (MARKET_MOCK=1). Public reads come
 * from ./data; the signed-in customer, cart, addresses, orders, wishlist and
 * follows live in memory for the life of the server process.
 *
 * Demo login: any 03XXXXXXXXX number, code 123456. Coupon: WELCOME10.
 */
import type { CustomerApi, MarketApi } from '../api';
import type {
  Address, Cart, CartGroup, CartLine, CheckoutPreview, Customer, ModifierPick, OrderDetail, OrderStatus, PaymentMethod, ProductDetail, ShopSummary, Slot,
} from '../types';
import { GATES, PRODUCTS, SHOPS } from './data';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order mil gaya, confirm ho raha hai', CONFIRMED: 'Confirm ho gaya', PREPARING: 'Tayyar ho raha hai',
  READY_FOR_PICKUP: 'Tayyar hai', OUT_FOR_DELIVERY: 'Raste me hai', DELIVERED: 'Deliver ho gaya', CANCELLED: 'Cancel ho gaya',
};

class MockError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

interface StoredLine { id: string; productId: string; variantId: string | null; quantity: number; notes: string | null; options: Record<string, unknown> | null; picks: ModifierPick[]; savedPrice: number }

interface State {
  customer: Customer;
  lines: StoredLine[];
  addresses: Address[];
  orders: OrderDetail[];
  wish: Set<string>;
  follows: Set<string>;
  seq: number;
}

const g = globalThis as unknown as { __nafaaMarketMock?: State };
const state: State = (g.__nafaaMarketMock ??= {
  customer: { id: 'c-demo', fullName: 'Ali Raza', phone: '03001234567', email: null, avatarUrl: null, language: 'en' },
  lines: [],
  addresses: [
    {
      id: 'a-home', label: 'Ghar', fullName: 'Ali Raza', phone: '03001234567', addressLine1: 'House 12, Street 4', addressLine2: null,
      landmark: 'Near Jamia Masjid', city: 'Lahore', area: 'Gulberg III', lat: 31.5104, lng: 74.3441, addressType: 'HOME', isDefault: true, deliveryNotes: null,
    },
  ],
  orders: [],
  wish: new Set(),
  follows: new Set(),
  seq: 1000,
});

const shopById = (id: string) => SHOPS.find((s) => s.shopId === id);
const product = (id: string) => PRODUCTS.find((p) => p.productId === id);
const summary = (s: (typeof SHOPS)[number]): ShopSummary => {
  const { description: _d, phone: _p, whatsapp: _w, address: _a, gallery: _g, workingHours: _h, holidayDates: _hd, followers: _f, productCount: _c, reviews: _r, lat: _la, lng: _ln, pickupMinutes: _pm, offersDineIn: _di, ...rest } = s;
  return rest;
};
const ok = (token: string) => {
  if (token !== 'mock-access') throw new MockError(401, 'No token provided');
};

function seedOrders() {
  if (state.orders.length) return;
  const shop = SHOPS[0]!;
  const items = PRODUCTS.filter((p) => p.shopId === shop.shopId).slice(0, 3);
  const subtotal = items.reduce((s, p) => s + p.price, 0);
  state.orders.push({
    id: 'o-demo-1', orderNumber: 'NM261110A1B2C3', status: 'DELIVERED', statusLabel: STATUS_LABEL.DELIVERED!, deliveryType: 'DELIVERY',
    paymentMethod: 'COD', paymentStatus: 'PAID', subtotal, deliveryFee: shop.deliveryFee, discount: 0, total: subtotal + shop.deliveryFee,
    createdAt: '2026-11-10T13:20:00Z', deliverySlotStart: null, deliverySlotEnd: null, estimatedDeliveryAt: null, customerNotes: null, cancelReason: null,
    items: items.map((p, i) => ({ id: `oi-${i}`, productId: p.productId, name: p.name, variantName: null, imageUrl: null, quantity: 1, unitPrice: p.price, total: p.price, notes: null })),
    history: (['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as OrderStatus[]).map((s, i) => ({ status: s, note: null, changedAt: new Date(Date.parse('2026-11-10T13:20:00Z') + i * 9 * 60000).toISOString() })),
    address: state.addresses[0] ?? null,
    shop: { shopId: shop.shopId, slug: shop.slug, name: shop.name, logoUrl: null, phone: shop.phone, whatsapp: shop.whatsapp },
    riderName: 'Bilal', riderPhone: '03111234567', live: null, attachments: [], isActive: false, canCancel: false, canRate: true, canReorder: true, isRated: false,
  });
}

function buildCart(): Cart {
  const groups = new Map<string, CartGroup>();
  for (const l of state.lines) {
    const p = product(l.productId);
    if (!p) continue;
    const shop = shopById(p.shopId)!;
    const line = p.lines.find((x) => x.variantId === l.variantId) ?? p.lines[0]!;
    let grp = groups.get(shop.shopId);
    if (!grp) {
      grp = {
        shopId: shop.shopId,
        shop: {
          slug: shop.slug, publicName: shop.name, logoUrl: null, city: shop.city, estimatedDeliveryMinutes: shop.etaMinutes, estimatedPickupMinutes: shop.pickupMinutes,
          isOpen: shop.open, isPaused: false, offersDelivery: shop.offersDelivery, offersPickup: shop.offersPickup, offersDineIn: false, freeDeliveryAbove: shop.freeDeliveryAbove,
        },
        gate: shop.gate, flow: shop.flow, lines: [], subtotal: 0, deliveryFee: shop.deliveryFee, minOrderAmount: shop.minOrder, meetsMinOrder: true,
        hasProblems: false, needsPrescription: false, shopTotal: 0, itemCount: 0,
      };
      groups.set(shop.shopId, grp);
    }
    const chosen = p.modifierGroups.map((grp) => ({ grp, opts: grp.options.filter((o) => l.picks.find((x) => x.groupId === grp.id)?.optionIds.includes(o.id)) }));
    const addOns = chosen.reduce((s, c) => s + c.opts.reduce((a, o) => a + o.price, 0), 0);
    const unit = line.price + addOns;
    const problem: CartLine['problem'] = line.maxQty <= 0 ? 'OUT_OF_STOCK' : l.quantity > line.maxQty ? 'QTY' : null;
    grp.lines.push({
      id: l.id, productId: p.productId, variantId: l.variantId, productName: p.name, variantName: line.name, imageUrl: null,
      unitPrice: unit, savedPrice: l.savedPrice, priceChanged: l.savedPrice !== unit, compareAtPrice: line.compareAt, availability: line.availability,
      maxQty: line.maxQty, requiresPrescription: p.requiresPrescription, problem,
      problemText: problem === 'OUT_OF_STOCK' ? 'Ye item abhi stock me nahi hai' : problem === 'QTY' ? 'Itni quantity stock me nahi hai' : null,
      quantity: l.quantity, notes: l.notes, options: l.options, lineTotal: unit * l.quantity,
      modifiers: l.picks.length ? { picks: l.picks, summary: chosen.filter((c) => c.opts.length).map((c) => ({ group: c.grp.name, options: c.opts.map((o) => o.name) })) } : null,
    });
  }
  let subtotal = 0;
  let fees = 0;
  let items = 0;
  for (const grp of groups.values()) {
    grp.subtotal = grp.lines.reduce((s, l) => s + l.lineTotal, 0);
    grp.itemCount = grp.lines.reduce((s, l) => s + l.quantity, 0);
    if (grp.shop?.freeDeliveryAbove && grp.subtotal >= grp.shop.freeDeliveryAbove) grp.deliveryFee = 0;
    grp.meetsMinOrder = grp.subtotal >= grp.minOrderAmount;
    grp.hasProblems = grp.lines.some((l) => l.problem);
    grp.needsPrescription = !!grp.flow?.prescription && grp.lines.some((l) => l.requiresPrescription);
    grp.shopTotal = grp.subtotal + grp.deliveryFee;
    subtotal += grp.subtotal;
    fees += grp.deliveryFee;
    items += grp.itemCount;
  }
  const shopGroups = [...groups.values()];
  return { id: 'cart-demo', shopGroups, totalItems: items, subtotal, totalDeliveryFee: fees, grandTotal: subtotal + fees, hasProblems: shopGroups.some((x) => x.hasProblems) };
}

function preview(couponCode?: string, deliveryType = 'DELIVERY'): CheckoutPreview {
  const cart = buildCart();
  if (!cart.shopGroups.length) throw new MockError(400, 'Cart khali hai');
  const coupon = couponCode?.trim().toUpperCase();
  const couponOk = coupon === 'WELCOME10';
  const breakdown = cart.shopGroups.map((grp) => {
    const fee = deliveryType === 'DELIVERY' ? grp.deliveryFee : 0;
    const disc = couponOk ? Math.round(grp.subtotal * 0.1) : 0;
    const errors: string[] = [];
    if (!grp.meetsMinOrder) errors.push(`${grp.shop?.publicName}: minimum order Rs ${grp.minOrderAmount} hai`);
    if (grp.hasProblems) errors.push(`${grp.shop?.publicName}: kuch items available nahi`);
    return {
      shopId: grp.shopId, shop: grp.shop, gate: grp.gate, flow: grp.flow, itemCount: grp.itemCount, subtotal: grp.subtotal, deliveryFee: fee,
      couponDiscount: disc, minOrderAmount: grp.minOrderAmount, meetsMinOrder: grp.meetsMinOrder, needsPrescription: grp.needsPrescription,
      total: grp.subtotal + fee - disc, errors,
    };
  });
  const couponDiscount = breakdown.reduce((s, b) => s + b.couponDiscount, 0);
  const totalDeliveryFee = breakdown.reduce((s, b) => s + b.deliveryFee, 0);
  return {
    shopBreakdown: breakdown, subtotal: cart.subtotal, totalDeliveryFee, couponDiscount,
    couponError: coupon && !couponOk ? 'Ye coupon code sahi nahi ya expire ho chuka hai' : null,
    totalDiscount: couponDiscount, finalTotal: cart.subtotal + totalDeliveryFee - couponDiscount, paymentMethods: ['COD'],
    canPlaceOrder: breakdown.every((b) => !b.errors.length), warnings: [],
  };
}

function slotsFor(): Slot[] {
  const out: Slot[] = [];
  const now = new Date();
  for (let d = 0; d < 3; d++) {
    for (const h of [10, 12, 14, 16, 18, 20]) {
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() + d);
      start.setUTCHours(h - 5, 0, 0, 0);
      if (start.getTime() < now.getTime() + 45 * 60000) continue;
      const end = new Date(start.getTime() + 3600000);
      const fmt = (x: number) => `${x % 12 || 12}${x < 12 ? 'am' : 'pm'}`;
      out.push({ start: start.toISOString(), end: end.toISOString(), label: `${fmt(h)} - ${fmt(h + 1)}`, date: new Date(start.getTime() + 5 * 3600000).toISOString().slice(0, 10) });
    }
  }
  return out;
}

const customer: CustomerApi = {
  async sendOtp(phone) {
    if (!/^(\+92|0)?3\d{9}$/.test(phone.replace(/[\s-]/g, ''))) throw new MockError(400, 'Valid Pakistani mobile number chahiye (03XX-XXXXXXX)');
    return { devCode: '123456', expiresIn: 300 };
  },
  async verifyOtp(body) {
    if (body.code !== '123456') throw new MockError(400, 'Ghalat code');
    state.customer.phone = body.phone;
    if (body.fullName) state.customer.fullName = body.fullName;
    return { customer: state.customer, accessToken: 'mock-access', refreshToken: 'mock-refresh' };
  },
  async refresh(rt) {
    if (rt !== 'mock-refresh') throw new MockError(401, 'Session expired');
    return { customer: state.customer, accessToken: 'mock-access', refreshToken: 'mock-refresh' };
  },
  async logout() {},
  async me(t) { ok(t); return state.customer; },
  async updateMe(t, body) { ok(t); Object.assign(state.customer, body); return state.customer; },
  async deleteAccount(t) { ok(t); },
  async cart(t) { ok(t); return buildCart(); },
  async cartAdd(t, body) {
    ok(t);
    const p = product(body.productId);
    if (!p) throw new MockError(404, 'Ye item ab Market par nahi hai');
    if (p.lines.length > 1 && !body.variantId) throw new MockError(400, 'Size ya rang chunein');
    const line = p.lines.find((l) => l.variantId === (body.variantId ?? null)) ?? p.lines[0]!;
    if (line.maxQty <= 0) throw new MockError(409, 'Ye item abhi stock me nahi hai', 'OUT_OF_STOCK');
    const picks = (body.modifiers ?? []).filter((x) => x.optionIds.length);
    for (const grp of p.modifierGroups) {
      const n = picks.find((x) => x.groupId === grp.id)?.optionIds.length ?? 0;
      if (grp.required && n < Math.max(1, grp.min)) throw new MockError(400, `${grp.name} chunein`);
    }
    const addOns = p.modifierGroups.reduce((s, grp) => s + grp.options.filter((o) => picks.find((x) => x.groupId === grp.id)?.optionIds.includes(o.id)).reduce((a, o) => a + o.price, 0), 0);
    const same = !body.options && !body.notes && !picks.length && state.lines.find((l) => l.productId === p.productId && l.variantId === (body.variantId ?? null) && !l.options);
    if (same) {
      if (same.quantity + body.quantity > line.maxQty) throw new MockError(409, `Sirf ${line.maxQty} available hain`, 'OUT_OF_STOCK');
      same.quantity += body.quantity;
    } else {
      state.lines.push({ id: `l-${++state.seq}`, productId: p.productId, variantId: body.variantId ?? null, quantity: body.quantity, notes: body.notes ?? null, options: body.options ?? null, picks, savedPrice: line.price + addOns });
    }
    return buildCart();
  },
  async cartUpdate(t, id, body) {
    ok(t);
    const l = state.lines.find((x) => x.id === id);
    if (!l) throw new MockError(404, 'Cart me ye item nahi mila');
    if (body.quantity !== undefined) {
      const max = (product(l.productId)?.lines.find((x) => x.variantId === l.variantId) ?? product(l.productId)?.lines[0])?.maxQty ?? 0;
      if (body.quantity > l.quantity && body.quantity > max) throw new MockError(409, `Sirf ${max} available hain`, 'OUT_OF_STOCK');
      l.quantity = body.quantity;
    }
    if (body.options) l.options = body.options;
    if (body.notes !== undefined) l.notes = body.notes;
    return buildCart();
  },
  async cartRemove(t, id) { ok(t); state.lines = state.lines.filter((l) => l.id !== id); return buildCart(); },
  async preview(t, body) { ok(t); return preview(body.couponCode, body.deliveryType); },
  async placeOrder(t, body) {
    ok(t);
    const pv = preview(body.couponCode, body.deliveryType);
    if (!pv.canPlaceOrder) throw new MockError(400, pv.shopBreakdown.flatMap((b) => b.errors)[0] ?? 'Order nahi ho saka');
    if (body.deliveryType === 'DELIVERY' && !body.addressId) throw new MockError(400, 'Delivery ka address chunein');
    for (const b of pv.shopBreakdown) {
      if (b.needsPrescription && !body.attachments?.some((a) => a.kind === 'prescription' && (!a.shopId || a.shopId === b.shopId))) {
        throw new MockError(400, 'Is order me nuskha (prescription) ki photo lagayen');
      }
    }
    if (body.expectedTotal !== undefined && Math.abs(body.expectedTotal - pv.finalTotal) > 0.5) {
      throw new MockError(409, `Qeemat badal gayi hai. Naya total Rs ${pv.finalTotal} hai, dobara dekh lein.`, 'PRICE_CHANGED');
    }
    const cart = buildCart();
    const now = new Date().toISOString();
    const placed = cart.shopGroups.map((grp) => {
      const b = pv.shopBreakdown.find((x) => x.shopId === grp.shopId)!;
      const shop = shopById(grp.shopId)!;
      const id = `o-${++state.seq}`;
      const order: OrderDetail = {
        id, orderNumber: `NM${now.slice(2, 10).replace(/-/g, '')}${state.seq}`, status: 'PENDING', statusLabel: STATUS_LABEL.PENDING!, deliveryType: body.deliveryType,
        paymentMethod: body.paymentMethod, paymentStatus: 'PENDING', subtotal: b.subtotal, deliveryFee: b.deliveryFee, discount: b.couponDiscount, total: b.total,
        createdAt: now, deliverySlotStart: body.deliverySlotStart ?? null, deliverySlotEnd: body.deliverySlotEnd ?? null, estimatedDeliveryAt: null,
        customerNotes: body.customerNotes ?? null, cancelReason: null,
        items: grp.lines.map((l) => ({ id: l.id, productId: l.productId, name: l.productName, variantName: l.variantName, imageUrl: null, quantity: l.quantity, unitPrice: l.unitPrice, total: l.lineTotal, notes: l.notes })),
        history: [{ status: 'PENDING', note: null, changedAt: now }],
        address: state.addresses.find((a) => a.id === body.addressId) ?? null,
        shop: { shopId: shop.shopId, slug: shop.slug, name: shop.name, logoUrl: null, phone: shop.phone, whatsapp: shop.whatsapp },
        riderName: null, riderPhone: null, live: null, attachments: body.attachments?.filter((a) => !a.shopId || a.shopId === shop.shopId) ?? [],
        isActive: true, canCancel: true, canRate: false, canReorder: true, isRated: false,
      };
      state.orders.unshift(order);
      return { id, orderNumber: order.orderNumber, shopId: shop.shopId, total: order.total, status: order.status };
    });
    state.lines = [];
    return { orders: placed, grandTotal: pv.finalTotal };
  },
  async slots(t) { ok(t); return slotsFor(); },
  async orders(t, q) {
    ok(t);
    seedOrders();
    const list = state.orders.filter((o) => !q.active || o.isActive);
    return {
      items: list.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, status: o.status, deliveryType: o.deliveryType, total: o.total, createdAt: o.createdAt, isActive: o.isActive,
        canCancel: o.canCancel, shop: o.shop ? { slug: o.shop.slug, name: o.shop.name, logoUrl: null } : null,
        items: o.items.slice(0, 3).map((i) => ({ name: i.name, variantName: i.variantName, imageUrl: null, quantity: i.quantity })),
      })),
      total: list.length,
      hasMore: false,
    };
  },
  async order(t, id) {
    ok(t);
    seedOrders();
    const o = state.orders.find((x) => x.id === id);
    if (!o) throw new MockError(404, 'Order not found');
    return o;
  },
  async cancelOrder(t, id) {
    ok(t);
    const o = state.orders.find((x) => x.id === id);
    if (!o || !o.canCancel) throw new MockError(400, 'Ye order ab cancel nahi ho sakta. Dukaan se baat karein.');
    Object.assign(o, { status: 'CANCELLED', statusLabel: STATUS_LABEL.CANCELLED, canCancel: false, isActive: false });
    o.history.push({ status: 'CANCELLED', note: null, changedAt: new Date().toISOString() });
  },
  async reorder(t, id) {
    ok(t);
    const o = state.orders.find((x) => x.id === id);
    if (!o) throw new MockError(404, 'Order nahi mila');
    for (const i of o.items) await customer.cartAdd(t, { productId: i.productId, quantity: i.quantity }).catch(() => undefined);
    return { addedCount: o.items.length, skippedItems: [] };
  },
  async rateOrder(t, id) {
    ok(t);
    const o = state.orders.find((x) => x.id === id);
    if (o) Object.assign(o, { isRated: true, canRate: false });
  },
  async addresses(t) { ok(t); return state.addresses; },
  async addAddress(t, body) {
    ok(t);
    const a: Address = {
      id: `a-${++state.seq}`, addressLine2: null, landmark: null, deliveryNotes: null, lat: null, lng: null, ...body,
      isDefault: !state.addresses.length || !!body.isDefault,
    } as Address;
    if (a.isDefault) state.addresses.forEach((x) => (x.isDefault = false));
    state.addresses.push(a);
    return a;
  },
  async deleteAddress(t, id) { ok(t); state.addresses = state.addresses.filter((a) => a.id !== id); },
  async defaultAddress(t, id) { ok(t); state.addresses.forEach((a) => (a.isDefault = a.id === id)); },
  async wishlist(t) {
    ok(t);
    return [...state.wish].map(product).filter(Boolean).map((p) => ({
      productId: p!.productId, name: p!.name, price: p!.price, compareAt: p!.compareAt, image: null, available: p!.inStock,
      shop: p!.shop ? { slug: p!.shop.slug, name: p!.shop.name } : null,
    }));
  },
  async toggleWish(t, id) {
    ok(t);
    if (state.wish.has(id)) state.wish.delete(id);
    else state.wish.add(id);
    return state.wish.has(id);
  },
  async followed(t) {
    ok(t);
    return SHOPS.filter((s) => state.follows.has(s.shopId)).map((s) => ({ shopId: s.shopId, slug: s.slug, name: s.name, logoUrl: null, city: s.city, rating: s.rating }));
  },
  async follow(t, id, on) {
    ok(t);
    if (on) state.follows.add(id);
    else state.follows.delete(id);
    return on;
  },
  async notifications(t) {
    ok(t);
    return state.orders.slice(0, 5).map((o) => ({ id: `n-${o.id}`, title: o.shop?.name ?? 'Nafaa Market', body: o.statusLabel, actionUrl: `/orders/${o.id}`, isRead: !o.isActive, createdAt: o.createdAt }));
  },
  async readAllNotifications(t) { ok(t); },
  async presignUpload(t, body) {
    ok(t);
    // No storage in demo mode: the browser skips the upload when uploadUrl is empty.
    return { uploadUrl: '', publicUrl: `https://example.com/mock-uploads/${encodeURIComponent(body.fileName)}`, headers: {} };
  },
};

export const mockApi: MarketApi = {
  async config() {
    return { gates: GATES, payments: ['cod'], launchCities: ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'] };
  },
  async shops(q) {
    const limit = q.limit ?? 20;
    let list = SHOPS.filter((s) => !q.gate || s.gate === q.gate);
    if (q.filter) list = list.filter((s) => s.gateFilter === q.filter);
    if (q.onlyOpen) list = list.filter((s) => s.open);
    if (q.freeDelivery) list = list.filter((s) => s.deliveryFee === 0 || s.freeDeliveryAbove);
    if (q.q) {
      const t = q.q.toLowerCase();
      list = list.filter((s) => `${s.name} ${s.tagline} ${s.area}`.toLowerCase().includes(t));
    }
    if (q.sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (q.sort === 'distance') list = [...list].sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    else if (q.sort === 'delivery_time') list = [...list].sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999));
    else list = [...list].sort((a, b) => b.totalOrders - a.totalOrders);
    const start = ((q.page ?? 1) - 1) * limit;
    const items = list.slice(start, start + limit).map(summary);
    return { items, total: list.length, hasMore: start + limit < list.length };
  },
  async shop(slug) {
    const s = SHOPS.find((x) => x.slug === slug || x.shopId === slug);
    return s ? { ...s } : null;
  },
  async shopProducts(shopId, q) {
    let list = PRODUCTS.filter((p) => p.shopId === shopId);
    const categories = [...new Set(list.map((p) => p.category!))].map((name) => ({ name, count: list.filter((p) => p.category === name).length }));
    if (q.category) list = list.filter((p) => p.category === q.category);
    if (q.search) list = list.filter((p) => p.name.toLowerCase().includes(q.search!.toLowerCase()));
    return { items: list.map(({ lines: _l, brand: _b, ...p }) => p), total: list.length, hasMore: false, categories };
  },
  async shopReviews(shopId) {
    const s = shopById(shopId);
    return { items: s?.reviews ?? [], total: s?.reviews.length ?? 0, hasMore: false };
  },
  async discover(q) {
    const shops = SHOPS.filter((s) => !q.gate || s.gate === q.gate).map(summary);
    return {
      nearbyShops: [...shops].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)),
      featuredShops: shops.filter((s) => s.verification === 'GOLD'),
      trendingProducts: PRODUCTS.filter((p) => p.compareAt || p.ratingCount > 60).slice(0, 12).map(({ lines: _l, brand: _b, ...p }) => p),
    };
  },
  async products(q) {
    const limit = q.limit ?? 24;
    let list = PRODUCTS.filter((p) => !q.shopId || p.shopId === q.shopId);
    if (q.q) {
      const t = q.q.toLowerCase();
      list = list.filter((p) => `${p.name} ${p.category} ${p.shop?.name}`.toLowerCase().includes(t));
    }
    if (q.inStockOnly) list = list.filter((p) => p.inStock);
    if (q.onDiscount) list = list.filter((p) => p.compareAt);
    if (q.sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    if (q.sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    if (q.sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    const start = ((q.page ?? 1) - 1) * limit;
    return { items: list.slice(start, start + limit).map(({ lines: _l, brand: _b, ...p }) => p), total: list.length, hasMore: start + limit < list.length };
  },
  async product(id): Promise<ProductDetail | null> {
    const p = product(id);
    if (!p) return null;
    const shop = shopById(p.shopId)!;
    return {
      ...p,
      images: [],
      shop: { ...summary(shop), phone: shop.phone },
      related: PRODUCTS.filter((x) => x.shopId === p.shopId && x.productId !== id).slice(0, 8).map(({ lines: _l, brand: _b, ...x }) => x),
      reviews: shop.reviews,
    };
  },
  customer,
};

export type { PaymentMethod };
