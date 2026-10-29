/**
 * One route: who runs it and its shops in visit order. Drag a row (or use
 * the arrows) to change the order, then save; the booker app shows shops in
 * this order. Shops can be added from any route or from those on none.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, GripVertical, MapPin, Pencil, Phone, Plus, Save, Trash2, Truck, UserRound, Warehouse, X } from 'lucide-react';
import { Badge, Button, Card, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { DIST_KEY, distError, distSetupApi, type CustomerCard, type Route } from '../../api/distribution.api';
import { partyName, rs } from '../../lib/meta';
import { WEEKDAYS } from '../shared';
import { AddToRouteModal } from './AddToRouteModal';

export function RouteDetail({ route, onEdit, onChanged }: { route: Route; onEdit: () => void; onChanged: () => void }) {
  const q = useQuery({ queryKey: [DIST_KEY, 'route', route.id], queryFn: () => distSetupApi.route(route.id) });
  const [order, setOrder] = useState<CustomerCard[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => { if (q.data) setOrder(q.data.customers); }, [q.data]);
  const changed = useMemo(() => (q.data?.customers ?? []).map((c) => c.id).join() !== order.map((c) => c.id).join(), [q.data, order]);

  const saveOrder = useMutation({
    mutationFn: () => distSetupApi.setRouteCustomers(route.id, order.map((c) => c.id), true),
    onSuccess: () => { q.refetch(); onChanged(); toast.success('Tarteeb save ho gayi'); },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });
  const remove = useMutation({
    mutationFn: (cid: string) => distSetupApi.removeRouteCustomer(route.id, cid),
    onSuccess: () => { q.refetch(); onChanged(); },
    onError: (e) => toast.error(distError(e)),
  });
  const del = useMutation({
    mutationFn: () => distSetupApi.deleteRoute(route.id),
    onSuccess: (r) => { onChanged(); toast.success(r.deleted ? 'Route mita diya' : 'Route band kar diya (purane orders is par hain)'); },
    onError: (e) => toast.error(distError(e)),
  });

  const move = (from: number, to: number) => setOrder((o) => {
    if (to < 0 || to >= o.length || from === to) return o;
    const n = [...o];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    return n;
  });

  const days = route.visitDays.length ? route.visitDays.map((d) => WEEKDAYS[d]).join(', ') : 'Koi din nahi';
  const balance = order.reduce((s, c) => s + (Number(c.balance) || 0), 0);

  return (
    <div className="min-w-0 space-y-3">
      <Card className="rounded-2xl"
        title={<span className="inline-flex flex-wrap items-center gap-2">{route.name}{!route.isActive && <Badge size="xs" variant="danger">Band</Badge>}</span>}
        description={route.area || undefined}
        actions={<div className="flex gap-1.5">
          <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEdit}>Badlein</Button>
          <Button size="sm" variant="ghost" aria-label="Route mitayein" onClick={async () => {
            if (await confirmDialog({ title: `${route.name} mitayein?`, text: 'Customers route se hat jayenge. Purane orders is route par hon to route sirf band hoga.', yes: 'Mitayein', danger: true })) del.mutate();
          }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
        </div>}>
        <dl className="grid grid-cols-2 gap-2 text-[0.8125rem] lg:grid-cols-4">
          <Fact icon={MapPin} k="Din" v={days} />
          <Fact icon={UserRound} k="Booker" v={route.bookerName ?? '—'} />
          <Fact icon={Truck} k="Delivery" v={route.deliveryUserName ?? '—'} />
          <Fact icon={Warehouse} k="Godown" v={route.shopName ?? 'Default'} />
        </dl>
      </Card>

      <Card flush className="rounded-2xl"
        title={`Dukaanein (${order.length})`}
        description={order.length ? `Upar se neeche visit ki tarteeb · kul udhaar ${rs(balance)}` : undefined}
        actions={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Dukaan jorein</Button>}>
        {q.isLoading ? <div className="p-4"><Skeleton className="h-60" /></div> : !order.length ? (
          <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-500">Is route par abhi koi dukaan nahi — "Dukaan jorein" dabayein.</p>
        ) : (
          <ol className="divide-y divide-slate-100 border-t border-slate-100">
            {order.map((c, i) => (
              <li key={c.id} draggable
                onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== c.id) move(order.findIndex((x) => x.id === dragId), i); }}
                onDragEnd={() => setDragId(null)}
                className={cn('flex items-center gap-2 bg-white px-3 py-2.5 sm:px-4', dragId === c.id && 'bg-brand-50 opacity-70')}>
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" aria-hidden />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold tabular-nums text-slate-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold text-slate-900">{partyName(c)}</p>
                  <p className="flex flex-wrap items-center gap-x-2 truncate text-[0.75rem] text-slate-500">
                    {c.businessName && <span>{c.name}</span>}
                    {c.area && <span>{c.area}</span>}
                    {c.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.latitude == null && <span className="text-amber-700">GPS nahi</span>}
                  </p>
                </div>
                {Number(c.balance) > 0 && <span className="hidden shrink-0 text-[0.75rem] font-semibold tabular-nums text-rose-700 sm:block">{rs(c.balance)}</span>}
                <div className="flex shrink-0 items-center">
                  <button type="button" aria-label="Upar" disabled={i === 0} onClick={() => move(i, i - 1)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Neeche" disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="Route se hatayein" onClick={() => remove.mutate(c.id)} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {changed && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          <p className="mr-auto text-[0.8125rem] text-slate-600">Tarteeb badli — save karein to booker app me bhi yehi tarteeb</p>
          <Button variant="secondary" onClick={() => setOrder(q.data?.customers ?? [])}>Rehne dein</Button>
          <Button data-save-action loading={saveOrder.isPending} leftIcon={<Save className="h-4 w-4" />} onClick={() => saveOrder.mutate()}>Save karein</Button>
        </div>
      )}

      {adding && <AddToRouteModal route={route} onClose={() => setAdding(false)} onDone={() => { setAdding(false); q.refetch(); onChanged(); }} />}
    </div>
  );
}

function Fact({ icon: Icon, k, v }: { icon: typeof MapPin; k: string; v: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <dt className="flex items-center gap-1 text-[0.6875rem] font-medium text-slate-500"><Icon className="h-3 w-3" />{k}</dt>
      <dd className="truncate font-semibold text-slate-900" title={v}>{v}</dd>
    </div>
  );
}
