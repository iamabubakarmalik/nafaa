export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';

export const PERMISSIONS = {
  POS_USE: 'pos.use',

  SALES_VIEW: 'sales.view',
  RETURNS_VIEW: 'returns.view',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_EDIT: 'customers.edit',
  KHATA_VIEW: 'khata.view',
  LOYALTY_VIEW: 'loyalty.view',
  DISCOUNTS_VIEW: 'discounts.view',
  CASH_REGISTER_VIEW: 'cash_register.view',

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
  PURCHASES_VIEW: 'purchases.view',

  REPORTS_VIEW: 'reports.view',
  PROFIT_REPORT_VIEW: 'profit_report.view',

  EXPENSES_VIEW: 'expenses.view',
  EXPORTS_VIEW: 'exports.view',
  BACKUP_MANAGE: 'backup.manage',

  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  SHOPS_VIEW: 'shops.view',
  ACTIVITY_VIEW: 'activity.view',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  PLANS_VIEW: 'plans.view',
  PLAN_USAGE_VIEW: 'plan_usage.view',
  REFERRALS_VIEW: 'referrals.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  OWNER: ALL_PERMISSIONS,

  MANAGER: [
    PERMISSIONS.POS_USE,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.KHATA_VIEW,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.DISCOUNTS_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW,

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

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.PROFIT_REPORT_VIEW,
    PERMISSIONS.EXPENSES_VIEW,
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
    PERMISSIONS.KHATA_VIEW,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.DISCOUNTS_VIEW,
    PERMISSIONS.CASH_REGISTER_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
  ],

  STAFF: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.LOW_STOCK_VIEW,
    PERMISSIONS.STOCK_MOVEMENTS_VIEW,
    PERMISSIONS.SUPPLIERS_VIEW,
  ],
};

export function hasPermission(
  role: UserRole | undefined,
  permissions: string[] | undefined,
  required: PermissionKey,
): boolean {
  if (!role) return false;
  if (role === 'OWNER' || role === 'SUPER_ADMIN') return true;

  const effective =
    permissions && permissions.length > 0
      ? permissions
      : DEFAULT_ROLE_PERMISSIONS[role] ?? [];

  return effective.includes(required);
}

export function hasAnyPermission(
  role: UserRole | undefined,
  permissions: string[] | undefined,
  required: PermissionKey[],
): boolean {
  return required.some((perm) => hasPermission(role, permissions, perm));
}

export const PERMISSION_LABELS: Record<string, string> = {
  'pos.use': 'POS',
  'sales.view': 'Sales History',
  'returns.view': 'Returns',
  'customers.view': 'Customers View',
  'customers.edit': 'Customers Edit',
  'khata.view': 'Khata / Udhaar',
  'loyalty.view': 'Loyalty Points',
  'discounts.view': 'Discount Codes',
  'cash_register.view': 'Cash Register',
  'products.view': 'Products View',
  'products.create': 'Products Create',
  'products.edit': 'Products Edit',
  'products.delete': 'Products Delete',
  'brands.view': 'Brands',
  'tags.view': 'Tags',
  'categories.view': 'Categories',
  'low_stock.view': 'Low Stock',
  'barcode_labels.view': 'Barcode Labels',
  'stock_movements.view': 'Stock Movements',
  'stock_adjustments.manage': 'Stock Adjustments',
  'stock_transfers.manage': 'Stock Transfers',
  'suppliers.view': 'Suppliers',
  'purchases.view': 'Purchases',
  'reports.view': 'Reports',
  'profit_report.view': 'Profit Report',
  'expenses.view': 'Expenses',
  'exports.view': 'Exports',
  'backup.manage': 'Backup',
  'team.view': 'View Team',
  'team.manage': 'Manage Team',
  'shops.view': 'Shops',
  'activity.view': 'Activity Log',
  'settings.view': 'Settings View',
  'settings.edit': 'Settings Edit',
  'billing.view': 'Billing',
  'billing.manage': 'Billing Manage',
  'plans.view': 'Plans',
  'plan_usage.view': 'Plan Usage',
  'referrals.view': 'Referrals',
};

export const PERMISSION_GROUPS: Array<{
  title: string;
  color: string;
  permissions: PermissionKey[];
}> = [
  {
    title: 'Sales',
    color: '#16a34a',
    permissions: [
      PERMISSIONS.POS_USE, PERMISSIONS.SALES_VIEW, PERMISSIONS.RETURNS_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT,
      PERMISSIONS.KHATA_VIEW, PERMISSIONS.LOYALTY_VIEW,
      PERMISSIONS.DISCOUNTS_VIEW, PERMISSIONS.CASH_REGISTER_VIEW,
    ],
  },
  {
    title: 'Inventory',
    color: '#2563eb',
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_DELETE,
      PERMISSIONS.BRANDS_VIEW, PERMISSIONS.TAGS_VIEW, PERMISSIONS.CATEGORIES_VIEW,
      PERMISSIONS.LOW_STOCK_VIEW, PERMISSIONS.BARCODE_LABELS_VIEW,
      PERMISSIONS.STOCK_MOVEMENTS_VIEW, PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE,
      PERMISSIONS.STOCK_TRANSFERS_MANAGE,
      PERMISSIONS.SUPPLIERS_VIEW, PERMISSIONS.PURCHASES_VIEW,
    ],
  },
  {
    title: 'Reports & Finance',
    color: '#f59e0b',
    permissions: [
      PERMISSIONS.REPORTS_VIEW, PERMISSIONS.PROFIT_REPORT_VIEW,
      PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPORTS_VIEW,
      PERMISSIONS.BACKUP_MANAGE,
    ],
  },
  {
    title: 'System',
    color: '#7c3aed',
    permissions: [
      PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_MANAGE,
      PERMISSIONS.SHOPS_VIEW, PERMISSIONS.ACTIVITY_VIEW,
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT,
      PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_MANAGE,
      PERMISSIONS.PLANS_VIEW, PERMISSIONS.PLAN_USAGE_VIEW,
      PERMISSIONS.REFERRALS_VIEW,
    ],
  },
];
