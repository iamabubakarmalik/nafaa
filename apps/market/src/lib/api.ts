/**
 * Typed client for the Nafaa Market customer API (apps/api, base
 * `${NAFAA_API_URL}/marketplace`). The only file that knows endpoint paths and
 * response shapes; everything returned is normalised into lib/types.ts.
 *
 * - Server side only (NAFAA_API_URL is not public). The browser talks to
 *   /api/m/<action> route handlers (lib/bridge.ts), which call this client
 *   with the customer's token from the httpOnly cookie.
 * - Public reads are cached by Next with tags (`market:config`,
 *   `market:shop:<slug>`, ...) and a short revalidate window.
 * - The API wraps JSON as { success, data }; errors as { message, code? }.
 * - Decimal columns arrive as strings ("150.00") on public routes and as
 *   decimal.js objects ({ s, e, d }) on signed-in routes; num() reads both.
 * - MARKET_MOCK=1 serves src/lib/mock instead, so every page runs without an API.
 */
import { mockApi } from './mock';
import type {
  Address, AddressInput, AuthResult, Availability, Cart, CheckoutPreview, Customer, DeliveryType, DiscoverData, FollowedShop,
  Flow, Gate, GateDef, L3, MarketConfig, ModifierGroup, ModifierPick, NotificationItem, OrderDetail, OrderStatus, OrderSummary, OtpSent, Page,
  PlacedOrders, PlaceOrderBody, ProductDetail, ProductLine, ProductSummary, Review, ShopDetail, ShopProducts, ShopSummary,
  Slot, Upload, WishItem,
} from './types';

const API = (process.env.NAFAA_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
export const MOCK = process.env.MARKET_MOCK === '1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

// ─── Transport ─────────────────────────────────────────────────────────────

type Query = Record<string, string | number | boolean | undefined | null>;

interface CallOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  token?: string;
  /** Cache public reads: seconds plus tags. Omitted = no cache. */
  cache?: { revalidate: number; tags: string[] };
}

