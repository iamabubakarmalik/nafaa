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
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  OWNER: ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    PERMISSIONS.POS_USE, PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_VOID,
    PERMISSIONS.RETURNS_VIEW, PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.KHATA_VIEW, PERMISSIONS.KHATA_MANAGE,
    PERMISSIONS.LOYALTY_VIEW, PERMISSIONS.DISCOUNTS_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_OPEN, PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.BRANDS_VIEW, PERMISSIONS.TAGS_VIEW, PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.LOW_STOCK_VIEW, PERMISSIONS.BARCODE_LABELS_VIEW, PERMISSIONS.STOCK_MOVEMENTS_VIEW,
    PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, PERMISSIONS.STOCK_TRANSFERS_MANAGE,
    PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.PURCHASES_VIEW, PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.PROFIT_REPORT_VIEW,
    PERMISSIONS.STAFF_VIEW, PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPORTS_VIEW, PERMISSIONS.TEAM_VIEW, PERMISSIONS.SHOPS_VIEW,
    PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.BILLING_VIEW, PERMISSIONS.PLANS_VIEW, PERMISSIONS.PLAN_USAGE_VIEW, PERMISSIONS.REFERRALS_VIEW,
  ],
  CASHIER: [
    PERMISSIONS.POS_USE, PERMISSIONS.SALES_VIEW, PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.KHATA_VIEW, PERMISSIONS.LOYALTY_VIEW, PERMISSIONS.DISCOUNTS_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_OPEN, PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.LOW_STOCK_VIEW, PERMISSIONS.DASHBOARD_VIEW,
  ],
  STAFF: [
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.LOW_STOCK_VIEW,
    PERMISSIONS.STOCK_MOVEMENTS_VIEW, PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.CUSTOMERS_VIEW,
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
};

export function getPermissionLabel(key: string): string {
  return PERMISSION_LABELS[key] ?? key;
}

// ═══ GROUPS — includes title (alias of label) + color for TeamPage ═══

export interface PermissionGroup {
  title: string;   // used by TeamPage
  label: string;   // alias
  emoji: string;
  color: string;
  permissions: PermissionKey[];
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
  {
    title: 'Billing & Plans', label: 'Billing & Plans', emoji: '💳', color: '#a855f7',
    permissions: [
      PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_MANAGE,
      PERMISSIONS.PLANS_VIEW, PERMISSIONS.PLAN_USAGE_VIEW, PERMISSIONS.REFERRALS_VIEW,
    ],
  },
];
