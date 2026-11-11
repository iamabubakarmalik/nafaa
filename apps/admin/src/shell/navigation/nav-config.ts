/**
 * Admin navigation: workspaces, their menu groups and pages (single source).
 *
 * Each workspace owns a set of URL prefixes. The sidebar shows the menu of the
 * workspace the current URL belongs to, the workspace switcher lists them all,
 * and global search (Ctrl/⌘+K) searches every item here. Adding a page means
 * adding a route in routes/AdminRoutes.tsx and an item here.
 */

import type { ComponentType, CSSProperties } from 'react';
import {
  Activity, BadgeDollarSign, BarChart3, Beaker, Bell, BellRing, Bot, Bug, Building2, Calendar, CircleHelp, CreditCard, Download,
  ClipboardList, FileText, Gift, Globe, Handshake, HandCoins, Briefcase, HeartPulse, Images, Layers, LayoutDashboard, ListChecks, Mail, MailCheck,
  Megaphone, Menu as MenuIcon, MessageSquare, MessageSquareText, MousePointer2, Package, PackageCheck,
  PackageSearch, Paintbrush, Palette, Plug, Power, Puzzle, SlidersHorizontal, Receipt, Rocket, Search, Send, Settings, Settings2,
  KeyRound, MapPinCheck, Radio, ScrollText, ShieldCheck, ShoppingCart, UserCog, Signpost, Smartphone, Sparkles, Store, TabletSmartphone, Tag, Target,
  Timer, ToggleRight, Wrench, TrendingUp, Truck, UserX, Users, Wallet,
} from 'lucide-react';
import { ENTRY_SECTIONS } from '@/features/marketing/cms/entries/sections';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

export interface AdminNavItem {
  to: string;
  label: string;
  icon: IconType;
  /** Extra words global search and menu search should match. */
  keywords?: string;
  /** Active only on an exact match (the path has child routes listed separately). */
  exact?: boolean;
  /** Permission needed to see the item; defaults to `<area>.view` from areaForPath(). */
  permission?: string | null;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: IconType;
  items: AdminNavItem[];
}

export type WorkspaceId =
  | 'platform' | 'merchants' | 'partners' | 'billing' | 'online-store' | 'marketing' | 'communications' | 'mobile' | 'system' | 'staff';

export interface AdminWorkspace {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  description: string;
  icon: IconType;
  /** Tile color of the workspace mark (Tailwind background + text classes). */
  tone: string;
  /** Page opened when switching to the workspace. */
  root: string;
  /** URL prefixes that belong to this workspace. */
  prefixes: string[];
  groups: AdminNavGroup[];
}

