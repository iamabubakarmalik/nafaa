/**
 * Global search (command palette).
 *
 * Opens with Ctrl/⌘+K, the search field in the top bar, or the search icon on
 * phones. Lists common actions (new bill, new product, add customer…) and
 * every menu and settings page instantly (client side), and finds products,
 * customers, sales and suppliers from the API. Arrow keys move, Enter opens,
 * Escape closes and focus returns to where it was.
 *
 * The dialog renders in a portal and is mounted once by AppShell, so it is
 * never clipped or hidden by the top bar's responsive containers. Sale totals
 * and customer balances respect the privacy lock (HiddenValue).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import {
  ArrowLeft, BarChart3, BookOpen, ClipboardCheck, CornerDownLeft, Keyboard, Loader2, Package, PackagePlus, Receipt, Search, Settings,
  ShoppingCart, Truck, UserPlus, Users, Wallet, X,
} from 'lucide-react';
import { searchApi, type SearchResults } from '@modules/pos/api/search.api';
import { formatPKR } from '@core/lib/format';
import { HiddenValue } from '@core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { useShortcutsHelp } from '../keyboard/ShortcutsHelp';
import { useVisibleNav } from '../navigation/useVisibleNav';
import { Kbd } from '@/design-system/components';

/* ─── Open state, shared by every trigger ─── */

interface SearchState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useGlobalSearch = create<SearchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/* ─── Trigger shown in the top bar from 768px up ─── */

