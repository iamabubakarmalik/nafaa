/**
 * Source text for every online store label (same keys as the web, so the
 * web translations are reused). Data stays raw; screens call t(LABEL) at
 * render.
 */

import { msg } from '@/core/i18n';
import type {
  AdvanceMethod, CostKind, CostSource, CourierState, DeliveryMode, OnlineOrderStatus, OrderTab, RiskLevel, StatementField,
} from '@nafaa/core/online-store';
import type { AdPlatform, BreakdownKey, ChannelKind } from '../api/growth';

export const STATUS_LABEL: Record<OnlineOrderStatus, { label: string; short: string }> = {
  PENDING: { label: msg('Naya order'), short: msg('Naya') },
  ACCEPTING: { label: msg('Bill ban raha'), short: msg('Ruko…') },
  CONFIRMED: { label: msg('Accept ho gaya'), short: msg('Accept') },
  PREPARING: { label: msg('Tayyar ho raha'), short: msg('Packing') },
  READY: { label: msg('Pack ho gaya'), short: msg('Ready') },
  OUT_FOR_DELIVERY: { label: msg('Raste me hai'), short: msg('Raste me') },
  DELIVERED: { label: msg('Deliver ho gaya'), short: msg('Delivered') },
  CANCELLED: { label: msg('Cancel'), short: msg('Cancel') },
  REJECTED: { label: msg('Reject'), short: msg('Reject') },
  RETURNED: { label: msg('Wapas aaya (RTO)'), short: msg('RTO') },
};

/** The next-step button says what happens. */
export const NEXT_ACTION: Partial<Record<OnlineOrderStatus, string>> = {
  CONFIRMED: msg('Packing shuru'),
  PREPARING: msg('Pack ho gaya'),
  READY: msg('Rider ko de diya'),
  OUT_FOR_DELIVERY: msg('Deliver ho gaya'),
};
export const NEXT_FALLBACK = msg('Aage');

export const TAB_LABEL: Record<OrderTab, string> = {
  PENDING: msg('Naye'),
  ACTIVE: msg('Chal rahe'),
  DELIVERED: msg('Delivered'),
  COD_DUE: msg('COD baqi'),
  CLOSED: msg('Cancel / wapas'),
  ALL: msg('Sab'),
};

export const PAYMENT_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'brand' }> = {
  PAID: { label: msg('Paisa mil gaya'), tone: 'success' },
  COLLECTED: { label: msg('Courier ke paas'), tone: 'warning' },
  NOT_COLLECTED: { label: msg('Paisa nahi aaya (RTO)'), tone: 'neutral' },
  PENDING: { label: msg('Baqi'), tone: 'warning' },
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  NEW: msg('Naya customer'),
  TRUSTED: msg('Bharosemand'),
  OK: msg('Theek'),
  WATCH: msg('Dhyan se'),
  HIGH: msg('RTO khatra'),
  BLOCKED: msg('Block kiya hua'),
};

export const COURIER_STATE_LABEL: Record<CourierState | 'BOOKING', string> = {
  BOOKING: msg('Book ho raha…'),
  BOOKED: msg('Book ho gaya — pickup ka intezar'),
  PICKED_UP: msg('Courier le gaya'),
  IN_TRANSIT: msg('Raste me'),
  OUT_FOR_DELIVERY: msg('Aaj deliver hoga'),
  ATTEMPTED: msg('Customer nahi mila — dobara koshish'),
  DELIVERED: msg('Deliver ho gaya'),
  RETURNING: msg('Wapas aa raha hai'),
  RETURNED: msg('Wapas aa gaya (RTO)'),
  CANCELLED: msg('Booking cancel'),
  UNKNOWN: msg('Status nahi mila'),
};

export const CANCEL_REASONS = [msg('Stock khatam'), msg('Customer ne mana kiya'), msg('Address/number ghalat'), msg('Fake order'), msg('Delivery nahi ho sakti')];
export const RTO_REASONS = [msg('Customer ne parcel nahi liya'), msg('Phone band / nahi utha'), msg('Address ghalat'), msg('Customer ne mana kar diya'), msg('Fake order')];
export const BLOCK_REASONS = [msg('Fake order'), msg('Parcel wapas kiya'), msg('Phone nahi uthata'), msg('Badtameezi')];
export const QUICK_TAGS = ['VIP', 'Gift', 'Urgent', 'Exchange', 'Call pehle', 'Advance liya'];

