import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, ArrowRightLeft, BarChart3, BookOpen, BookmarkPlus, CheckCircle2, CornerDownLeft,
  Layers, Package, PackagePlus, Plus, Search, Settings, ShoppingBag, ShoppingCart, Smartphone, Tag, Truck, Users, Wallet,
} from 'lucide-react';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { useVisibleNav } from '../navigation/useVisibleNav';
import { Kbd, controlClass } from '@/design-system/components';
import { hasHover, Panel, useDismiss } from '../ui';

interface Props {
  role: any;
  permissions: string[] | undefined;
  businessType?: string;
}

type Tone = 'brand' | 'blue' | 'violet' | 'pink' | 'amber' | 'rose' | 'cyan' | 'orange' | 'slate';
type Action = { key: string; to: string; label: string; sub?: string; icon: any; tone: Tone; permission?: string; keywords?: string };
type Section = { title: string; items: Action[]; tiles?: boolean };

const TONE: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  pink: 'bg-pink-50 text-pink-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  orange: 'bg-orange-50 text-orange-700',
  slate: 'bg-slate-100 text-slate-600',
};

/**
 * "Create" button in the top bar. Opens a small command panel:
 * type to find any action or page, ↑ ↓ to move, Enter to open.
 * ⌥N opens it from anywhere (⌘Q would quit the browser on Mac).
 */
