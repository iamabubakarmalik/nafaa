import { PERMISSIONS, type PermissionKey } from './permissions.constants';

/* ═════════════════════════════════════════════════════════════
   KAUNSE RAASTE PAR KAUNSI IJAZAT
   ─────────────────────────────────────────────────────────────
   Nafaa me 350 se zyada controller hain. Har ek par haath se
   `@RequirePermissions` lagana mahinon ka kaam hai, aur ek ghalat
   lafz kisi chalti dukaan ko bahar kar deta hai.

   Is liye ijazat RAASTE se tay hoti hai, controller se nahi. Faida
   ye hai ke ek hi usool saari industries par chalta hai:

       products            → Kirana
       bakery/products     → Bakery
       agri/products       → Beej wala
       shoe/products       → Joota wala

   Chaaron ek hi `products.*` ijazat maangte hain, kyunke dukaan-daar
   ki nazar me ye chaar alag cheezein hain hi nahi — maal maal hota
   hai.

   DO AHEM USOOL:

   1. Jo raasta is list me NAHI hai, wo khula rehta hai. Nafaa par
      asli dukaanein chal rahi hain; agar hum har anjaan raaste ko
      band kar dein to kal subah kisi ki dukaan ruk jayegi. Naye
      raaste yahan jurte rahenge.

   2. Controller par laga hua `@RequirePermissions` hamesha jeetta
      hai. Jahan khaas hifazat chahiye wahan wo lagta hai, aur ye
      list us me dakhal nahi deti.
   ═════════════════════════════════════════════════════════════ */

const P = PERMISSIONS;

/** Ek raaste ke liye: kis tareeqe par kaunsi ijazat */
interface RouteRule {
  /** Raaste ka aakhri hissa — `bakery/products` me `products` */
  match: RegExp;
  GET?: PermissionKey;
  POST?: PermissionKey;
  PATCH?: PermissionKey;
  PUT?: PermissionKey;
  DELETE?: PermissionKey;
  /** Jo upar na likha ho us ke liye */
  write?: PermissionKey;
}

/**
 * Tarteeb maina rakhti hai — upar wala pehle chalta hai.
 *
 * Khaas raaste pehle, aam baad me. Warna `stock-adjustments` ko
 * `stock` wala aam usool pakar leta.
 */
