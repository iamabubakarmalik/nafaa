import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronDown, Check, MapPin, Phone, Plus, Lock, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { useAuthStore } from '@core/stores/auth.store';
import { ALL_SHOPS } from '@core/lib/shopScope';
import { toast } from 'sonner';

/**
 * Branch switcher in the top bar.
 *
 * Owners pick a branch or "All Shops"; other staff see the branch they are
 * locked to. `variant="row"` is the full-width version shown under the top
 * bar on phones, where the branch name must always be visible.
 */
export default function ShopSelector({ variant = 'bar' }: { variant?: 'bar' | 'row' }) {
  const nameClass = variant === 'row' ? 'max-w-[60vw] truncate' : 'hidden max-w-[130px] truncate lg:inline';
  const tagClass = variant === 'row' ? 'inline' : 'hidden 2xl:inline';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { currentShopId, setCurrentShop, user } = useAuthStore();

  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';
  const lockedShopId = !isOwner ? user?.shopId : null;

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops-selector'],
    queryFn: shopsApi.list,
    enabled: isOwner, // Only owner fetches all shops
  });

  // ─── Auto-lock non-owners to their assigned shop ──────────────
  useEffect(() => {
    if (!isOwner && user?.shopId && currentShopId !== user.shopId) {
      setCurrentShop(user.shopId);
    }
  }, [isOwner, user?.shopId, currentShopId, setCurrentShop]);

  // ─── Auto-select main shop for owner on first load ───────────
  useEffect(() => {
    if (isOwner && !currentShopId && shops.length > 0) {
      const main = shops.find((s) => s.isMain && s.isActive) || shops.find((s) => s.isActive);
      if (main) setCurrentShop(main.id);
    }
  }, [isOwner, shops, currentShopId, setCurrentShop]);

  // ─── Close on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ═══ NON-OWNER VIEW: LOCKED shop badge (no dropdown) ═══════════
  if (!isOwner) {
    if (!user?.assignedShop) {
      return (
        <div className="inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="h-4 w-4" />
          <span>No shop assigned</span>
        </div>
      );
    }

    return (
      <div
        className="inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition cursor-default border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
        title="Aap is shop pe locked hain — sirf Owner switch kar sakta hai"
      >
        <Lock className="h-3.5 w-3.5 opacity-60" />
        <Store className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <span className={nameClass}>{user.assignedShop.name}</span>
        {user.assignedShop.isMain && (
          <span className={`${tagClass} rounded bg-brand-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-brand-fg`}>
            MAIN
          </span>
        )}
      </div>
    );
  }

  // ═══ OWNER VIEW: Full dropdown ════════════════════════════════
  if (isLoading) {
    return <div className="h-10 px-3 rounded-xl bg-slate-100 animate-pulse w-44" />;
  }

  const activeShops = shops.filter((s) => s.isActive);
  const isAll = currentShopId === ALL_SHOPS;
  const currentShop = shops.find((s) => s.id === currentShopId);

  if (activeShops.length === 0) {
    return (
      <Link
        to="/shops"
        className="h-10 inline-flex items-center gap-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-bold"
      >
        <Plus className="h-4 w-4" />
        Add Shop
      </Link>
    );
  }

  const handleSelect = (shopId: string, shopName: string) => {
    setCurrentShop(shopId);
    setOpen(false);
    toast.success(`Switched to ${shopName}`, {
      description:
        shopId === ALL_SHOPS
          ? 'Reports aur lists ab sab branches ka data dikhayengi'
          : 'POS, cash register, aur reports ab is shop ka data dikhayenge',
    });
  };

  return (
    <div ref={ref} className={variant === 'row' ? 'relative w-full' : 'relative'}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${variant === 'row' ? 'w-full' : ''} ${
          open
            ? 'border-brand-400 bg-brand-50 text-brand-900 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-white'
            : isAll
            ? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200'
            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-white/20'
        }`}
        title="Switch shop"
      >
        {isAll ? (
          <Layers className="h-4 w-4 text-violet-600 dark:text-violet-300" />
        ) : (
          <Store className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        )}
        <span className={nameClass}>
          {isAll ? 'All Shops' : currentShop?.name || 'Select Shop'}
        </span>
        {isAll && (
          <span className={`${tagClass} rounded bg-violet-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white`}>
            {activeShops.length}
          </span>
        )}
        {!isAll && currentShop?.isMain && (
          <span className={`${tagClass} rounded bg-brand-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-brand-fg`}>
            MAIN
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${variant === 'row' ? 'ml-auto' : ''} ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 dark:border-slate-800 dark:bg-slate-900 ${variant === 'row' ? 'inset-x-0' : 'right-0 w-80'}`}>
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="text-[0.6875rem] uppercase tracking-wider font-bold text-slate-500">
              Switch Shop
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {activeShops.length} active branch{activeShops.length !== 1 ? 'es' : ''}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {activeShops.length > 1 && (
              <button
                onClick={() => handleSelect(ALL_SHOPS, 'All Shops')}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition mb-1 ${
                  isAll ? 'bg-violet-50 border-2 border-violet-300' : 'border-2 border-transparent hover:bg-slate-50'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isAll ? 'bg-gradient-to-br from-violet-500 to-violet-700 shadow' : 'bg-slate-100'
                  }`}
                >
                  <Layers className={`h-5 w-5 ${isAll ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-bold text-slate-900 text-sm">All Shops</div>
                  <div className="text-[0.6875rem] text-slate-500 mt-0.5">
                    Sab {activeShops.length} branches ka mila hua data — POS aur cash register ke liye
                    ek shop chunni paregi
                  </div>
                </div>
                {isAll && (
                  <div className="h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            )}

            {activeShops.map((shop) => {
              const active = shop.id === currentShopId;
              return (
                <button
                  key={shop.id}
                  onClick={() => handleSelect(shop.id, shop.name)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition mb-1 ${
                    active ? 'bg-brand-50 border-2 border-brand-300' : 'border-2 border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      shop.isMain
                        ? 'bg-gradient-to-br from-brand-500 to-brand-700 shadow'
                        : active
                        ? 'bg-brand-600'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Store className={`h-5 w-5 ${shop.isMain || active ? 'text-white' : 'text-slate-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate text-sm">{shop.name}</span>
                      {shop.isMain && (
                        <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-extrabold bg-brand-100 text-brand-700">
                          MAIN
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-slate-100 text-slate-600">
                        {shop.type}
                      </span>
                    </div>
                    {shop.address && (
                      <div className="text-[0.6875rem] text-slate-500 mt-0.5 flex items-start gap-1">
                        <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="text-[0.6875rem] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        {shop.phone}
                      </div>
                    )}
                  </div>

                  {active && (
                    <div className="h-6 w-6 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 p-2">
            <Link
              to="/shops"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Plus className="h-4 w-4 text-brand-600" />
              Manage Shops
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
