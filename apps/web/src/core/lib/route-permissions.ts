import { PERMISSIONS, type PermissionKey } from './permissions';

/* ═════════════════════════════════════════════════════════════
   KAUNSE SAFHE PAR KAUNSI IJAZAT
   ─────────────────────────────────────────────────────────────
   Ye backend ke `permission-routes.ts` ka jora hai. Dono ek jaisa
   sochte hain, warna safha khulta hai magar API mana kar deti hai
   — aur user ko khali screen milti hai bina wajah ke.

   Industry pack apne raaste khud jorte hain (`AgriPack.routes`
   waghera). Wo App.tsx se nahi guzarte, is liye un ke liye yehi
   naqsha chalta hai — warna `/bakery/products` jaisa safha bina
   kisi rok ke khul jata tha, chahe cashier se maal ka access le
   liya gaya ho.
   ═════════════════════════════════════════════════════════════ */

const P = PERMISSIONS;

/** Tarteeb maina rakhti hai — khaas pehle, aam baad me */
const RULES: Array<[RegExp, PermissionKey]> = [
  // Bakery
  [/^\/bakery\/(cake-orders|bulk-orders)/, P.BAKERY_ORDERS_VIEW],
  [/^\/bakery\/(production|freshness)/, P.BAKERY_PRODUCTION_VIEW],
  [/^\/bakery\/ingredients/, P.BAKERY_INGREDIENTS_VIEW],

  // Agri
  [/^\/agri\/(farmers|ledger)/, P.AGRI_FARMERS_VIEW],
  [/^\/agri\/(bulk-orders|subsidy|seasonal-plans)/, P.AGRI_ORDERS_VIEW],
  [/^\/agri\/advisory/, P.AGRI_ADVISORY_VIEW],

  // Electronics
  [/^\/electronics\/serials/, P.ELECTRONICS_SERIALS_VIEW],
  [/^\/electronics\/warranty/, P.ELECTRONICS_WARRANTY_VIEW],

  // Mobile
  [/^\/mobile\/(repairs|repair-tickets)/, P.MOBILE_REPAIRS_VIEW],
  [/^\/(mobile\/)?(imei|used-phones)/, P.MOBILE_IMEI_VIEW],

  // Restaurant
  [/^\/restaurant\/(orders|tables|delivery|riders)/, P.RESTAURANT_ORDERS_VIEW],
  [/^\/restaurant\/(kot|stations|recipes)/, P.RESTAURANT_KITCHEN_VIEW],
  [/^\/restaurant\/(menu|modifiers|happy-hours)/, P.RESTAURANT_MENU_VIEW],

  // Services / workshop
  [/\/(jobs|workshop-jobs|service-requests|dispatch|quotes)/, P.SERVICE_JOBS_VIEW],
  [/\/(bookings|appointments)/, P.SERVICE_BOOKINGS_VIEW],

  // Online dukaan
  [/^\/online-orders/, P.ONLINE_ORDERS_VIEW],
  [/^\/catalog/, P.CATALOG_VIEW],

  // Maal — banane/badalne ke apne darje
  [/products?\/new$/, P.PRODUCTS_CREATE],
  [/products?\/[^/]+\/edit$/, P.PRODUCTS_EDIT],
  [/products/, P.PRODUCTS_VIEW],

  // ── Aam safhe (core) ──
  // Ye navConfig me pehle se likhe hain, magar pack bhi inhi raaston
  // par apna safha rakh sakta hai — is liye fallback yahan bhi poora.
  [/^\/pos/, P.POS_USE],
  [/^\/sales/, P.SALES_VIEW],
  [/^\/returns/, P.RETURNS_VIEW],
  [/^\/cash-register/, P.CASH_REGISTER_VIEW],
  [/^\/customers/, P.CUSTOMERS_VIEW],
  [/^\/khata/, P.KHATA_VIEW],
  [/^\/loyalty/, P.LOYALTY_VIEW],
  [/^\/discounts/, P.DISCOUNTS_VIEW],
  [/^\/categories/, P.CATEGORIES_VIEW],
  [/^\/brands/, P.BRANDS_VIEW],
  [/^\/tags/, P.TAGS_VIEW],
  [/^\/low-stock/, P.LOW_STOCK_VIEW],
  [/^\/stock-report/, P.STOCK_MOVEMENTS_VIEW],
  [/^\/stock-adjustments/, P.STOCK_ADJUSTMENTS_MANAGE],
  [/^\/transfers/, P.STOCK_TRANSFERS_MANAGE],
  [/^\/suppliers/, P.SUPPLIERS_VIEW],
  [/^\/purchases/, P.PURCHASES_VIEW],
  [/^\/expenses/, P.EXPENSES_VIEW],
  [/^\/money/, P.REPORTS_VIEW],
  [/^\/profit-report/, P.PROFIT_REPORT_VIEW],
  [/^\/reports/, P.REPORTS_VIEW],
  [/^\/staff/, P.STAFF_VIEW],
  [/^\/team/, P.TEAM_VIEW],
  [/^\/shops/, P.SHOPS_VIEW],
  [/^\/activity/, P.ACTIVITY_VIEW],
  [/^\/billing/, P.BILLING_VIEW],
  [/^\/dashboard/, P.DASHBOARD_VIEW],
];

/**
 * Industry ke dashboard — `/bakery`, `/agri`, `/restaurant`.
 *
 * Pehle yahan har ek-lafz wala raasta chalta tha (`/^\/[a-z-]+$/`),
 * magar us me `/profile`, `/legal` aur `/sync` bhi aa jate thay —
 * yani jis cashier ke paas dashboard ka access na ho, us se apna
 * profile bhi chhup jata. Ab sirf wohi naam jo waqai industry ke
 * hain.
 */
const INDUSTRY_ROOTS = new Set([
  'retail', 'bakery', 'agri', 'electronics', 'mobile', 'restaurant',
  'pharmacy', 'garments', 'jewelry', 'hardware', 'cosmetics', 'dairy',
  'meat', 'bookstore', 'carpet', 'clinic', 'florist', 'furniture',
  'gaming', 'gym', 'hotel', 'optical', 'petshop', 'salon', 'shoe',
  'sports', 'toystore', 'autoparts', 'appliances', 'services-biz',
]);

/**
 * Is safhe ke liye kaunsi ijazat chahiye.
 *
 * Kuch na mile to `null` — safha khula rehta hai. Asli rok API par
 * hai; yahan sirf ye tay hota hai ke khali screen dikhane ke bajaye
 * saaf paigham mile.
 */
export function permissionForPath(path: string): PermissionKey | null {
  const clean = (path || '').toLowerCase();
  const root = clean.replace(/^\//, '').split('/')[0];
  /* Industry ka apna dashboard — `/bakery`, `/agri/dashboard` */
  if (INDUSTRY_ROOTS.has(root) && (clean === `/${root}` || clean === `/${root}/dashboard`)) {
    return P.DASHBOARD_VIEW;
  }
  const hit = RULES.find(([rx]) => rx.test(clean));
  return hit ? hit[1] : null;
}