export const ROUTE_RULES: RouteRule[] = [
  /* ── Bikri aur counter ── */
  { match: /(^|\/)pos(\/|$)/, GET: P.POS_USE, write: P.POS_USE },
  { match: /(^|\/)sales(\/|$)/, GET: P.SALES_VIEW, write: P.POS_USE, DELETE: P.SALES_VOID },
  { match: /(^|\/)returns(\/|$)/, GET: P.RETURNS_VIEW, write: P.RETURNS_CREATE },
  { match: /(^|\/)cash-register(\/|$)/, GET: P.CASH_REGISTER_VIEW, write: P.CASH_REGISTER_OPEN },

  /* ── Grahak aur khata ── */
  { match: /(^|\/)customers(\/|$)/, GET: P.CUSTOMERS_VIEW, write: P.CUSTOMERS_EDIT },
  { match: /(^|\/)khata(\/|$)/, GET: P.KHATA_VIEW, write: P.KHATA_MANAGE },
  { match: /(^|\/)customer-ledger(\/|$)/, GET: P.KHATA_VIEW, write: P.KHATA_MANAGE },
  { match: /(^|\/)loyalty(\/|$)/, GET: P.LOYALTY_VIEW, write: P.KHATA_MANAGE },
  { match: /(^|\/)discounts?(\/|$)/, GET: P.DISCOUNTS_VIEW, write: P.DISCOUNTS_MANAGE },

  /* ── Maal ──
     Har industry ka apna products controller hai; sab ek hi
     ijazat par chalte hain. */
  { match: /(^|\/)products(\/|$)/, GET: P.PRODUCTS_VIEW, POST: P.PRODUCTS_CREATE, PATCH: P.PRODUCTS_EDIT, PUT: P.PRODUCTS_EDIT, DELETE: P.PRODUCTS_DELETE },
  { match: /(^|\/)product-units(\/|$)/, GET: P.PRODUCTS_VIEW, write: P.PRODUCTS_EDIT },
  { match: /(^|\/)categories(\/|$)/, GET: P.CATEGORIES_VIEW, write: P.PRODUCTS_EDIT },
  { match: /(^|\/)brands(\/|$)/, GET: P.BRANDS_VIEW, write: P.PRODUCTS_EDIT },
  { match: /(^|\/)tags(\/|$)/, GET: P.TAGS_VIEW, write: P.PRODUCTS_EDIT },
  { match: /(^|\/)barcode-labels(\/|$)/, GET: P.BARCODE_LABELS_VIEW, write: P.BARCODE_LABELS_VIEW },
  { match: /(^|\/)bulk-import(\/|$)/, GET: P.PRODUCTS_VIEW, write: P.PRODUCTS_CREATE },

  /* ── Gudaam ── */
  { match: /(^|\/)low-stock(\/|$)/, GET: P.LOW_STOCK_VIEW },
  { match: /(^|\/)stock-adjustments(\/|$)/, GET: P.STOCK_ADJUSTMENTS_MANAGE, write: P.STOCK_ADJUSTMENTS_MANAGE },
  { match: /(^|\/)stock-movements(\/|$)/, GET: P.STOCK_MOVEMENTS_VIEW },
  { match: /(^|\/)transfers(\/|$)/, GET: P.STOCK_TRANSFERS_MANAGE, write: P.STOCK_TRANSFERS_MANAGE },

  /* ── Kharidari ── */
  { match: /(^|\/)suppliers(\/|$)/, GET: P.SUPPLIERS_VIEW, write: P.SUPPLIERS_EDIT },
  { match: /(^|\/)supplier-ledger(\/|$)/, GET: P.SUPPLIERS_VIEW, write: P.SUPPLIERS_EDIT },
  { match: /(^|\/)purchases(\/|$)/, GET: P.PURCHASES_VIEW, write: P.PURCHASES_CREATE },

  /* ── Hisab ── */
  { match: /(^|\/)dashboard(\/|$)/, GET: P.DASHBOARD_VIEW },
  { match: /(^|\/)profit(-|\/)/, GET: P.PROFIT_REPORT_VIEW },
  { match: /(^|\/)reports(\/|$)/, GET: P.REPORTS_VIEW },
  { match: /(^|\/)accounting(\/|$)/, GET: P.REPORTS_VIEW, write: P.SETTINGS_EDIT },
  { match: /(^|\/)expenses(\/|$)/, GET: P.EXPENSES_VIEW, write: P.EXPENSES_CREATE },
  { match: /(^|\/)money(\/|$)/, GET: P.REPORTS_VIEW, write: P.EXPENSES_CREATE },

  /* ── Bande ── */
  { match: /(^|\/)staff(\/|$)/, GET: P.STAFF_VIEW, write: P.STAFF_MANAGE },
  { match: /(^|\/)commission(\/|$)/, GET: P.STAFF_VIEW, write: P.STAFF_MANAGE },
  { match: /(^|\/)team(\/|$)/, GET: P.TEAM_VIEW, write: P.TEAM_MANAGE },

  /* ── Industry ke apne kaam ──
     Ye un raaston se pehle aate hain jo aam hain, warna
     `bakery/cake-orders` ko koi aam `orders` wala usool pakar leta. */
  { match: /^bakery\/(cake-orders|bulk-orders)(\/|$)/, GET: P.BAKERY_ORDERS_VIEW, write: P.BAKERY_ORDERS_MANAGE },
  { match: /^bakery\/(production|freshness)(\/|$)/, GET: P.BAKERY_PRODUCTION_VIEW, write: P.BAKERY_PRODUCTION_MANAGE },
  { match: /^bakery\/ingredients(\/|$)/, GET: P.BAKERY_INGREDIENTS_VIEW, write: P.BAKERY_INGREDIENTS_MANAGE },

  { match: /^agri\/(farmers|ledger)(\/|$)/, GET: P.AGRI_FARMERS_VIEW, write: P.AGRI_FARMERS_MANAGE },
  { match: /^agri\/(bulk-orders|subsidy|seasonal-plans)(\/|$)/, GET: P.AGRI_ORDERS_VIEW, write: P.AGRI_ORDERS_MANAGE },
  { match: /^agri\/advisory(\/|$)/, GET: P.AGRI_ADVISORY_VIEW, write: P.AGRI_ADVISORY_MANAGE },

  { match: /^(electronics|appliances)\/serial-tracking(\/|$)/, GET: P.ELECTRONICS_SERIALS_VIEW, write: P.ELECTRONICS_SERIALS_MANAGE },
  { match: /^(electronics|appliances|services-biz)\/warranty/, GET: P.ELECTRONICS_WARRANTY_VIEW, write: P.ELECTRONICS_WARRANTY_MANAGE },

  { match: /(^|\/)repair-tickets?(\/|$)/, GET: P.MOBILE_REPAIRS_VIEW, write: P.MOBILE_REPAIRS_MANAGE },
  { match: /(^|\/)(imei|used-phones)(\/|$)/, GET: P.MOBILE_IMEI_VIEW, write: P.MOBILE_IMEI_MANAGE },

  { match: /^restaurant\/(orders|tables|delivery)(\/|$)/, GET: P.RESTAURANT_ORDERS_VIEW, write: P.RESTAURANT_ORDERS_MANAGE },
  { match: /^restaurant\/(kot|stations|recipes)(\/|$)/, GET: P.RESTAURANT_KITCHEN_VIEW, write: P.RESTAURANT_KITCHEN_MANAGE },
  { match: /^restaurant\/(menu-items|modifiers|happy-hours)(\/|$)/, GET: P.RESTAURANT_MENU_VIEW, write: P.RESTAURANT_MENU_MANAGE },

  { match: /(^|\/)(jobs|workshop-jobs|service-requests|dispatch|quotes)(\/|$)/, GET: P.SERVICE_JOBS_VIEW, write: P.SERVICE_JOBS_MANAGE },
  { match: /(^|\/)(bookings|appointments)(\/|$)/, GET: P.SERVICE_BOOKINGS_VIEW, write: P.SERVICE_BOOKINGS_MANAGE },

  { match: /(^|\/)online-orders?(\/|$)/, GET: P.ONLINE_ORDERS_VIEW, write: P.ONLINE_ORDERS_MANAGE },
  { match: /(^|\/)marketplace/, GET: P.CATALOG_VIEW, write: P.CATALOG_MANAGE },

  /* ── Nizam ── */
  { match: /(^|\/)shops(\/|$)/, GET: P.SHOPS_VIEW, write: P.SHOPS_MANAGE },
  { match: /(^|\/)settings(\/|$)/, GET: P.SETTINGS_VIEW, write: P.SETTINGS_EDIT },
  { match: /(^|\/)activity-log(\/|$)/, GET: P.ACTIVITY_VIEW },
  { match: /(^|\/)backup(\/|$)/, GET: P.BACKUP_MANAGE, write: P.BACKUP_MANAGE },
  { match: /(^|\/)tax-authority(\/|$)/, GET: P.SETTINGS_VIEW, write: P.SETTINGS_EDIT },
  { match: /(^|\/)billing(\/|$)/, GET: P.BILLING_VIEW, write: P.BILLING_MANAGE },
  { match: /(^|\/)subscriptions(\/|$)/, GET: P.BILLING_VIEW, write: P.BILLING_MANAGE },
];

