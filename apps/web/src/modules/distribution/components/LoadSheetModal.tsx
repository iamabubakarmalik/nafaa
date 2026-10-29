/**
 * Puts invoiced orders on a van: a new load sheet (date, delivery man,
 * driver, vehicle) or an open one. Without preselected orders it lists every
 * invoiced order not yet on a sheet, grouped by route, all ticked.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Segmented, Select } from '@/design-system/components';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { DIST_KEY, distError, distributionApi, type ID } from '../api/distribution.api';
import { partyName, partySub, rs } from '../lib/meta';
import { useDeliveryStaff } from '../hooks/useDistribution';

export function LoadSheetModal({ orderIds, addTo, onClose }: { orderIds?: ID[]; addTo?: ID; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const preset = !!orderIds?.length;
  const ordersQ = useQuery({
    queryKey: [DIST_KEY, 'orders', 'to-load'],
    queryFn: () => distributionApi.orders({ status: 'INVOICED', unloaded: true, limit: 200 }),
  });
  const openQ = useQuery({ queryKey: [DIST_KEY, 'sheets', 'OPEN'], queryFn: () => distributionApi.loadSheets({ status: 'OPEN', limit: 50 }) });
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });

  const [mode, setMode] = useState<'new' | 'add'>(addTo ? 'add' : 'new');
  const [sheetId, setSheetId] = useState(addTo ?? '');
  const [picked, setPicked] = useState<Set<ID> | null>(preset ? new Set(orderIds) : null);
  const [date, setDate] = useState(() => businessDayKey(new Date(), startHour));
  const [routeId, setRouteId] = useState('');
  const [deliveryUserId, setDeliveryUserId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [note, setNote] = useState('');

  const orders = ordersQ.data?.orders ?? [];
  const chosen = picked ?? new Set(orders.map((o) => o.id));
  const shown = preset ? orders.filter((o) => orderIds!.includes(o.id)) : orders;
  const groups = useMemo(() => {
    const m = new Map<string, typeof orders>();
    shown.forEach((o) => { const k = o.routeName ?? 'Route nahi'; m.set(k, [...(m.get(k) ?? []), o]); });
    return [...m.entries()];
  }, [shown]);
  const value = shown.filter((o) => chosen.has(o.id)).reduce((a, o) => a + o.total, 0);
  const routeDrivers = (routesQ.data ?? []).map((r) => ({ id: r.deliveryUserId, name: r.deliveryUserName }));
  const deliveryUsers = useDeliveryStaff(routeDrivers).list;
  const openSheets = openQ.data?.sheets ?? [];

  const toggle = (id: ID) => setPicked(() => { const n = new Set(chosen); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...chosen].filter((id) => shown.some((o) => o.id === id));

  const save = useMutation({
    mutationFn: () => {
      if (!ids.length) throw new Error('Kam se kam ek order chunein');
      if (mode === 'add') {
        if (!sheetId) throw new Error('Load sheet chunein');
        return distributionApi.addToSheet(sheetId, ids);
      }
      return distributionApi.createLoadSheet({
        orderIds: ids, date, routeId: routeId || undefined, deliveryUserId: deliveryUserId || undefined,
        driverName: driverName.trim() || undefined, vehicleNo: vehicleNo.trim() || undefined, note: note.trim() || undefined,
      });
    },
    onSuccess: (s) => {
      toast.success(`${s.number} — ${s.invoiceCount} invoices`);
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
      onClose();
      navigate(`/distribution/load-sheets/${s.id}`);
    },
    onError: (e) => toast.error(distError(e, 'Load sheet nahi bani')),
  });

  const pickRoute = (id: string) => {
    setRouteId(id);
    const r = routesQ.data?.find((x) => x.id === id);
    if (r?.deliveryUserId && !deliveryUserId) setDeliveryUserId(r.deliveryUserId);
    if (r && !preset) setPicked(new Set(orders.filter((o) => o.routeId === id).map((o) => o.id)));
  };

  return (
    <Modal open onClose={onClose} size="xl" title="Load sheet" description="Invoiced orders gaari par — maal ki list aur invoices ek sheet par"
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">{ids.length} invoices · <b className="text-slate-900">{rs(value)}</b></span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} disabled={!ids.length} leftIcon={<Truck className="h-4 w-4" />} onClick={() => save.mutate()}>{mode === 'add' ? 'Sheet me daalein' : 'Load sheet banayein'}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-3">
          {openSheets.length > 0 && !addTo && (
            <Segmented label="Sheet" value={mode} onChange={(v) => setMode(v as 'new' | 'add')} items={[{ value: 'new', label: 'Nayi sheet' }, { value: 'add', label: 'Khuli sheet me' }]} />
          )}
          {mode === 'add' ? (
            <Select size="sm" label="Load sheet" value={sheetId} onChange={(e) => setSheetId(e.target.value)}
              options={[{ value: '', label: 'Chunein' }, ...openSheets.map((s) => ({ value: s.id, label: `${s.number} · ${s.routeName ?? s.deliveryUserName ?? ''} (${s.invoiceCount})` }))]} />
          ) : <>
            <Input size="sm" type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select size="sm" label="Route" value={routeId} onChange={(e) => pickRoute(e.target.value)}
              options={[{ value: '', label: 'Mili juli / koi nahi' }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
            <Select size="sm" label="Delivery wala" value={deliveryUserId} onChange={(e) => setDeliveryUserId(e.target.value)}
              options={[{ value: '', label: 'Baad me' }, ...deliveryUsers.map((u) => ({ value: u.id, label: u.label }))]} />
            <div className="grid grid-cols-2 gap-2">
              <Input size="sm" label="Driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              <Input size="sm" label="Gaari no." value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} />
            </div>
            <Input size="sm" label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zaroori nahi" />
          </>}
        </div>
        <div className="max-h-[55vh] min-w-0 overflow-auto rounded-2xl ring-1 ring-slate-200/80">
          {ordersQ.isLoading ? <p className="p-6 text-center text-[0.8125rem] text-slate-500">Orders aa rahe hain…</p>
            : !shown.length ? <p className="p-6 text-center text-[0.8125rem] text-slate-500">Koi invoiced order load ke liye baqi nahi. Pehle orders approve karein.</p>
              : groups.map(([route, list]) => (
                <div key={route}>
                  <div className="sticky top-0 flex items-center gap-2 bg-slate-50 px-3 py-1.5 text-[0.75rem] font-semibold text-slate-600">
                    <Checkbox aria-label={`${route} sab`} checked={list.every((o) => chosen.has(o.id))}
                      onChange={(e) => setPicked(() => { const n = new Set(chosen); list.forEach((o) => (e.target.checked ? n.add(o.id) : n.delete(o.id))); return n; })} />
                    {route} <span className="font-normal text-slate-400">· {list.length}</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {list.map((o) => (
                      <li key={o.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50/80">
                          <Checkbox aria-label={o.orderNumber} checked={chosen.has(o.id)} onChange={() => toggle(o.id)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{partyName(o.customer)}</span>
                            <span className="block truncate text-[0.75rem] text-slate-500">{o.saleNumber} · {o.orderNumber}{partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}</span>
                          </span>
                          <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{rs(o.total)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
        </div>
      </div>
    </Modal>
  );
}
