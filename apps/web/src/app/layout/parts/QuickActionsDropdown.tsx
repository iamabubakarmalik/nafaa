import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, ArrowRightLeft, BarChart3, BookOpen, BookmarkPlus, CheckCircle2, CornerDownLeft,
  Layers, Package, PackagePlus, Plus, Search, Settings, ShoppingBag, ShoppingCart, Smartphone, Tag, Truck, Users, Wallet,
} from 'lucide-react';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { useVisibleNav } from './Sidebar';
import { hasHover, Kbd, Panel, useDismiss } from './shell-ui';

interface Props {
  role: any;
  permissions: string[] | undefined;
  businessType?: string;
}

type Tone = 'emerald' | 'blue' | 'violet' | 'pink' | 'amber' | 'rose' | 'cyan' | 'orange' | 'slate';
type Action = { key: string; to: string; label: string; sub?: string; icon: any; tone: Tone; permission?: string; keywords?: string };
type Section = { title: string; items: Action[]; tiles?: boolean };

const TONE: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  pink: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
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
      { key: 'sale', to: '/pos', label: 'New sale', sub: 'Open the POS counter', icon: ShoppingCart, tone: 'emerald', permission: PERMISSIONS.POS_USE, keywords: 'bill checkout' },
      { key: 'booking', to: '/bookings/new', label: 'New booking', sub: 'Advance or reserve', icon: BookmarkPlus, tone: 'blue', permission: PERMISSIONS.SALES_VIEW },
    ];
    const create: Action[] = [
      { key: 'product', to: '/products/new', label: 'Add product', icon: Package, tone: 'violet', permission: PERMISSIONS.PRODUCTS_CREATE, keywords: 'item' },
      { key: 'customer', to: '/customers/new', label: 'Add customer', icon: Users, tone: 'pink', permission: PERMISSIONS.CUSTOMERS_EDIT },
      { key: 'supplier', to: '/suppliers/new', label: 'Add supplier', icon: Truck, tone: 'orange', permission: PERMISSIONS.SUPPLIERS_VIEW, keywords: 'vendor' },
      { key: 'expense', to: '/expenses', label: 'Record expense', icon: Wallet, tone: 'amber', permission: PERMISSIONS.EXPENSES_VIEW, keywords: 'kharcha' },
      { key: 'purchase', to: '/purchases', label: 'New purchase', icon: PackagePlus, tone: 'rose', permission: PERMISSIONS.PURCHASES_VIEW, keywords: 'buy stock' },
      { key: 'transfer', to: '/transfers', label: 'Stock transfer', icon: ArrowRightLeft, tone: 'cyan', permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
    ];
    const industry: Action[] = [];
    if (isCarpet) {
      industry.push(
        { key: 'rolls', to: '/carpet-rolls', label: 'Carpet rolls', sub: 'Manage rolls', icon: Layers, tone: 'emerald' },
        { key: 'cuts', to: '/carpet-cut-pieces', label: 'Cut pieces', sub: 'Leftover pieces', icon: Tag, tone: 'violet' },
      );
    }
    if (isMobileShop) industry.push({ key: 'imei', to: '/imei-inventory', label: 'IMEI inventory', sub: 'Add IMEIs', icon: Smartphone, tone: 'blue' });
    const daily: Action[] = [
      { key: 'attendance', to: '/staff/attendance', label: 'Mark attendance', icon: CheckCircle2, tone: 'cyan', permission: PERMISSIONS.STAFF_VIEW },
      { key: 'register', to: '/cash-register', label: 'Cash register', icon: Wallet, tone: 'emerald', permission: PERMISSIONS.CASH_REGISTER_VIEW, keywords: 'till close day' },
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
          'inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-white shadow-sm transition sm:px-3',
          open ? 'bg-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700',
        )}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Create</span>
        <Kbd className="ml-0.5 hidden border-white/25 bg-white/15 text-white/90 xl:inline-flex dark:border-white/25 dark:bg-white/15 dark:text-white/90">⌥N</Kbd>
      </button>

      <Panel open={open} onClose={close} widthClass="sm:w-[400px]" label="Quick actions">
        <div className="border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search actions, pages, settings…"
              aria-label="Search actions"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {sections.map((s) => (
            <div key={s.title} className="pb-2">
              <div className="px-2 pb-1 pt-1.5 text-[12px] font-semibold text-slate-400">{s.title}</div>
              {s.tiles ? (
                <div className="grid grid-cols-2 gap-2 px-1">
                  {s.items.map((a) => {
                    n += 1;
                    const i = n;
                    const Icon = a.icon;
                    return (
                      <button key={a.key} data-idx={i} onClick={() => go(a)} onMouseEnter={() => setIdx(i)}
                        className={cn('flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition',
                          idx === i ? 'border-emerald-500/50 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')}>
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONE[a.tone])}><Icon className="h-[18px] w-[18px]" /></span>
                        <span>
                          <span className="block text-[13.5px] font-semibold">{a.label}</span>
                          {a.sub && <span className="block text-[12px] text-slate-500">{a.sub}</span>}
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
                        idx === i ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60')}>
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE[a.tone])}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{a.label}</span>
                        {a.sub && <span className="block truncate text-[12px] text-slate-500">{a.sub}</span>}
                      </span>
                      {idx === i
                        ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        : <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />}
                    </button>
                  );
                })
              )}
            </div>
          ))}
          {flat.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Search className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
              <div className="mt-2 text-[14px] font-semibold">Nothing found for “{q}”</div>
              <div className="text-[12px] text-slate-500">Try a page name like “khata” or “products”.</div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500 sm:flex dark:border-slate-800">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>⌥N</Kbd> anywhere</span>
        </div>
      </Panel>
    </div>
  );
}