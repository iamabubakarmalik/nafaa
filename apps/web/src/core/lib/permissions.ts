// ═══════════════════════════════════════════════════════════════
// PERMISSIONS — Frontend mirror of backend permission constants
// ═══════════════════════════════════════════════════════════════

export const PERMISSIONS = {
  POS_USE: 'pos.use',
  SALES_VIEW: 'sales.view',
  SALES_VOID: 'sales.void',
  RETURNS_VIEW: 'returns.view',
  RETURNS_CREATE: 'returns.create',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_EDIT: 'customers.edit',
  KHATA_VIEW: 'khata.view',
  KHATA_MANAGE: 'khata.manage',
  LOYALTY_VIEW: 'loyalty.view',
  DISCOUNTS_VIEW: 'discounts.view',
  DISCOUNTS_MANAGE: 'discounts.manage',
  CASH_REGISTER_VIEW: 'cash_register.view',
  CASH_REGISTER_OPEN: 'cash_register.open',
  CASH_REGISTER_CLOSE: 'cash_register.close',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  BRANDS_VIEW: 'brands.view',
  TAGS_VIEW: 'tags.view',
  CATEGORIES_VIEW: 'categories.view',
  LOW_STOCK_VIEW: 'low_stock.view',
  BARCODE_LABELS_VIEW: 'barcode_labels.view',
  STOCK_MOVEMENTS_VIEW: 'stock_movements.view',
  STOCK_ADJUSTMENTS_MANAGE: 'stock_adjustments.manage',
  STOCK_TRANSFERS_MANAGE: 'stock_transfers.manage',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_EDIT: 'suppliers.edit',
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  DASHBOARD_VIEW: 'dashboard.view',
  REPORTS_VIEW: 'reports.view',
  PROFIT_REPORT_VIEW: 'profit_report.view',
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPORTS_VIEW: 'exports.view',
  BACKUP_MANAGE: 'backup.manage',
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  SHOPS_VIEW: 'shops.view',
  SHOPS_MANAGE: 'shops.manage',
  ACTIVITY_VIEW: 'activity.view',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE: 'settings.manage',
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  PLANS_VIEW: 'plans.view',
  PLAN_USAGE_VIEW: 'plan_usage.view',
  REFERRALS_VIEW: 'referrals.view',

  // ── Industry ke apne safhe ──
  BAKERY_ORDERS_VIEW: 'bakery.orders.view',
  BAKERY_ORDERS_MANAGE: 'bakery.orders.manage',
  BAKERY_PRODUCTION_VIEW: 'bakery.production.view',
  BAKERY_PRODUCTION_MANAGE: 'bakery.production.manage',
  BAKERY_INGREDIENTS_VIEW: 'bakery.ingredients.view',
  BAKERY_INGREDIENTS_MANAGE: 'bakery.ingredients.manage',
  AGRI_FARMERS_VIEW: 'agri.farmers.view',
  AGRI_FARMERS_MANAGE: 'agri.farmers.manage',
  AGRI_ORDERS_VIEW: 'agri.orders.view',
  AGRI_ORDERS_MANAGE: 'agri.orders.manage',
  AGRI_ADVISORY_VIEW: 'agri.advisory.view',
  AGRI_ADVISORY_MANAGE: 'agri.advisory.manage',
  ELECTRONICS_SERIALS_VIEW: 'electronics.serials.view',
  ELECTRONICS_SERIALS_MANAGE: 'electronics.serials.manage',
  ELECTRONICS_WARRANTY_VIEW: 'electronics.warranty.view',
  ELECTRONICS_WARRANTY_MANAGE: 'electronics.warranty.manage',
  MOBILE_REPAIRS_VIEW: 'mobile.repairs.view',
  MOBILE_REPAIRS_MANAGE: 'mobile.repairs.manage',
  MOBILE_IMEI_VIEW: 'mobile.imei.view',
  MOBILE_IMEI_MANAGE: 'mobile.imei.manage',
  RESTAURANT_ORDERS_VIEW: 'restaurant.orders.view',
  RESTAURANT_ORDERS_MANAGE: 'restaurant.orders.manage',
  RESTAURANT_KITCHEN_VIEW: 'restaurant.kitchen.view',
  RESTAURANT_KITCHEN_MANAGE: 'restaurant.kitchen.manage',
  RESTAURANT_MENU_VIEW: 'restaurant.menu.view',
  RESTAURANT_MENU_MANAGE: 'restaurant.menu.manage',
  SERVICE_JOBS_VIEW: 'service.jobs.view',
  SERVICE_JOBS_MANAGE: 'service.jobs.manage',
  SERVICE_BOOKINGS_VIEW: 'service.bookings.view',
  SERVICE_BOOKINGS_MANAGE: 'service.bookings.manage',
  ONLINE_ORDERS_VIEW: 'online_orders.view',
  ONLINE_ORDERS_MANAGE: 'online_orders.manage',
  CATALOG_VIEW: 'catalog.view',
  CATALOG_MANAGE: 'catalog.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

/* ═════════════════════════════════════════════════════════════
   ROLE KE DEFAULTS — backend ki naqal
   ─────────────────────────────────────────────────────────────
   Ye list backend ke `permissions.constants.ts` se hu-ba-hu copy
   hai. Pehle dono alag alag badalti thin aur chup chap bhatak gayi
   thin: frontend cashier ko 14 ijazat dikhata tha, backend us se
   zyada deta tha. Team ke safhe par ginti ghalat aati thi.

   Badalna ho to BACKEND me badlein, phir yahan copy karein.
   ═════════════════════════════════════════════════════════════ */
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

// ═══ HELPERS ═══

export function hasPermission(
  userRole: string | undefined,
  userPermissions: string[] | undefined,
  required: PermissionKey | string,
): boolean {
  if (!userRole) return false;
  if (userRole === 'OWNER' || userRole === 'SUPER_ADMIN') return true;
  return (userPermissions ?? []).includes(required as string);
}

/** Check if user has ANY of the given permissions */
export function hasAnyPermission(
  userRole: string | undefined,
  userPermissions: string[] | undefined,
  required: Array<PermissionKey | string>,
): boolean {
  if (!userRole) return false;
  if (userRole === 'OWNER' || userRole === 'SUPER_ADMIN') return true;
  const set = new Set(userPermissions ?? []);
  return required.some((p) => set.has(p as string));
}

/** Check if user has ALL of the given permissions */
export function hasAllPermissions(
  userRole: string | undefined,
  userPermissions: string[] | undefined,
  required: Array<PermissionKey | string>,
): boolean {
  if (!userRole) return false;
  if (userRole === 'OWNER' || userRole === 'SUPER_ADMIN') return true;
  const set = new Set(userPermissions ?? []);
  return required.every((p) => set.has(p as string));
}

export const userHasPermission = hasPermission;

export function isOwner(userRole: string | undefined): boolean {
  return userRole === 'OWNER' || userRole === 'SUPER_ADMIN';
}

export function isShopLocked(userRole: string | undefined): boolean {
  return !isOwner(userRole);
}

export const OWNER_ONLY_PATHS = new Set<string>([
  '/shops', '/shops/overview', '/team', '/staff/salary/new',
  '/billing', '/plans', '/referrals', '/backup', '/settings',
  '/activity-log', '/fbr', '/fbr/invoices', '/fbr/reports', '/fbr/analytics',
]);

export function isOwnerOnlyPath(path: string): boolean {
  return OWNER_ONLY_PATHS.has(path);
}

// ═══ LABELS ═══

export const PERMISSION_LABELS: Record<string, string> = {
  'pos.use': 'POS Counter Use', 'sales.view': 'View Sales', 'sales.void': 'Void Sales',
  'returns.view': 'View Returns', 'returns.create': 'Create Returns',
  'customers.view': 'View Customers', 'customers.edit': 'Edit Customers',
  'khata.view': 'View Udhaar/Khata', 'khata.manage': 'Manage Udhaar/Khata',
  'loyalty.view': 'View Loyalty', 'discounts.view': 'View Discounts', 'discounts.manage': 'Manage Discounts',
  'cash_register.view': 'View Cash Register', 'cash_register.open': 'Open Cash Register', 'cash_register.close': 'Close Cash Register',
  'products.view': 'View Products', 'products.create': 'Create Products', 'products.edit': 'Edit Products', 'products.delete': 'Delete Products',
  'brands.view': 'View Brands', 'tags.view': 'View Tags', 'categories.view': 'View Categories',
  'low_stock.view': 'View Low Stock', 'barcode_labels.view': 'Barcode Labels',
  'stock_movements.view': 'View Stock Movements', 'stock_adjustments.manage': 'Manage Adjustments', 'stock_transfers.manage': 'Manage Transfers',
  'suppliers.view': 'View Suppliers', 'suppliers.edit': 'Edit Suppliers',
  'purchases.view': 'View Purchases', 'purchases.create': 'Create Purchases',
  'dashboard.view': 'View Dashboard', 'reports.view': 'View Reports', 'profit_report.view': 'Profit Report',
  'staff.view': 'View Staff', 'staff.manage': 'Manage Staff',
  'expenses.view': 'View Expenses', 'expenses.create': 'Create Expenses',
  'exports.view': 'Data Exports', 'backup.manage': 'Manage Backups',
  'team.view': 'View Team', 'team.manage': 'Manage Team',
  'shops.view': 'View Shops', 'shops.manage': 'Manage Shops',
  'activity.view': 'View Activity Log',
  'settings.view': 'View Settings', 'settings.edit': 'Edit Settings', 'settings.manage': 'Manage Settings',
  'billing.view': 'View Billing', 'billing.manage': 'Manage Billing',
  'plans.view': 'View Plans', 'plan_usage.view': 'View Plan Usage', 'referrals.view': 'View Referrals',

  // ── Industry ke apne kaam ──
  'bakery.orders.view': 'Cake / bulk orders dekhein', 'bakery.orders.manage': 'Cake / bulk orders banayein',
  'bakery.production.view': 'Baking plan dekhein', 'bakery.production.manage': 'Baking plan chalayein',
  'bakery.ingredients.view': 'Banane ka saamaan dekhein', 'bakery.ingredients.manage': 'Saamaan ka hisab badlein',
  'agri.farmers.view': 'Farmer dekhein', 'agri.farmers.manage': 'Farmer banayein / badlein',
  'agri.orders.view': 'Bare order dekhein', 'agri.orders.manage': 'Bare order banayein',
  'agri.advisory.view': 'Mashwara dekhein', 'agri.advisory.manage': 'Mashwara likhein',
  'electronics.serials.view': 'Serial / IMEI dekhein', 'electronics.serials.manage': 'Serial / IMEI darj karein',
  'electronics.warranty.view': 'Warranty claim dekhein', 'electronics.warranty.manage': 'Warranty claim chalayein',
  'mobile.repairs.view': 'Marammat dekhein', 'mobile.repairs.manage': 'Marammat chalayein',
  'mobile.imei.view': 'IMEI / purane phone dekhein', 'mobile.imei.manage': 'IMEI / purane phone darj karein',
  'restaurant.orders.view': 'Order aur table dekhein', 'restaurant.orders.manage': 'Order lein aur chalayein',
  'restaurant.kitchen.view': 'Kitchen (KOT) dekhein', 'restaurant.kitchen.manage': 'Kitchen chalayein',
  'restaurant.menu.view': 'Menu dekhein', 'restaurant.menu.manage': 'Menu badlein',
  'service.jobs.view': 'Kaam / job dekhein', 'service.jobs.manage': 'Kaam / job chalayein',
  'service.bookings.view': 'Booking dekhein', 'service.bookings.manage': 'Booking lein',
  'online_orders.view': 'Online order dekhein', 'online_orders.manage': 'Online order chalayein',
  'catalog.view': 'Online catalog dekhein', 'catalog.manage': 'Online catalog badlein',
};

export function getPermissionLabel(key: string): string {
  return permissionLabel(key);
}

// ═══ GROUPS — includes title (alias of label) + color for TeamPage ═══

export interface PermissionGroup {
  title: string;   // used by TeamPage
  label: string;   // alias
  emoji: string;
  color: string;
  /** Sirf is industry par dikhe — khali to har dukaan par */
  industry?: string;
  permissions: PermissionKey[];
}

/**
 * Is dukaan ke liye kaam ke groups.
 *
 * Industry wale groups sirf apni dukaan par dikhte hain. 34 industry
 * permissions sab ko ek sath dikhana ulta nuqsan hai — malik ko 100
 * se zyada checkbox me se apne kaam ki cheez dhoondni parti.
 */
export function permissionGroupsFor(industryId?: string | null): PermissionGroup[] {
  const SERVICE_LIKE = ['services-biz', 'autoparts', 'appliances', 'salon', 'gym', 'clinic'];

  const groups = PERMISSION_GROUPS.filter((g) => {
    if (!g.industry) return true;
    if (g.industry === industryId) return true;
    if (g.industry === 'services' && SERVICE_LIKE.includes(industryId ?? '')) return true;
    /* Industry pata hi na chale (pack load nahi hua, ya tenant ka
       businessType kisi pack se match nahi karta) to SAB industry
       groups dikha dete hain. Chhupa dena zyada bura hai: malik ko
       lagta hai ke feature hai hi nahi. */
    return !industryId;
  });

  /* ── Jaal: koi ijazat group se bahar na reh jaye ──
     Nayi permission jor kar group me daalna bhool jayein to wo UI
     me kabhi nazar nahi aati — yani malik usay kisi ko de hi nahi
     sakta, aur wajah dhoondhne me ghanta lagta hai. Is liye jo
     bachi hain wo khud ek group me aa jati hain. */
  const covered = new Set(PERMISSION_GROUPS.flatMap((g) => g.permissions as string[]));
  const leftover = ALL_PERMISSIONS.filter((p) => !covered.has(p));
  if (leftover.length > 0) {
    groups.push({
      title: 'Baqi ijazatein', label: 'Baqi ijazatein', emoji: '🗝️', color: '#64748b',
      permissions: leftover,
    });
  }

  return groups;
}

/** Group me kis ka naam kya — UI me checkbox par yehi likha jata hai */
export function permissionLabel(key: string): string {
  return PERMISSION_LABELS[key] ?? key
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' — ');
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'POS & Sales', label: 'POS & Sales', emoji: '🛒', color: '#10b981',
    permissions: [
      PERMISSIONS.POS_USE, PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_VOID,
      PERMISSIONS.RETURNS_VIEW, PERMISSIONS.RETURNS_CREATE,
    ],
  },
  {
    title: 'Customers & Khata', label: 'Customers & Khata', emoji: '👥', color: '#8b5cf6',
    permissions: [
      PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT,
      PERMISSIONS.KHATA_VIEW, PERMISSIONS.KHATA_MANAGE,
      PERMISSIONS.LOYALTY_VIEW, PERMISSIONS.DISCOUNTS_VIEW, PERMISSIONS.DISCOUNTS_MANAGE,
    ],
  },
  {
    title: 'Cash Register', label: 'Cash Register', emoji: '💰', color: '#f59e0b',
    permissions: [
      PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_OPEN, PERMISSIONS.CASH_REGISTER_CLOSE,
    ],
  },
  {
    title: 'Products & Inventory', label: 'Products & Inventory', emoji: '📦', color: '#0891b2',
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_DELETE,
      PERMISSIONS.BRANDS_VIEW, PERMISSIONS.TAGS_VIEW, PERMISSIONS.CATEGORIES_VIEW,
      PERMISSIONS.LOW_STOCK_VIEW, PERMISSIONS.BARCODE_LABELS_VIEW,
      PERMISSIONS.STOCK_MOVEMENTS_VIEW, PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, PERMISSIONS.STOCK_TRANSFERS_MANAGE,
    ],
  },
  {
    title: 'Suppliers & Purchases', label: 'Suppliers & Purchases', emoji: '🚚', color: '#f97316',
    permissions: [
      PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.SUPPLIERS_EDIT,
      PERMISSIONS.PURCHASES_VIEW, PERMISSIONS.PURCHASES_CREATE,
    ],
  },
  {
    title: 'Reports & Analytics', label: 'Reports & Analytics', emoji: '📊', color: '#3b82f6',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.PROFIT_REPORT_VIEW,
    ],
  },
  {
    title: 'Staff & Finance', label: 'Staff & Finance', emoji: '👨‍💼', color: '#ec4899',
    permissions: [
      PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE,
      PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_CREATE,
      PERMISSIONS.EXPORTS_VIEW, PERMISSIONS.BACKUP_MANAGE,
    ],
  },
  {
    title: 'System & Admin', label: 'System & Admin', emoji: '⚙️', color: '#64748b',
    permissions: [
      PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_MANAGE,
      PERMISSIONS.SHOPS_VIEW, PERMISSIONS.SHOPS_MANAGE,
      PERMISSIONS.ACTIVITY_VIEW,
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_MANAGE,
    ],
  },
  /* ── Industry ke apne kaam ──
     Ye sab groups har dukaan par nahi dikhte. Safha sirf USI industry
     ka group dikhata hai jis par dukaan chal rahi hai — warna bakery
     wale ko "Farmers" aur "Kitchen" ka shor milta, jo us ke kaam ka
     hai hi nahi. `industry` khana isi ke liye hai. */
  {
    title: 'Bakery ke kaam', label: 'Bakery ke kaam', emoji: '🧁', color: '#ec4899',
    industry: 'bakery',
    permissions: [
      PERMISSIONS.BAKERY_ORDERS_VIEW, PERMISSIONS.BAKERY_ORDERS_MANAGE,
      PERMISSIONS.BAKERY_PRODUCTION_VIEW, PERMISSIONS.BAKERY_PRODUCTION_MANAGE,
      PERMISSIONS.BAKERY_INGREDIENTS_VIEW, PERMISSIONS.BAKERY_INGREDIENTS_MANAGE,
    ],
  },
  {
    title: 'Agri ke kaam', label: 'Agri ke kaam', emoji: '🌾', color: '#65a30d',
    industry: 'agri',
    permissions: [
      PERMISSIONS.AGRI_FARMERS_VIEW, PERMISSIONS.AGRI_FARMERS_MANAGE,
      PERMISSIONS.AGRI_ORDERS_VIEW, PERMISSIONS.AGRI_ORDERS_MANAGE,
      PERMISSIONS.AGRI_ADVISORY_VIEW, PERMISSIONS.AGRI_ADVISORY_MANAGE,
    ],
  },
  {
    title: 'Electronics ke kaam', label: 'Electronics ke kaam', emoji: '🔌', color: '#3b82f6',
    industry: 'electronics',
    permissions: [
      PERMISSIONS.ELECTRONICS_SERIALS_VIEW, PERMISSIONS.ELECTRONICS_SERIALS_MANAGE,
      PERMISSIONS.ELECTRONICS_WARRANTY_VIEW, PERMISSIONS.ELECTRONICS_WARRANTY_MANAGE,
    ],
  },
  {
    title: 'Mobile ke kaam', label: 'Mobile ke kaam', emoji: '📱', color: '#8b5cf6',
    industry: 'mobile',
    permissions: [
      PERMISSIONS.MOBILE_REPAIRS_VIEW, PERMISSIONS.MOBILE_REPAIRS_MANAGE,
      PERMISSIONS.MOBILE_IMEI_VIEW, PERMISSIONS.MOBILE_IMEI_MANAGE,
    ],
  },
  {
    title: 'Restaurant ke kaam', label: 'Restaurant ke kaam', emoji: '🍽️', color: '#f97316',
    industry: 'restaurant',
    permissions: [
      PERMISSIONS.RESTAURANT_ORDERS_VIEW, PERMISSIONS.RESTAURANT_ORDERS_MANAGE,
      PERMISSIONS.RESTAURANT_KITCHEN_VIEW, PERMISSIONS.RESTAURANT_KITCHEN_MANAGE,
      PERMISSIONS.RESTAURANT_MENU_VIEW, PERMISSIONS.RESTAURANT_MENU_MANAGE,
    ],
  },
  {
    title: 'Service ke kaam', label: 'Service ke kaam', emoji: '🔧', color: '#14b8a6',
    industry: 'services',
    permissions: [
      PERMISSIONS.SERVICE_JOBS_VIEW, PERMISSIONS.SERVICE_JOBS_MANAGE,
      PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_MANAGE,
    ],
  },
  {
    title: 'Online dukaan', label: 'Online dukaan', emoji: '🌐', color: '#0ea5e9',
    permissions: [
      PERMISSIONS.ONLINE_ORDERS_VIEW, PERMISSIONS.ONLINE_ORDERS_MANAGE,
      PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE,
    ],
  },
  {
    title: 'Billing & Plans', label: 'Billing & Plans', emoji: '💳', color: '#a855f7',
    permissions: [
      PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_MANAGE,
      PERMISSIONS.PLANS_VIEW, PERMISSIONS.PLAN_USAGE_VIEW, PERMISSIONS.REFERRALS_VIEW,
    ],
  },
];
