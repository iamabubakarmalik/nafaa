export const PERMISSIONS = {
  // POS & Sales
  POS_USE: 'pos.use',
  /** Hand discount above the shop's limit without the owner's PIN. Given per person. */
  POS_DISCOUNT_OVERRIDE: 'pos.discount_override',
  /** Switch the counter (or a bill line) away from the shop's default price tier. Automatic tiers set by the owner's rules do not need it. */
  POS_PRICE_TIER: 'pos.price_tier',
  SALES_VIEW: 'sales.view',
  SALES_VOID: 'sales.void',
  RETURNS_VIEW: 'returns.view',
  RETURNS_CREATE: 'returns.create',

  // Customers & Khata
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_EDIT: 'customers.edit',
  KHATA_VIEW: 'khata.view',
  KHATA_MANAGE: 'khata.manage',
  LOYALTY_VIEW: 'loyalty.view',
  DISCOUNTS_VIEW: 'discounts.view',
  DISCOUNTS_MANAGE: 'discounts.manage',

  // Cash Register
  CASH_REGISTER_VIEW: 'cash_register.view',
  CASH_REGISTER_OPEN: 'cash_register.open',
  CASH_REGISTER_CLOSE: 'cash_register.close',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  BRANDS_VIEW: 'brands.view',
  TAGS_VIEW: 'tags.view',
  CATEGORIES_VIEW: 'categories.view',

  // Inventory
  LOW_STOCK_VIEW: 'low_stock.view',
  BARCODE_LABELS_VIEW: 'barcode_labels.view',
  STOCK_MOVEMENTS_VIEW: 'stock_movements.view',
  STOCK_ADJUSTMENTS_MANAGE: 'stock_adjustments.manage',
  /** Change stock as a data correction, with no profit effect ("Galti theek karna"). */
  STOCK_ADJUSTMENTS_CORRECT: 'stock_adjustments.correct',
  STOCK_TRANSFERS_MANAGE: 'stock_transfers.manage',
  /** Manufacturing: see recipes, production and its report. */
  MANUFACTURING_VIEW: 'manufacturing.view',
  /** Manufacturing: create and change recipes. */
  MANUFACTURING_MANAGE: 'manufacturing.manage',
  /** Manufacturing: make goods (raw materials out, finished goods in) and reverse a production. */
  MANUFACTURING_PRODUCE: 'manufacturing.produce',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_EDIT: 'suppliers.edit',
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',

  // Reports
  DASHBOARD_VIEW: 'dashboard.view',
  /// Lagat, munafa aur margin dekhna. Ye bikri dekhne se alag hai:
  /// counter wala rate dekhta hai, magar "kitne me aayi thi" nahi.
  COST_VIEW: 'cost.view',
  REPORTS_VIEW: 'reports.view',
  PROFIT_REPORT_VIEW: 'profit_report.view',
  /// Nafaa AI assistant. Its answers still follow every other permission.
  AI_USE: 'ai.use',

  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',

  // Commission — staff se alag, jaan boojh kar.
  // Counter wale ko apni commission dekhni hoti hai, magar is ka
  // matlab ye nahi ke wo sab ki tankhwah aur attendance bhi dekhe.
  /// Sirf apni commission
  COMMISSION_OWN: 'commission.own',
  /// Sab bandon ki commission
  COMMISSION_VIEW: 'commission.view',
  /// Rules banana aur adaigi likhna
  COMMISSION_MANAGE: 'commission.manage',

  // Finance
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  /** Other income (company incentives, scheme claims, commission, rent): see the record. */
  INCOME_VIEW: 'income.view',
  /** Other income: add, edit and delete. */
  INCOME_MANAGE: 'income.manage',
  EXPORTS_VIEW: 'exports.view',
  BACKUP_MANAGE: 'backup.manage',

  // System
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  SHOPS_VIEW: 'shops.view',
  SHOPS_MANAGE: 'shops.manage',
  ACTIVITY_VIEW: 'activity.view',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE: 'settings.manage',

  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  PLANS_VIEW: 'plans.view',
  PLAN_USAGE_VIEW: 'plan_usage.view',
  REFERRALS_VIEW: 'referrals.view',

  // ─────────────────────────────────────────────────────────────
  // INDUSTRY KE APNE SAFHE
  // ─────────────────────────────────────────────────────────────
  // Har industry ke apne kaam hain jo kirana ki dukaan me hote hi
  // nahi — bakery ki baking, beej wale ka farmer ka khata, hotel ka
  // KOT. Inhe `products.view` jaisi aam ijazat se baandhna ghalat
  // hai: jo banda maal dekh sakta hai, zaroori nahi ke wo customer
  // ka udhaar bhi dekh sake.
  //
  // Har feature ke do darje: dekhna, aur badalna.
  // Safhe par sirf USI industry ka group dikhta hai jis par dukaan
  // chal rahi hai — baqi ka shor nahi hota.

  // Bakery
  BAKERY_ORDERS_VIEW: 'bakery.orders.view',
  BAKERY_ORDERS_MANAGE: 'bakery.orders.manage',
  BAKERY_PRODUCTION_VIEW: 'bakery.production.view',
  BAKERY_PRODUCTION_MANAGE: 'bakery.production.manage',
  BAKERY_INGREDIENTS_VIEW: 'bakery.ingredients.view',
  BAKERY_INGREDIENTS_MANAGE: 'bakery.ingredients.manage',

  // Agri / beej
  AGRI_FARMERS_VIEW: 'agri.farmers.view',
  AGRI_FARMERS_MANAGE: 'agri.farmers.manage',
  AGRI_ORDERS_VIEW: 'agri.orders.view',
  AGRI_ORDERS_MANAGE: 'agri.orders.manage',
  AGRI_ADVISORY_VIEW: 'agri.advisory.view',
  AGRI_ADVISORY_MANAGE: 'agri.advisory.manage',

  // Electronics
  ELECTRONICS_SERIALS_VIEW: 'electronics.serials.view',
  ELECTRONICS_SERIALS_MANAGE: 'electronics.serials.manage',
  ELECTRONICS_WARRANTY_VIEW: 'electronics.warranty.view',
  ELECTRONICS_WARRANTY_MANAGE: 'electronics.warranty.manage',

  // Mobile
  MOBILE_REPAIRS_VIEW: 'mobile.repairs.view',
  MOBILE_REPAIRS_MANAGE: 'mobile.repairs.manage',
  MOBILE_IMEI_VIEW: 'mobile.imei.view',
  MOBILE_IMEI_MANAGE: 'mobile.imei.manage',

  // Restaurant
  RESTAURANT_ORDERS_VIEW: 'restaurant.orders.view',
  RESTAURANT_ORDERS_MANAGE: 'restaurant.orders.manage',
  RESTAURANT_KITCHEN_VIEW: 'restaurant.kitchen.view',
  RESTAURANT_KITCHEN_MANAGE: 'restaurant.kitchen.manage',
  RESTAURANT_MENU_VIEW: 'restaurant.menu.view',
  RESTAURANT_MENU_MANAGE: 'restaurant.menu.manage',

  // Services / workshop (services-biz, autoparts, appliances, salon)
  SERVICE_JOBS_VIEW: 'service.jobs.view',
  SERVICE_JOBS_MANAGE: 'service.jobs.manage',
  SERVICE_BOOKINGS_VIEW: 'service.bookings.view',
  SERVICE_BOOKINGS_MANAGE: 'service.bookings.manage',

  // Clinic medical records (checkup, vitals, prescriptions, lab, vaccines)
  CLINIC_RECORDS_VIEW: 'clinic.records.view',
  CLINIC_RECORDS_MANAGE: 'clinic.records.manage',

  // Online dukaan
  ONLINE_ORDERS_VIEW: 'online_orders.view',
  ONLINE_ORDERS_MANAGE: 'online_orders.manage',
  /** Online products: see links, channel prices, stock sent and sync errors. */
  ONLINE_PRODUCTS_VIEW: 'online_products.view',
  /** Online products: link and unlink, create channel items in Nafaa, set channel prices and stock buffer, sync now. */
  ONLINE_PRODUCTS_MANAGE: 'online_products.manage',
  CATALOG_VIEW: 'catalog.view',
  CATALOG_MANAGE: 'catalog.manage',
  /** Ads spend log and the ROAS report: see them. Profit columns also need cost.view and profit_report.view. */
  ADS_VIEW: 'ads.view',
  /** Ads spend: add, edit, delete and import. Writing it to expenses also needs expenses.create. */
  ADS_MANAGE: 'ads.manage',

  // Distribution (wholesale): orders booked in the field, routes, load sheets, recoveries
  /** Sales orders, load sheets, visits and the distribution reports: read them. */
  DISTRIBUTION_ORDERS_VIEW: 'distribution.orders.view',
  /** Book orders, record visits and use the booker app (bootstrap, sync, own orders). */
  DISTRIBUTION_ORDERS_BOOK: 'distribution.orders.book',
  /** Edit any booked order, approve and invoice orders, cancel orders not yet invoiced. */
  DISTRIBUTION_ORDERS_MANAGE: 'distribution.orders.manage',
  /** Book an order at a price other than the customer's price list. */
  DISTRIBUTION_PRICE_OVERRIDE: 'distribution.price_override',
  /** Make, change, dispatch and cancel load sheets. */
  DISTRIBUTION_LOADSHEETS_MANAGE: 'distribution.loadsheets.manage',
  /** Settle a load sheet: delivered, partly delivered or returned invoices (returns go back through the bill), cash handed in. */
  DISTRIBUTION_SETTLE: 'distribution.settle',
  /** Make and change routes and put customers on them. */
  DISTRIBUTION_ROUTES_MANAGE: 'distribution.routes.manage',
  DISTRIBUTION_PRICELISTS_VIEW: 'distribution.pricelists.view',
  DISTRIBUTION_PRICELISTS_MANAGE: 'distribution.pricelists.manage',
  DISTRIBUTION_SCHEMES_MANAGE: 'distribution.schemes.manage',
  /** Record money collected in the field (stays pending until verified). */
  DISTRIBUTION_COLLECTIONS_COLLECT: 'distribution.collections.collect',
  /** Verify or reject field collections; a verified one is posted to the customer's khata. */
  DISTRIBUTION_COLLECTIONS_VERIFY: 'distribution.collections.verify',
  /** Delivery app: see own dispatched load sheets and report each invoice (delivered, returns, cash). The office still settles. */
  DISTRIBUTION_DELIVERY_REPORT: 'distribution.delivery.report',
  /** Vans: add vans, load from the godown, close the day (count, short / excess, unload). */
  DISTRIBUTION_VANS_MANAGE: 'distribution.vans.manage',
  /** Sell from a van on the route (spot invoices) and see that van's stock. */
  DISTRIBUTION_VANS_SELL: 'distribution.vans.sell',
  /** Record market returns on the route (they wait for approval). */
  DISTRIBUTION_RETURNS_COLLECT: 'distribution.returns.collect',
  /** Approve or reject market returns: khata credit, stock back, damaged written off. */
  DISTRIBUTION_RETURNS_APPROVE: 'distribution.returns.approve',
  /** Principal claims: make, print, submit and record money received (other income). */
  DISTRIBUTION_CLAIMS_MANAGE: 'distribution.claims.manage',
  /** Set monthly targets for bookers, routes, brands and principals. */
  DISTRIBUTION_TARGETS_MANAGE: 'distribution.targets.manage',
  /** Cheque register: deposit, clear and bounce (a bounce takes the payment back off the khata). */
  DISTRIBUTION_CHEQUES_MANAGE: 'distribution.cheques.manage',

  // Trade network: ordering between linked businesses on Nafaa
  /** Buyer: see linked suppliers and their catalogs, place and track orders, match products. */
  TRADE_BUY: 'trade.buy',
  /** Buyer: receive a delivered network order into stock ("Maal mil gaya"); makes the Purchase. */
  TRADE_RECEIVE: 'trade.receive',
  /** Seller: see network customers, link requests and the statement with each buyer. Needs distribution on. */
  TRADE_SELL: 'trade.sell',
  /** Send link requests (buyer); approve, reject, pause and unlink, set terms, edit the directory profile and invite code (seller). */
  TRADE_LINKS_MANAGE: 'trade.links.manage',
  /** Record network payments and confirm or dispute payments the other side recorded. */
  TRADE_PAYMENTS_MANAGE: 'trade.payments.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  OWNER: ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,

  MANAGER: [
    PERMISSIONS.COST_VIEW,
    PERMISSIONS.COMMISSION_OWN, PERMISSIONS.COMMISSION_VIEW, PERMISSIONS.COMMISSION_MANAGE,
    // Industry ke apne kaam — manager poori dukaan chalata hai
    PERMISSIONS.BAKERY_ORDERS_VIEW, PERMISSIONS.BAKERY_ORDERS_MANAGE,
    PERMISSIONS.BAKERY_PRODUCTION_VIEW, PERMISSIONS.BAKERY_PRODUCTION_MANAGE,
    PERMISSIONS.BAKERY_INGREDIENTS_VIEW, PERMISSIONS.BAKERY_INGREDIENTS_MANAGE,
    PERMISSIONS.AGRI_FARMERS_VIEW, PERMISSIONS.AGRI_FARMERS_MANAGE,
    PERMISSIONS.AGRI_ORDERS_VIEW, PERMISSIONS.AGRI_ORDERS_MANAGE,
    PERMISSIONS.AGRI_ADVISORY_VIEW, PERMISSIONS.AGRI_ADVISORY_MANAGE,
    PERMISSIONS.ELECTRONICS_SERIALS_VIEW, PERMISSIONS.ELECTRONICS_SERIALS_MANAGE,
    PERMISSIONS.ELECTRONICS_WARRANTY_VIEW, PERMISSIONS.ELECTRONICS_WARRANTY_MANAGE,
    PERMISSIONS.MOBILE_REPAIRS_VIEW, PERMISSIONS.MOBILE_REPAIRS_MANAGE,
    PERMISSIONS.MOBILE_IMEI_VIEW, PERMISSIONS.MOBILE_IMEI_MANAGE,
    PERMISSIONS.RESTAURANT_ORDERS_VIEW, PERMISSIONS.RESTAURANT_ORDERS_MANAGE,
    PERMISSIONS.RESTAURANT_KITCHEN_VIEW, PERMISSIONS.RESTAURANT_KITCHEN_MANAGE,
    PERMISSIONS.RESTAURANT_MENU_VIEW, PERMISSIONS.RESTAURANT_MENU_MANAGE,
    PERMISSIONS.SERVICE_JOBS_VIEW, PERMISSIONS.SERVICE_JOBS_MANAGE,
    PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_MANAGE,
    PERMISSIONS.CLINIC_RECORDS_VIEW, PERMISSIONS.CLINIC_RECORDS_MANAGE,
    PERMISSIONS.ONLINE_ORDERS_VIEW, PERMISSIONS.ONLINE_ORDERS_MANAGE,
    PERMISSIONS.ONLINE_PRODUCTS_VIEW, PERMISSIONS.ONLINE_PRODUCTS_MANAGE,
    PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_MANAGE,
    // Distribution: everything except booking at another price.
    PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_BOOK, PERMISSIONS.DISTRIBUTION_ORDERS_MANAGE,
    PERMISSIONS.DISTRIBUTION_LOADSHEETS_MANAGE, PERMISSIONS.DISTRIBUTION_SETTLE, PERMISSIONS.DISTRIBUTION_ROUTES_MANAGE,
    PERMISSIONS.DISTRIBUTION_PRICELISTS_VIEW, PERMISSIONS.DISTRIBUTION_PRICELISTS_MANAGE, PERMISSIONS.DISTRIBUTION_SCHEMES_MANAGE,
    PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT, PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY,
    PERMISSIONS.DISTRIBUTION_DELIVERY_REPORT,
    PERMISSIONS.DISTRIBUTION_VANS_MANAGE, PERMISSIONS.DISTRIBUTION_VANS_SELL, PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT,
    PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE, PERMISSIONS.DISTRIBUTION_CLAIMS_MANAGE, PERMISSIONS.DISTRIBUTION_TARGETS_MANAGE,
    PERMISSIONS.DISTRIBUTION_CHEQUES_MANAGE,
    // Trade network: everything except linking (credit terms stay with the owner).
    PERMISSIONS.TRADE_BUY, PERMISSIONS.TRADE_RECEIVE, PERMISSIONS.TRADE_SELL, PERMISSIONS.TRADE_PAYMENTS_MANAGE,
    PERMISSIONS.POS_USE,
    PERMISSIONS.POS_PRICE_TIER,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_VOID,
    PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.KHATA_VIEW,
    PERMISSIONS.KHATA_MANAGE,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.DISCOUNTS_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.BRANDS_VIEW,
    PERMISSIONS.TAGS_VIEW,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.LOW_STOCK_VIEW,
    PERMISSIONS.BARCODE_LABELS_VIEW,
    PERMISSIONS.STOCK_MOVEMENTS_VIEW,
    PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE,
    PERMISSIONS.STOCK_ADJUSTMENTS_CORRECT,
    PERMISSIONS.STOCK_TRANSFERS_MANAGE,
    PERMISSIONS.MANUFACTURING_VIEW,
    PERMISSIONS.MANUFACTURING_MANAGE,
    PERMISSIONS.MANUFACTURING_PRODUCE,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.PROFIT_REPORT_VIEW,
    PERMISSIONS.AI_USE,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.INCOME_VIEW,
    PERMISSIONS.INCOME_MANAGE,
    PERMISSIONS.EXPORTS_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.SHOPS_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.PLANS_VIEW,
    PERMISSIONS.PLAN_USAGE_VIEW,
    PERMISSIONS.REFERRALS_VIEW,
  ],

  CASHIER: [
    // Apni commission — doosron ki nahi
    PERMISSIONS.COMMISSION_OWN,
    // ── POS chalane ke liye lazmi ──
    // Counter par maal, category aur rate parhe baghair bikri hoti
    // hi nahi. Ye nishan hata diye jayen to POS khali reh jata hai —
    // Team ke safhe par is ki tambeeh bhi aati hai.
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.BRANDS_VIEW,
    PERMISSIONS.TAGS_VIEW,
    PERMISSIONS.SHOPS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,

    // Counter wale ko wohi kaam jo bikri ke liye chahiye — order
    // lena aur dekhna. Banane/badalne ka kaam manager ka hai.
    PERMISSIONS.BAKERY_ORDERS_VIEW, PERMISSIONS.BAKERY_ORDERS_MANAGE,
    PERMISSIONS.AGRI_FARMERS_VIEW,
    PERMISSIONS.AGRI_ORDERS_VIEW,
    PERMISSIONS.ELECTRONICS_SERIALS_VIEW,
    PERMISSIONS.ELECTRONICS_WARRANTY_VIEW,
    PERMISSIONS.MOBILE_REPAIRS_VIEW,
    PERMISSIONS.MOBILE_IMEI_VIEW,
    PERMISSIONS.RESTAURANT_ORDERS_VIEW, PERMISSIONS.RESTAURANT_ORDERS_MANAGE,
    PERMISSIONS.RESTAURANT_MENU_VIEW,
    PERMISSIONS.SERVICE_JOBS_VIEW,
    PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_MANAGE,
    PERMISSIONS.CLINIC_RECORDS_VIEW, PERMISSIONS.CLINIC_RECORDS_MANAGE,
    PERMISSIONS.ONLINE_ORDERS_VIEW,
    PERMISSIONS.POS_USE,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.KHATA_VIEW,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.DISCOUNTS_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.LOW_STOCK_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  STAFF: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.LOW_STOCK_VIEW,
    PERMISSIONS.STOCK_MOVEMENTS_VIEW,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
  ],
};

