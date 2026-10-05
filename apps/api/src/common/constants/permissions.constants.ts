export const PERMISSIONS = {
  // POS & Sales
  POS_USE: 'pos.use',
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
  STOCK_TRANSFERS_MANAGE: 'stock_transfers.manage',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_EDIT: 'suppliers.edit',
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',

  // Reports
  DASHBOARD_VIEW: 'dashboard.view',
  REPORTS_VIEW: 'reports.view',
  PROFIT_REPORT_VIEW: 'profit_report.view',

  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',

  // Finance
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
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

  // Online dukaan
  ONLINE_ORDERS_VIEW: 'online_orders.view',
  ONLINE_ORDERS_MANAGE: 'online_orders.manage',
  CATALOG_VIEW: 'catalog.view',
  CATALOG_MANAGE: 'catalog.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  OWNER: ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,

  MANAGER: [
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
    PERMISSIONS.ONLINE_ORDERS_VIEW, PERMISSIONS.ONLINE_ORDERS_MANAGE,
    PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.POS_USE,
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
    PERMISSIONS.STOCK_TRANSFERS_MANAGE,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.PROFIT_REPORT_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
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
