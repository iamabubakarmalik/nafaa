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
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  OWNER: ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,

  MANAGER: [
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
export const userHasPermission = hasPermission;
