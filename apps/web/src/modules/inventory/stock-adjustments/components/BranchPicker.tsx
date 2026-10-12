/**
 * Shown in place of a form on the all-branches view: stock is changed in one
 * branch at a time, so the owner picks the branch and the app switches to it.
 */

import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';

export function BranchPicker({ what }: { what: string }) {
  const setCurrentShop = useAuthStore((s) => s.setCurrentShop);
  const q = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = (q.data ?? []).filter((s) => s.isActive);
  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Store className="h-4 w-4" /> Pehle branch chunein</p>
      <p className="mt-1 text-[0.8125rem] text-amber-900/80">
        Abhi "Sab branches" khula hai. {what} hamesha ek branch ka hota hai — jis branch ka maal hai woh chunein. App us branch par chali jayegi.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {q.isLoading && <span className="h-9 w-32 animate-pulse rounded-xl bg-amber-100" />}
        {shops.map((s) => (
          <button key={s.id} type="button" onClick={() => { setCurrentShop(s.id); toast.success(`${s.name} khul gayi`); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-800 ring-1 ring-amber-200 hover:bg-amber-100">
            <Store className="h-4 w-4 text-brand-600" /> {s.name}{s.isMain && <span className="text-[0.6875rem] font-medium text-slate-400">Main</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