/**
 * Check if user has a specific permission.
 * OWNER and SUPER_ADMIN always return true.
 */
export function hasPermission(
  userRole: string,
  userPermissions: string[] | undefined,
  required: PermissionKey,
): boolean {
  if (userRole === 'OWNER' || userRole === 'SUPER_ADMIN') return true;
  return (userPermissions ?? []).includes(required);
}

/**
 * Alias kept for backward compatibility with newer code paths.
 */
/**
 * POS counter chalane ke liye kaun si ijazat lazmi hai.
 *
 * `pos.use` sirf safha kholne deti hai. Maal, rate aur category
 * parhe baghair counter khali rehta hai, aur offline sync bhi ruk
 * jati hai. Ye list Team ke safhe par tambeeh dikhane ke liye hai —
 * rok nahi lagati, sirf batati hai ke kya toot jayega.
 */
export const POS_REQUIRED_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.SHOPS_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
];

export const userHasPermission = hasPermission;

/**
 * Permissions the booker app needs to work. Like POS_REQUIRED_PERMISSIONS this
 * only drives a warning on the Team page; nothing is granted or blocked by it.
 * Bootstrap pages customers only with customers.view and products only with
 * products.view, so without them the app has nothing to book against.
 */
export const BOOKER_REQUIRED_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DISTRIBUTION_ORDERS_BOOK,
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.PRODUCTS_VIEW,
];

