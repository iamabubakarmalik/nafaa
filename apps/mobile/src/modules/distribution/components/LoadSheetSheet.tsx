/**
 * Puts invoiced orders on a van: a new load sheet (date, delivery man,
 * driver, vehicle) or an open one. Without preselected orders it lists every
 * invoiced order not yet on a sheet, grouped by route, all ticked.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { businessDayKey } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Checkbox, DatePicker, Input, Segmented, Select, Sheet, SkeletonRows, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distError, distributionApi, type ID } from '../api/distribution.api';
import { useDeliveryStaff } from '../hooks/useDistribution';
import { partyName, partySub, rs } from '../lib/meta';

const toDate = (s: string) => new Date(`${s}T12:00:00`);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function LoadSheetSheet({ open, orderIds, addTo, onClose }: { open: boolean; orderIds?: ID[]; addTo?: ID; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const preset = !!orderIds?.length;
  const ordersQ = useQuery({ queryKey: [DIST_KEY, 'orders', 'to-load'], queryFn: () => distributionApi.orders({ status: 'INVOICED', unloaded: true, limit: 200 }), enabled: open });
  const openQ = useQuery({ queryKey: [DIST_KEY, 'sheets', 'OPEN'], queryFn: () => distributionApi.loadSheets({ status: 'OPEN', limit: 50 }), enabled: open });
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000, enabled: open });

  const [mode, setMode] = useState<'new' | 'add'>(addTo ? 'add' : 'new');
  const [sheetId, setSheetId] = useState(addTo ?? '');
  const [picked, setPicked] = useState<Set<ID> | null>(null);
  const [date, setDate] = useState(() => businessDayKey());
  const [routeId, setRouteId] = useState('');
  const [deliveryUserId, setDeliveryUserId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setPicked(preset ? new Set(orderIds) : null); setMode(addTo ? 'add' : 'new'); setSheetId(addTo ?? ''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const orders = ordersQ.data?.orders ?? [];
  const shown = preset ? orders.filter((o) => orderIds!.includes(o.id)) : orders;
  const chosen = picked ?? new Set(orders.map((o) => o.id));
  const ids = [...chosen].filter((id) => shown.some((o) => o.id === id));
  const value = shown.filter((o) => chosen.has(o.id)).reduce((a, o) => a + o.total, 0);
  const groups = useMemo(() => {
    const m = new Map<string, typeof orders>();
    shown.forEach((o) => { const k = o.routeName ?? t('Route nahi'); m.set(k, [...(m.get(k) ?? []), o]); });
    return [...m.entries()];
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const routeDrivers = (routesQ.data ?? []).map((r) => ({ id: r.deliveryUserId, name: r.deliveryUserName }));
  const staff = useDeliveryStaff(routeDrivers).list;
  const openSheets = openQ.data?.sheets ?? [];

  const toggle = (id: ID) => setPicked(() => { const n = new Set(chosen); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = useMutation({
    mutationFn: () => {
      if (!ids.length) throw new Error(t('Kam se kam ek order chunein'));
      if (mode === 'add') {
        if (!sheetId) throw new Error(t('Load sheet chunein'));
        return distributionApi.addToSheet(sheetId, ids);
      }
      return distributionApi.createLoadSheet({
        orderIds: ids, date, routeId: routeId || undefined, deliveryUserId: deliveryUserId || undefined,
        driverName: driverName.trim() || undefined, vehicleNo: vehicleNo.trim() || undefined, note: note.trim() || undefined,
      });
    },
    onSuccess: (s) => {
      toast.success(`${s.number} — ${t('{{count}} invoices', { count: s.invoiceCount })}`);
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
      onClose();
      router.push(`/distribution/load-sheets/${s.id}` as never);
    },
    onError: (e) => toast.error(distError(e, t('Load sheet nahi bani'))),
  });

  const pickRoute = (id: string) => {
    setRouteId(id);
    const r = routesQ.data?.find((x) => x.id === id);
    if (r?.deliveryUserId && !deliveryUserId) setDeliveryUserId(r.deliveryUserId);
    if (r && !preset) setPicked(new Set(orders.filter((o) => o.routeId === id).map((o) => o.id)));
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('Load sheet')} description={t('Invoiced orders gaari par — maal ki list aur invoices ek sheet par')}
      footer={
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" tone="muted" align="center">{t('{{count}} invoices ·', { count: ids.length })} {rs(value)}</Text>
          <Button fullWidth size="lg" icon={Truck} loading={save.isPending} disabled={!ids.length} onPress={() => save.mutate()}>{mode === 'add' ? t('Sheet me daalein') : t('Load sheet banayein')}</Button>
        </View>
      }>
      <View style={{ gap: th.space(3) }}>
        {openSheets.length > 0 && !addTo && (
          <Segmented value={mode} onChange={setMode} options={[{ value: 'new', label: t('Nayi sheet') }, { value: 'add', label: t('Khuli sheet me') }]} />
        )}
        {mode === 'add' ? (
          <Select label={t('Load sheet')} value={sheetId} onChange={setSheetId} placeholder={t('Chunein')}
            options={openSheets.map((s) => ({ value: s.id, label: `${s.number} · ${s.routeName ?? s.deliveryUserName ?? ''} (${s.invoiceCount})` }))} />
        ) : <>
          <DatePicker label={t('Date')} value={toDate(date)} onChange={(d) => setDate(ymd(d))} />
          <Select label={t('Route')} value={routeId} onChange={pickRoute} placeholder={t('Mili juli / koi nahi')}
            options={[{ value: '', label: t('Mili juli / koi nahi') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
          <Select label={t('Delivery wala')} value={deliveryUserId} onChange={setDeliveryUserId} placeholder={t('Baad me')}
            options={[{ value: '', label: t('Baad me') }, ...staff.map((u) => ({ value: u.id, label: u.label }))]} />
          <Input label={t('Driver')} value={driverName} onChangeText={setDriverName} />
          <Input label={t('Gaari no.')} value={vehicleNo} onChangeText={(v) => setVehicleNo(v.toUpperCase())} autoCapitalize="characters" ltr />
          <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Zaroori nahi')} />
        </>}

        {ordersQ.isLoading ? <SkeletonRows count={4} />
          : !shown.length ? <Text size="sm" tone="muted" align="center">{t('Koi invoiced order load ke liye baqi nahi. Pehle orders approve karein.')}</Text>
            : groups.map(([route, list]) => (
              <View key={route} style={{ gap: th.space(1) }}>
                <Checkbox label={`${route} · ${list.length}`} value={list.every((o) => chosen.has(o.id))}
                  onChange={(v) => setPicked(() => { const n = new Set(chosen); list.forEach((o) => (v ? n.add(o.id) : n.delete(o.id))); return n; })} />
                {list.map((o) => (
                  <Checkbox key={o.id} value={chosen.has(o.id)} onChange={() => toggle(o.id)}
                    label={`${partyName(o.customer)} · ${rs(o.total)}`}
                    description={`${o.saleNumber ?? ''} · ${o.orderNumber}${partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}`} />
                ))}
              </View>
            ))}
      </View>
    </Sheet>
  );
}
