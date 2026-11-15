/**
 * Shapes the pages work with. lib/api.ts turns API answers (Decimal strings,
 * nested profiles) into these; the mock data in lib/mock produces them
 * directly. Money is always a number in rupees.
 */

export type Lang = 'en' | 'ur' | 'roman';
export type L3 = { en: string; roman: string; ur: string };

export type Gate = 'FOOD' | 'GROCERY' | 'PHARMACY' | 'SHOPPING' | 'BOOKING' | 'WHOLESALE';
export type OrderMode = 'INSTANT' | 'SHIPPED' | 'BOOKING';
export type Availability = 'in_stock' | 'out_of_stock' | 'backorder';
export type Verification = 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Flow {
  modifiers?: boolean;
  substitutes?: boolean;
  deliverySlots?: boolean;
  prescription?: boolean;
  customCake?: boolean;
  booking?: boolean;
  sizeColour?: boolean;
  courier?: boolean;
  pickup?: boolean;
  dineIn?: boolean;
  giftMessage?: boolean;
  minOrderAmount: number;
}

export interface GateDef {
  id: Gate;
  /** URL segment, e.g. "food". */
  slug: string;
  label: L3;
  tagline: L3;
  mode: OrderMode;
  businessOnly: boolean;
  filters: Array<{ id: string; label: L3 }>;
}

export interface MarketConfig {
  gates: GateDef[];
  /** Enabled payment methods: 'cod' | 'jazzcash' | 'easypaisa' | 'card' | 'bankTransfer'. */
  payments: string[];
  launchCities: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export type WorkingHours = Record<string, { open?: string; close?: string; closed?: boolean }> | null;

export interface ShopSummary {
  shopId: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string;
  area: string | null;
  gate: Gate;
  gateFilter: string | null;
  flow: Flow;
  rating: number;
  ratingCount: number;
  totalOrders: number;
  open: boolean;
  paused: boolean;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  minOrder: number;
  etaMinutes: number | null;
  distanceKm: number | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  verification: Verification;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  imageUrls: string[];
  verified: boolean;
  reply: string | null;
  createdAt: string;
  customerName: string | null;
}

export interface ShopDetail extends ShopSummary {
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  gallery: string[];
  workingHours: WorkingHours;
  holidayDates: string[];
  followers: number;
  productCount: number;
  pickupMinutes: number | null;
  offersDineIn: boolean;
  reviews: Review[];
}

export interface ProductSummary {
  productId: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  priceMax: number;
  compareAt: number | null;
  image: string | null;
  category: string | null;
  rating: number;
  ratingCount: number;
  availability: Availability;
  inStock: boolean;
  maxQty: number;
  requiresPrescription: boolean;
  shop?: { slug: string; name: string; logoUrl: string | null; city: string } | null;
}

export interface ProductLine {
  variantId: string | null;
  name: string | null;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  price: number;
  compareAt: number | null;
  availability: Availability;
  maxQty: number;
  image: string | null;
}

/** Restaurant add-ons from the POS modifier groups. max 1 = pick one (radio). */
export interface ModifierGroup {
  id: string;
  name: string;
  type: string;
  required: boolean;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; price: number; isDefault: boolean; emoji: string | null }>;
}

export type ModifierPick = { groupId: string; optionIds: string[] };

export interface ProductDetail extends ProductSummary {
  modifierGroups: ModifierGroup[];
  images: string[];
  brand: string | null;
  lines: ProductLine[];
  shop: ShopSummary & { phone?: string | null };
  related: ProductSummary[];
  reviews: Review[];
}

export interface ShopProducts extends Page<ProductSummary> {
  categories: Array<{ name: string; count: number }>;
}

export interface DiscoverData {
  nearbyShops: ShopSummary[];
  featuredShops: ShopSummary[];
  trendingProducts: ProductSummary[];
}

// ─── Customer (signed in) ──────────────────────────────────────────────────

export type LineProblem = 'NOT_LISTED' | 'HIDDEN' | 'VARIANT_REQUIRED' | 'OUT_OF_STOCK' | 'QTY' | 'OPTIONS';

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPrice: number;
  savedPrice: number;
  priceChanged: boolean;
  compareAtPrice: number | null;
  availability: Availability;
  maxQty: number;
  requiresPrescription: boolean;
  problem: LineProblem | null;
  problemText: string | null;
  quantity: number;
  notes: string | null;
  options: Record<string, unknown> | null;
  /** Chosen add-ons; summary is what the customer sees under the item. */
  modifiers: { picks: ModifierPick[]; summary: Array<{ group: string; options: string[] }> } | null;
  lineTotal: number;
}

