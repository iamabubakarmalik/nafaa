import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, ChevronDown, ChevronRight, ShoppingCart, Package, Users,
  Wallet, PackagePlus, CheckCircle2, BookmarkPlus, Receipt, Sparkles,
  Zap, Truck, Tag, Layers, Smartphone, ArrowRightLeft,
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Props {
  role: any;
  permissions: string[] | undefined;
  businessType?: string;
}

interface Action {
  to: string;
  label: string;
  sublabel?: string;
  icon: any;
  color: string;
  permission?: string;
  shortcut?: string;
  hot?: boolean;
}

export function QuickActionsDropdown({ role, permissions, businessType }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Q
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'q') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const type = (businessType ?? '').toUpperCase();
  const isCarpet = type.includes('CARPET') || type.includes('FLOORING');
  const isMobile = type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS');

  const primary: Action[] = [
    { to: '/pos', label: 'New Sale', sublabel: 'Open POS counter', icon: ShoppingCart, color: 'emerald', permission: PERMISSIONS.POS_USE, hot: true, shortcut: '⌘S' },
    { to: '/bookings/new', label: 'New Booking', sublabel: 'Advance / Reserve', icon: BookmarkPlus, color: 'blue', permission: PERMISSIONS.SALES_VIEW, hot: true },
  ];

  const create: Action[] = [
    { to: '/products/new', label: 'Add Product', icon: Package, color: 'violet', permission: PERMISSIONS.PRODUCTS_CREATE },
    { to: '/customers/new', label: 'Add Customer', icon: Users, color: 'pink', permission: PERMISSIONS.CUSTOMERS_EDIT },
    { to: '/suppliers/new', label: 'Add Supplier', icon: Truck, color: 'orange', permission: PERMISSIONS.SUPPLIERS_VIEW },
    { to: '/expenses', label: 'Add Expense', icon: Wallet, color: 'amber', permission: PERMISSIONS.EXPENSES_VIEW },
    { to: '/purchases', label: 'New Purchase', icon: PackagePlus, color: 'rose', permission: PERMISSIONS.PURCHASES_VIEW },
    { to: '/transfers', label: 'Stock Transfer', icon: ArrowRightLeft, color: 'cyan', permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
  ];

  const industry: Action[] = [];
  if (isCarpet) {
    industry.push(
      { to: '/carpet-rolls', label: 'Carpet Rolls', sublabel: 'Manage rolls', icon: Layers, color: 'emerald' },
      { to: '/carpet-cut-pieces', label: 'Cut Pieces', sublabel: 'Cut leftover pieces', icon: Tag, color: 'violet' },
    );
  }
  if (isMobile) {
    industry.push(
      { to: '/imei-inventory', label: 'IMEI Inventory', sublabel: 'Add IMEIs', icon: Smartphone, color: 'blue' },
    );
  }

  const daily: Action[] = [
    { to: '/staff/attendance', label: 'Mark Attendance', icon: CheckCircle2, color: 'cyan', permission: PERMISSIONS.STAFF_VIEW },
    { to: '/cash-register', label: 'Cash Register', icon: Wallet, color: 'emerald', permission: PERMISSIONS.CASH_REGISTER_VIEW },
  ];

  const filterActions = (list: Action[]) =>
    list.filter((a) => !a.permission || hasPermission(role, permissions, a.permission));

  const filteredPrimary = filterActions(primary);
  const filteredCreate = filterActions(create);
  const filteredIndustry = filterActions(industry);
  const filteredDaily = filterActions(daily);

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700', text: 'text-white', ring: 'ring-emerald-500/30' },
    blue: { bg: 'bg-gradient-to-br from-blue-500 to-blue-700', text: 'text-white', ring: 'ring-blue-500/30' },
    violet: { bg: 'bg-gradient-to-br from-violet-500 to-violet-700', text: 'text-white', ring: 'ring-violet-500/30' },
    pink: { bg: 'bg-gradient-to-br from-pink-500 to-pink-700', text: 'text-white', ring: 'ring-pink-500/30' },
    amber: { bg: 'bg-gradient-to-br from-amber-500 to-amber-700', text: 'text-white', ring: 'ring-amber-500/30' },
    rose: { bg: 'bg-gradient-to-br from-rose-500 to-rose-700', text: 'text-white', ring: 'ring-rose-500/30' },
    cyan: { bg: 'bg-gradient-to-br from-cyan-500 to-cyan-700', text: 'text-white', ring: 'ring-cyan-500/30' },
    orange: { bg: 'bg-gradient-to-br from-orange-500 to-orange-700', text: 'text-white', ring: 'ring-orange-500/30' },
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-10 inline-flex items-center gap-2 px-3.5 rounded-xl text-sm font-extrabold transition-all shadow-md ${
          open
            ? 'bg-gradient-to-r from-brand-700 to-emerald-700 text-white shadow-brand-500/40 scale-105'
            : 'bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white shadow-brand-500/30 hover:shadow-lg'
        }`}
      >
        <Zap className="h-4 w-4" />
        <span className="hidden sm:inline">Quick</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b-2 border-slate-100 bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-800 text-white relative overflow-hidden">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Quick Actions
                </div>
                <div className="text-sm font-extrabold mt-0.5">Fast shortcuts</div>
              </div>
              <div className="text-[9px] font-mono font-bold px-2 py-1 rounded-md bg-white/15 backdrop-blur border border-white/20">
                ⌘Q
              </div>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {/* PRIMARY — Hot actions */}
            {filteredPrimary.length > 0 && (
              <div className="p-2 border-b border-slate-100">
                <div className="px-2 pt-1 pb-1.5 text-[9px] uppercase tracking-widest font-extrabold text-amber-600 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Most Used
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredPrimary.map((a) => {
                    const Icon = a.icon;
                    const c = colorMap[a.color];
                    return (
                      <Link
                        key={a.to}
                        to={a.to}
                        onClick={() => setOpen(false)}
                        className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-transparent hover:border-slate-200 hover:shadow-md transition ${c.bg} ${c.text}`}
                      >
                        <div className="h-10 w-10 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center shadow-inner">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <div className="text-[11px] font-extrabold leading-tight">{a.label}</div>
                          {a.sublabel && (
                            <div className="text-[9px] opacity-80 mt-0.5">{a.sublabel}</div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Industry-specific */}
            {filteredIndustry.length > 0 && (
              <div className="p-2 border-b border-slate-100">
                <div className="px-2 pt-1 pb-1.5 text-[9px] uppercase tracking-widest font-extrabold text-emerald-600 flex items-center gap-1">
                  {isCarpet ? '🧶 Carpet Actions' : '📱 Mobile Actions'}
                </div>
                {filteredIndustry.map((a) => (
                  <ActionRow key={a.to} action={a} colorMap={colorMap} onClick={() => setOpen(false)} />
                ))}
              </div>
            )}

            {/* Create */}
            {filteredCreate.length > 0 && (
              <div className="p-2 border-b border-slate-100">
                <div className="px-2 pt-1 pb-1.5 text-[9px] uppercase tracking-widest font-extrabold text-slate-600 flex items-center gap-1">
                  <Plus className="h-2.5 w-2.5" />
                  Create New
                </div>
                {filteredCreate.map((a) => (
                  <ActionRow key={a.to} action={a} colorMap={colorMap} onClick={() => setOpen(false)} />
                ))}
              </div>
            )}

            {/* Daily */}
            {filteredDaily.length > 0 && (
              <div className="p-2">
                <div className="px-2 pt-1 pb-1.5 text-[9px] uppercase tracking-widest font-extrabold text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Daily Tasks
                </div>
                {filteredDaily.map((a) => (
                  <ActionRow key={a.to} action={a} colorMap={colorMap} onClick={() => setOpen(false)} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-500 font-bold">
              Press <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9px] font-extrabold">⌘Q</kbd> to open anytime
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action, colorMap, onClick,
}: {
  action: Action;
  colorMap: Record<string, { bg: string; text: string; ring: string }>;
  onClick: () => void;
}) {
  const Icon = action.icon;
  const c = colorMap[action.color];
  return (
    <Link
      to={action.to}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition group"
    >
      <div className={`h-9 w-9 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-extrabold text-slate-900 truncate">{action.label}</div>
        {action.sublabel && (
          <div className="text-[10px] font-semibold text-slate-500 truncate">{action.sublabel}</div>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-brand-600 group-hover:translate-x-0.5 transition" />
    </Link>
  );
}
