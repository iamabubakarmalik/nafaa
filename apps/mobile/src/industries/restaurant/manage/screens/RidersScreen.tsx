/**
 * Riders (web RidersPage): who is on duty, on a trip, on a break or off,
 * the cash each holds from delivered orders, and their details. Changes
 * need the server; the last list stays readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bike, Coffee, HandCoins, Pencil, Phone, Plus, Power, Trash2, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Checkbox, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Select, Sheet, StatTile, SwipeRow, Text, confirm, toast,
  useDebouncedValue, useTheme,
} from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import type { Rider } from '../../api';
import { ridersManageApi, type RiderInput } from '../api';
import { MENU_KEYS, RIDER_STATUS, refreshMenu } from '../meta';

type View_ = 'all' | 'duty' | 'off';

export function RidersScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.RESTAURANT_ORDERS_MANAGE);
  const online = useOnlineStatus();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase(), 150);
  const [view, setView] = useState<View_>('all');
  const [edit, setEdit] = useState<Rider | 'new' | null>(null);
  const q = useQuery({ queryKey: [MENU_KEYS.riders, 'active'], queryFn: () => ridersManageApi.list(), refetchInterval: 30_000 });
  const riders = q.data ?? [];
  const onDuty = riders.filter((r) => r.status === 'ACTIVE' || r.status === 'BUSY');
  const cash = riders.reduce((n, r) => n + (r.cashDue ?? 0), 0);
  const shown = useMemo(() => riders.filter((r) => (view === 'all' || (view === 'duty' ? r.status === 'ACTIVE' || r.status === 'BUSY' : r.status === 'OFFLINE' || r.status === 'ON_BREAK'))
    && (!term || r.name.toLowerCase().includes(term) || r.phone.includes(term) || (r.vehicleNumber ?? '').toLowerCase().includes(term))), [riders, term, view]);
  const refresh = () => refreshMenu(MENU_KEYS.riders, MENU_KEYS.delivery, MENU_KEYS.riderCash);
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };

  const act = useMutation({
    mutationFn: async ({ run, ok }: { run: () => Promise<unknown>; ok: string }) => { await run(); return ok; },
    onSuccess: (ok) => { toast.success(ok); refresh(); setEdit(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const run = (fn: () => Promise<unknown>, ok: string) => guard(() => act.mutate({ run: fn, ok }));

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={HandCoins} tone="warning" label={t('Riders ke paas cash')} loading={q.isLoading} value={<Amount value={cash} size="lg" weight="bold" />}
          hint={t('{{count}} rider', { count: riders.filter((r) => (r.cashDue ?? 0) > 0).length })} onPress={() => router.push('/restaurant/delivery' as never)} />
        <StatTile style={{ flex: 1 }} icon={Users} tone="success" label={t('Duty par')} loading={q.isLoading} value={`${onDuty.length} / ${riders.length}`} hint={t('Order par lag sakte hain')} onPress={() => setView(view === 'duty' ? 'all' : 'duty')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Bike} tone="accent" label={t('Trip par')} loading={q.isLoading} value={String(riders.filter((r) => r.status === 'BUSY').length)} />
        <StatTile style={{ flex: 1 }} icon={Coffee} tone="neutral" label={t('Off / break')} loading={q.isLoading} value={String(riders.length - onDuty.length)} onPress={() => setView(view === 'off' ? 'all' : 'off')} />
      </Row>
      <ChipGroup value={view} onChange={setView} options={[{ value: 'all', label: t('Sab'), count: riders.length }, { value: 'duty', label: t('Duty par'), count: onDuty.length }, { value: 'off', label: t('Off'), count: riders.length - onDuty.length }]} />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<Rider>
        title={t('Riders')}
        actions={<IconButton icon={Bike} label={t('Delivery board')} onPress={() => router.push('/restaurant/delivery' as never)} />}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone ya bike number…') }}
        summary={header}
        data={shown}
        loading={q.isLoading}
        error={!q.data ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const st = RIDER_STATUS[r.status] ?? RIDER_STATUS.OFFLINE;
          const actions = !canManage ? [] : [
            ...(r.status !== 'BUSY' ? [r.status === 'ACTIVE'
              ? { icon: Power, label: t('Off'), tone: 'neutral' as const, onPress: () => run(() => ridersManageApi.update(r.id, { status: 'OFFLINE' }), `${r.name} off`) }
              : { icon: Power, label: t('Duty par'), tone: 'success' as const, onPress: () => run(() => ridersManageApi.update(r.id, { status: 'ACTIVE' }), t('{{name}} duty par', { name: r.name })) }] : []),
            ...(r.status === 'ACTIVE' ? [{ icon: Coffee, label: t('Break'), tone: 'warning' as const, onPress: () => run(() => ridersManageApi.update(r.id, { status: 'ON_BREAK' }), t('{{name}} break par', { name: r.name })) }] : []),
            { icon: Trash2, label: t('Hatayein'), tone: 'danger' as const, onPress: () => void confirm({ title: t('{{name}} ko list se hata dein?', { name: r.name }), message: t('Purani deliveries record me rahengi.'), tone: 'danger', confirmLabel: t('Hatayein') }).then((ok) => ok && run(() => ridersManageApi.remove(r.id), t('Rider hata diya'))) },
          ];
          return (
            <SwipeRow end={actions}>
              <ListRow icon={Bike} iconTone="accent" divider
                title={<Row gap={1.5}><Text weight="semibold" numberOfLines={1}>{r.name}</Text><Badge tone={st.tone}>{r.status === 'BUSY' ? t('{{value}} trip par', { value: r.activeTrips ?? 1 }) : t(st.label)}</Badge></Row>}
                subtitle={`${r.phone}${t('{{value}} · {{totalDeliveries}} delivery', { value: r.vehicleNumber ? ` · ${r.vehicleNumber}` : '', totalDeliveries: r.totalDeliveries ?? 0 })}`}
                trailing={<Row gap={1}>
                  {(r.cashDue ?? 0) > 0 && <Badge tone="warning">{t('{{formatPKR}} cash', { formatPKR: formatPKR(r.cashDue ?? 0) })}</Badge>}
                  <IconButton icon={Phone} label={t('Call')} size="sm" onPress={() => void Linking.openURL(`tel:${r.phone}`)} />
                  {canManage && <IconButton icon={Pencil} label={t('Badlein')} size="sm" onPress={() => guard(() => setEdit(r))} />}
                </Row>} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Bike} title={riders.length ? t('Is filter me koi rider nahi') : t('Abhi koi rider nahi')}
          action={canManage && !riders.length ? <Button icon={Plus} onPress={() => guard(() => setEdit('new'))}>{t('Pehla rider')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('Naya rider'), onPress: () => guard(() => setEdit('new')) } : undefined}
      />
      {edit && <RiderSheet rider={edit === 'new' ? null : edit} saving={act.isPending} onClose={() => setEdit(null)}
        onSave={(d) => run(() => (edit === 'new' ? ridersManageApi.create(d) : ridersManageApi.update(edit.id, d)), edit === 'new' ? t('{{name}} jur gaya', { name: d.name ?? '' }) : t('Rider save ho gaya'))} />}
    </>
  );
}

function RiderSheet({ rider, saving, onSave, onClose }: { rider: Rider | null; saving: boolean; onSave: (d: RiderInput) => void; onClose: () => void }) {
  const th = useTheme();
  const [f, setF] = useState({
    name: rider?.name ?? '', phone: rider?.phone ?? '', cnic: rider?.cnic ?? '', vehicleType: rider?.vehicleType ?? t('Bike'), vehicleNumber: rider?.vehicleNumber ?? '',
    isEmployee: rider?.isEmployee ?? true, commissionType: rider?.commissionType ?? 'PER_DELIVERY', commissionValue: rider?.commissionValue ?? null as number | null, notes: rider?.notes ?? '',
  });
  const [tried, setTried] = useState(false);
  const errors = {
    name: f.name.trim().length < 2 ? t('Rider ka naam likhein') : '',
    phone: !/^[0-9+\-\s]{7,20}$/.test(f.phone.trim()) ? t('Phone number theek likhein (jaise 03001234567)') : '',
    cnic: f.cnic && f.cnic.replace(/\D/g, '').length !== 13 ? t('CNIC 13 hindsay ka hota hai') : '',
  };
  const ok = !errors.name && !errors.phone && !errors.cnic;
  const submit = () => {
    setTried(true);
    if (!ok) return;
    onSave({
      name: f.name.trim(), phone: f.phone.trim(), cnic: f.cnic.trim() || undefined, vehicleType: f.vehicleType.trim() || undefined, vehicleNumber: f.vehicleNumber.trim() || undefined,
      isEmployee: f.isEmployee, commissionType: f.commissionType, commissionValue: f.commissionValue ?? 0, notes: f.notes.trim() || undefined,
    });
  };
  return (
    <Sheet open onClose={onClose} title={rider ? t('{{name}} badlein', { name: rider.name }) : t('Naya rider')} height={0.92}
      footer={<Button size="lg" fullWidth loading={saving} onPress={submit}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.name} onChangeText={(name) => setF({ ...f, name })} error={tried ? errors.name : undefined} />
        <Input label={t('Phone')} value={f.phone} onChangeText={(phone) => setF({ ...f, phone })} keyboardType="phone-pad" placeholder={t('03xx xxxxxxx')} error={tried ? errors.phone : undefined} hint={t('Customer aur counter isi number par call karte hain')} />
        <Row gap={2}>
          <Input containerStyle={{ flex: 1 }} label={t('Sawari')} value={f.vehicleType} onChangeText={(vehicleType) => setF({ ...f, vehicleType })} placeholder={t('Bike')} />
          <Input containerStyle={{ flex: 1 }} label={t('Number plate')} value={f.vehicleNumber} onChangeText={(vehicleNumber) => setF({ ...f, vehicleNumber })} placeholder={t('LEA-1234')} ltr />
        </Row>
        <Input label="CNIC" value={f.cnic} onChangeText={(cnic) => setF({ ...f, cnic })} keyboardType="number-pad" placeholder="35202-1234567-1" error={tried ? errors.cnic : undefined} hint={t('Marzi — record ke liye')} />
        <Select label={t('Kiraya kaise')} value={f.commissionType} onChange={(commissionType) => setF({ ...f, commissionType })}
          options={[{ value: 'PER_DELIVERY', label: t('Har delivery ka fixed') }, { value: 'PERCENTAGE', label: t('Bill ka %') }, { value: 'FIXED', label: t('Mahana tankhwah') }]} />
        <NumberInput label={f.commissionType === 'PERCENTAGE' ? t('Kitna %') : t('Kitne Rs')} value={f.commissionValue} onChangeValue={(commissionValue) => setF({ ...f, commissionValue })} hint={t('Sirf record — payment Expense ya Staff se')} />
        <Checkbox value={f.isEmployee} onChange={(isEmployee) => setF({ ...f, isEmployee })} label={t('Dukaan ka apna rider')} />
        <Input label={t('Note')} value={f.notes} onChangeText={(notes) => setF({ ...f, notes: notes.slice(0, 300) })} />
      </View>
    </Sheet>
  );
}