export interface CartGroup {
  shopId: string;
  shop: {
    slug: string;
    publicName: string;
    logoUrl: string | null;
    city: string;
    estimatedDeliveryMinutes: number | null;
    estimatedPickupMinutes: number | null;
    isOpen: boolean;
    isPaused: boolean;
    offersDelivery: boolean;
    offersPickup: boolean;
    offersDineIn: boolean;
    freeDeliveryAbove: number | null;
  } | null;
  gate: Gate | null;
  flow: Flow | null;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  minOrderAmount: number;
  meetsMinOrder: boolean;
  hasProblems: boolean;
  needsPrescription: boolean;
  shopTotal: number;
  itemCount: number;
}

export interface Cart {
  id: string;
  shopGroups: CartGroup[];
  totalItems: number;
  subtotal: number;
  totalDeliveryFee: number;
  grandTotal: number;
  hasProblems: boolean;
}

export type DeliveryType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';
export type PaymentMethod = 'COD' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'WALLET';

export interface CheckoutPreview {
  shopBreakdown: Array<{
    shopId: string;
    shop: CartGroup['shop'];
    gate: Gate | null;
    flow: Flow | null;
    itemCount: number;
    subtotal: number;
    deliveryFee: number;
    couponDiscount: number;
    minOrderAmount: number;
    meetsMinOrder: boolean;
    needsPrescription: boolean;
    total: number;
    errors: string[];
  }>;
  subtotal: number;
  totalDeliveryFee: number;
  couponDiscount: number;
  couponError: string | null;
  totalDiscount: number;
  finalTotal: number;
  paymentMethods: PaymentMethod[];
  canPlaceOrder: boolean;
  warnings: string[];
}

export interface PlaceOrderBody {
  addressId?: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  customerNotes?: string;
  deliverySlotStart?: string;
  deliverySlotEnd?: string;
  attachments?: Array<{ kind: 'prescription'; url: string; shopId?: string }>;
  expectedTotal?: number;
}

export interface PlacedOrders {
  orders: Array<{ id: string; orderNumber: string; shopId: string; total: number; status: OrderStatus }>;
  grandTotal: number;
}

export interface Slot {
  start: string;
  end: string;
  label: string;
  date: string;
}

export type OrderStatus =
  | 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY'
  | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'RETURNED';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryType: string;
  total: number;
  createdAt: string;
  isActive: boolean;
  canCancel: boolean;
  shop: { slug: string; name: string; logoUrl: string | null } | null;
  items: Array<{ name: string; variantName: string | null; imageUrl: string | null; quantity: number }>;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  area: string;
  lat: number | null;
  lng: number | null;
  addressType: string;
  isDefault: boolean;
  deliveryNotes: string | null;
}

export type AddressInput = Omit<Address, 'id' | 'isDefault' | 'addressLine2' | 'landmark' | 'deliveryNotes' | 'lat' | 'lng'> & {
  addressLine2?: string;
  landmark?: string;
  deliveryNotes?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
};

export interface LiveInfo {
  orderStatus: string;
  rider: { name: string | null; phone: string | null } | null;
  courier: { name: string | null; trackingNumber: string | null; trackUrl: string | null; status: string | null } | null;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  deliveryType: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: string;
  deliverySlotStart: string | null;
  deliverySlotEnd: string | null;
  estimatedDeliveryAt: string | null;
  customerNotes: string | null;
  cancelReason: string | null;
  items: Array<{ id: string; productId: string; name: string; variantName: string | null; imageUrl: string | null; quantity: number; unitPrice: number; total: number; notes: string | null }>;
  history: Array<{ status: OrderStatus; note: string | null; changedAt: string }>;
  address: Address | null;
  shop: { shopId: string; slug: string; name: string; logoUrl: string | null; phone: string | null; whatsapp: string | null } | null;
  riderName: string | null;
  riderPhone: string | null;
  live: LiveInfo | null;
  attachments: Array<{ kind: string; url: string }>;
  isActive: boolean;
  canCancel: boolean;
  canRate: boolean;
  canReorder: boolean;
  isRated: boolean;
}

export interface Customer {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  language: string | null;
}

export interface WishItem {
  productId: string;
  name: string;
  price: number;
  compareAt: number | null;
  image: string | null;
  available: boolean;
  shop: { slug: string; name: string } | null;
}

export interface FollowedShop {
  shopId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
  rating: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuthResult {
  customer: Customer;
  accessToken: string;
  refreshToken: string;
}

export interface OtpSent {
  devCode?: string;
  expiresIn: number;
}

export interface Upload {
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}
