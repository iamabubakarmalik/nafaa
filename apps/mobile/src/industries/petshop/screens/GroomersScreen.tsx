/** Groomers (web GroomersPage): who works when, commission and the month's work; add, edit, switch off. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, Plus, Power, Scissors, Star, Users } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DatePicker, DetailRow, EmptyState, Input, ListRow, ListTemplate, Row, Segmented, Sheet, StatTile, Switch, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, errorText, numIn, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { groomersApi, type Groomer, type GroomerInput, type GroomingService, type PetSpecies } from '../api';
import { PET_KEYS, SERVICE, WEEKDAYS, refreshPet, serviceLabel, speciesEmoji } from '../meta';

type Tab = 'active' | 'off' | 'all';
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const timeToDate = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d; };
const dateToTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

export function GroomersScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.STAFF_MANAGE);
  const { guard } = useDeskOnline('petshopAnimals');
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Groomer | 'new' | null>(null);
  const [open, setOpen] = useState<Groomer | null>(null);
  const q = useQuery({ queryKey: [PET_KEYS.groomers, 'all'], queryFn: () => groomersApi.list() });
  const all = q.data ?? [];
  const weekday = new Date().getDay();
  const active = all.filter((g) => g.isActive);
  const rated = active.filter((g) => g.avgRating);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((g) => (tab === 'all' || (tab === 'active' ? g.isActive : !g.isActive)) && (!s || [g.name, g.phone, g.employeeCode].join(' ').toLowerCase().includes(s)));
  }, [all, tab, search]);
  const activate = useMutation({
    mutationFn: (g: Groomer) => groomersApi.update(g.id, { isActive: true }),
    onSuccess: () => { refreshPet([PET_KEYS.groomers]); toast.success(t('Groomer dobara chalu')); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const deactivate = async (g: Groomer) => {
    const ok = await confirm({ title: t('{{name}} band karein?', { name: g.name }), message: t('Nayi booking me nahi aayega. Purani visits aur hisaab me naam rahega; baad me dobara chalu kar sakte hain.'), tone: 'danger', confirmLabel: t('Haan, band') });
    if (!ok) return;
    try { await groomersApi.deactivate(g.id); refreshPet([PET_KEYS.groomers]); toast.success(t('Groomer band — purani visits me naam rahega')); setOpen(null); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Users} tone="info" label={t('Chalu groomers')} loading={q.isLoading} value={String(active.length)} />
        <StatTile style={{ flex: 1 }} icon={CalendarDays} tone="success" label={t('Aaj kaam par')} loading={q.isLoading} value={String(active.filter((g) => g.workingDays.includes(weekday)).length)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Scissors} tone="accent" label={t('Kul visits')} loading={q.isLoading} value={String(active.reduce((s, g) => s + g.completedAppointments, 0))} />
        <StatTile style={{ flex: 1 }} icon={Star} tone="warning" label={t('Aam rating')} loading={q.isLoading} value={rated.length ? (rated.reduce((s, g) => s + (g.avgRating ?? 0), 0) / rated.length).toFixed(1) : '—'} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('Chalu') }, { value: 'off', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
      <OfflineNote feature="petshopAnimals" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<Groomer>
        title={t('Groomers')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone ya code…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(g) => g.id}
        renderItem={({ item: g }) => (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: g.isActive ? 1 : 0.7 }}>
            <ListRow icon={Scissors} iconTone={g.isActive ? 'success' : 'neutral'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{g.name}</Text><Badge tone={g.isActive ? 'success' : 'neutral'}>{g.isActive ? t('Chalu') : t('Band')}</Badge></Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" ltr numberOfLines={1}>{`${g.employeeCode} · ${g.phone}`}</Text>
                <Text size="xs" tone="secondary">{`${g.workStartTime}–${g.workEndTime} · ${g.workingDays.map((d) => t(WEEKDAYS[d]).slice(0, 3)).join(', ')}`}</Text>
                <Text size="xs" tone="muted">{t('{{completedAppointments}} visits{{value}}', { completedAppointments: g.completedAppointments, value: g.avgRating ? ` · ★ ${g.avgRating}` : '' })}</Text>
              </View>}
              chevron onPress={() => setOpen(g)} />
          </View>
        )}
        empty={<EmptyState icon={Scissors} title={all.length ? t('Is filter me koi nahi') : t('Abhi koi groomer nahi')} message={t('Groomer jorein — booking me usi ke khali waqt aate hain.')} />}
        fab={canManage ? { icon: Plus, label: t('Naya groomer'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <GroomerSheet g={open} canManage={canManage} onClose={() => setOpen(null)} onEdit={(g) => { setOpen(null); guard(() => setForm(g)); }} onOff={(g) => guard(() => void deactivate(g))} onOn={(g) => guard(() => activate.mutate(g))} />
      <GroomerForm groomer={form} onClose={() => setForm(null)} />
    </>
  );
}

function GroomerSheet({ g, canManage, onClose, onEdit, onOff, onOn }: { g: Groomer | null; canManage: boolean; onClose: () => void; onEdit: (g: Groomer) => void; onOff: (g: Groomer) => void; onOn: (g: Groomer) => void }) {
  const th = useTheme();
  const canCommission = usePermission()(P.COMMISSION_VIEW);
  const monthStart = `${todayKey().slice(0, 8)}01`;
  const detail = useQuery({ queryKey: [PET_KEYS.groomers, 'one', g?.id], queryFn: () => groomersApi.getOne(g!.id), enabled: !!g });
  const load = useQuery({ queryKey: [PET_KEYS.groomers, 'workload', g?.id, monthStart], queryFn: () => groomersApi.workload(g!.id, monthStart, todayKey()), enabled: !!g && canCommission });
  const d = detail.data ?? g;
  const x = load.data?.totals;
  return (
    <Sheet open={!!g} onClose={onClose} title={g?.name} description={g ? `${g.employeeCode} · ${g.phone}` : undefined}
      footer={g && canManage ? (
        <Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => onEdit(g)}>{t('Badlein')}</Button>
          {g.isActive ? <Button variant="secondary" icon={Power} style={{ flex: 1 }} onPress={() => onOff(g)}>{t('Band karein')}</Button> : <Button style={{ flex: 1 }} onPress={() => onOn(g)}>{t('Chalu')}</Button>}
        </Row>
      ) : undefined}>
      {g && d && (
        <View style={{ gap: th.space(3) }}>
          <Card flush>
            <DetailRow label={t('Kaam ka waqt')} value={`${g.workStartTime}–${g.workEndTime}`} />
            <DetailRow label={t('Kaam ke din')} value={g.workingDays.map((x2) => t(WEEKDAYS[x2])).join(', ') || '—'} />
            <DetailRow label={t('Kya karta hai')} value={g.serviceTypes.map(serviceLabel).join(', ') || t('Sab')} />
            {!!g.experienceYears && <DetailRow label={t('Tajurba (saal)')} value={String(g.experienceYears)} />}
            <DetailRow label={t('Kin janwaron ka kaam')} value={g.specializations.map(speciesEmoji).join(' ') || '—'} last />
          </Card>
          {canCommission && (
            <Row gap={2}>
              <StatTile style={{ flex: 1 }} label={t('Is mahine visits')} value={x ? `${x.completed} / ${x.total}` : '…'} />
              <StatTile style={{ flex: 1 }} label={t('Kaam ki value')} value={x ? formatMoney(x.revenue) : '…'} />
              <StatTile style={{ flex: 1 }} label={t('Commission ({{commissionPct}}%)', { commissionPct: g.commissionPct })} value={x ? formatMoney(x.commission) : '…'} />
            </Row>
          )}
          <View style={{ gap: 4 }}>
            <Text size="xs" weight="semibold" tone="muted">{t('Aaj')}</Text>
            {(d.todayAppointments ?? []).length === 0 ? <Text size="sm" tone="muted">{t('Aaj koi booking nahi')}</Text> : (d.todayAppointments ?? []).map((a) => <Text key={a.id} size="sm">{`${a.scheduledSlot ?? ''} · ${a.petName}`}</Text>)}
            {(d.upcoming ?? []).length > 0 && <Text size="xs" weight="semibold" tone="muted" style={{ marginTop: 8 }}>{t('Aage ki bookings')}</Text>}
            {(d.upcoming ?? []).slice(0, 8).map((a) => <Text key={a.id} size="sm" tone="secondary">{`${a.scheduledDate.slice(0, 10)} ${a.scheduledSlot ?? ''} · ${a.petName}`}</Text>)}
          </View>
        </View>
      )}
    </Sheet>
  );
}

function GroomerForm({ groomer, onClose }: { groomer: Groomer | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const g = groomer === 'new' ? null : groomer;
  const [d, setD] = useState({ employeeCode: '', name: '', phone: '', cnic: '', specializations: [] as PetSpecies[], serviceTypes: [] as GroomingService[], workingDays: [1, 2, 3, 4, 5, 6], workStartTime: '10:00', workEndTime: '19:00', experienceYears: null as number | null, perServiceRate: null as number | null, commissionPct: '0', isActive: true });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!groomer) return;
    setTouched(false);
    setD({
      employeeCode: g?.employeeCode ?? '', name: g?.name ?? '', phone: g?.phone ?? '', cnic: g?.cnic ?? '', specializations: g?.specializations ?? [], serviceTypes: g?.serviceTypes ?? [],
      workingDays: g?.workingDays ?? [1, 2, 3, 4, 5, 6], workStartTime: g?.workStartTime ?? '10:00', workEndTime: g?.workEndTime ?? '19:00', experienceYears: g?.experienceYears ?? null,
      perServiceRate: g?.perServiceRate ?? null, commissionPct: g ? String(g.commissionPct) : '0', isActive: g?.isActive ?? true,
    });
  }, [groomer]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const pct = numIn(d.commissionPct) ?? 0;
  const error = !d.employeeCode.trim() ? t('Code likhein') : !d.name.trim() ? t('Naam likhein') : !phoneOk(d.phone) ? t('Phone 10 se 15 hindse') : !d.workingDays.length ? t('Kam se kam ek din chunein')
    : d.workStartTime >= d.workEndTime ? t('Chhutti ka waqt shuru se baad ho') : pct < 0 || pct > 100 ? t('Commission 0 se 100%') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    const body: GroomerInput = {
      employeeCode: d.employeeCode.trim(), name: d.name.trim(), phone: d.phone.trim(), cnic: d.cnic.trim() || undefined, specializations: d.specializations, serviceTypes: d.serviceTypes,
      workingDays: [...d.workingDays].sort(), workStartTime: d.workStartTime, workEndTime: d.workEndTime, experienceYears: d.experienceYears != null ? Math.round(d.experienceYears) : undefined,
      perServiceRate: d.perServiceRate ?? undefined, commissionPct: pct, isActive: d.isActive,
    };
    setBusy(true);
    try {
      if (g) await groomersApi.update(g.id, body); else await groomersApi.create(body);
      refreshPet([PET_KEYS.groomers]);
      toast.success(g ? t('Save ho gaya') : t('Groomer jur gaya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!groomer} onClose={onClose} height={0.92} title={g ? t('{{name}} badlein', { name: g.name }) : t('Naya groomer')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{g ? t('Save') : t('Groomer jorein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Code')} value={d.employeeCode} onChangeText={(v) => set('employeeCode', v)} placeholder="G-01" hint={t('Har groomer ka alag')} error={touched && !d.employeeCode.trim() ? error : undefined} />
        <Input label={t('Naam')} value={d.name} onChangeText={(v) => set('name', v)} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={d.phone} onChangeText={(v) => set('phone', v)} error={touched && d.employeeCode.trim() && d.name.trim() && !phoneOk(d.phone) ? error : undefined} />
        <Text size="sm" weight="medium" tone="secondary">{t('Kaam ke din')}</Text>
        <ChipGroup wrap multiple value={d.workingDays.map(String)} onChange={(v) => set('workingDays', v.map(Number))} options={WEEKDAYS.map((w, i) => ({ value: String(i), label: t(w) }))} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Shuru')} value={timeToDate(d.workStartTime)} onChange={(x) => set('workStartTime', dateToTime(x))} /></View>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Chhutti')} value={timeToDate(d.workEndTime)} onChange={(x) => set('workEndTime', dateToTime(x))} /></View>
        </Row>
        <NumberInput label={t('Rate (Rs)')} value={d.perServiceRate} onChangeValue={(v) => set('perServiceRate', v)} hint={t('Booking me yaad dilata hai')} />
        <Input label={t('Commission %')} keyboardType="decimal-pad" ltr value={d.commissionPct} onChangeText={(v) => set('commissionPct', v)} />
        <Text size="sm" weight="medium" tone="secondary">{t('Kin janwaron ka kaam')}</Text>
        <ChipGroup wrap multiple value={d.specializations} onChange={(v) => set('specializations', v)} options={(['DOG', 'CAT', 'RABBIT', 'BIRD', 'OTHER'] as const).map((s) => ({ value: s, label: `${speciesEmoji(s)} ${s === 'DOG' ? t('Kutta') : s === 'CAT' ? t('Billi') : s === 'RABBIT' ? t('Khargosh') : s === 'BIRD' ? t('Parinda / tota') : t('Aur')}` }))} />
        <Text size="sm" weight="medium" tone="secondary">{t('Kya karta hai (khali = sab)')}</Text>
        <ChipGroup wrap multiple value={d.serviceTypes} onChange={(v) => set('serviceTypes', v)} options={(Object.keys(SERVICE) as GroomingService[]).map((s) => ({ value: s, label: t(SERVICE[s]) }))} />
        <Input label={t('CNIC (marzi)')} ltr value={d.cnic} onChangeText={(v) => set('cnic', v)} placeholder="35202-1234567-1" />
        <NumberInput label={t('Tajurba (saal)')} integer value={d.experienceYears} onChangeValue={(v) => set('experienceYears', v)} />
        <Switch value={d.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu')} />
      </View>
    </Sheet>
  );
}