export const CONFIRM_OPTIONS: Array<{ value: '' | 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE'; label: string }> = [
  { value: '', label: msg('Sab') },
  { value: 'NONE', label: msg('Abhi poocha nahi') },
  { value: 'CONFIRMED', label: msg('Confirm ho gaya') },
  { value: 'NO_ANSWER', label: msg('Jawab nahi') },
  { value: 'REFUSED', label: msg('Mana kiya') },
];

export const COST_LABEL: Record<CostKind, string> = {
  courierCharge: msg('Courier charge'),
  codFee: msg('COD fee'),
  gatewayFee: msg('Gateway fee'),
  packagingCost: msg('Packaging'),
  rtoCost: msg('Wapsi (RTO)'),
};
export const COST_SOURCE: Record<CostSource, string> = {
  API: msg('courier se'), STATEMENT: msg('statement se'), MANUAL: msg('aap ne likha'), POSTED: msg('likha hua'), ESTIMATE: msg('andaza'), NONE: '',
};

export const ADVANCE_METHODS: Array<{ value: AdvanceMethod; label: string }> = [
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
  { value: 'BANK', label: msg('Bank') },
  { value: 'CASH', label: msg('Cash') },
  { value: 'OTHER', label: msg('Doosra') },
];

export const DELIVERY_MODES: Array<{ value: DeliveryMode; label: string }> = [
  { value: 'CUSTOMER', label: msg('Customer se') },
  { value: 'FREE', label: msg('Free (dukaan degi)') },
  { value: 'RIDER', label: msg('Rider rakhega') },
];

export const CUSTOMER_SEGMENTS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'all', label: msg('Sab'), hint: msg('Saare online customers (2 saal)') },
  { value: 'vip', label: msg('VIP'), hint: msg('Sab se zyada kharchne wale 10%') },
  { value: 'repeat', label: msg('Dobara lene wale'), hint: msg('2 ya zyada order deliver') },
  { value: 'inactive30', label: msg('30 din se gayab'), hint: msg('Pehle le chuke, 30 din se koi order nahi') },
  { value: 'inactive60', label: msg('60 din se gayab'), hint: msg('60 din se koi order nahi') },
  { value: 'inactive90', label: msg('90 din se gayab'), hint: msg('90 din se koi order nahi') },
  { value: 'new', label: msg('Naye'), hint: msg('Pehla order pichhle 30 din me') },
  { value: 'risky', label: msg('RTO wale'), hint: msg('Kam az kam ek parcel wapas kiya') },
  { value: 'blocked', label: msg('Blocked'), hint: msg('Block list me') },
];

export const STATEMENT_FIELD_LABEL: Record<StatementField, string> = {
  cn: msg('CN / tracking'), orderRef: msg('Order number'), amount: msg('COD amount (customer se)'), charge: msg('Delivery charge'),
  codFee: msg('COD fee'), tax: msg('GST / tax'), net: msg('Net (aap ko mila)'), status: msg('Status'),
};

export const AD_PLATFORM_LABEL: Record<AdPlatform, string> = {
  META: msg('Facebook / Instagram'), TIKTOK: msg('TikTok'), GOOGLE: msg('Google'), OTHER: msg('Doosra'),
};

export const KIND_LABEL: Record<ChannelKind, string> = { DARAZ: msg('Daraz'), SHOPIFY: msg('Shopify'), WOOCOMMERCE: msg('WooCommerce'), WEBSITE: msg('Apni website') };

export const BREAKDOWN_LABEL: Record<BreakdownKey, string> = {
  cost: msg('Product cost'), tax: msg('GST / tax'), packaging: msg('Packaging'), shipping: msg('Courier / shipping'), codFee: msg('COD fee'),
  commission: msg('Commission'), paymentFee: msg('Payment fee'), fixedFee: msg('Fixed fee'), ads: msg('Ads'), rto: msg('RTO (wapsi) ka nuksan'), profit: msg('Profit'),
};

export const COURIER_LABEL_OVERRIDES: Record<string, string> = { RIDER: msg('Apna rider'), OTHER: msg('Doosra') };
