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
  // Bakery: taking or changing an order needs the manage right.
  [/^\/bakery\/(cake-orders|bulk-orders)\/(new|[^/]+\/edit)$/, P.BAKERY_ORDERS_MANAGE],
  [/^\/bakery\/(cake-orders|bulk-orders)/, P.BAKERY_ORDERS_VIEW],
  [/^\/bakery\/(production|freshness)/, P.BAKERY_PRODUCTION_VIEW],
  [/^\/bakery\/ingredients/, P.BAKERY_INGREDIENTS_VIEW],

  // Agri
  [/^\/agri\/farmers\/(new|[^/]+\/edit)$/, P.AGRI_FARMERS_MANAGE],
  [/^\/agri\/(farmers|ledger)/, P.AGRI_FARMERS_VIEW],
  [/^\/agri\/(bulk-orders|subsidy|seasonal-plans)/, P.AGRI_ORDERS_VIEW],
  [/^\/agri\/advisory/, P.AGRI_ADVISORY_VIEW],

  // Carpet: rolls and pieces are stock; the roll import adds stock.
  [/^\/carpet-bulk-import/, P.PRODUCTS_CREATE],
  [/^\/carpet-(rolls|cut-pieces)/, P.PRODUCTS_VIEW],

  // Furniture: orders, deliveries and karigar are service jobs.
  [/^\/furniture\/custom-orders\/(new|[^/]+\/edit)$/, P.SERVICE_JOBS_MANAGE],
  [/^\/furniture\/(custom-orders|deliveries|carpenters)/, P.SERVICE_JOBS_VIEW],

  // Gaming: cafe, stations, rentals and tournaments run at the counter; cards are stock.
  [/^\/gaming\/(cafe|stations|rentals|tournaments)/, P.POS_USE],
  [/^\/gaming\/topups/, P.PRODUCTS_VIEW],

  // Electronics
  [/^\/electronics\/bundles/, P.PRODUCTS_VIEW],
  [/^\/electronics\/serials/, P.ELECTRONICS_SERIALS_VIEW],
  [/^\/electronics\/warranty/, P.ELECTRONICS_WARRANTY_VIEW],

  // Mobile
  [/^\/(mobile\/)?(repairs|repair-tickets)/, P.MOBILE_REPAIRS_VIEW],
  [/^\/(mobile\/)?(imei|used-phones)/, P.MOBILE_IMEI_VIEW],
  [/^\/emi-plans/, P.KHATA_VIEW],

  // Pharmacy
  [/^\/pharmacy\/prescriptions/, P.POS_USE],
  [/^\/pharmacy\/(medicines|salts|expiring|controlled-log)/, P.PRODUCTS_VIEW],

  // Restaurant
  [/^\/restaurant\/(orders|tables|delivery|riders)/, P.RESTAURANT_ORDERS_VIEW],
  [/^\/restaurant\/(kot|stations|recipes)/, P.RESTAURANT_KITCHEN_VIEW],
  [/^\/restaurant\/(menu|modifiers|happy-hours)/, P.RESTAURANT_MENU_VIEW],

  // Retail
  [/^\/retail\/barcode-labels/, P.PRODUCTS_VIEW],

  // Salon services and hotel room types are edited like products.
  [/^\/(salon-services|hotel-room-types)\/new$/, P.PRODUCTS_CREATE],
  [/^\/(salon-services|hotel-room-types)\/[^/]+\/edit$/, P.PRODUCTS_EDIT],
  [/^\/(salon-services|hotel-room-types)/, P.PRODUCTS_VIEW],

  // Hotel (bookings are covered by the general rule below)
  [/^\/hotel\/(housekeeping|rooms)/, P.SERVICE_BOOKINGS_VIEW],
  [/^\/hotel\/reports/, P.REPORTS_VIEW],

  // Gym
  [/^\/gym\/lockers/, P.SERVICE_BOOKINGS_VIEW],

  // Pet shop animals are stock
  [/^\/petshop\/live-animals\/new$/, P.PRODUCTS_CREATE],
  [/^\/petshop\/live-animals\/[^/]+\/edit$/, P.PRODUCTS_EDIT],
  [/^\/petshop\/live-animals/, P.PRODUCTS_VIEW],

  // Services business
  [/^\/services-biz\/warranty/, P.ELECTRONICS_WARRANTY_VIEW],
  [/^\/services-biz\/(technicians|amc)/, P.SERVICE_JOBS_VIEW],
  [/^\/services-biz-services\/new$/, P.PRODUCTS_CREATE],
  [/^\/services-biz-services\/[^/]+\/edit$/, P.PRODUCTS_EDIT],
  [/^\/(services-biz\/catalog|services-biz-services)/, P.PRODUCTS_VIEW],

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
  [/^\/stock-report/, P.REPORTS_VIEW],
  [/^\/stock-adjustments/, P.STOCK_ADJUSTMENTS_MANAGE],
  [/^\/manufacturing\/produce/, P.MANUFACTURING_PRODUCE],
  [/^\/manufacturing/, P.MANUFACTURING_VIEW],
  [/^\/transfers/, P.STOCK_TRANSFERS_MANAGE],
  [/^\/suppliers/, P.SUPPLIERS_VIEW],
  [/^\/purchases/, P.PURCHASES_VIEW],
  [/^\/expenses/, P.EXPENSES_VIEW],
  [/^\/money/, P.REPORTS_VIEW],
  [/^\/profit-report/, P.PROFIT_REPORT_VIEW],
  [/^\/profit-loss/, P.PROFIT_REPORT_VIEW],
  [/^\/audit/, P.ACTIVITY_VIEW],
  [/^\/reports/, P.REPORTS_VIEW],
  [/^\/ai(\/|$)/, P.AI_USE],
  /* Commission staff ke andar hai magar us ka hissa nahi — counter
     wale ko apni commission dekhne ke liye poora staff section
     kholna nahi parta. Is liye `/staff` se PEHLE. */
  [/^\/staff\/commission/, P.COMMISSION_OWN],
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