export interface PermissionPreset {
  key: 'ORDER_BOOKER' | 'DELIVERY' | 'VAN_SALESMAN' | 'DISTRIBUTION_MANAGER';
  label: string;
  /** Role the user is created with; the permissions below replace that role's defaults. */
  role: 'STAFF' | 'MANAGER';
  description: string;
  permissions: PermissionKey[];
}

/**
 * Ready-made permission sets for distribution staff. The Team page offers them
 * as a starting point; every box stays visible and the owner can change it.
 */
export const DISTRIBUTION_PRESETS: PermissionPreset[] = [
  {
    key: 'ORDER_BOOKER', label: 'Order Booker', role: 'STAFF',
    description: 'Route par jaa kar Order book karta hai, visit aur recovery likhta hai',
    permissions: [
      PERMISSIONS.DISTRIBUTION_ORDERS_BOOK,
      PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT,
      PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.KHATA_VIEW,
    ],
  },
  {
    key: 'DELIVERY', label: 'Delivery', role: 'STAFF',
    description: 'Phone par load sheet ka maal deliver karta hai, har Invoice ki report aur cash laata hai',
    permissions: [
      PERMISSIONS.DISTRIBUTION_DELIVERY_REPORT,
      PERMISSIONS.DISTRIBUTION_ORDERS_VIEW,
      PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT,
      PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
    ],
  },
  {
    key: 'VAN_SALESMAN', label: 'Van Salesman', role: 'STAFF',
    description: 'Van se maal bechta hai (spot Invoice), recovery, cheque aur market return leta hai',
    permissions: [
      PERMISSIONS.DISTRIBUTION_VANS_SELL,
      PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT,
      PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.KHATA_VIEW,
    ],
  },
  {
    key: 'DISTRIBUTION_MANAGER', label: 'Distribution Manager', role: 'MANAGER',
    description: 'Orders approve, Invoice, load sheet, settlement aur recovery verify karta hai',
    permissions: [
      PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_BOOK, PERMISSIONS.DISTRIBUTION_ORDERS_MANAGE,
      PERMISSIONS.DISTRIBUTION_LOADSHEETS_MANAGE, PERMISSIONS.DISTRIBUTION_SETTLE, PERMISSIONS.DISTRIBUTION_ROUTES_MANAGE,
      PERMISSIONS.DISTRIBUTION_PRICELISTS_VIEW, PERMISSIONS.DISTRIBUTION_PRICELISTS_MANAGE, PERMISSIONS.DISTRIBUTION_SCHEMES_MANAGE,
      PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT, PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY, PERMISSIONS.DISTRIBUTION_DELIVERY_REPORT,
      PERMISSIONS.DISTRIBUTION_VANS_MANAGE, PERMISSIONS.DISTRIBUTION_VANS_SELL, PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT,
      PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE, PERMISSIONS.DISTRIBUTION_CLAIMS_MANAGE, PERMISSIONS.DISTRIBUTION_TARGETS_MANAGE,
      PERMISSIONS.DISTRIBUTION_CHEQUES_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT, PERMISSIONS.KHATA_VIEW, PERMISSIONS.KHATA_MANAGE,
      PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.SALES_VIEW, PERMISSIONS.RETURNS_VIEW, PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SHOPS_VIEW, PERMISSIONS.STAFF_VIEW, PERMISSIONS.TEAM_VIEW,
    ],
  },
];
