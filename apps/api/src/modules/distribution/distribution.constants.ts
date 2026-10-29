/**
 * Fixed values of the distribution module: order, load sheet, collection and
 * visit states, no-order reasons and limits. The booker app and the web read
 * the same lists from GET /distribution/settings (`meta`).
 */

export const ORDER_STATUSES = ['BOOKED', 'APPROVED', 'INVOICING', 'INVOICED', 'LOADED', 'DELIVERED', 'PARTIAL', 'RETURNED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Orders whose invoice exists. */
export const INVOICED_STATUSES: OrderStatus[] = ['INVOICED', 'LOADED', 'DELIVERED', 'PARTIAL', 'RETURNED'];
/** Orders still counted as open work (not cancelled, not settled). */
export const OPEN_STATUSES: OrderStatus[] = ['BOOKED', 'APPROVED', 'INVOICING', 'INVOICED', 'LOADED'];

export const LOAD_SHEET_STATUSES = ['OPEN', 'DISPATCHED', 'SETTLED', 'CANCELLED'] as const;
export const DELIVERY_OUTCOMES = ['DELIVERED', 'PARTIAL', 'RETURNED'] as const;
export type DeliveryOutcome = (typeof DELIVERY_OUTCOMES)[number];

export const COLLECTION_KINDS = ['INVOICE_CASH', 'RECOVERY'] as const;
export const COLLECTION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

export const VISIT_OUTCOMES = ['ORDER', 'NO_ORDER', 'CLOSED', 'RECOVERY_ONLY'] as const;

export const CREDIT_MODES = ['WARN_THEN_PIN', 'BLOCK', 'OFF'] as const;

/** Why a shop gave no order; labels are shown as is. */
export const NO_ORDER_REASONS: Array<{ code: string; label: string }> = [
  { code: 'STOCK_AVAILABLE', label: 'Maal abhi pada hai' },
  { code: 'SHOP_CLOSED', label: 'Dukaan band thi' },
  { code: 'OWNER_ABSENT', label: 'Malik mojood nahi' },
  { code: 'NO_CASH', label: 'Paise nahi the' },
  { code: 'PRICE_ISSUE', label: 'Price ka masla' },
  { code: 'CREDIT_HOLD', label: 'Udhaar zyada hai' },
  { code: 'COMPETITOR', label: 'Doosri company ka maal liya' },
  { code: 'OTHER', label: 'Koi aur wajah' },
];

/** Orders invoiced per chunk in a bulk approve; each order is still its own transaction. */
export const INVOICE_CHUNK = 20;
/** Most items one sync call may carry (orders + visits + collections). */
export const SYNC_MAX_ITEMS = 200;
/** Page size limits for bootstrap. */
export const BOOTSTRAP_PAGE = 500;
export const BOOTSTRAP_PAGE_MAX = 1000;