export function GlobalSearchTrigger() {
  const setOpen = useGlobalSearch((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[0.8125rem] text-slate-500 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-left">Search products, customers, pages…</span>
      <Kbd className="hidden lg:inline-flex">Ctrl K</Kbd>
    </button>
  );
}

/* ─── Dialog ─── */

type ResultItem = {
  key: string;
  section: string;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  icon: ReactNode;
  to?: string;
  run?: () => void;
};

/** Common actions, shown first. `q` holds extra words people may type. */
const ACTIONS: Array<{ title: string; subtitle: string; to: string; icon: typeof Receipt; permission?: string; q: string }> = [
  { title: 'Naya bill', subtitle: 'POS counter kholein', to: '/pos', icon: ShoppingCart, permission: PERMISSIONS.POS_USE, q: 'new sale bill pos checkout' },
  { title: 'Naya product', subtitle: 'Nayi cheez add karein', to: '/products/new', icon: Package, permission: PERMISSIONS.PRODUCTS_CREATE, q: 'add product item new' },
  { title: 'Bulk banayein', subtitle: 'Bohat se products ek sheet me likhein', to: '/products/bulk-create', icon: PackagePlus, permission: PERMISSIONS.PRODUCTS_CREATE, q: 'bulk create many products sheet spreadsheet excel' },
  { title: 'Bulk edit', subtitle: 'Bohat se products ki price, stock ek saath', to: '/products/bulk-edit', icon: Package, permission: PERMISSIONS.PRODUCTS_EDIT, q: 'bulk edit price stock spreadsheet many products' },
  { title: 'Excel import', subtitle: 'File se products aur stock', to: '/products/bulk-import', icon: PackagePlus, permission: PERMISSIONS.PRODUCTS_CREATE, q: 'excel import csv upload products stock file' },
  { title: 'Customer add', subtitle: 'Naya customer', to: '/customers/new', icon: UserPlus, permission: PERMISSIONS.CUSTOMERS_EDIT, q: 'new customer add' },
  { title: 'Purchase', subtitle: 'Naya maal khareedein', to: '/purchases/new', icon: PackagePlus, permission: PERMISSIONS.PURCHASES_CREATE, q: 'new purchase buy stock supplier' },
  { title: 'Expense', subtitle: 'Kharcha likhein', to: '/expenses?new=1', icon: Wallet, permission: PERMISSIONS.EXPENSES_CREATE, q: 'new expense kharcha' },
  { title: 'Report…', subtitle: 'Sab reports', to: '/reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW, q: 'reports report profit sale' },
  { title: 'Supplier add', subtitle: 'Naya supplier', to: '/suppliers/new', icon: Truck, permission: PERMISSIONS.SUPPLIERS_VIEW, q: 'new supplier vendor' },
  { title: 'Stock adjust', subtitle: 'Stock ginti theek karein', to: '/stock-adjustments', icon: ClipboardCheck, permission: PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE, q: 'stock adjustment count' },
  { title: 'Khata', subtitle: 'Udhaar ka hisaab', to: '/khata', icon: BookOpen, permission: PERMISSIONS.KHATA_VIEW, q: 'khata udhaar credit' },
];

const MIN_REMOTE_QUERY = 2;

export function GlobalSearchDialog() {
  const { open, setOpen } = useGlobalSearch();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { groups, settingsItems } = useVisibleNav(user?.role, user?.permissions);
  const openHelp = useShortcutsHelp((st) => st.setOpen);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ctrl/⌘ + K toggles; Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useGlobalSearch.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  // Reset when closed; focus and lock page scroll when open.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      setActive(0);
      // Back to where the user was, unless the palette navigated somewhere new.
      const back = returnFocus.current;
      returnFocus.current = null;
      if (back && document.contains(back) && (document.activeElement === document.body || !document.activeElement)) back.focus({ preventScroll: true });
      return;
    }
    returnFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.clearTimeout(t); document.body.style.overflow = previous; };
  }, [open]);

  // Remote search, debounced.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < MIN_REMOTE_QUERY) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        setResults(await searchApi.global(q));
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  const items = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const hit = (text: string) => !q || text.toLowerCase().includes(q);
    const can = (p?: string) => !p || hasPermission(user?.role as never, user?.permissions, p as PermissionKey);
    const actions = ACTIONS
      .filter((a) => can(a.permission) && hit(`${a.title} ${a.subtitle} ${a.q}`))
      .map((a): ResultItem => ({ key: `a:${a.to}`, section: 'Actions', title: a.title, subtitle: a.subtitle, icon: <a.icon className="h-4 w-4" />, to: a.to }));
    if (hit('keyboard shortcuts keys help madad')) {
      actions.push({ key: 'a:help', section: 'Actions', title: 'Keyboard shortcuts', subtitle: 'Saari keys dekhein (?)', icon: <Keyboard className="h-4 w-4" />, run: () => openHelp(true) });
    }
    // Every page when the box is empty; the best matches while typing.
    const seen = new Set<string>();
    const pages = groups
      .flatMap((g) => g.items.map((i) => ({ item: i, group: g.label })))
      .filter(({ item }) => (seen.has(item.to) ? false : (seen.add(item.to), true)))
      .filter(({ item, group }) => hit(`${item.label} ${item.keywords ?? ''} ${group}`))
      .slice(0, q ? 12 : undefined)
      .map(({ item, group }): ResultItem => {
        const Icon = item.icon;
        return { key: `page:${item.to}`, section: q ? 'Pages' : 'Go to', title: item.label, subtitle: group, icon: <Icon className="h-4 w-4" />, to: item.to };
      });
    const settings = q
      ? settingsItems
        .filter((i) => !i.external && hit(`${i.label} ${i.desc} ${i.keywords ?? ''}`))
        .slice(0, 6)
        .map((i): ResultItem => {
          const Icon = i.icon ?? Settings;
          return { key: `set:${i.to}`, section: 'Settings', title: i.label, subtitle: i.desc, icon: <Icon className="h-4 w-4" />, to: i.to };
        })
      : [];
    const local = [...actions, ...pages, ...settings];
    if (!results) return local;
    return [
      ...local,
      ...results.products.map((p): ResultItem => ({
        key: `p:${p.id}`, section: 'Products', title: p.name, subtitle: p.sku || undefined,
        meta: <span className="tabular-nums">{formatPKR(p.price)}</span>, icon: <Package className="h-4 w-4" />, to: `/products/${p.id}`,
      })),
      ...results.customers.map((c): ResultItem => ({
        key: `c:${c.id}`, section: 'Customers', title: c.name, subtitle: c.phone || undefined,
        meta: c.balance ? <HiddenValue type="sales" value={formatPKR(c.balance)} /> : undefined, icon: <Users className="h-4 w-4" />, to: `/customers/${c.id}`,
      })),
      ...results.sales.map((s): ResultItem => ({
        key: `s:${s.id}`, section: 'Sales', title: s.saleNumber, subtitle: s.customer?.name || 'Walk-in',
        meta: <HiddenValue type="sales" value={formatPKR(s.total)} />, icon: <Receipt className="h-4 w-4" />, to: `/sales/${s.id}/receipt`,
      })),
      ...results.suppliers.map((s): ResultItem => ({
        key: `su:${s.id}`, section: 'Suppliers', title: s.name, subtitle: s.phone || undefined, icon: <Truck className="h-4 w-4" />, to: `/suppliers/${s.id}`,
      })),
    ];
  }, [groups, settingsItems, query, results, user, openHelp]);

  useEffect(() => { setActive(0); }, [query, results]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (item?: ResultItem) => {
    if (!item) return;
    setOpen(false);
    if (item.run) { returnFocus.current = null; item.run(); return; }
    if (item.to) navigate(item.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Home' && !query) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && !query) { e.preventDefault(); setActive(items.length - 1); }
    else if (e.key === 'PageDown') { e.preventDefault(); setActive((i) => Math.min(i + 8, items.length - 1)); }
    else if (e.key === 'PageUp') { e.preventDefault(); setActive((i) => Math.max(i - 8, 0)); }
    else if (e.key === 'Tab') { e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  if (!open) return null;

  const trimmed = query.trim();
  const sections = items.reduce<{ name: string; rows: { item: ResultItem; index: number }[] }[]>((acc, item, index) => {
    const last = acc[acc.length - 1];
    if (last?.name === item.section) last.rows.push({ item, index });
    else acc.push({ name: item.section, rows: [{ item, index }] });
    return acc;
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center sm:items-start sm:px-4 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={() => setOpen(false)} aria-hidden />

      <div className="relative flex w-full flex-col overflow-hidden bg-white shadow-2xl animate-in fade-in duration-150 sm:max-h-[min(70dvh,560px)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-200 sm:zoom-in-95">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 pt-[env(safe-area-inset-top)] sm:px-4">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 sm:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Search className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Page, action, product, customer ya bill dhoondein…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-activedescendant={items[active] ? `gs-opt-${active}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-slate-900 outline-none placeholder:text-slate-400"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
          {query && (
            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          )}
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </div>

        <div ref={listRef} id="global-search-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {sections.map((section) => (
            <div key={section.name} className="pb-1">
              <div className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{section.name}</div>
              {section.rows.map(({ item, index }) => (
                <button
                  type="button"
                  key={item.key}
                  data-index={index}
                  id={`gs-opt-${index}`}
                  tabIndex={-1}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    index === active ? 'bg-brand-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', index === active ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-500')}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium">{item.title}</span>
                    {item.subtitle && <span className="block truncate text-[0.75rem] text-slate-500">{item.subtitle}</span>}
                  </span>
                  {item.meta && <span className="shrink-0 text-[0.8125rem] font-semibold text-slate-600">{item.meta}</span>}
                  {index === active && <CornerDownLeft className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />}
                </button>
              ))}
            </div>
          ))}

          {!loading && trimmed.length >= MIN_REMOTE_QUERY && items.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <div className="mt-2 text-[0.875rem] font-semibold text-slate-700">Nothing found for “{trimmed}”</div>
              <div className="mt-1 text-[0.8125rem] text-slate-500">Try a product name, SKU, phone number or invoice number.</div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-slate-200 px-4 py-2 text-[0.6875rem] text-slate-500 sm:flex">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="flex items-center gap-1"><Kbd>Enter</Kbd> open</span>
          <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
