import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, TrendingUp, Store, ShoppingBag, Package, Heart,
  MessageCircle, Bot, Video, Users, Zap, ArrowRight, Command,
} from 'lucide-react';
import { homeApi } from '@/features/home/api/home.api';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

interface QuickAction {
  icon: any;
  label: string;
  path: string;
  keywords: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: ShoppingBag, label: 'My Cart', path: '/cart', keywords: 'cart shopping' },
  { icon: Package, label: 'My Orders', path: '/orders', keywords: 'orders purchase' },
  { icon: Heart, label: 'Wishlist', path: '/wishlist', keywords: 'wishlist favorites' },
  { icon: Store, label: 'Browse shops', path: '/shops', keywords: 'shops stores' },
  { icon: Bot, label: 'AI Assistant', path: '/ai-assistant', keywords: 'ai chat assistant help' },
  { icon: Video, label: 'Live Shopping', path: '/live', keywords: 'live streaming' },
  { icon: Users, label: 'Group Buys', path: '/group-buys', keywords: 'group buy deals' },
  { icon: Zap, label: 'Auctions', path: '/auctions', keywords: 'auction bidding' },
  { icon: MessageCircle, label: 'My Bargains', path: '/bargain', keywords: 'bargain negotiate' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debouncedSet = useDebouncedCallback((v: string) => setDebouncedQuery(v), 300);
  useEffect(() => debouncedSet(query), [query]);

  const { data: suggestions } = useQuery({
    queryKey: ['cmd-suggestions', debouncedQuery],
    queryFn: () => homeApi.searchSuggestions(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 60000,
  });

  const filteredActions = query
    ? QUICK_ACTIONS.filter((a) =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.keywords.includes(query.toLowerCase()),
      )
    : QUICK_ACTIONS.slice(0, 5);

  const shops = suggestions?.suggestions?.shops || [];
  const products = suggestions?.suggestions?.products || [];
  const categories = suggestions?.suggestions?.categories || [];

  type Item =
    | { kind: 'action'; data: QuickAction }
    | { kind: 'shop'; data: any }
    | { kind: 'product'; data: any }
    | { kind: 'category'; data: string };

  const allItems: Item[] = [
    ...filteredActions.map((a) => ({ kind: 'action' as const, data: a })),
    ...shops.map((s: any) => ({ kind: 'shop' as const, data: s })),
    ...products.map((p: any) => ({ kind: 'product' as const, data: p })),
    ...categories.map((c: string) => ({ kind: 'category' as const, data: c })),
  ];

  const selectItem = (item: Item) => {
    switch (item.kind) {
      case 'action':
        navigate(item.data.path);
        break;
      case 'shop':
        navigate(`/shops/${item.data.slug || item.data.shopId}`);
        break;
      case 'product':
        navigate(`/products/${item.data.productId}`);
        break;
      case 'category':
        navigate(`/search?category=${encodeURIComponent(item.data)}`);
        break;
    }
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        selectItem(allItems[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, allItems, selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fade-in flex items-start justify-center pt-[15vh] px-4">
      <div className="w-full max-w-2xl bg-surface rounded-3xl shadow-2xl border border-border overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-5 w-5 text-content-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shops, products, or type a command..."
            className="flex-1 bg-transparent text-base font-medium focus:outline-none placeholder:text-content-subtle"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-content-subtle hover:text-content h-7 w-7 rounded-lg hover:bg-surface-muted flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-content-muted text-sm">
              No results for "{query}"
            </div>
          ) : (
            <>
              {/* Quick actions */}
              {filteredActions.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Quick actions
                  </div>
                  {filteredActions.map((a, i) => {
                    const idx = i;
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.path}
                        onClick={() => selectItem({ kind: 'action', data: a })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition',
                          selectedIndex === idx ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-surface-muted',
                        )}
                      >
                        <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-bold flex-1 text-left">{a.label}</span>
                        <ArrowRight className={cn(
                          'h-3.5 w-3.5 transition',
                          selectedIndex === idx ? 'text-brand-600 translate-x-1' : 'text-content-subtle',
                        )} />
                      </button>
                    );
                  })}
                </div>
              )}

              {shops.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Shops
                  </div>
                  {shops.map((s: any, i: number) => {
                    const idx = filteredActions.length + i;
                    return (
                      <button
                        key={s.shopId}
                        onClick={() => selectItem({ kind: 'shop', data: s })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition',
                          selectedIndex === idx ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-surface-muted',
                        )}
                      >
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black shrink-0">
                            {s.publicName[0]}
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-bold truncate">{s.publicName}</div>
                          <div className="text-2xs text-content-muted">{s.city}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {products.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Products
                  </div>
                  {products.map((p: any, i: number) => {
                    const idx = filteredActions.length + shops.length + i;
                    return (
                      <button
                        key={p.productId}
                        onClick={() => selectItem({ kind: 'product', data: p })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition',
                          selectedIndex === idx ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-surface-muted',
                        )}
                      >
                        {p.publicImages?.[0] ? (
                          <img src={p.publicImages[0]} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-4 w-4 text-content-subtle" />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-bold line-clamp-1">{p.publicName}</div>
                          <div className="text-2xs text-brand-600 font-black">{formatPrice(p.publicPrice)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {categories.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-2xs font-black text-content-subtle uppercase tracking-wider">
                    Categories
                  </div>
                  {categories.map((c: string, i: number) => {
                    const idx = filteredActions.length + shops.length + products.length + i;
                    return (
                      <button
                        key={c}
                        onClick={() => selectItem({ kind: 'category', data: c })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition',
                          selectedIndex === idx ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-surface-muted',
                        )}
                      >
                        <div className="h-9 w-9 rounded-xl bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                        </div>
                        <span className="text-sm font-bold capitalize flex-1 text-left">{c}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5 bg-surface-muted flex items-center justify-between text-2xs text-content-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-3xs">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-3xs">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-3xs">esc</kbd>
              Close
            </span>
          </div>
          <div className="flex items-center gap-1 font-bold">
            <Command className="h-3 w-3" />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