function qs(query?: Query): string {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    // The API turns any boolean query value into true, so false is left out.
    if (v === undefined || v === null || v === '' || v === false) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function call<T>(path: string, opts: CallOpts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let res: Response;
  try {
    res = await fetch(`${API}/marketplace/${path}${qs(opts.query)}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      ...(opts.cache ? { next: opts.cache } : { cache: 'no-store' as const }),
    });
  } catch {
    throw new ApiError(503, 'network');
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const msg = json?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? String(msg[0]) : typeof msg === 'string' ? msg : 'error', typeof json?.code === 'string' ? json.code : undefined);
  }
  return (json && 'data' in json ? json.data : json) as T;
}

// ─── Normalisers ───────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** Number from a JSON number, a Decimal string or a serialised decimal.js object. */
export function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  if (v && typeof v === 'object' && Array.isArray((v as Raw).d)) {
    const { s, e, d } = v as { s: number; e: number; d: number[] };
    const digits = d.map((n, i) => (i === 0 ? String(n) : String(n).padStart(7, '0'))).join('');
    return (s < 0 ? -1 : 1) * Number(`0.${digits}`) * 10 ** (e + 1);
  }
  return 0;
}
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : num(v));
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

function flowOf(raw: Raw): Flow {
  return { ...(raw ?? {}), minOrderAmount: num(raw?.minOrderAmount) };
}

function shopSummary(r: Raw): ShopSummary {
  const flow = flowOf(r.flow);
  return {
    shopId: r.shopId ?? r.id,
    slug: r.slug,
    name: r.publicName ?? '',
    tagline: str(r.tagline),
    logoUrl: str(r.logoUrl),
    coverUrl: str(r.coverUrl),
    city: r.city ?? '',
    area: str(r.area),
    gate: (r.gate ?? 'SHOPPING') as Gate,
    gateFilter: r.gateFilter ?? null,
    flow,
    rating: num(r.ratingAverage),
    ratingCount: num(r.ratingCount),
    totalOrders: num(r.totalOrders),
    open: r.currentlyOpen ?? r.isOpen ?? false,
    paused: !!r.isPaused,
    deliveryFee: num(r.deliveryFee),
    freeDeliveryAbove: numOrNull(r.freeDeliveryAbove),
    minOrder: Math.max(num(r.minOrderAmount), flow.minOrderAmount),
    etaMinutes: numOrNull(r.estimatedDeliveryMinutes),
    distanceKm: numOrNull(r.distanceKm),
    offersDelivery: r.offersDelivery ?? true,
    offersPickup: r.offersPickup ?? !!flow.pickup,
    verification: r.verificationLevel ?? 'UNVERIFIED',
  };
}

function review(r: Raw): Review {
  return {
    id: r.id,
    rating: num(r.rating),
    title: str(r.title),
    comment: str(r.comment),
    imageUrls: r.imageUrls ?? [],
    verified: !!r.isVerifiedPurchase,
    reply: str(r.replyFromShop),
    createdAt: r.createdAt,
    customerName: r.customer?.fullName ?? null,
  };
}

function shopDetail(r: Raw): ShopDetail {
  return {
    ...shopSummary(r),
    description: str(r.description),
    phone: str(r.publicPhone),
    whatsapp: str(r.whatsappNumber),
    address: [r.addressLine1, r.addressLine2, r.area, r.city].filter(Boolean).join(', ') || null,
    lat: numOrNull(r.lat),
    lng: numOrNull(r.lng),
    gallery: r.galleryUrls ?? [],
    workingHours: r.workingHours ?? null,
    holidayDates: r.holidayDates ?? [],
    followers: num(r.followerCount),
    productCount: num(r.productCount),
    pickupMinutes: numOrNull(r.estimatedPickupMinutes),
    offersDineIn: !!r.offersDineIn,
    reviews: (r.recentReviews ?? []).map(review),
  };
}

function productSummary(r: Raw): ProductSummary {
  const mp = r.shop?.marketplaceProfile;
  return {
    productId: r.productId,
    shopId: r.shopId ?? mp?.shopId ?? '',
    name: r.publicName ?? '',
    description: str(r.publicDescription),
    price: r.price !== undefined ? num(r.price) : num(r.publicPrice),
    priceMax: r.priceMax !== undefined ? num(r.priceMax) : num(r.publicPrice),
    compareAt: numOrNull(r.compareAtPrice),
    image: str(r.publicImages?.[0]),
    category: str(r.marketplaceCategory),
    rating: num(r.ratingAverage),
    ratingCount: num(r.ratingCount),
    availability: (r.availability ?? (r.isAvailable === false ? 'out_of_stock' : 'in_stock')) as Availability,
    inStock: r.inStock ?? r.isAvailable !== false,
    maxQty: r.maxQty !== undefined ? num(r.maxQty) : 99,
    requiresPrescription: !!r.requiresPrescription,
    shop: mp ? { slug: mp.slug, name: mp.publicName, logoUrl: str(mp.logoUrl), city: mp.city } : null,
  };
}

function productDetail(r: Raw): ProductDetail {
  const variants: Raw[] = r.product?.variants ?? [];
  const lines: ProductLine[] = (r.lines ?? []).map((l: Raw) => {
    const v = variants.find((x) => x.id === l.variantId);
    return {
      variantId: l.variantId ?? null,
      name: l.variantName ?? v?.name ?? null,
      size: v?.size ?? null,
      color: v?.color ?? null,
      colorHex: v?.colorHex ?? null,
      price: num(l.price),
      compareAt: numOrNull(l.compareAtPrice),
      availability: l.availability,
      maxQty: num(l.maxQty),
      image: str(l.image ?? v?.imageUrl),
    };
  });
  const images: string[] = [...(r.publicImages ?? []), ...((r.product?.images ?? []) as Raw[]).map((i) => i.url)].filter(
    (u, i, a) => typeof u === 'string' && a.indexOf(u) === i,
  );
  const mp = r.shop?.marketplaceProfile ?? {};
  const shop = shopSummary(mp);
  const modifierGroups: ModifierGroup[] = (r.modifierGroups ?? []).map((g: Raw) => ({
    id: String(g.id),
    name: g.name ?? '',
    type: g.type ?? '',
    required: !!g.required,
    min: num(g.min),
    max: num(g.max) || 1,
    options: (g.options ?? []).map((o: Raw) => ({ id: String(o.id), name: o.name ?? '', price: num(o.price), isDefault: !!o.isDefault, emoji: str(o.emoji) })),
  }));
  return {
    ...productSummary(r),
    modifierGroups,
    shopId: mp.shopId ?? r.shopId,
    image: images[0] ?? null,
    images,
    brand: r.product?.brand?.name ?? null,
    lines,
    shop,
    related: (r.related ?? []).map((x: Raw) => productSummary({ ...x, shopId: mp.shopId })),
    reviews: (r.reviews ?? []).map(review),
  };
}

function page<T>(r: Raw, map: (x: Raw) => T, limit: number): Page<T> {
  const items = (r?.items ?? []).map(map);
  // The API's total is capped for some lists, so "more" is judged by a full page.
  return { items, total: num(r?.total), hasMore: items.length >= limit };
}

function address(r: Raw): Address {
  return {
    id: r.id, label: r.label, fullName: r.fullName, phone: r.phone, addressLine1: r.addressLine1,
    addressLine2: r.addressLine2 ?? null, landmark: r.landmark ?? null, city: r.city, area: r.area,
    lat: numOrNull(r.lat), lng: numOrNull(r.lng), addressType: r.addressType ?? 'HOME', isDefault: !!r.isDefault,
    deliveryNotes: r.deliveryNotes ?? null,
  };
}

function orderSummary(r: Raw): OrderSummary {
  const mp = r.shop?.marketplaceProfile;
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    status: r.status as OrderStatus,
    deliveryType: r.deliveryType,
    total: num(r.total),
    createdAt: r.createdAt,
    isActive: !!r.isActive,
    canCancel: !!r.canCancel,
    shop: mp ? { slug: mp.slug, name: mp.publicName, logoUrl: str(mp.logoUrl) } : null,
    items: (r.items ?? []).map((i: Raw) => ({ name: i.productName, variantName: i.variantName ?? null, imageUrl: str(i.imageUrl), quantity: num(i.quantity) })),
  };
}

function orderDetail(r: Raw): OrderDetail {
  const mp = r.shop?.marketplaceProfile;
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    status: r.status,
    statusLabel: r.statusLabel ?? r.status,
    deliveryType: r.deliveryType,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    subtotal: num(r.subtotal),
    deliveryFee: num(r.deliveryFee),
    discount: num(r.discount) + num(r.couponDiscount),
    total: num(r.total),
    createdAt: r.createdAt,
    deliverySlotStart: r.deliverySlotStart ?? null,
    deliverySlotEnd: r.deliverySlotEnd ?? null,
    estimatedDeliveryAt: r.estimatedDeliveryAt ?? null,
    customerNotes: r.customerNotes ?? null,
    cancelReason: r.cancelReason ?? null,
    items: (r.items ?? []).map((i: Raw) => ({
      id: i.id, productId: i.productId, name: i.productName, variantName: i.variantName ?? null, imageUrl: str(i.imageUrl),
      quantity: num(i.quantity), unitPrice: num(i.unitPrice), total: num(i.total), notes: i.notes ?? null,
    })),
    history: (r.statusHistory ?? []).map((h: Raw) => ({ status: h.status, note: h.note ?? null, changedAt: h.changedAt })),
    address: r.address ? address(r.address) : r.addressSnapshot ? address(r.addressSnapshot) : null,
    shop: mp
      ? { shopId: mp.shopId, slug: mp.slug, name: mp.publicName, logoUrl: str(mp.logoUrl), phone: str(mp.publicPhone), whatsapp: str(mp.whatsappNumber) }
      : null,
    riderName: r.riderName ?? null,
    riderPhone: r.riderPhone ?? null,
    live: r.live
      ? {
          orderStatus: r.live.orderStatus,
          rider: r.live.rider ?? null,
          courier: r.live.courier
            ? { name: r.live.courier.name, trackingNumber: r.live.courier.trackingNumber, trackUrl: r.live.courier.trackUrl, status: r.live.courier.status }
            : null,
        }
      : null,
    attachments: r.attachments ?? [],
    isActive: !!r.isActive,
    canCancel: !!r.canCancel,
    canRate: !!r.canRate,
    canReorder: !!r.canReorder,
    isRated: !!r.isRated,
  };
}

function customer(r: Raw): Customer {
  return {
    id: r.id, fullName: r.fullName ?? r.displayName ?? null, phone: r.phone ?? null, email: r.email ?? null,
    avatarUrl: r.avatarUrl ?? null, language: r.language ?? null,
  };
}

function authResult(r: Raw): AuthResult {
  return { customer: customer(r.customer), accessToken: r.tokens.accessToken, refreshToken: r.tokens.refreshToken };
}

// ─── Public reads ──────────────────────────────────────────────────────────

const MIN = 60;

export interface ShopQuery {
  gate?: Gate;
  city?: string;
  lat?: number;
  lng?: number;
  q?: string;
  filter?: string;
  onlyOpen?: boolean;
  freeDelivery?: boolean;
  sort?: 'distance' | 'rating' | 'popular' | 'newest' | 'delivery_time';
  page?: number;
  limit?: number;
}

export interface ProductQuery {
  q?: string;
  shopId?: string;
  category?: string;
  inStockOnly?: boolean;
  onDiscount?: boolean;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestsellers';
  page?: number;
  limit?: number;
}

export interface MarketApi {
  config(): Promise<MarketConfig>;
  shops(q: ShopQuery): Promise<Page<ShopSummary>>;
  shop(slug: string): Promise<ShopDetail | null>;
  shopProducts(shopId: string, q: { category?: string; search?: string; page?: number; limit?: number }): Promise<ShopProducts>;
  shopReviews(shopId: string, page?: number): Promise<Page<Review>>;
  discover(q: { gate?: Gate; city?: string; lat?: number; lng?: number }): Promise<DiscoverData>;
  products(q: ProductQuery): Promise<Page<ProductSummary>>;
  product(id: string): Promise<ProductDetail | null>;
  customer: CustomerApi;
}

export interface CustomerApi {
  sendOtp(phone: string, purpose: 'LOGIN' | 'REGISTER'): Promise<OtpSent>;
  verifyOtp(body: { phone: string; code: string; purpose: 'LOGIN' | 'REGISTER'; fullName?: string }): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  logout(token: string, refreshToken: string): Promise<void>;
  me(token: string): Promise<Customer>;
  updateMe(token: string, body: { fullName?: string; email?: string; language?: string }): Promise<Customer>;
  deleteAccount(token: string, reason?: string): Promise<void>;
  cart(token: string): Promise<Cart>;
  cartAdd(token: string, body: { productId: string; variantId?: string; quantity: number; notes?: string; options?: Record<string, unknown>; modifiers?: ModifierPick[] }): Promise<Cart>;
  cartUpdate(token: string, lineId: string, body: { quantity?: number; notes?: string; options?: Record<string, unknown>; modifiers?: ModifierPick[] }): Promise<Cart>;
  cartRemove(token: string, lineId: string): Promise<Cart>;
  preview(token: string, body: { addressId?: string; deliveryType?: DeliveryType; couponCode?: string }): Promise<CheckoutPreview>;
  placeOrder(token: string, body: PlaceOrderBody): Promise<PlacedOrders>;
  slots(token: string, shopId: string): Promise<Slot[]>;
  orders(token: string, q: { page?: number; active?: boolean }): Promise<Page<OrderSummary>>;
  order(token: string, id: string): Promise<OrderDetail>;
  cancelOrder(token: string, id: string, reason?: string): Promise<void>;
  reorder(token: string, id: string): Promise<{ addedCount: number; skippedItems: string[] }>;
  rateOrder(token: string, id: string, body: { shopRating: number; riderRating?: number; comment?: string }): Promise<void>;
  addresses(token: string): Promise<Address[]>;
  addAddress(token: string, body: AddressInput): Promise<Address>;
  deleteAddress(token: string, id: string): Promise<void>;
  defaultAddress(token: string, id: string): Promise<void>;
  wishlist(token: string): Promise<WishItem[]>;
  toggleWish(token: string, productId: string): Promise<boolean>;
  followed(token: string): Promise<FollowedShop[]>;
  follow(token: string, shopId: string, on: boolean): Promise<boolean>;
  notifications(token: string): Promise<NotificationItem[]>;
  readAllNotifications(token: string): Promise<void>;
  presignUpload(token: string, body: { fileName: string; contentType: string; fileSize: number }): Promise<Upload>;
}

const ACTIVE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];

const liveCustomer: CustomerApi = {
  async sendOtp(phone, purpose) {
    const r = await call<Raw>('auth/otp/send', { method: 'POST', body: { phone, purpose } });
    return { devCode: r.devCode, expiresIn: num(r.expiresIn) || 300 };
  },
  async verifyOtp(body) {
    return authResult(await call<Raw>('auth/otp/verify', { method: 'POST', body }));
  },
  async refresh(refreshToken) {
    return authResult(await call<Raw>('auth/refresh', { method: 'POST', body: { refreshToken } }));
  },
  async logout(token, refreshToken) {
    await call('auth/logout', { method: 'POST', token, body: { refreshToken } });
  },
  async me(token) {
    return customer(await call<Raw>('auth/me', { token }));
  },
  async updateMe(token, body) {
    return customer(await call<Raw>('auth/me', { method: 'PATCH', token, body }));
  },
  async deleteAccount(token, reason) {
    await call('auth/me', { method: 'DELETE', token, body: { reason } });
  },
  cart: (token) => call<Cart>('cart', { token }),
  cartAdd: (token, body) => call<Cart>('cart/add', { method: 'POST', token, body }),
  cartUpdate: (token, lineId, body) => call<Cart>(`cart/lines/${encodeURIComponent(lineId)}`, { method: 'PATCH', token, body }),
  cartRemove: (token, lineId) => call<Cart>(`cart/lines/${encodeURIComponent(lineId)}`, { method: 'DELETE', token }),
  preview: (token, body) => call<CheckoutPreview>('checkout/preview', { method: 'POST', token, body }),
  async placeOrder(token, body) {
    const r = await call<Raw>('checkout/place-order', { method: 'POST', token, body });
    return { orders: r.orders.map((o: Raw) => ({ ...o, total: num(o.total) })), grandTotal: num(r.grandTotal) };
  },
  async slots(token, shopId) {
    return (await call<{ slots: Slot[] }>('checkout/delivery-slots', { token, query: { shopId } })).slots ?? [];
  },
  async orders(token, q) {
    const limit = 20;
    const p = new URLSearchParams({ limit: String(limit), offset: String(((q.page ?? 1) - 1) * limit) });
    // status is an array on the API: repeat the key.
    if (q.active) for (const s of ACTIVE) p.append('status', s);
    return page(await call<Raw>(`orders?${p}`, { token }), orderSummary, limit);
  },
  async order(token, id) {
    return orderDetail(await call<Raw>(`orders/${encodeURIComponent(id)}`, { token }));
  },
  async cancelOrder(token, id, reason) {
    await call(`orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', token, body: reason ? { reason } : {} });
  },
  async reorder(token, id) {
    const r = await call<Raw>(`orders/${encodeURIComponent(id)}/reorder`, { method: 'POST', token });
    return { addedCount: num(r.addedCount), skippedItems: r.skippedItems ?? [] };
  },
  async rateOrder(token, id, body) {
    await call(`orders/${encodeURIComponent(id)}/rate`, { method: 'POST', token, body });
  },
  async addresses(token) {
    return ((await call<Raw[]>('profile/addresses', { token })) ?? []).map(address);
  },
  async addAddress(token, body) {
    return address(await call<Raw>('profile/addresses', { method: 'POST', token, body }));
  },
  async deleteAddress(token, id) {
    await call(`profile/addresses/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },
  async defaultAddress(token, id) {
    await call(`profile/addresses/${encodeURIComponent(id)}/default`, { method: 'POST', token });
  },
  async wishlist(token) {
    const r = await call<Raw>('wishlist', { token, query: { limit: 100 } });
    return (r.items ?? []).map((w: Raw) => ({
      productId: w.product.productId,
      name: w.product.publicName,
      price: num(w.product.publicPrice),
      compareAt: numOrNull(w.product.compareAtPrice),
      image: str(w.product.publicImages?.[0]),
      available: !!w.product.isAvailable && !!w.product.isListedOnMarketplace,
      shop: w.product.shop?.marketplaceProfile ? { slug: w.product.shop.marketplaceProfile.slug, name: w.product.shop.marketplaceProfile.publicName } : null,
    }));
  },
  async toggleWish(token, productId) {
    return !!(await call<Raw>(`wishlist/${encodeURIComponent(productId)}/toggle`, { method: 'POST', token })).isInWishlist;
  },
  async followed(token) {
    const r = await call<Raw>('shops/followed/list', { token, query: { limit: '100' } });
    return (r.items ?? []).map((s: Raw) => ({ shopId: s.shopId, slug: s.slug, name: s.publicName, logoUrl: str(s.logoUrl), city: s.city, rating: num(s.ratingAverage) }));
  },
  async follow(token, shopId, on) {
    const r = await call<Raw>(`shops/${encodeURIComponent(shopId)}/follow`, { method: on ? 'POST' : 'DELETE', token });
    return !!r.isFollowing;
  },
  async notifications(token) {
    const r = await call<Raw>('notifications', { token, query: { limit: 50 } });
    return (r.items ?? []).map((n: Raw) => ({ id: n.id, title: n.title, body: n.body, actionUrl: n.actionUrl ?? null, isRead: !!n.isRead, createdAt: n.createdAt }));
  },
  async readAllNotifications(token) {
    await call('notifications/mark-all-read', { method: 'POST', token, body: {} });
  },
  async presignUpload(token, body) {
    // Prescription photos; the storage route sits next to the marketplace routes: /api/marketplace/storage.
    const r = await call<Raw>('storage/presigned-upload', { method: 'POST', token, body: { ...body, folder: 'prescription' } });
    return { uploadUrl: r.uploadUrl, publicUrl: r.publicUrl, headers: r.headers ?? { 'Content-Type': body.contentType } };
  },
};

const live: MarketApi = {
  async config() {
    const r = await call<Raw>('config', { cache: { revalidate: 5 * MIN, tags: ['market:config'] } });
    const gates: GateDef[] = (r.gates ?? []).map((g: Raw) => ({
      id: g.id, slug: String(g.id).toLowerCase(), label: g.label as L3, tagline: g.tagline as L3, mode: g.mode,
      businessOnly: !!g.businessOnly, filters: g.filters ?? [],
    }));
    return { gates, payments: r.payments ?? ['cod'], launchCities: r.launchCities ?? [] };
  },
  async shops(q) {
    const limit = q.limit ?? 20;
    const r = await call<Raw>('shops', {
      query: {
        gate: q.gate, filter: q.filter, city: q.lat ? undefined : q.city, lat: q.lat, lng: q.lng, search: q.q, onlyOpen: q.onlyOpen,
        freeDelivery: q.freeDelivery, sortBy: q.sort ?? (q.lat ? 'distance' : 'popular'), limit, offset: ((q.page ?? 1) - 1) * limit,
      },
      cache: { revalidate: MIN, tags: ['market:shops'] },
    });
    // The API applies the sub-filter (shop type or sub-category) before paging.
    return page(r, shopSummary, limit);
  },
  async shop(slug) {
    try {
      return shopDetail(await call<Raw>(`shops/by-slug/${encodeURIComponent(slug)}`, { cache: { revalidate: MIN, tags: ['market:shops', `market:shop:${slug}`] } }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  async shopProducts(shopId, q) {
    const limit = q.limit ?? 60;
    const r = await call<Raw>(`shops/${encodeURIComponent(shopId)}/products`, {
      query: { category: q.category, search: q.search, limit, offset: ((q.page ?? 1) - 1) * limit },
      cache: { revalidate: MIN, tags: [`market:products:${shopId}`] },
    });
    return {
      ...page(r, (x) => productSummary({ ...x, shopId }), limit),
      categories: (r.facets?.categories ?? []).filter((c: Raw) => c.name).map((c: Raw) => ({ name: c.name, count: num(c.count) })),
    };
  },
  async shopReviews(shopId, p = 1) {
    const r = await call<Raw>(`shops/${encodeURIComponent(shopId)}/reviews`, {
      query: { limit: 20, offset: (p - 1) * 20 },
      cache: { revalidate: 5 * MIN, tags: [`market:reviews:${shopId}`] },
    });
    return page(r, review, 20);
  },
  async discover(q) {
    const r = await call<Raw>('home/discover', {
      query: { gate: q.gate, city: q.lat ? undefined : q.city, lat: q.lat, lng: q.lng },
      cache: { revalidate: MIN, tags: ['market:home'] },
    });
    return {
      nearbyShops: (r.nearbyShops ?? []).map(shopSummary),
      featuredShops: (r.featuredShops ?? []).map(shopSummary),
      trendingProducts: (r.trendingProducts ?? []).map(productSummary),
    };
  },
  async products(q) {
    const limit = q.limit ?? 24;
    const r = await call<Raw>('products', {
      query: {
        q: q.q, shopId: q.shopId, category: q.category, inStockOnly: q.inStockOnly, onDiscount: q.onDiscount,
        sortBy: q.sort, limit, offset: ((q.page ?? 1) - 1) * limit,
      },
      cache: { revalidate: MIN, tags: ['market:search'] },
    });
    return page(r, productSummary, limit);
  },
  async product(id) {
    try {
      return productDetail(await call<Raw>(`products/${encodeURIComponent(id)}`, { cache: { revalidate: MIN, tags: [`market:product:${id}`] } }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  customer: liveCustomer,
};

export const api: MarketApi = MOCK ? mockApi : live;
