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

/**
 * Ek raaste ke liye: kis tareeqe par kaunsi ijazat.
 *
 * Qeemat list bhi ho sakti hai — us surat me KOI EK kaafi hai.
 *
 * Abhi koi raasta is ki zaroorat nahi rakhta, aur ye jaan boojh kar
 * hai. Pehle yahan ek chhupa hua usool tha: `pos.use` rakhne wale ko
 * maal parhne ka haq apne aap mil jata tha. Wo ghalat tha — malik ne
 * jab "View Products" ka nishan hata diya, to us ka matlab hata
 * hi tha. Ab har ijazat wohi karti hai jo us par likha hai.
 */
type Need = PermissionKey | PermissionKey[];

interface RouteRule {
  /** Raaste ka aakhri hissa — `bakery/products` me `products` */
  match: RegExp;
  GET?: Need;
  POST?: Need;
  PATCH?: Need;
  PUT?: Need;
  DELETE?: Need;
  /** Jo upar na likha ho us ke liye */
  write?: Need;
}


/**
 * Tarteeb maina rakhti hai — upar wala pehle chalta hai.
 *
 * Khaas raaste pehle, aam baad me. Warna `stock-adjustments` ko
 * `stock` wala aam usool pakar leta.
 */
export const ROUTE_RULES: RouteRule[] = [
  /* Nafaa AI. Every answer is also checked against the permission of the data it reads. */
  { match: /^ai(\/|$)/, GET: P.AI_USE, write: P.AI_USE },

  /* Distribution (wholesale). Placed first so `distribution/routes/:id/customers` and the
     like are not taken by the general customers or products rules. Several reads serve
     more than one role (a booker's phone, the office desk, the POS price lookup), so they
     list each permission that may read them. Services narrow further where noted. */
  { match: /^distribution\/settings(\/|$)/, GET: [P.SETTINGS_VIEW, P.DISTRIBUTION_ORDERS_VIEW, P.DISTRIBUTION_ORDERS_BOOK], write: P.SETTINGS_EDIT },
  { match: /^distribution\/presets(\/|$)/, GET: [P.TEAM_VIEW, P.STAFF_VIEW] },
  { match: /^distribution\/booker(\/|$)/, GET: P.DISTRIBUTION_ORDERS_BOOK, write: P.DISTRIBUTION_ORDERS_BOOK },
  { match: /^distribution\/price-lists\/resolve$/, GET: [P.POS_USE, P.DISTRIBUTION_PRICELISTS_VIEW, P.DISTRIBUTION_ORDERS_BOOK] },
  { match: /^distribution\/price-lists(\/|$)/, GET: P.DISTRIBUTION_PRICELISTS_VIEW, write: P.DISTRIBUTION_PRICELISTS_MANAGE },
  { match: /^distribution\/routes(\/|$)/, GET: [P.DISTRIBUTION_ROUTES_MANAGE, P.DISTRIBUTION_ORDERS_VIEW, P.DISTRIBUTION_ORDERS_BOOK], write: P.DISTRIBUTION_ROUTES_MANAGE },
  { match: /^distribution\/schemes\/preview$/, POST: [P.POS_USE, P.DISTRIBUTION_ORDERS_BOOK, P.DISTRIBUTION_ORDERS_MANAGE] },
  { match: /^distribution\/schemes(\/|$)/, GET: [P.DISTRIBUTION_SCHEMES_MANAGE, P.DISTRIBUTION_PRICELISTS_VIEW, P.DISTRIBUTION_ORDERS_VIEW, P.DISTRIBUTION_ORDERS_BOOK], write: P.DISTRIBUTION_SCHEMES_MANAGE },
  { match: /^distribution\/orders\/preview$/, POST: [P.DISTRIBUTION_ORDERS_BOOK, P.DISTRIBUTION_ORDERS_MANAGE] },
  { match: /^distribution\/orders\/(approve|invoice|cancel)$/, POST: P.DISTRIBUTION_ORDERS_MANAGE },
  // Editing: a booker edits only their own booked orders (checked in the service).
  { match: /^distribution\/orders(\/|$)/, GET: P.DISTRIBUTION_ORDERS_VIEW, POST: P.DISTRIBUTION_ORDERS_BOOK, PATCH: [P.DISTRIBUTION_ORDERS_BOOK, P.DISTRIBUTION_ORDERS_MANAGE], write: P.DISTRIBUTION_ORDERS_MANAGE },
  { match: /^distribution\/load-sheets\/[^/]+\/(settle|settlement)$/, GET: [P.DISTRIBUTION_SETTLE, P.DISTRIBUTION_LOADSHEETS_MANAGE], POST: P.DISTRIBUTION_SETTLE },
  { match: /^distribution\/load-sheets(\/|$)/, GET: [P.DISTRIBUTION_LOADSHEETS_MANAGE, P.DISTRIBUTION_ORDERS_VIEW], write: P.DISTRIBUTION_LOADSHEETS_MANAGE },
  { match: /^distribution\/collections\/(verify|reject)$/, POST: P.DISTRIBUTION_COLLECTIONS_VERIFY },
  // Balances and ageing are khata figures.
  { match: /^distribution\/collections\/(recoveries|recovery-sheet)$/, GET: P.KHATA_VIEW },
  // A collector without verify sees only their own collections (checked in the service).
  { match: /^distribution\/collections(\/|$)/, GET: [P.DISTRIBUTION_COLLECTIONS_VERIFY, P.DISTRIBUTION_COLLECTIONS_COLLECT], write: P.DISTRIBUTION_COLLECTIONS_COLLECT },
  { match: /^distribution\/delivery\/staff$/, GET: [P.DISTRIBUTION_LOADSHEETS_MANAGE, P.DISTRIBUTION_ROUTES_MANAGE] },
  { match: /^distribution\/delivery(\/|$)/, GET: P.DISTRIBUTION_DELIVERY_REPORT, write: P.DISTRIBUTION_DELIVERY_REPORT },
  { match: /^distribution\/visits(\/|$)/, GET: P.DISTRIBUTION_ORDERS_VIEW, write: P.DISTRIBUTION_ORDERS_BOOK },
  { match: /^distribution\/reports(\/|$)/, GET: P.DISTRIBUTION_ORDERS_VIEW },
  // Phase 2. A salesman sees only the van given to him (checked in the service).
  { match: /^distribution\/vans\/[^/]+\/sell$/, POST: P.DISTRIBUTION_VANS_SELL },
  { match: /^distribution\/vans(\/|$)/, GET: [P.DISTRIBUTION_VANS_MANAGE, P.DISTRIBUTION_VANS_SELL, P.DISTRIBUTION_ORDERS_VIEW], write: P.DISTRIBUTION_VANS_MANAGE },
  { match: /^distribution\/returns\/(approve|reject)$/, POST: P.DISTRIBUTION_RETURNS_APPROVE },
  // A collector without approve sees only the returns they recorded (checked in the service).
  { match: /^distribution\/returns(\/|$)/, GET: [P.DISTRIBUTION_RETURNS_APPROVE, P.DISTRIBUTION_RETURNS_COLLECT, P.DISTRIBUTION_ORDERS_VIEW], write: P.DISTRIBUTION_RETURNS_COLLECT },
  { match: /^distribution\/principals(\/|$)/, GET: [P.DISTRIBUTION_CLAIMS_MANAGE, P.DISTRIBUTION_TARGETS_MANAGE, P.DISTRIBUTION_SCHEMES_MANAGE, P.DISTRIBUTION_ORDERS_VIEW], write: P.DISTRIBUTION_CLAIMS_MANAGE },
  { match: /^distribution\/claims(\/|$)/, GET: P.DISTRIBUTION_CLAIMS_MANAGE, write: P.DISTRIBUTION_CLAIMS_MANAGE },
  { match: /^distribution\/targets(\/|$)/, GET: [P.DISTRIBUTION_TARGETS_MANAGE, P.DISTRIBUTION_ORDERS_VIEW], write: P.DISTRIBUTION_TARGETS_MANAGE },
  { match: /^distribution\/cheques(\/|$)/, GET: [P.DISTRIBUTION_CHEQUES_MANAGE, P.DISTRIBUTION_COLLECTIONS_VERIFY], write: P.DISTRIBUTION_CHEQUES_MANAGE },
  { match: /^distribution(\/|$)/, GET: P.DISTRIBUTION_ORDERS_VIEW, write: P.DISTRIBUTION_ORDERS_MANAGE },

  /* Trade network. Reads that serve both sides list each permission that may read them;
     the service then checks the side (buyer or seller) and the link. */
  { match: /^trade-network\/(overview|links\/[^/]+\/statement)$/, GET: [P.TRADE_BUY, P.TRADE_SELL, P.TRADE_LINKS_MANAGE, P.TRADE_PAYMENTS_MANAGE] },
  { match: /^trade-network\/(find|directory)$/, GET: [P.TRADE_LINKS_MANAGE, P.TRADE_BUY] },
  { match: /^trade-network\/requests\/incoming$/, GET: [P.TRADE_SELL, P.TRADE_LINKS_MANAGE] },
  { match: /^trade-network\/(requests|profile)(\/|$)/, GET: [P.TRADE_LINKS_MANAGE, P.TRADE_SELL, P.TRADE_BUY], write: P.TRADE_LINKS_MANAGE },
  { match: /^trade-network\/links(\/|$)/, GET: [P.TRADE_LINKS_MANAGE, P.TRADE_SELL, P.TRADE_BUY], write: P.TRADE_LINKS_MANAGE },
  { match: /^trade-network\/payments(\/|$)/, GET: [P.TRADE_PAYMENTS_MANAGE, P.TRADE_BUY, P.TRADE_SELL], write: P.TRADE_PAYMENTS_MANAGE },
  { match: /^trade-network\/customers(\/|$)/, GET: P.TRADE_SELL },
  { match: /^trade-network\/orders\/[^/]+\/receive$/, POST: P.TRADE_RECEIVE },
  { match: /^trade-network\/receiving(\/|$)/, GET: [P.TRADE_RECEIVE, P.TRADE_BUY] },
  { match: /^trade-network\/(suppliers|orders)(\/|$)/, GET: P.TRADE_BUY, write: P.TRADE_BUY },
  { match: /^trade-network(\/|$)/, GET: P.TRADE_BUY, write: P.TRADE_LINKS_MANAGE },

  /* Data files. Each file also needs the view right of what it holds (checked in ExportsService). */
  { match: /^exports(\/|$)/, GET: P.EXPORTS_VIEW },

  /* Garments. Placed first so `garments/collections/:id/products` is not taken by
     the general products rule. Jobs take money at the counter (same right as the
     web's useGarmentsCan); measurements are customer records. */
  { match: /^garments\/(tailoring|alterations|reservations|layaway)(\/|$)/, GET: P.POS_USE, write: P.POS_USE },
  { match: /^garments\/measurements(\/|$)/, GET: P.CUSTOMERS_VIEW, write: P.CUSTOMERS_EDIT },
  { match: /^garments\/(collections|size-charts)(\/|$)/, GET: P.PRODUCTS_VIEW, write: P.PRODUCTS_EDIT },

  /* Retail reorder list: reading is the low-stock view, acting on it is buying. */
  { match: /^retail\/reorder(\/|$)/, GET: P.LOW_STOCK_VIEW, write: P.PURCHASES_CREATE },

  /* Salon. Placed before the general staff, commission and bookings rules. Bills,
     checkout, advances and package or membership sales take money at the counter;
     services, plans and packages are catalog setup; stylist setup is staff work. */
  { match: /^salon\/bills(\/|$)/, GET: P.POS_USE, POST: P.POS_USE },
  { match: /^salon\/appointments\/[^/]+\/(checkout|payments)$/, POST: P.POS_USE },
  { match: /^salon\/(memberships\/subscribe|packages\/purchase|memberships\/[^/]+\/cancel|packages\/purchases\/[^/]+\/cancel)$/, POST: P.POS_USE },
  { match: /^salon\/(memberships|packages)(\/|$)/, GET: [P.POS_USE, P.PRODUCTS_VIEW, P.CUSTOMERS_VIEW], write: P.PRODUCTS_EDIT },
  { match: /^salon\/services(\/|$)/, GET: [P.PRODUCTS_VIEW, P.POS_USE, P.SERVICE_BOOKINGS_VIEW], POST: P.PRODUCTS_CREATE, PATCH: P.PRODUCTS_EDIT, DELETE: P.PRODUCTS_DELETE },
  { match: /^salon\/staff-profiles\/commission$/, GET: [P.COMMISSION_VIEW, P.COMMISSION_MANAGE] },
  { match: /^salon\/staff-profiles(\/|$)/, GET: [P.STAFF_VIEW, P.POS_USE, P.SERVICE_BOOKINGS_VIEW], write: P.STAFF_MANAGE },
  { match: /^salon\/customer-profiles(\/|$)/, GET: P.CUSTOMERS_VIEW, write: P.CUSTOMERS_EDIT },
  // Gift vouchers are sold and spent at the counter; the list also serves customer lookups.
  { match: /^salon\/gift-vouchers(\/|$)/, GET: [P.POS_USE, P.CUSTOMERS_VIEW], POST: P.POS_USE },

  /* Auto parts. Vehicles and reminders are customer records, part details and
     makes/models are catalog data, mechanics are staff seen from the job board. */
  { match: /^autoparts\/(customer-vehicles|service-reminders)(\/|$)/, GET: P.CUSTOMERS_VIEW, write: P.CUSTOMERS_EDIT },
  { match: /^autoparts\/(part-profiles|vehicle-makes|vehicle-models)(\/|$)/, GET: P.PRODUCTS_VIEW, write: P.PRODUCTS_EDIT },
  { match: /^autoparts\/mechanics(\/|$)/, GET: P.SERVICE_JOBS_VIEW, write: P.STAFF_MANAGE },

  /* Toy store: the counter reads toy badges (age, cells, safety), so pos.use is
     enough to read them. Must stay above the general products rule. */
  { match: /^toystore\/products\/facts$/, GET: [P.PRODUCTS_VIEW, P.POS_USE] },

  /* Gym lockers and PT packages are bookings. Write routes also carry decorators. */
  { match: /^gym\/(lockers|pt-packages)(\/|$)/, GET: P.SERVICE_BOOKINGS_VIEW, write: P.SERVICE_BOOKINGS_MANAGE },

  /* Optical records. The counter reads them too; decorated routes keep their own checks. */
  { match: /^optical\/(eye-tests|prescriptions|optometrists|lens-orders)(\/|$)/, GET: [P.CUSTOMERS_VIEW, P.POS_USE], write: P.POS_USE },

  /* Pet shop animals are stock. The counter lists animals on sale, so pos.use can read. */
  { match: /^petshop\/live-animals(\/|$)/, GET: [P.PRODUCTS_VIEW, P.POS_USE], write: P.PRODUCTS_EDIT },

  /* ── Bikri aur counter ── */
  { match: /(^|\/)pos(\/|$)/, GET: P.POS_USE, write: P.POS_USE },
  /* Cancelling a bill always needs the void permission, whatever the PIN setting. */
  { match: /(^|\/)sales\/[^/]+\/void$/, POST: P.SALES_VOID },
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
  { match: /(^|\/)combos(\/|$)/, GET: P.PRODUCTS_VIEW, write: P.PRODUCTS_EDIT, DELETE: P.PRODUCTS_DELETE },
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
  /* Manufacturing: reading, recipes, and making goods are separate rights.
     The controller also carries decorators; this keeps the map complete. */
  // The counter reads which items are made when sold.
  { match: /^manufacturing\/make-on-sale$/, GET: [P.POS_USE, P.MANUFACTURING_VIEW] },
  { match: /^manufacturing\/recipes(\/|$)/, GET: P.MANUFACTURING_VIEW, write: P.MANUFACTURING_MANAGE },
  { match: /^manufacturing\/(runs|preview)(\/|$)/, GET: P.MANUFACTURING_VIEW, POST: P.MANUFACTURING_PRODUCE },
  { match: /^manufacturing(\/|$)/, GET: P.MANUFACTURING_VIEW, write: P.MANUFACTURING_MANAGE },

  /* ── Kharidari ── */
  { match: /(^|\/)suppliers(\/|$)/, GET: P.SUPPLIERS_VIEW, write: P.SUPPLIERS_EDIT },
  { match: /(^|\/)supplier-ledger(\/|$)/, GET: P.SUPPLIERS_VIEW, write: P.SUPPLIERS_EDIT },
  { match: /(^|\/)purchases(\/|$)/, GET: P.PURCHASES_VIEW, write: P.PURCHASES_CREATE },

  /* ── Hisab ── */
  { match: /(^|\/)dashboard(\/|$)/, GET: P.DASHBOARD_VIEW },
  { match: /(^|\/)day-book(\/|$)/, GET: P.DASHBOARD_VIEW },
  /* The P&L shows profit, so it needs the profit permission, not the general reports one. */
  { match: /^reports\/pnl(\/|$)/, GET: P.PROFIT_REPORT_VIEW },
  /* Also a path that ends in `profit` (electronics/analytics/profit). */
  { match: /(^|\/)profit(-|\/|$)/, GET: P.PROFIT_REPORT_VIEW },
  /* Daily summary: reading is a report; sending it now is a settings action. */
  { match: /^reports\/daily-summary(\/|$)/, GET: P.REPORTS_VIEW, write: P.SETTINGS_EDIT },
  /* Customers report lives under reports, not customers. It needs report access
     AND customers.view; the controller's @RequirePermissions asks for both (a list
     here would mean either one). */
  { match: /(^|\/)reports\/customer-insights(\/|$)/, GET: P.REPORTS_VIEW },
  /* Staff & counters report: report access AND staff.view, both required by the controller. */
  { match: /^reports\/staff(\/|$)/, GET: P.REPORTS_VIEW },
  /* Audit report shows staff mistakes, logins and PIN use: same right as the activity log. */
  { match: /^reports\/audit(\/|$)/, GET: P.ACTIVITY_VIEW },
  { match: /(^|\/)reports(\/|$)/, GET: P.REPORTS_VIEW },
  { match: /(^|\/)accounting(\/|$)/, GET: P.REPORTS_VIEW, write: P.SETTINGS_EDIT },
  { match: /(^|\/)expenses(\/|$)/, GET: P.EXPENSES_VIEW, write: P.EXPENSES_CREATE },
  { match: /^income(\/|$)/, GET: P.INCOME_VIEW, write: P.INCOME_MANAGE },
  { match: /(^|\/)money(\/|$)/, GET: P.REPORTS_VIEW, write: P.EXPENSES_CREATE },

  /* ── Bande ── */
  { match: /(^|\/)staff(\/|$)/, GET: P.STAFF_VIEW, write: P.STAFF_MANAGE },
  /* Commission — rules aur adaigi malik ka kaam; dekhna alag.
     `summary` aur `detail` ke andar service khud chaant deti hai:
     jis ke paas sirf `commission.own` hai, usay apni hi line milti
     hai. Is liye yahan par sab se halki ijazat chalti hai. */
  /* The POS "sold by" picker: names of enrolled sellers only, needed at the counter. */
  { match: /^commission\/sellers$/, GET: [P.POS_USE, P.COMMISSION_OWN, P.COMMISSION_VIEW, P.COMMISSION_MANAGE] },
  { match: /^commission\/(rules|enroll|pay|people)(\/|$)/, GET: P.COMMISSION_MANAGE, write: P.COMMISSION_MANAGE },
  { match: /(^|\/)commission(\/|$)/, GET: [P.COMMISSION_OWN, P.COMMISSION_VIEW, P.COMMISSION_MANAGE], write: P.COMMISSION_MANAGE },
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
  // Furniture karigar reads: the order desk and the staff section both list them. Writes are decorated.
  { match: /^furniture\/carpenters(\/|$)/, GET: [P.SERVICE_JOBS_VIEW, P.STAFF_VIEW] },
  /* Carpet roll and piece reads: products, counter, transfers, adjustments, purchases, bookings and the online catalog all read rolls.
     Writes carry their own decorators. Reports and bills are decorated too. */
  { match: /^carpet-(rolls|cut-pieces)(\/|$)/, GET: [P.PRODUCTS_VIEW, P.POS_USE, P.STOCK_TRANSFERS_MANAGE, P.STOCK_ADJUSTMENTS_MANAGE, P.PURCHASES_CREATE, P.SERVICE_BOOKINGS_MANAGE, P.CATALOG_VIEW] },

  { match: /^(electronics|appliances)\/serial-tracking(\/|$)/, GET: P.ELECTRONICS_SERIALS_VIEW, write: P.ELECTRONICS_SERIALS_MANAGE },
  { match: /^(electronics|appliances|services-biz)\/warranty/, GET: P.ELECTRONICS_WARRANTY_VIEW, write: P.ELECTRONICS_WARRANTY_MANAGE },

  { match: /(^|\/)repair-tickets?(\/|$)/, GET: P.MOBILE_REPAIRS_VIEW, write: P.MOBILE_REPAIRS_MANAGE },
  { match: /(^|\/)(imei|used-phones)(\/|$)/, GET: P.MOBILE_IMEI_VIEW, write: P.MOBILE_IMEI_MANAGE },

  { match: /^restaurant\/(orders|tables|delivery|riders)(\/|$)/, GET: P.RESTAURANT_ORDERS_VIEW, write: P.RESTAURANT_ORDERS_MANAGE },
  { match: /^restaurant\/(kot|stations|recipes)(\/|$)/, GET: P.RESTAURANT_KITCHEN_VIEW, write: P.RESTAURANT_KITCHEN_MANAGE },
  { match: /^restaurant\/(menu-items|modifiers|happy-hours)(\/|$)/, GET: P.RESTAURANT_MENU_VIEW, write: P.RESTAURANT_MENU_MANAGE },

  { match: /(^|\/)(jobs|workshop-jobs|service-requests|dispatch|quotes)(\/|$)/, GET: P.SERVICE_JOBS_VIEW, write: P.SERVICE_JOBS_MANAGE },
  { match: /(^|\/)(bookings|appointments)(\/|$)/, GET: P.SERVICE_BOOKINGS_VIEW, write: P.SERVICE_BOOKINGS_MANAGE },

  { match: /(^|\/)online-orders?(\/|$)/, GET: P.ONLINE_ORDERS_VIEW, write: P.ONLINE_ORDERS_MANAGE },
  { match: /^online-products(\/|$)/, GET: P.ONLINE_PRODUCTS_VIEW, write: P.ONLINE_PRODUCTS_MANAGE },
  /* Ads spend and ROAS. The posting setting is a settings change; writing to expenses also needs expenses.create (checked in AdsService). */
  { match: /^ads\/settings(\/|$)/, GET: P.ADS_VIEW, write: P.SETTINGS_EDIT },
  { match: /^ads(\/|$)/, GET: P.ADS_VIEW, write: P.ADS_MANAGE },
  /* Price calculator shows cost and profit; the controller adds products.view and settings.edit where needed. */
  { match: /^price-calculator(\/|$)/, GET: P.COST_VIEW, write: P.COST_VIEW },
  { match: /(^|\/)marketplace/, GET: P.CATALOG_VIEW, write: P.CATALOG_MANAGE },

  /* ── PIN ka nizam ──
     Ye `settings` ke andar rehta hai magar settings ka hissa nahi.

     `pin-status` har logged-in bande ko chahiye: usi se app ko pata
     chalta hai ke lagat chhupani hai ya nahi. Ye call ruk jaye to
     app samajhta hai "koi PIN nahi laga" aur kharid ka bhao khol
     deta hai — yani rok lagane se ulta nuqsan hota hai.

     `verify-pin` bhi khula hai: PIN daal kar kholna hi to wo kaam
     hai jo har us bande ko karna hota hai jisay ijazat hai.

     Lagana / hatana / badalna — wo malik ka kaam hai. */
  { match: /^settings\/security\/(pin-status|verify-pin)(\/|$)/ },
  // Counter rules: every staff member at the POS must follow them.
  { match: /^settings\/counter(\/|$)/ },
  // Bill printing: every staff member prints receipts.
  { match: /^settings\/receipt(\/|$)/ },
  // Report display preferences: every report page reads them; nothing secret.
  { match: /^settings\/report-prefs(\/|$)/ },
  { match: /^settings\/security\/(set-pin|remove-pin|reset-pin|locked-routes)(\/|$)/, GET: P.SETTINGS_MANAGE, write: P.SETTINGS_MANAGE },

  /* ── Nizam ── */
  { match: /(^|\/)shops(\/|$)/, GET: P.SHOPS_VIEW, write: P.SHOPS_MANAGE },
  // A full data export and account deletion are owner-level, not general settings edits.
  { match: /^settings\/backup(\/|$)/, GET: P.BACKUP_MANAGE, write: P.BACKUP_MANAGE },
  { match: /^settings\/danger(\/|$)/, GET: P.SETTINGS_MANAGE, write: P.SETTINGS_MANAGE },
  { match: /^settings\/integrations(\/|$)/, GET: P.SETTINGS_MANAGE, write: P.SETTINGS_MANAGE },
  { match: /(^|\/)settings(\/|$)/, GET: P.SETTINGS_VIEW, write: P.SETTINGS_EDIT },
  { match: /(^|\/)activity-log(\/|$)/, GET: P.ACTIVITY_VIEW },
  { match: /(^|\/)backup(\/|$)/, GET: P.BACKUP_MANAGE, write: P.BACKUP_MANAGE },
  { match: /(^|\/)tax-authority(\/|$)/, GET: P.SETTINGS_VIEW, write: P.SETTINGS_EDIT },
  { match: /(^|\/)billing(\/|$)/, GET: P.BILLING_VIEW, write: P.BILLING_MANAGE },
  { match: /(^|\/)subscriptions(\/|$)/, GET: P.BILLING_VIEW, write: P.BILLING_MANAGE },
  { match: /^referrals(\/|$)/, GET: P.REFERRALS_VIEW },
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
  /^appearance(\/|$)/,
  /^preferences(\/|$)/,
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
): PermissionKey[] | null {
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
  const need: Need | undefined = (m === 'GET' || m === 'HEAD')
    ? rule.GET
    : ((rule as any)[m] ?? rule.write);

  if (!need) return null;
  return Array.isArray(need) ? need : [need];
}