export function QuickActionsDropdown({ role, permissions, businessType }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { groups, settingsItems } = useVisibleNav(role, permissions);

  const close = useCallback(() => { setOpen(false); setQ(''); setIdx(0); }, []);
  useDismiss(ref, open, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyN') { e.preventDefault(); setOpen((v) => !v); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open && hasHover()) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const type = (businessType ?? '').toUpperCase();
  const isCarpet = type.includes('CARPET') || type.includes('FLOORING');
  const isMobileShop = type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS');

  const allowed = useCallback(
    (a: { permission?: string }) => !a.permission || hasPermission(role, permissions, a.permission as PermissionKey),
    [role, permissions],
  );

  const sections = useMemo<Section[]>(() => {
    const start: Action[] = [
      { key: 'sale', to: '/pos', label: 'New sale', sub: 'Open the POS counter', icon: ShoppingCart, tone: 'brand', permission: PERMISSIONS.POS_USE, keywords: 'bill checkout' },
      { key: 'booking', to: '/bookings/new', label: 'New booking', sub: 'Advance or reserve', icon: BookmarkPlus, tone: 'blue', permission: PERMISSIONS.SALES_VIEW },
    ];
    const create: Action[] = [
      { key: 'product', to: '/products/new', label: 'Add product', icon: Package, tone: 'violet', permission: PERMISSIONS.PRODUCTS_CREATE, keywords: 'item' },
      { key: 'customer', to: '/customers/new', label: 'Add customer', icon: Users, tone: 'pink', permission: PERMISSIONS.CUSTOMERS_EDIT },
      { key: 'supplier', to: '/suppliers/new', label: 'Add supplier', icon: Truck, tone: 'orange', permission: PERMISSIONS.SUPPLIERS_VIEW, keywords: 'vendor' },
      { key: 'expense', to: '/expenses', label: 'Record expense', icon: Wallet, tone: 'amber', permission: PERMISSIONS.EXPENSES_VIEW, keywords: 'kharcha' },
      { key: 'income', to: '/income?new=1', label: 'Doosri aamdani likhein', icon: Wallet, tone: 'amber', permission: PERMISSIONS.INCOME_MANAGE, keywords: 'income incentive scheme claim commission kiraya aamdani' },
      { key: 'purchase', to: '/purchases/new', label: 'New purchase', icon: PackagePlus, tone: 'rose', permission: PERMISSIONS.PURCHASES_CREATE, keywords: 'buy stock' },
      { key: 'transfer', to: '/transfers', label: 'Stock transfer', icon: ArrowRightLeft, tone: 'cyan', permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
    ];
    const industry: Action[] = [];
    if (isCarpet) {
      industry.push(
        { key: 'rolls', to: '/carpet-rolls', label: 'Carpet rolls', sub: 'Manage rolls', icon: Layers, tone: 'brand' },
        { key: 'cuts', to: '/carpet-cut-pieces', label: 'Cut pieces', sub: 'Leftover pieces', icon: Tag, tone: 'violet' },
      );
    }
    if (isMobileShop) industry.push({ key: 'imei', to: '/imei-inventory', label: 'IMEI inventory', sub: 'Add IMEIs', icon: Smartphone, tone: 'blue' });
    const daily: Action[] = [
      { key: 'attendance', to: '/staff/attendance', label: 'Mark attendance', icon: CheckCircle2, tone: 'cyan', permission: PERMISSIONS.STAFF_VIEW },
      { key: 'register', to: '/cash-register', label: 'Cash register', icon: Wallet, tone: 'brand', permission: PERMISSIONS.CASH_REGISTER_VIEW, keywords: 'till close day' },
    ];
    const jump: Action[] = [
      { key: 'online', to: '/online-orders', label: 'Online orders', icon: ShoppingBag, tone: 'slate', permission: PERMISSIONS.SALES_VIEW },
      { key: 'low', to: '/low-stock', label: 'Low stock', icon: AlertTriangle, tone: 'slate', permission: PERMISSIONS.LOW_STOCK_VIEW },
      { key: 'khata', to: '/khata', label: 'Khata (credit)', icon: BookOpen, tone: 'slate', permission: PERMISSIONS.KHATA_VIEW, keywords: 'udhaar' },
      { key: 'reports', to: '/reports', label: 'Reports', icon: BarChart3, tone: 'slate', permission: PERMISSIONS.REPORTS_VIEW },
    ];

    const base: Section[] = [
      { title: 'Start', items: start.filter(allowed), tiles: true },
      { title: isCarpet ? 'Carpet' : 'Your shop', items: industry.filter(allowed) },
      { title: 'Create', items: create.filter(allowed) },
      { title: 'Daily', items: daily.filter(allowed) },
      { title: 'Go to', items: jump.filter(allowed) },
    ].filter((s) => s.items.length);

    const query = q.trim().toLowerCase();
    if (!query) return base;

    const hit = (text: string) => text.toLowerCase().includes(query);
    const actions = base.flatMap((s) => s.items).filter((a) => hit(`${a.label} ${a.sub ?? ''} ${a.keywords ?? ''}`));
    const taken = new Set(actions.map((a) => a.to));
    const pages: Action[] = groups
      .flatMap((g) => g.items.map((i) => ({ ...i, groupLabel: g.label })))
      .filter((i) => !taken.has(i.to) && hit(`${i.label} ${i.keywords ?? ''} ${i.groupLabel}`))
      .slice(0, 10)
      .map((i) => ({ key: `page-${i.to}`, to: i.to, label: i.label, sub: i.groupLabel, icon: i.icon, tone: 'slate' as Tone }));
    const settings: Action[] = settingsItems
      .filter((i) => hit(`${i.label} ${i.desc} ${i.keywords ?? ''}`))
      .slice(0, 6)
      .map((i) => ({ key: `set-${i.to}`, to: i.to, label: i.label, sub: `Settings · ${i.desc}`, icon: i.icon ?? Settings, tone: 'slate' as Tone }));

    return [
      { title: 'Actions', items: actions },
      { title: 'Pages', items: pages },
      { title: 'Settings', items: settings },
    ].filter((s) => s.items.length);
  }, [q, isCarpet, isMobileShop, allowed, groups, settingsItems]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  useEffect(() => { setIdx(0); }, [q]);

  // Keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  const go = (a?: Action) => {
    if (!a) return;
    navigate(a.to);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[idx]); }
  };

  let n = -1;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Create and quick actions"
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-fg shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 lg:px-3 dark:focus-visible:ring-offset-ink-900',
          open ? 'bg-brand-800' : 'bg-brand-600 hover:bg-brand-700',
        )}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">Create</span>
        <Kbd className="ml-0.5 hidden border-white/25 bg-white/15 text-white/90 xl:inline-flex dark:border-ink-white/25 dark:bg-ink-white/15 dark:text-ink-white/90">⌥N</Kbd>
      </button>

      <Panel open={open} onClose={close} widthClass="sm:w-[25rem]" label="Quick actions">
        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search actions, pages, settings…"
              aria-label="Search actions"
              className={cn(controlClass(), 'h-11 rounded-xl pl-9 pr-3 text-[0.875rem]')}
            />
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {sections.map((s) => (
            <div key={s.title} className="pb-2">
              <div className="px-2 pb-1 pt-1.5 text-[0.75rem] font-semibold text-slate-400">{s.title}</div>
              {s.tiles ? (
                <div className="grid grid-cols-2 gap-2 px-1">
                  {s.items.map((a) => {
                    n += 1;
                    const i = n;
                    const Icon = a.icon;
                    return (
                      <button key={a.key} data-idx={i} onClick={() => go(a)} onMouseEnter={() => setIdx(i)}
                        className={cn('flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition',
                          idx === i ? 'border-brand-300 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300')}>
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONE[a.tone])}><Icon className="h-[1.125rem] w-[1.125rem]" /></span>
                        <span>
                          <span className="block text-[0.84375rem] font-semibold">{a.label}</span>
                          {a.sub && <span className="block text-[0.75rem] text-slate-500">{a.sub}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                s.items.map((a) => {
                  n += 1;
                  const i = n;
                  const Icon = a.icon;
                  return (
                    <button key={a.key} data-idx={i} onClick={() => go(a)} onMouseEnter={() => setIdx(i)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition',
                        idx === i ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE[a.tone])}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.84375rem] font-medium">{a.label}</span>
                        {a.sub && <span className="block truncate text-[0.75rem] text-slate-500">{a.sub}</span>}
                      </span>
                      {idx === i
                        ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        : <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                    </button>
                  );
                })
              )}
            </div>
          ))}
          {flat.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Search className="mx-auto h-7 w-7 text-slate-300" />
              <div className="mt-2 text-[0.875rem] font-semibold">Nothing found for “{q}”</div>
              <div className="text-[0.75rem] text-slate-500">Try a page name like “khata” or “products”.</div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-t border-slate-100 px-3 py-2 text-[0.6875rem] text-slate-500 sm:flex">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>⌥N</Kbd> anywhere</span>
        </div>
      </Panel>
    </div>
  );
}