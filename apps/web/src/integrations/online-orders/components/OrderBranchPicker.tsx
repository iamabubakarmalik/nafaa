import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Store } from 'lucide-react';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrderDetail } from '../api/online-orders.api';

/**
 * Multi-branch: naya order ghalat branch me aa gaya to accept se pehle doosri branch me bhejo.
 * "Aage se bhi" — isi Token / code wale agle orders seedha usi branch me jayenge.
 */
export function OrderBranchPicker({ order, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const list = (Array.isArray(shops) ? shops : (shops as any)?.items ?? []) as Array<{ id: string; name: string; isActive?: boolean }>;
  const active = list.filter((s) => s.isActive !== false);
  const route = order.metadata?.route;
  const [remember, setRemember] = useState(!!route);
  const move = useMutation({
    mutationFn: (shopId: string) => onlineOrdersApi.moveBranch(order.id, { shopId, remember: remember && !!route }),
    onSuccess: (r) => {
      toast.success(`Order ${r.shopName} me chala gaya`, { description: r.remembered ? 'Aage se isi tarah ke orders seedha isi branch me aayenge' : undefined });
      onChanged();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (active.length <= 1 || order.orderStatus !== 'PENDING' || order.nafaaSaleId) return null;
  const current = order.shopId ?? order.fulfilShopId ?? '';
  return (
    <section className="rounded-2xl border border-slate-200 p-3 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-2">
        <Store className="h-4 w-4 text-slate-400" />
        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Branch</span>
        <span className="flex-1" />
        <select
          value={current}
          disabled={move.isPending}
          onChange={(e) => e.target.value && e.target.value !== current && move.mutate(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-semibold dark:border-neutral-700 dark:bg-neutral-900"
        >
          {!current && <option value="">— chunein —</option>}
          {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {route && (
        <label className="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
          Aage se is website branch ke orders bhi seedha isi branch me
        </label>
      )}
    </section>
  );
}
