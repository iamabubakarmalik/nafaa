/**
 * Global search (command palette).
 *
 * Opens with Ctrl/⌘+K, the search field in the top bar, or the search icon on
 * phones. Finds menu pages instantly (client side) and products, customers,
 * sales and suppliers from the API. Arrow keys move, Enter opens, Escape closes.
 *
 * The dialog renders in a portal and is mounted once by AppShell, so it is
 * never clipped or hidden by the top bar's responsive containers. Sale totals
 * and customer balances respect the privacy lock (HiddenValue).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { ArrowLeft, CornerDownLeft, Loader2, Package, Receipt, Search, Truck, Users, X } from 'lucide-react';
import { searchApi, type SearchResults } from '@modules/pos/api/search.api';
import { formatPKR } from '@core/lib/format';
import { HiddenValue } from '@core/security/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
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
  to: string;
};

const MIN_REMOTE_QUERY = 2;

export function GlobalSearchDialog() {
  const { open, setOpen } = useGlobalSearch();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { groups } = useVisibleNav(user?.role, user?.permissions);
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
      return;
    }
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
    const pages = groups
      .flatMap((g) => g.items.map((i) => ({ item: i, group: g.label })))
      .filter(({ item }) => !q || `${item.label} ${item.keywords ?? ''}`.toLowerCase().includes(q))
      .slice(0, q ? 6 : 8)
      .map(({ item, group }): ResultItem => {
        const Icon = item.icon;
        return { key: `page:${item.to}`, section: q ? 'Pages' : 'Go to', title: item.label, subtitle: group, icon: <Icon className="h-4 w-4" />, to: item.to };
      });
    if (!results) return pages;
    return [
      ...pages,
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
  }, [groups, query, results]);

  useEffect(() => { setActive(0); }, [query, results]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (item?: ResultItem) => {
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
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
            placeholder="Search products, customers, sales, pages…"
            aria-label="Search"
            aria-controls="global-search-results"
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
