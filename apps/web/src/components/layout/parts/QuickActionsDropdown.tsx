import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, ChevronDown, ChevronRight, ShoppingCart, Package, Users,
  Wallet, PackagePlus, CheckCircle2,
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Props {
  role: any;
  permissions: string[] | undefined;
}

export function QuickActionsDropdown({ role, permissions }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions = [
    { to: '/pos', label: 'New Sale', icon: ShoppingCart, color: 'emerald', permission: PERMISSIONS.POS_USE },
    { to: '/products/new', label: 'Add Product', icon: Package, color: 'blue', permission: PERMISSIONS.PRODUCTS_CREATE },
    { to: '/customers/new', label: 'Add Customer', icon: Users, color: 'violet', permission: PERMISSIONS.CUSTOMERS_EDIT },
    { to: '/expenses', label: 'Add Expense', icon: Wallet, color: 'amber', permission: PERMISSIONS.EXPENSES_VIEW },
    { to: '/purchases', label: 'New Purchase', icon: PackagePlus, color: 'pink', permission: PERMISSIONS.PURCHASES_VIEW },
    { to: '/staff/attendance', label: 'Mark Attendance', icon: CheckCircle2, color: 'cyan', permission: PERMISSIONS.STAFF_VIEW },
  ].filter((a) => !a.permission || hasPermission(role, permissions, a.permission));

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    pink: 'bg-pink-100 text-pink-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-10 inline-flex items-center gap-2 px-3.5 rounded-xl text-sm font-bold transition shadow-sm ${
          open ? 'bg-brand-700 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'
        }`}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Quick</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Quick Actions</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">Fast shortcuts</div>
          </div>
          <div className="p-2">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${colorMap[a.color]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 flex-1">{a.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
