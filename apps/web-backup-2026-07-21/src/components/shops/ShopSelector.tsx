import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronDown, Check, MapPin, Phone, Plus, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { shopsApi } from '@/api/shops.api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export default function ShopSelector() {
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
        <div className="h-10 inline-flex items-center gap-2 px-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-800">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-bold">No shop assigned</span>
        </div>
      );
    }

    return (
      <div
        className={`h-10 inline-flex items-center gap-2 px-3 rounded-xl border-2 text-sm font-bold cursor-not-allowed ${
          user.assignedShop.isMain
            ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
            : 'border-indigo-300 bg-indigo-50 text-indigo-900'
        }`}
        title="Aap is shop pe locked hain — sirf Owner switch kar sakta hai"
      >
        <Lock className="h-3.5 w-3.5 opacity-60" />
        <Store className={`h-4 w-4 ${user.assignedShop.isMain ? 'text-emerald-600' : 'text-indigo-600'}`} />
        <span className="hidden sm:inline max-w-[140px] truncate">{user.assignedShop.name}</span>
        {user.assignedShop.isMain && (
          <span className="hidden md:inline px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white">
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
      description: 'POS, cash register, and reports will use this shop',
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-10 inline-flex items-center gap-2 px-3 rounded-xl border-2 text-sm font-bold transition ${
          open
            ? 'border-brand-500 bg-brand-50 text-brand-900'
            : currentShop?.isMain
            ? 'border-emerald-400 bg-emerald-50 text-emerald-900 hover:border-emerald-500'
            : 'border-slate-200 bg-white hover:border-brand-400 text-slate-900'
        }`}
        title="Switch shop"
      >
        <Store className={`h-4 w-4 ${currentShop?.isMain ? 'text-emerald-600' : 'text-brand-600'}`} />
        <span className="hidden sm:inline max-w-[140px] truncate">
          {currentShop?.name || 'Select Shop'}
        </span>
        {currentShop?.isMain && (
          <span className="hidden md:inline px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white">
            MAIN
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              Switch Shop
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {activeShops.length} active branch{activeShops.length !== 1 ? 'es' : ''}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
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
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow'
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
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                          MAIN
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                        {shop.type}
                      </span>
                    </div>
                    {shop.address && (
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-start gap-1">
                        <MapPin className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
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
