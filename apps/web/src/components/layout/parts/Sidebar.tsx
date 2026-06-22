import { memo, useEffect, useMemo, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Sparkles, Store, Users, ShoppingCart, Receipt,
  Truck, PackagePlus, Tag, Wallet, Activity, BarChart3, Settings as SettingsIcon,
  ScanLine, ShieldCheck, BookOpen, ClipboardCheck, AlertTriangle, Building2,
  ArrowRightLeft, Download, Database, RotateCcw, Award, Percent, TrendingUp,
  CreditCard, Gift, Gauge, Hash, UserCircle, LifeBuoy, ScrollText, Eye,
  UserCog, CheckCircle2, Wallet2, Bell, Scissors, FileSpreadsheet, Layers,
  RefreshCw, Wrench, Smartphone,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@/lib/permissions';

const SIDEBAR_SCROLL_KEY = 'nafaa-sidebar-scroll';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { to: '/stock-report', label: 'Stock Report', icon: Package, permission: PERMISSIONS.REPORTS_VIEW, badge: 'NEW' },
      { to: '/profit-report', label: 'Profit by Product', icon: TrendingUp, permission: PERMISSIONS.PROFIT_REPORT_VIEW },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pos', label: 'POS', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
      { to: '/sales', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.SALES_VIEW },
      { to: '/returns', label: 'Returns', icon: RotateCcw, permission: PERMISSIONS.RETURNS_VIEW },
      { to: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
      { to: '/khata', label: 'Khata (Udhaar)', icon: BookOpen, permission: PERMISSIONS.KHATA_VIEW },
      { to: '/loyalty', label: 'Loyalty Points', icon: Award, permission: PERMISSIONS.LOYALTY_VIEW },
      { to: '/discounts', label: 'Discount Codes', icon: Percent, permission: PERMISSIONS.DISCOUNTS_VIEW },
      { to: '/cash-register', label: 'Cash Register', icon: Wallet, permission: PERMISSIONS.CASH_REGISTER_VIEW },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      { to: '/catalog', label: 'Catalog', icon: Eye, permission: PERMISSIONS.PRODUCTS_VIEW, badge: 'NEW' },
      { to: '/brands', label: 'Brands', icon: Building2, permission: PERMISSIONS.BRANDS_VIEW },
      { to: '/tags', label: 'Tags', icon: Hash, permission: PERMISSIONS.TAGS_VIEW },
      { to: '/categories', label: 'Categories', icon: Tag, permission: PERMISSIONS.CATEGORIES_VIEW },
      { to: '/low-stock', label: 'Low Stock Alerts', icon: AlertTriangle, permission: PERMISSIONS.LOW_STOCK_VIEW },
      { to: '/barcode-labels', label: 'Barcode Labels', icon: ScanLine, permission: PERMISSIONS.BARCODE_LABELS_VIEW },
      { to: '/stock-movements', label: 'Stock Movements', icon: Activity, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
      { to: '/stock-adjustments', label: 'Adjustments', icon: ClipboardCheck, permission: PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE },
      { to: '/transfers', label: 'Stock Transfers', icon: ArrowRightLeft, permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: PERMISSIONS.SUPPLIERS_VIEW },
      { to: '/purchases', label: 'Purchases', icon: PackagePlus, permission: PERMISSIONS.PURCHASES_VIEW },
    ],
  },
  {
    label: 'Carpet Industry',
    items: [
      { to: '/carpet-rolls', label: 'Carpet Rolls', icon: Layers, badge: 'NEW' },
      { to: '/carpet-cut-pieces', label: 'Cut Pieces', icon: Scissors },
      { to: '/carpet-reports', label: 'Carpet Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Mobile Industry',
    items: [
      { to: '/imei-inventory', label: 'IMEI Inventory', icon: Smartphone },
      { to: '/used-phones', label: 'Used Phones (Trade-In)', icon: RefreshCw },
      { to: '/repair-tickets', label: 'Repair Service', icon: Wrench },
      { to: '/emi-plans', label: 'EMI / Installments', icon: CreditCard },
      { to: '/mobile-reports', label: 'Mobile Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Staff Management',
    items: [
      { to: '/staff', label: 'All Staff', icon: UserCog, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/attendance', label: 'Attendance', icon: CheckCircle2, permission: PERMISSIONS.STAFF_VIEW },
      { to: '/staff/salary/new', label: 'Process Salary', icon: Wallet2, permission: PERMISSIONS.STAFF_MANAGE },
    ],
  },
  {
    label: 'Finance & Plan',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet, permission: PERMISSIONS.EXPENSES_VIEW },
      { to: '/billing', label: 'Billing', icon: CreditCard, permission: PERMISSIONS.BILLING_VIEW },
      { to: '/plans', label: 'Plans', icon: Sparkles, permission: PERMISSIONS.PLANS_VIEW },
      { to: '/plan-usage', label: 'Plan Usage', icon: Gauge, permission: PERMISSIONS.PLAN_USAGE_VIEW },
      { to: '/referrals', label: 'Referrals', icon: Gift, permission: PERMISSIONS.REFERRALS_VIEW },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/exports', label: 'Exports', icon: Download, permission: PERMISSIONS.EXPORTS_VIEW },
      { to: '/backup', label: 'Backup', icon: Database, permission: PERMISSIONS.BACKUP_MANAGE },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/team', label: 'Team (App Users)', icon: ShieldCheck, permission: PERMISSIONS.TEAM_VIEW },
      { to: '/shops', label: 'Shops / Branches', icon: Building2, permission: PERMISSIONS.SHOPS_VIEW },
      { to: '/activity-log', label: 'Activity Log', icon: Activity, permission: PERMISSIONS.ACTIVITY_VIEW },
      { to: '/profile', label: 'My Profile', icon: UserCircle },
      { to: '/help', label: 'Help Center', icon: LifeBuoy },
      { to: '/legal', label: 'Terms & Privacy', icon: ScrollText },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

type Props = {
  tenantName?: string;
  tenantSlug?: string;
  businessType?: string;
  role?: any;
  permissions?: string[];
  onItemClick?: () => void;
};

export const Sidebar = memo(function Sidebar({
  tenantName,
  tenantSlug,
  businessType,
  role,
  permissions,
  onItemClick,
}: Props) {
  const navRef = useRef<HTMLElement | null>(null);

  const filteredGroups = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    const isCarpet = type.includes('CARPET') || type.includes('FLOORING');
    const isMobile = type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS');

    return navGroups
      .filter((group) => {
        if (group.label === 'Carpet Industry' && !isCarpet) return false;
        if (group.label === 'Mobile Industry' && !isMobile) return false;
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.permission ? hasPermission(role, permissions, item.permission) : true,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [role, permissions, businessType]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved) nav.scrollTop = Number(saved);
    const handleScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    };
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* TOP: Branded Shop Card */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-800/60 shrink-0">
        <div className="relative rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-4 shadow-xl shadow-brand-900/30 overflow-hidden">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-md ring-1 ring-white/20">
                <Logo size={28} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Nafaa</div>
                <div className="text-[10px] text-white/60 font-semibold">Pakistan retail OS</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white truncate text-sm leading-tight">
                  {tenantName || 'My Store'}
                </div>
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  {businessType && (
                    <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur text-[9px] font-bold text-white">
                      {businessType.replace('_', ' ')}
                    </span>
                  )}
                  {tenantSlug && (
                    <span className="text-[9px] text-white/70 font-mono truncate">@{tenantSlug}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 sidebar-scroll"
      >
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/staff' || item.to === '/products'}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-900/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0 shadow">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* BOTTOM */}
      <div className="px-4 py-3 border-t border-slate-800/60 shrink-0">
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Pro Tip</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Settings → Business Type me apne shop ke features customize karein
          </p>
        </div>
      </div>
    </>
  );
});