export const WORKSPACES: AdminWorkspace[] = [
  {
    id: 'platform',
    label: 'Platform',
    shortLabel: 'Platform',
    description: 'Health of the whole business at a glance',
    icon: LayoutDashboard,
    tone: 'bg-indigo-600 text-white',
    root: '/dashboard',
    prefixes: ['/dashboard', '/live', '/analytics', '/notifications'],
    groups: [
      {
        id: 'overview',
        label: 'Overview',
        icon: LayoutDashboard,
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home kpi overview' },
          { to: '/live', label: 'Live now', icon: Radio, keywords: 'online active presence who is using signups today' },
          { to: '/analytics', label: 'Revenue analytics', icon: TrendingUp, keywords: 'mrr arr churn revenue' },
          { to: '/notifications', label: 'Notifications', icon: Bell, keywords: 'alerts inbox' },
        ],
      },
    ],
  },
  {
    id: 'merchants',
    label: 'Merchants',
    shortLabel: 'Merchants',
    description: 'Shops, their staff, products, sales and customers',
    icon: Building2,
    tone: 'bg-sky-600 text-white',
    root: '/tenants',
    prefixes: ['/tenants', '/users', '/customers', '/products', '/sales', '/deletion-requests', '/bulk-actions'],
    groups: [
      {
        id: 'shops',
        label: 'Shops',
        icon: Building2,
        items: [
          { to: '/tenants', label: 'Shops', icon: Building2, keywords: 'tenants businesses merchants stores' },
          { to: '/users', label: 'Users', icon: Users, keywords: 'staff owners logins' },
          { to: '/deletion-requests', label: 'Deletion requests', icon: UserX, keywords: 'delete account gdpr' },
        ],
      },
      {
        id: 'merchant-data',
        label: 'Merchant data',
        icon: Package,
        items: [
          { to: '/products', label: 'All products', icon: Package, keywords: 'items catalog stock' },
          { to: '/sales', label: 'All sales', icon: ShoppingCart, keywords: 'bills orders receipts' },
          { to: '/customers', label: 'All customers', icon: Users, keywords: 'khata buyers' },
        ],
      },
      {
        id: 'merchant-tools',
        label: 'Tools',
        icon: Layers,
        items: [
          { to: '/bulk-actions', label: 'Bulk actions', icon: Layers, keywords: 'mass suspend extend' },
        ],
      },
    ],
  },
  {
    id: 'partners',
    label: 'Partners',
    shortLabel: 'Partners',
    description: 'Referral partners, field agents and Nafaa field staff: leads, visits, commission and payouts',
    icon: Handshake,
    tone: 'bg-orange-600 text-white',
    root: '/partners',
    prefixes: ['/partners'],
    groups: [
      {
        id: 'partner-people',
        label: 'People',
        icon: Handshake,
        items: [
          { to: '/partners', label: 'Partners', icon: Handshake, exact: true, keywords: 'agents resellers employees field team referral' },
          { to: '/partners/applications', label: 'Applications', icon: ClipboardList, keywords: 'approve new partner signup review' },
        ],
      },
      {
        id: 'partner-field',
        label: 'Field work',
        icon: MapPinCheck,
        items: [
          { to: '/partners/leads', label: 'Leads', icon: Briefcase, keywords: 'shops prospects pipeline stages' },
          { to: '/partners/visits', label: 'Visit audit', icon: MapPinCheck, keywords: 'fake visits gps location photos flags fraud' },
          { to: '/partners/performance', label: 'Performance', icon: TrendingUp, keywords: 'roi revenue signups city leaderboard' },
        ],
      },
      {
        id: 'partner-money',
        label: 'Money',
        icon: HandCoins,
        items: [
          { to: '/partners/payouts', label: 'Payouts', icon: HandCoins, keywords: 'pay partner commission jazzcash easypaisa bank' },
          { to: '/partners/plans', label: 'Commission plans', icon: Tag, keywords: 'bonus percent slabs override' },
          { to: '/partners/kit', label: 'Marketing kit', icon: Megaphone, keywords: 'videos pdf demo account material' },
        ],
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & plans',
    shortLabel: 'Billing',
    description: 'Payments, revenue, subscriptions, plans, add-ons, invoices and promo codes',
    icon: Wallet,
    tone: 'bg-emerald-600 text-white',
    root: '/billing',
    prefixes: ['/billing', '/revenue', '/subscriptions', '/plans', '/addons', '/setups', '/invoices', '/referrals', '/platform-discounts', '/distribution'],
    groups: [
      {
        id: 'payments',
        label: 'Payments',
        icon: CreditCard,
        items: [
          { to: '/billing', label: 'Payment approvals', icon: CreditCard, exact: true, keywords: 'pending bank transfer jazzcash easypaisa' },
          { to: '/invoices', label: 'Invoices', icon: Receipt, keywords: 'bills receipts' },
          { to: '/revenue', label: 'Revenue', icon: BadgeDollarSign, keywords: 'mrr monthly recurring income by plan add-on grace trial grandfathered' },
        ],
      },
      {
        id: 'plans',
        label: 'Plans',
        icon: Sparkles,
        items: [
          { to: '/subscriptions', label: 'Subscriptions', icon: Sparkles, keywords: 'trial renew expire' },
          { to: '/plans', label: 'Plans & pricing', icon: Tag, keywords: 'packages price limits features free plan trial' },
          { to: '/addons', label: 'Add-ons', icon: Puzzle, keywords: 'extras shopify woocommerce daraz courier bundle extra user booker distribution price' },
          { to: '/billing/settings', label: 'Billing settings', icon: SlidersHorizontal, keywords: 'trial days grace reminders renewal grandfather run billing check' },
          { to: '/setups', label: 'Setup requests', icon: Wrench, keywords: 'activation setup training onboarding visit' },
          { to: '/distribution', label: 'Distribution usage', icon: Truck, keywords: 'wholesale add-on' },
        ],
      },
      {
        id: 'growth',
        label: 'Growth',
        icon: Gift,
        items: [
          { to: '/platform-discounts', label: 'Promo codes', icon: Tag, keywords: 'coupons discounts' },
          { to: '/referrals', label: 'Referrals', icon: Gift, keywords: 'invite reward' },
        ],
      },
    ],
  },
  {
    id: 'online-store',
    label: 'Online store',
    shortLabel: 'Online store',
    description: 'Channels, catalog sync, orders and couriers across all shops',
    icon: Store,
    tone: 'bg-cyan-600 text-white',
    root: '/commerce',
    prefixes: ['/commerce'],
    groups: [
      {
        id: 'commerce',
        label: 'Online store',
        icon: Store,
        items: [
          { to: '/commerce', label: 'Overview', icon: Store, exact: true, keywords: 'commerce online' },
          { to: '/commerce/channels', label: 'Channels', icon: Plug, keywords: 'shopify woocommerce daraz connections' },
          { to: '/commerce/orders', label: 'Orders monitor', icon: PackageSearch, keywords: 'online orders cod' },
          { to: '/commerce/jobs', label: 'Catalog jobs', icon: ListChecks, keywords: 'sync import queue' },
          { to: '/commerce/couriers', label: 'Couriers', icon: Truck, keywords: 'tcs leopards postex trax' },
          { to: '/commerce/controls', label: 'Controls', icon: Power, keywords: 'kill switch pause sync' },
        ],
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing site',
    shortLabel: 'Marketing',
    description: 'Website content, leads, campaigns and traffic',
    icon: Rocket,
    tone: 'bg-fuchsia-600 text-white',
    root: '/marketing',
    prefixes: ['/marketing'],
    groups: [
      {
        id: 'mk-growth',
        label: 'Growth',
        icon: Rocket,
        items: [
          { to: '/marketing', label: 'Marketing dashboard', icon: BarChart3, exact: true },
          { to: '/marketing/leads', label: 'Leads', icon: Users, keywords: 'prospects' },
          { to: '/marketing/demos', label: 'Demo bookings', icon: Calendar },
          { to: '/marketing/contact-forms', label: 'Contact forms', icon: MessageSquare },
          { to: '/marketing/chatbot', label: 'Chatbot', icon: Bot, keywords: 'conversations' },
          { to: '/marketing/newsletter', label: 'Newsletter', icon: Mail, keywords: 'subscribers' },
          { to: '/marketing/campaigns', label: 'Campaigns', icon: Megaphone },
        ],
      },
      {
        id: 'mk-website',
        label: 'Website',
        icon: Globe,
        items: [
          { to: '/marketing/website', label: 'Website overview', icon: Globe, exact: true, keywords: 'cms' },
          ...ENTRY_SECTIONS.map((s) => ({ to: `/marketing/website/${s.key}`, label: s.label, icon: s.icon as IconType, keywords: 'cms' })),
          { to: '/marketing/website/faqs', label: 'FAQs', icon: CircleHelp, keywords: 'cms' },
          { to: '/marketing/website/customers', label: 'Customers & testimonials', icon: Handshake, keywords: 'cms' },
          { to: '/marketing/website/media', label: 'Media', icon: Images, keywords: 'cms images' },
          { to: '/marketing/website/menus', label: 'Menus', icon: MenuIcon, keywords: 'cms navigation' },
          { to: '/marketing/website/redirects', label: 'Redirects', icon: Signpost, keywords: 'cms 301' },
          { to: '/marketing/website/settings', label: 'Site settings', icon: Settings2, keywords: 'cms' },
        ],
      },
      {
        id: 'mk-analytics',
        label: 'Analytics',
        icon: TrendingUp,
        items: [
          { to: '/marketing/analytics', label: 'Traffic', icon: TrendingUp, keywords: 'visitors' },
          { to: '/marketing/seo', label: 'SEO', icon: Search },
          { to: '/marketing/conversions', label: 'Conversions', icon: Target, keywords: 'funnel' },
          { to: '/marketing/ab-tests', label: 'A/B tests', icon: Beaker, keywords: 'experiments' },
          { to: '/marketing/heatmaps', label: 'Heatmaps', icon: MousePointer2 },
          { to: '/marketing/blog', label: 'Blog analytics', icon: FileText },
          { to: '/marketing/exports', label: 'Marketing exports', icon: Download, keywords: 'csv' },
        ],
      },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    shortLabel: 'Messages',
    description: 'Broadcasts, email and SMS to merchants',
    icon: Send,
    tone: 'bg-amber-500 text-white',
    root: '/broadcast',
    prefixes: ['/broadcast', '/email-templates', '/email-logs', '/sms-logs', '/sms-templates', '/bulk-communications'],
    groups: [
      {
        id: 'send',
        label: 'Send',
        icon: Send,
        items: [
          { to: '/broadcast', label: 'Broadcast', icon: Megaphone, keywords: 'announcement in-app' },
          { to: '/bulk-communications', label: 'Bulk email & SMS', icon: Send, keywords: 'mass message' },
        ],
      },
      {
        id: 'email',
        label: 'Email',
        icon: Mail,
        items: [
          { to: '/email-templates', label: 'Email templates', icon: Mail },
          { to: '/email-logs', label: 'Email log', icon: MailCheck, keywords: 'delivery bounce' },
        ],
      },
      {
        id: 'sms',
        label: 'SMS',
        icon: MessageSquareText,
        items: [
          { to: '/sms-templates', label: 'SMS templates', icon: MessageSquareText },
          { to: '/sms-logs', label: 'SMS log', icon: MessageSquare, keywords: 'delivery' },
        ],
      },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile apps',
    shortLabel: 'Mobile',
    description: 'Releases, devices, push and in-app switches',
    icon: Smartphone,
    tone: 'bg-violet-600 text-white',
    root: '/mobile',
    prefixes: ['/mobile'],
    groups: [
      {
        id: 'mobile',
        label: 'Mobile apps',
        icon: Smartphone,
        items: [
          { to: '/mobile', label: 'Overview', icon: Smartphone, exact: true },
          { to: '/mobile/devices', label: 'Devices', icon: TabletSmartphone },
          { to: '/mobile/releases', label: 'Releases & updates', icon: PackageCheck, keywords: 'version force update' },
          { to: '/mobile/push', label: 'Push notifications', icon: BellRing },
          { to: '/mobile/announcements', label: 'Announcements', icon: Megaphone },
          { to: '/mobile/flags', label: 'Feature switches', icon: ToggleRight, keywords: 'flags' },
          { to: '/mobile/appearance', label: 'App appearance', icon: Paintbrush, keywords: 'theme' },
        ],
      },
    ],
  },
  {
    id: 'system',
    label: 'System & security',
    shortLabel: 'System',
    description: 'Health, errors, background jobs, switches and settings',
    icon: ShieldCheck,
    tone: 'bg-slate-700 text-white',
    root: '/health',
    prefixes: ['/health', '/system', '/activity', '/ai-usage', '/exports', '/settings', '/appearance'],
    groups: [
      {
        id: 'monitor',
        label: 'Monitor',
        icon: HeartPulse,
        items: [
          { to: '/health', label: 'System health', icon: HeartPulse, keywords: 'uptime database redis' },
          { to: '/system/errors', label: 'Errors', icon: Bug, keywords: 'exceptions crashes failures 500 log' },
          { to: '/system/jobs', label: 'Background jobs', icon: Timer, keywords: 'cron schedule sync pause run' },
          { to: '/activity', label: 'Activity log', icon: Activity, keywords: 'audit history' },
          { to: '/ai-usage', label: 'Nafaa AI usage', icon: Bot, keywords: 'ai cost tokens assistant' },
        ],
      },
      {
        id: 'data',
        label: 'Data',
        icon: Download,
        items: [
          { to: '/exports', label: 'Exports', icon: Download, keywords: 'csv backup' },
        ],
      },
      {
        id: 'config',
        label: 'Configuration',
        icon: Settings,
        items: [
          { to: '/system/controls', label: 'Platform switches', icon: ToggleRight, keywords: 'maintenance mode signups ai kill switch' },
          { to: '/settings', label: 'Platform settings', icon: Settings },
          { to: '/appearance', label: 'Platform design', icon: Palette, keywords: 'theme colors merchant default' },
        ],
      },
    ],
  },
  {
    id: 'staff',
    label: 'Staff & access',
    shortLabel: 'Staff',
    description: 'Admin team, roles, two-step sign-in and the audit log',
    icon: UserCog,
    tone: 'bg-rose-600 text-white',
    root: '/staff',
    prefixes: ['/staff', '/account'],
    groups: [
      {
        id: 'team',
        label: 'Team',
        icon: UserCog,
        items: [
          { to: '/staff', label: 'Admin staff', icon: UserCog, exact: true, keywords: 'team invite people members' },
          { to: '/staff/roles', label: 'Roles & permissions', icon: KeyRound, keywords: 'access rights' },
          { to: '/staff/audit', label: 'Audit log', icon: ScrollText, keywords: 'history who changed', permission: 'audit.view' },
        ],
      },
      {
        id: 'me',
        label: 'My account',
        icon: ShieldCheck,
        items: [
          { to: '/account/security', label: 'My security', icon: ShieldCheck, keywords: '2fa two-step authenticator password sessions', permission: null },
        ],
      },
    ],
  },
];

/** Permission area of each page (see apps/api/src/admin/access/admin-permissions.ts). */
const AREA_BY_PREFIX: Array<[string, string]> = [
  ['/dashboard', 'dashboard'], ['/live', 'users'], ['/analytics', 'dashboard'], ['/notifications', 'notifications'],
  ['/tenants', 'tenants'], ['/users', 'users'], ['/deletion-requests', 'deletion'], ['/partners', 'partners'],
  ['/products', 'merchant_data'], ['/sales', 'merchant_data'], ['/customers', 'merchant_data'], ['/bulk-actions', 'bulk'],
  ['/billing/settings', 'plans'], ['/billing', 'billing'], ['/invoices', 'billing'], ['/revenue', 'billing'], ['/setups', 'tenants'], ['/addons', 'plans'], ['/subscriptions', 'plans'], ['/plans', 'plans'], ['/distribution', 'plans'],
  ['/platform-discounts', 'promos'], ['/referrals', 'promos'],
  ['/commerce', 'online_store'], ['/marketing', 'marketing'],
  ['/broadcast', 'communications'], ['/bulk-communications', 'communications'], ['/email-templates', 'communications'],
  ['/email-logs', 'communications'], ['/sms-templates', 'communications'], ['/sms-logs', 'communications'],
  ['/mobile', 'mobile'], ['/health', 'system'], ['/system', 'system'], ['/activity', 'system'], ['/ai-usage', 'system'], ['/exports', 'exports'],
  ['/settings', 'settings'], ['/appearance', 'settings'], ['/staff', 'staff'],
];

export function areaForPath(path: string): string | null {
  const hit = AREA_BY_PREFIX.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? hit[1] : null;
}

/** Permission needed to see a menu item (null = every admin). */
export function itemPermission(item: AdminNavItem): string | null {
  if (item.permission !== undefined) return item.permission;
  const area = areaForPath(item.to);
  return area ? `${area}.view` : null;
}

/** Workspaces and items the admin may see; workspaces with nothing left are dropped. */
export function visibleWorkspaces(can: (permission: string) => boolean): AdminWorkspace[] {
  return WORKSPACES
    .map((ws) => ({ ...ws, groups: ws.groups.map((g) => ({ ...g, items: g.items.filter((i) => { const p = itemPermission(i); return !p || can(p); }) })).filter((g) => g.items.length) }))
    .filter((ws) => ws.groups.length)
    .map((ws) => ({ ...ws, root: ws.groups[0].items.some((i) => i.to === ws.root) ? ws.root : ws.groups[0].items[0].to }));
}

export const WORKSPACE_BY_ID = Object.fromEntries(WORKSPACES.map((w) => [w.id, w])) as Record<WorkspaceId, AdminWorkspace>;

const startsWithPath = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** The workspace a URL belongs to (Platform when nothing matches). */
export function workspaceForPath(path: string): AdminWorkspace {
  let best: AdminWorkspace | undefined;
  let bestLen = -1;
  for (const ws of WORKSPACES) {
    for (const p of ws.prefixes) {
      if (startsWithPath(path, p) && p.length > bestLen) { best = ws; bestLen = p.length; }
    }
  }
  return best ?? WORKSPACES[0];
}

/** Every menu item, with its workspace, for search. */
export const ALL_ITEMS = WORKSPACES.flatMap((ws) => ws.groups.flatMap((g) => g.items.map((item) => ({ ...item, workspace: ws, group: g }))));

/** True when `to` is the active menu item for `path`. */
export function isActivePath(path: string, item: AdminNavItem): boolean {
  if (item.exact) return path === item.to;
  return startsWithPath(path, item.to);
}

/** Page title for the current URL, from the most specific matching menu item. */
export function itemForPath(path: string) {
  let best: (typeof ALL_ITEMS)[number] | undefined;
  for (const it of ALL_ITEMS) {
    if (isActivePath(path, it) && (!best || it.to.length > best.to.length)) best = it;
  }
  return best;
}
