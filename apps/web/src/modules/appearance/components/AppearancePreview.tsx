/**
 * Live preview of an appearance: a miniature app (sidebar, top bar, stat,
 * buttons, badges, input) themed with the given settings.
 *
 * The preview sets its own CSS variables and `dark` class, so it can show the
 * business defaults while the rest of the app shows the user's personal look.
 */

import { useEffect, type CSSProperties } from 'react';
import { BarChart3, Bell, Home, Package, Search, ShoppingCart, Users } from 'lucide-react';
import { ensureFont, findLatinFont, isDarkMode, themeVariables, useAppearanceStore, type ResolvedAppearance } from '@/design-system';
import { cn } from '@core/lib/cn';

export function AppearancePreview({ appearance, industryLabel }: { appearance: ResolvedAppearance; industryLabel: string }) {
  const systemPrefersDark = useAppearanceStore((s) => s.systemPrefersDark);
  const dark = isDarkMode(appearance, systemPrefersDark);
  const vars = themeVariables(appearance, dark) as CSSProperties;
  const sidebarDark = appearance.sidebarStyle !== 'light';

  useEffect(() => {
    ensureFont(findLatinFont(appearance.latinFont));
  }, [appearance.latinFont]);

  return (
    <div
      aria-label="Preview"
      className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-shell-canvas text-[rgb(var(--fg))] shadow-sm', dark ? 'dark' : 'light')}
      style={{ ...vars, fontFamily: 'var(--font-latin)' }}
    >
      <div className="flex h-[19rem]">
        <aside
          className={cn('flex w-36 shrink-0 flex-col gap-1 border-r border-shell-line bg-shell-sidebar p-2 text-[rgb(var(--fg))]', sidebarDark && 'dark')}
          style={sidebarDark ? ({ '--shell-sidebar': 'var(--shell-sidebar-dark)', '--shell-line': 'var(--shell-sidebar-dark-line)' } as CSSProperties) : undefined}
        >
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700" />
            <span className="truncate text-[0.6875rem] font-semibold text-slate-900">{industryLabel}</span>
          </div>
          {[
            { icon: Home, label: 'Dashboard' },
            { icon: ShoppingCart, label: 'POS', active: true },
            { icon: Package, label: 'Products' },
            { icon: Users, label: 'Customers' },
            { icon: BarChart3, label: 'Reports' },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className={cn(
              'relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.6875rem]',
              active ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'font-medium text-slate-600',
            )}>
              {active && <span className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" />}
              <Icon className={cn('h-3.5 w-3.5', active && 'text-brand-600')} /> {label}
            </div>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 items-center gap-2 border-b border-shell-line bg-shell-bar px-3">
            <div className="flex h-6 flex-1 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[0.625rem] text-slate-400">
              <Search className="h-3 w-3" /> Search…
            </div>
            <span className="rounded-md bg-brand-600 px-2 py-1 text-[0.625rem] font-semibold text-brand-fg">+ Create</span>
            <Bell className="h-3.5 w-3.5 text-slate-500" />
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="text-[0.625rem] text-slate-500">Aaj ki sale</div>
                <div className="text-[0.9375rem] font-bold text-slate-900">Rs 48,250</div>
                <span className="mt-1 inline-block rounded bg-success-50 px-1.5 py-px text-[0.5625rem] font-semibold text-success-700">+12%</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="text-[0.625rem] text-slate-500">Orders</div>
                <div className="text-[0.9375rem] font-bold text-slate-900">126</div>
                <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-px text-[0.5625rem] font-semibold text-brand-700">8 new</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="mb-2 text-[0.6875rem] font-semibold text-slate-900">Naya customer</div>
              <div className="mb-2 h-7 rounded-lg border border-slate-200 bg-white px-2 text-[0.625rem] leading-7 text-slate-400">Naam likhein</div>
              <div className="flex gap-1.5">
                <span className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[0.625rem] font-semibold text-brand-fg">Save</span>
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.625rem] font-semibold text-slate-700">Cancel</span>
                <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.625rem] font-semibold text-rose-700">Delete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
