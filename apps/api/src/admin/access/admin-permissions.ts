/**
 * Admin panel permissions (single source; the admin app reads it from
 * GET /admin/staff/catalog).
 *
 * Every admin controller declares its area with @AdminArea('<area>'). A read
 * (GET) needs '<area>.view'; any change (POST/PUT/PATCH/DELETE) needs
 * '<area>.manage'. A handler can ask for a specific key instead with
 * @AdminPermission(…) — used for actions that deserve their own switch
 * (impersonate, delete a shop, approve payments, run exports).
 *
 * A key grants exactly what its name says. "manage" does not include "view",
 * and nothing implies anything else, so a role is exactly its list of keys.
 * SUPER_ADMIN users skip these checks and always have every key.
 */

export interface AdminPermissionDef {
  key: string;
  label: string;
  /** Shown under the switch in the role editor. */
  hint?: string;
  /** Marked in red in the role editor. */
  sensitive?: boolean;
}

export interface AdminAreaDef {
  area: string;
  label: string;
  workspace: string;
  permissions: AdminPermissionDef[];
}

const area = (key: string, label: string, workspace: string, extra: AdminPermissionDef[] = [], manageHint?: string): AdminAreaDef => ({
  area: key,
  label,
  workspace,
  permissions: [
    { key: `${key}.view`, label: `See ${label.toLowerCase()}` },
    { key: `${key}.manage`, label: `Change ${label.toLowerCase()}`, hint: manageHint },
    ...extra,
  ],
});

export const ADMIN_AREAS: AdminAreaDef[] = [
  area('dashboard', 'Dashboard and analytics', 'Platform'),
  area('notifications', 'Admin notifications', 'Platform'),
  area('tenants', 'Shops', 'Merchants', [
    { key: 'tenants.impersonate', label: 'Sign in as a shop', hint: 'Opens the merchant app as that shop. Every use is logged.', sensitive: true },
    { key: 'tenants.delete', label: 'Delete shops', hint: 'Permanently removes a shop and all its data.', sensitive: true },
  ], 'Suspend, reactivate, notes, limits.'),
  area('users', 'Merchant users', 'Merchants', [
    { key: 'users.reset_password', label: 'Give a temporary password', hint: 'Sets a new password for a shop user and signs them out everywhere.', sensitive: true },
  ], 'Edit name, phone and role; switch off; sign out of all devices.'),
  area('merchant_data', 'Merchant products, sales and customers', 'Merchants', [], 'Edit or remove records inside a shop.'),
  area('deletion', 'Deletion requests', 'Merchants'),
  area('bulk', 'Bulk actions', 'Merchants', [], 'Run actions on many shops at once.'),
  area('partners', 'Partners and field team', 'Partners', [
    { key: 'partners.payouts', label: 'Approve and pay partner payouts', hint: 'Approve payout requests, mark them paid with the transfer reference, or reject them.', sensitive: true },
  ], 'Approve applications, edit partners, plans, targets and the marketing kit; review visits; adjust earnings.'),
  area('billing', 'Payments and invoices', 'Billing', [
    { key: 'billing.approve', label: 'Approve or reject payments', hint: 'Starts or stops a shop’s plan.', sensitive: true },
  ]),
  area('plans', 'Plans and subscriptions', 'Billing'),
  area('promos', 'Promo codes and referrals', 'Billing'),
  area('online_store', 'Online store', 'Online store', [], 'Pause sync, retry jobs, change channel settings.'),
  area('stores', 'Nafaa Stores websites', 'Online store', [
    { key: 'stores.suspend', label: 'Suspend or unsuspend a store website', hint: 'The website shows an "unavailable" page until unsuspended.', sensitive: true },
  ], 'Platform controls, domains, force password mode, revalidate and the abuse queue.'),
  area('marketplace', 'Marketplace', 'Marketplace'),
  area('marketing', 'Marketing site', 'Marketing'),
  {
    area: 'social',
    label: 'Nafaa Social',
    workspace: 'Marketing',
    permissions: [
      { key: 'social.view', label: 'See Nafaa Social posts, calendar and results' },
      { key: 'social.edit', label: 'Write and schedule posts, media and imports', hint: 'Create, edit, archive and reschedule posts; upload media; import content packs; use Nafaa AI.' },
      { key: 'social.approve', label: 'Approve or reject posts', hint: 'Approved posts with a time go out on their own.' },
      { key: 'social.publish', label: 'Publish now, retry and mark posted', sensitive: true },
      { key: 'social.connect', label: 'Connect accounts and switch auto-publish', hint: "Connects Nafaa's Facebook / Instagram and turns automatic posting on or off.", sensitive: true },
      { key: 'social.settings', label: 'Nafaa Social settings and automation keys', hint: 'Approval rules, pause switch, brand voice and API keys for automation.', sensitive: true },
    ],
  },
  area('communications', 'Broadcasts, email and SMS', 'Communications', [], 'Send messages to shops.'),
  area('mobile', 'Mobile apps', 'Mobile'),
  area('system', 'System health and jobs', 'System', [], 'Turn background jobs and switches on or off.'),
  area('settings', 'Platform settings and design', 'System'),
  area('exports', 'Data exports', 'System', [], 'Download platform data as files.'),
  area('audit', 'Audit log', 'System'),
  area('staff', 'Admin staff and roles', 'Staff', [], 'Invite, disable and change roles. Only give this to people you trust fully.'),
];