/**
 * Jin raaston par ijazat ka sawal hi nahi.
 *
 * Login, apna profile, file upload, dhoondna — ye har logged-in
 * bande ko chahiye, warna wo app chala hi nahi sakta.
 */
const ALWAYS_OPEN = [
  /^auth(\/|$)/,
  /^v1(\/|$)/,
  /^uploads?(\/|$)/,
  /^storage(\/|$)/,
  /^search(\/|$)/,
  /^notifications?(\/|$)/,
  /^health(\/|$)/,
  /^industries?(\/|$)/,
  /^onboarding(\/|$)/,
  /^feature-gating(\/|$)/,
  /^plans?(\/|$)/,
  /^stripe(\/|$)/,
  /^rider-app(\/|$)/,
];

/**
 * Is raaste aur tareeqe ke liye kaunsi ijazat chahiye.
 *
 * Kuch na mile to `null` — matlab khula hai (upar usool 1 dekhein).
 */
export function permissionForRoute(
  method: string,
  path: string,
): PermissionKey | null {
  /* `/api/v1/bakery/products/123` → `bakery/products/123` */
  const clean = path
    .replace(/^\/+/, '')
    .replace(/^api\//, '')
    .replace(/\?.*$/, '')
    .toLowerCase();

  /* Admin ka apna nizam hai — ye list us par nahi chalti */
  if (clean.startsWith('admin/')) return null;
  if (ALWAYS_OPEN.some((r) => r.test(clean))) return null;

  const rule = ROUTE_RULES.find((r) => r.match.test(clean));
  if (!rule) return null;

  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD') return rule.GET ?? null;
  return (rule as any)[m] ?? rule.write ?? null;
}
