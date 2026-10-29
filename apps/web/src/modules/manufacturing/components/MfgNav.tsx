/** Links between the manufacturing pages, shown under each page's header. */

import { NavLink } from 'react-router-dom';
import { BarChart3, Factory, FlaskConical, History, LayoutDashboard } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';

export function MfgNav() {
  const canProduce = usePermission(PERMISSIONS.MANUFACTURING_PRODUCE);
  const items = [
    { to: '/manufacturing', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/manufacturing/recipes', label: 'Recipes', icon: FlaskConical },
    ...(canProduce ? [{ to: '/manufacturing/produce', label: 'Banayein', icon: Factory }] : []),
    { to: '/manufacturing/history', label: 'History', icon: History },
    { to: '/manufacturing/report', label: 'Report', icon: BarChart3 },
  ];
  return (
    <nav aria-label="Manufacturing" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <div className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[0.875rem] font-semibold transition',
              isActive ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon className="h-4 w-4" />{label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Shown when manufacturing is switched off in Settings. */
export function MfgOff() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Factory className="h-7 w-7" /></span>
      <p className="mt-3 font-semibold text-slate-900">Banayein (Manufacturing) band hai</p>
      <p className="mt-1 text-[0.875rem] text-slate-500">Settings → Stock me "Recipe aur Production" chalu karein. Phir raw maal se apna maal banayein aur Cost khud nikalegi.</p>
      <NavLink to="/settings/stock" className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700">Settings kholein</NavLink>
    </div>
  );
}
