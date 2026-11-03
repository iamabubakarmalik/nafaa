/** Delivery routes (web RoutesPage): who goes where and when, how many homes and litres, and today's list of a route. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Milk, Plus, Route as RouteIcon, Trash2, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DetailRow, EmptyState, Input, ListRow, ListTemplate, PressableScale, Row, Segmented, Select, Sheet, Switch, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { routesApi, type DairyRoute, type RouteInput } from '../api';
import { DAIRY_KEYS, ROUTE_STATUS, liters, opt, refreshDairy, slotLabel } from '../meta';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#e11d48', '#7c3aed', '#0891b2'];

export function RoutesScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.CUSTOMERS_EDIT);
  const { guard } = useDeskOnline('dairyDesk');
  const [tab, setTab] = useState<'active' | 'off'>('active');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<DairyRoute | null>(null);
  const [form, setForm] = useState<DairyRoute | 'new' | null>(null);
  const q = useQuery({ queryKey: [DAIRY_KEYS.routes, 'all', search.trim()], queryFn: () => routesApi.all({ search: search.trim() || undefined }) });
  const all = q.data ?? [];
  const live = all.filter((r) => r.isActive && r.status !== 'DISCONTINUED');
  const rows = tab === 'active' ? live : all.filter((r) => !live.includes(r));

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: RouteIcon, tone: 'info', label: t('Chalu routes'), loading: q.isLoading, value: String(live.length) },
        { icon: Users, tone: 'success', label: t('Customers'), loading: q.isLoading, value: String(live.reduce((s, r) => s + r.totalCustomers, 0)), hint: liters(live.reduce((s, r) => s + r.totalDailyLiters, 0)) },
      ]} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: `${t('Chalu')} · ${live.length}` }, { value: 'off', label: `${t('Band')} · ${all.length - live.length}` }]} />
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<DairyRoute>
        title={t('Delivery routes')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Route ya area…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const st = ROUTE_STATUS[r.status];
          return (
            <RowCard dim={!r.isActive}>
              <ListRow leading={<View style={{ width: 10, height: 40, borderRadius: 5, backgroundColor: r.color || th.colors.brand.solid }} />}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</Text>{st && r.status !== 'ACTIVE' && <Badge tone={st.tone}>{t(st.label)}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" numberOfLines={1}>{[r.routeNumber, r.areaName, slotLabel(r.slot)].filter(Boolean).join(' · ')}</Text><Text size="xs" tone="secondary">{`${r.totalCustomers} ${t('Customers')} · ${liters(r.totalDailyLiters)}`}</Text></View>}
                chevron onPress={() => setOpen(r)} />
            </RowCard>
          );
        }}
        empty={<EmptyState icon={RouteIcon} title={t('Abhi koi route nahi')} message={t('Mohalla ya rider ke hisaab se route banayein — customers ko route par lagayein.')} />}
        fab={canEdit ? { icon: Plus, label: t('Naya route'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <RouteSheet r={open} canEdit={canEdit} onClose={() => setOpen(null)} onEdit={(r) => { setOpen(null); guard(() => setForm(r)); }} />
      <RouteForm value={form} onClose={() => setForm(null)} />
    </>
  );
}

function RouteSheet({ r, canEdit, onClose, onEdit }: { r: DairyRoute | null; canEdit: boolean; onClose: () => void; onEdit: (r: DairyRoute) => void }) {
  const th = useTheme();
  const remove = useMutation({ mutationFn: () => routesApi.remove(r!.id), onSuccess: () => { refreshDairy([DAIRY_KEYS.routes]); toast.success(t('Route hat gaya')); onClose(); }, onError: (e) => toast.error(errorText(e, t('Nahi hua'))) });
  const del = async () => { if (await confirm({ title: t('Route hatayein?'), tone: 'danger', confirmLabel: t('Hatayein') })) remove.mutate(); };
  return (
    <Sheet open={!!r} onClose={onClose} title={r?.name} description={r ? `${r.routeNumber} · ${slotLabel(r.slot)}` : undefined}
      footer={r ? <Row gap={2}><Button style={{ flex: 1 }} size="lg" variant="secondary" icon={Milk} onPress={() => { onClose(); router.push(`/dairy/deliveries?route=${r.id}` as never); }}>{t('Home delivery')}</Button>{canEdit && <Button style={{ flex: 1 }} size="lg" onPress={() => onEdit(r)}>{t('Badlein')}</Button>}</Row> : undefined}>
      {r && (
        <View style={{ gap: th.space(3) }}>
          <Card flush>
            {!!r.areaName && <DetailRow label={t('Area')} value={r.areaName} />}
            {!!r.startTime && <DetailRow label={t('Nikalne ka waqt')} value={r.startTime} />}
            {!!(r.vehicleType || r.vehicleNumber) && <DetailRow label={t('Gaari')} value={[r.vehicleType, r.vehicleNumber].filter(Boolean).join(' · ')} />}
            {!!r.estimatedDurationMin && <DetailRow label={t('Kitni der (minute)')} value={String(r.estimatedDurationMin)} />}
            <DetailRow label={t('Customers')} value={String(r.totalCustomers)} />
            <DetailRow label={t('Roz ka doodh')} value={liters(r.totalDailyLiters)} last />
          </Card>
          {canEdit && <Button variant="ghost" icon={Trash2} onPress={() => void del()}>{t('Hatayein')}</Button>}
        </View>
      )}
    </Sheet>
  );
}

function RouteForm({ value, onClose }: { value: DairyRoute | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const r = value === 'new' ? null : value;
  const [f, setF] = useState({ name: '', areaName: '', slot: 'MORNING', status: 'ACTIVE' as RouteInput['status'], vehicleType: '', vehicleNumber: '', startTime: '', estimatedDurationMin: null as number | null, description: '', color: COLORS[0], isActive: true });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!value) return;
    setTouched(false);
    setF({ name: r?.name ?? '', areaName: r?.areaName ?? '', slot: r?.slot ?? 'MORNING', status: r?.status ?? 'ACTIVE', vehicleType: r?.vehicleType ?? '', vehicleNumber: r?.vehicleNumber ?? '', startTime: r?.startTime ?? '', estimatedDurationMin: r?.estimatedDurationMin ?? null, description: r?.description ?? '', color: r?.color ?? COLORS[0], isActive: r?.isActive ?? true });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const error = !f.name.trim() ? t('Naam likhein') : f.startTime && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(f.startTime) ? t('Waqt 06:00 jaisa likhein') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    const body: Partial<RouteInput> = { name: f.name.trim(), areaName: opt(f.areaName), slot: f.slot, status: f.status, vehicleType: opt(f.vehicleType), vehicleNumber: opt(f.vehicleNumber), startTime: opt(f.startTime), estimatedDurationMin: f.estimatedDurationMin ?? undefined, description: opt(f.description), color: f.color, ...(r ? { isActive: f.isActive } : {}) };
    setBusy(true);
    try { await routesApi.save(r?.id, body); refreshDairy([DAIRY_KEYS.routes]); toast.success(r ? t('Save ho gaya') : t('Route ban gaya')); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!value} onClose={onClose} height={0.94} title={r ? t('{{name}} badlein', { name: r.name }) : t('Naya route')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam *')} value={f.name} onChangeText={(v) => set('name', v)} placeholder={t('Model Town subah')} error={touched && !f.name.trim() ? error : undefined} />
        <Input label={t('Area')} value={f.areaName} onChangeText={(v) => set('areaName', v)} />
        <Select label={t('Waqt')} value={f.slot} onChange={(v) => set('slot', v)} options={[{ value: 'MORNING', label: t('Subah') }, { value: 'EVENING', label: t('Shaam') }, { value: 'AFTERNOON', label: t('Dopahar') }]} />
        <Input label={t('Nikalne ka waqt')} value={f.startTime} onChangeText={(v) => set('startTime', v)} placeholder="06:00" ltr error={touched && f.name.trim() ? error || undefined : undefined} />
        <Input label={t('Gaari')} value={f.vehicleType} onChangeText={(v) => set('vehicleType', v)} placeholder={t('Motorcycle, cycle, rickshaw')} />
        <Input label={t('Gaari number')} value={f.vehicleNumber} onChangeText={(v) => set('vehicleNumber', v)} ltr autoCapitalize="characters" />
        <NumberInput label={t('Kitni der (minute)')} integer value={f.estimatedDurationMin} onChangeValue={(v) => set('estimatedDurationMin', v)} />
        <Select label={t('Status')} value={f.status ?? 'ACTIVE'} onChange={(v) => set('status', v as RouteInput['status'])} options={Object.entries(ROUTE_STATUS).map(([value2, x]) => ({ value: value2, label: t(x.label) }))} />
        <Text size="sm" weight="medium" tone="secondary">{t('Rang')}</Text>
        <Row gap={3}>{COLORS.map((c) => <PressableScale key={c} onPress={() => set('color', c)} accessibilityLabel={c} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: 3, borderColor: f.color === c ? th.colors.text : 'transparent' }} />)}</Row>
        <TextArea label={t('Note')} value={f.description} onChangeText={(v) => set('description', v)} />
        {r && <Switch value={f.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu hai')} description={t('Band route customer form me nahi aata')} />}
      </View>
    </Sheet>
  );
}
