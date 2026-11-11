/**
 * Every feature key a plan or an add-on can turn on. Plans list keys in
 * Plan.features; add-ons in AddOn.grantsFeatures. The admin plan editor shows
 * this list as checkboxes, and the merchant apps read the resolved keys from
 * GET /billing/entitlements to hide or upsell features.
 *
 * Adding a key here never locks anything by itself: a key only matters once a
 * gate (see feature-gates.ts) or a screen checks it.
 */

export interface FeatureDef {
  key: string;
  label: string;
  group: 'Core' | 'Business' | 'Growth' | 'Advanced' | 'Add-on';
  hint?: string;
}

export const FEATURES: FeatureDef[] = [
  { key: 'pos', label: 'POS / counter', group: 'Core' },
  { key: 'khata', label: 'Customer credit (khata)', group: 'Core' },
  { key: 'inventory', label: 'Products and stock', group: 'Core' },
  { key: 'returns', label: 'Returns', group: 'Core' },
  { key: 'barcode', label: 'Barcode scanning and labels', group: 'Core' },
  { key: 'cash_register', label: 'Cash register and day close', group: 'Core' },
  { key: 'reports', label: 'Day report and basic reports', group: 'Core' },
  { key: 'offline', label: 'Offline selling', group: 'Core' },

  { key: 'profit_report', label: 'Profit report', group: 'Business' },
  { key: 'expenses', label: 'Expenses and other income', group: 'Business' },
  { key: 'whatsapp_receipt', label: 'WhatsApp receipts', group: 'Business' },
  { key: 'backup', label: 'Backup and restore', group: 'Business' },
  { key: 'ai', label: 'Nafaa AI', group: 'Business' },

  { key: 'loyalty', label: 'Loyalty points', group: 'Growth' },
  { key: 'discount_rules', label: 'Discount rules and coupons', group: 'Growth', hint: 'A discount on a single bill is always allowed.' },
  { key: 'promotions', label: 'Promotions and campaigns', group: 'Growth' },
  { key: 'stock_transfer', label: 'Stock transfer between shops', group: 'Growth' },
  { key: 'purchase_orders', label: 'Purchase orders and suppliers', group: 'Growth' },
  { key: 'exports', label: 'Excel/CSV exports', group: 'Growth' },
  { key: 'approvals', label: 'Manager approvals and staff permissions', group: 'Growth' },
  { key: 'hr', label: 'Staff attendance and salary', group: 'Growth' },
  { key: 'multi_shop', label: 'More than one shop', group: 'Growth' },

  { key: 'branding', label: 'Own logo and branding', group: 'Advanced' },
  { key: 'api', label: 'Developer API and webhooks', group: 'Advanced' },
  { key: 'priority_support', label: 'Priority support', group: 'Advanced' },

  { key: 'integration.shopify', label: 'Shopify', group: 'Add-on' },
  { key: 'integration.woocommerce', label: 'WooCommerce', group: 'Add-on' },
  { key: 'integration.daraz', label: 'Daraz', group: 'Add-on' },
  { key: 'integration.website', label: 'Own website channel', group: 'Add-on' },
  { key: 'integration.foodpanda', label: 'Foodpanda', group: 'Add-on' },
  { key: 'courier', label: 'Courier booking (TCS, Leopards, CallCourier)', group: 'Add-on' },
  { key: 'online_store', label: 'Nafaa online store and order desk', group: 'Add-on' },
  { key: 'meta', label: 'Facebook and Instagram', group: 'Add-on' },
  { key: 'distribution', label: 'Distribution and wholesale', group: 'Add-on' },
  { key: 'fbr', label: 'FBR and tax integration', group: 'Add-on' },
  { key: 'accounting', label: 'Accounting sync', group: 'Add-on' },
  { key: 'ai_plus', label: 'Nafaa AI Plus', group: 'Add-on' },
];

export const FEATURE_KEYS = new Set(FEATURES.map((f) => f.key));

export const CORE_FEATURES = FEATURES.filter((f) => f.group === 'Core').map((f) => f.key);

/** Limits a plan sets and add-ons can raise. 999999 and above means unlimited. */
export const LIMIT_KEYS = ['users', 'shops', 'products', 'salesPerMonth', 'bookers'] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];
export const UNLIMITED = 999_999;