export const ALL_ADMIN_PERMISSIONS: string[] = ADMIN_AREAS.flatMap((a) => a.permissions.map((p) => p.key));
const KNOWN = new Set(ALL_ADMIN_PERMISSIONS);

/** Drops unknown keys and duplicates. */
export const cleanPermissions = (keys: unknown): string[] =>
  Array.isArray(keys) ? [...new Set(keys.filter((k): k is string => typeof k === 'string' && KNOWN.has(k)))] : [];

const views = (...areas: string[]) => areas.map((a) => `${a}.view`);
const manages = (...areas: string[]) => areas.map((a) => `${a}.manage`);

/** Built-in roles, created on first use. They can be edited, not deleted. */
export const SYSTEM_ROLES: Array<{ key: string; name: string; description: string; permissions: string[] }> = [
  {
    key: 'owner',
    name: 'Owner',
    description: 'Everything, including staff and roles.',
    permissions: ALL_ADMIN_PERMISSIONS,
  },
  {
    key: 'operations',
    name: 'Operations',
    description: 'Runs shops, billing and the online store day to day. Cannot manage staff or delete shops.',
    permissions: [
      ...views('dashboard', 'notifications', 'tenants', 'users', 'merchant_data', 'deletion', 'bulk', 'billing', 'plans', 'promos', 'online_store', 'stores', 'marketplace', 'communications', 'mobile', 'system', 'audit', 'partners'),
      ...manages('notifications', 'tenants', 'users', 'deletion', 'billing', 'plans', 'online_store', 'stores', 'marketplace', 'communications', 'partners'),
      'billing.approve',
    ],
  },
  {
    key: 'support',
    name: 'Support',
    description: 'Helps shops: sees their data, can sign in as a shop and reset users. No billing changes.',
    permissions: [
      ...views('dashboard', 'notifications', 'tenants', 'users', 'merchant_data', 'deletion', 'billing', 'plans', 'online_store', 'mobile'),
      ...manages('notifications', 'users'),
      'tenants.impersonate',
    ],
  },
  {
    key: 'finance',
    name: 'Finance',
    description: 'Payments, invoices, plans and promo codes.',
    permissions: [
      ...views('dashboard', 'tenants', 'billing', 'plans', 'promos', 'exports'),
      ...manages('billing', 'plans', 'promos', 'exports'),
      'billing.approve',
    ],
  },
  {
    key: 'marketing',
    name: 'Marketing',
    description: 'Marketing site, campaigns and messages to shops.',
    permissions: [...views('dashboard', 'marketing', 'communications', 'promos'), ...manages('marketing', 'communications'), 'social.view', 'social.edit', 'social.approve', 'social.publish'],
  },
  {
    key: 'marketplace',
    name: 'Marketplace moderator',
    description: 'Reviews sellers, products, orders and disputes on Nafaa Market.',
    permissions: [...views('dashboard', 'tenants', 'marketplace'), ...manages('marketplace')],
  },
  {
    key: 'readonly',
    name: 'Read only',
    description: 'Can look at everything except staff and the audit log. Cannot change anything.',
    permissions: [...views('dashboard', 'notifications', 'tenants', 'users', 'merchant_data', 'deletion', 'bulk', 'billing', 'plans', 'promos', 'online_store', 'marketplace', 'marketing', 'communications', 'mobile', 'system', 'settings', 'exports', 'partners'), 'social.view'],
  },
];
