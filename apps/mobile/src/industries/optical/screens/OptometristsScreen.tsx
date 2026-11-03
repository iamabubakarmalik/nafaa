/**
 * Optometrists (web OptometristsPage): the doctors who do eye tests, with
 * their days, hours and fees, which the booking uses. Adding, editing and
 * closing need staff.manage. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Ban, CalendarDays, Pencil, Plus, Stethoscope, UserCog } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, DatePicker, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Sheet, StatTile, SwipeRow, Text, toast, useTheme, type SwipeAction } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { optometristsApi, type OpticalOptometrist, type OptometristInput } from '../api';
import { MultiChoices } from '../components/parts';
import { DAYS, OPTICAL_KEYS, SPECIALTIES, phoneOk, refreshOptical, todayKey } from '../meta';

type Tab = 'active' | 'off' | 'all';

/** "HH:MM" (shop clock) as a Date for the time picker, and back. */
const timeDate = (hm: string) => new Date(`${todayKey()}T${hm}:00+05:00`);
const dateTime24 = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Karachi' }).format(d);

export function OptometristsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const canManage = can(P.STAFF_MANAGE);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<OpticalOptometrist | 'new' | null>(null);
  const list = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'all'], queryFn: () => optometristsApi.list() });
  const all = list.data ?? [];
  const term = search.trim().toLowerCase();
  const rows = all.filter((d) => (tab === 'all' || (tab === 'active' ? d.isActive : !d.isActive)) && (!term || [d.name, d.phone, d.employeeCode, d.qualification].some((v) => v?.toLowerCase().includes(term))));
  const active = all.filter((d) => d.isActive);
  const today = new Date().getDay();
  const off = useMutation({ mutationFn: (d: OpticalOptometrist) => optometristsApi.deactivate(d.id), onSuccess: () => { toast.success(t('Band kar diya — purana record rehta hai')); refreshOptical([OPTICAL_KEYS.doctors]); } });
  const on = useMutation({ mutationFn: (d: OpticalOptometrist) => optometristsApi.update(d.id, { isActive: true }), onSuccess: () => { toast.success(t('Dobara chalu')); refreshOptical([OPTICAL_KEYS.doctors]); } });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={UserCog} label={t('Chalu doctor')} loading={list.isLoading} value={String(active.length)} onPress={() => setTab('active')} />
        <StatTile style={{ flex: 1 }} icon={CalendarDays} tone="success" label={t('Aaj dukaan par')} loading={list.isLoading} value={String(active.filter((d) => d.workingDays.includes(today)).length)} hint={t(DAYS[today])} />
        <StatTile style={{ flex: 1 }} icon={Ban} tone="neutral" label={t('Band')} loading={list.isLoading} value={String(all.length - active.length)} onPress={() => setTab('off')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('Chalu') }, { value: 'off', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
    </View>
  );

  return (
    <>
      <ListTemplate<OpticalOptometrist>
        title={t('Optometrists')} subtitle={t('Eye test karne wale doctor')}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone ya code…') }}
        summary={header}
        data={rows} loading={list.isLoading} error={!list.data ? list.error : undefined} onRetry={() => void list.refetch()}
        refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(d) => d.id}
        renderItem={({ item: d }) => {
          const acts: SwipeAction[] = canManage ? [
            { icon: Pencil, label: t('Badlein'), tone: 'brand', onPress: () => setEditing(d) },
            d.isActive ? { icon: Ban, label: t('Band karein'), tone: 'danger', onPress: () => off.mutate(d) } : { icon: Stethoscope, label: t('Chalu'), tone: 'success', onPress: () => on.mutate(d) },
          ] : [];
          return (
            <SwipeRow end={acts} enabled={canManage}>
              <ListRow
                title={d.name} overline={[d.employeeCode, d.qualification].filter(Boolean).join(' · ')}
                subtitle={`${d.workingDays.map((i) => t(DAYS[i]).slice(0, 2)).join(' ')} · ${d.workStartTime}–${d.workEndTime}`}
                trailing={(
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text size="sm" weight="semibold" ltr>{cost(d.consultationFee)}</Text>
                    <Text size="2xs" tone="muted">{t('{{count}} test', { count: d.totalTests })}</Text>
                    {!d.isActive && <Badge tone="neutral">{t('Band')}</Badge>}
                  </View>
                )}
                onPress={canManage ? () => setEditing(d) : undefined} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={UserCog} title={term ? t('"{{search}}" se koi nahi mila', { search }) : t('Abhi koi doctor nahi')} message={t('Doctor jorein — eye test booking me unke din, waqt aur fees aate hain.')} />}
        fab={canManage ? { icon: Plus, label: t('Naya doctor'), onPress: () => setEditing('new') } : undefined}
      />
      <DoctorSheet doctor={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  );
}

function DoctorSheet({ doctor, open, onClose }: { doctor: OpticalOptometrist | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const blank = useMemo(() => ({
    employeeCode: `OPT-${Date.now().toString().slice(-4)}`, name: '', phone: '', qualification: '', registrationNumber: '', years: '',
    days: [1, 2, 3, 4, 5, 6], start: '10:00', end: '20:00', fee: 500 as number | null, followFee: 0 as number | null, specializations: [] as string[],
  }), []);
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTried(false);
    setF(doctor ? {
      employeeCode: doctor.employeeCode, name: doctor.name, phone: doctor.phone, qualification: doctor.qualification ?? '', registrationNumber: doctor.registrationNumber ?? '',
      years: doctor.yearsExperience != null ? String(doctor.yearsExperience) : '', days: doctor.workingDays, start: doctor.workStartTime, end: doctor.workEndTime,
      fee: doctor.consultationFee, followFee: doctor.followUpFee, specializations: doctor.specializations,
    } : { ...blank, employeeCode: `OPT-${Date.now().toString().slice(-4)}` });
  }, [open, doctor, blank]);
  const set = (patch: Partial<typeof f>) => setF((c) => ({ ...c, ...patch }));
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = t('Naam likhein');
  if (!phoneOk(f.phone)) e.phone = t('Sahi mobile number likhein (03xx-xxxxxxx)');
  if (!f.employeeCode.trim()) e.code = t('Code likhein');
  if (!f.days.length) e.days = t('Kam se kam ek din chunein');
  if (f.end <= f.start) e.time = t('Chhutti ka waqt aane ke baad ho');
  const save = useMutation({
    mutationFn: () => {
      const body: OptometristInput = {
        employeeCode: f.employeeCode.trim(), name: f.name.trim(), phone: f.phone.trim(), qualification: f.qualification.trim() || undefined,
        registrationNumber: f.registrationNumber.trim() || undefined, yearsExperience: f.years ? Number(f.years) : undefined,
        workingDays: [...f.days].sort(), workStartTime: f.start, workEndTime: f.end, consultationFee: f.fee ?? 0, followUpFee: f.followFee ?? 0, specializations: f.specializations,
      };
      return doctor ? optometristsApi.update(doctor.id, body) : optometristsApi.create(body);
    },
    onSuccess: () => { toast.success(doctor ? t('Save ho gaya') : t('Doctor jur gaya')); refreshOptical([OPTICAL_KEYS.doctors]); onClose(); },
  });
  const submit = () => {
    setTried(true);
    if (!online) { toast.warning(onlineNeededText('opticalDesk')); return; }
    if (!Object.keys(e).length && !save.isPending) save.mutate();
  };
  const show = (k: string) => (tried ? e[k] : undefined);
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={doctor ? t('{{name}} — badlein', { name: doctor.name }) : t('Naya optometrist')} description={t('Din, waqt aur fees — booking yahi istemal karti hai')}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.name} onChangeText={(name) => set({ name })} placeholder={t('Dr. Sana Ahmed')} error={show('name')} maxLength={120} />
        <Input label={t('Mobile')} value={f.phone} onChangeText={(phone) => set({ phone })} placeholder="0300-1234567" keyboardType="phone-pad" error={show('phone')} maxLength={20} />
        <Input label={t('Qualification')} value={f.qualification} onChangeText={(qualification) => set({ qualification })} placeholder={t('B.Sc Optometry')} hint={t('Marzi hai')} />
        <Input label={t('Registration number')} value={f.registrationNumber} onChangeText={(registrationNumber) => set({ registrationNumber })} hint={t('Marzi hai')} />
        <Input label={t('Code')} value={f.employeeCode} onChangeText={(employeeCode) => set({ employeeCode })} error={show('code')} hint={t('Har doctor ka alag')} maxLength={30} ltr />
        <Input label={t('Tajurba (saal)')} value={f.years} onChangeText={(years) => set({ years: years.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" hint={t('Marzi hai')} />
        <View style={{ gap: th.space(1.5) }}>
          <Text size="sm" weight="medium" tone="secondary">{t('Kin dinon aate hain')}</Text>
          <ChipGroup wrap multiple value={f.days.map(String)} onChange={(v) => set({ days: v.map(Number) })} options={DAYS.map((n, i) => ({ value: String(i), label: t(n) }))} />
          {show('days') ? <Text size="xs" tone="danger">{show('days')}</Text> : null}
        </View>
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Aane ka waqt')} value={timeDate(f.start)} onChange={(d) => set({ start: dateTime24(d) })} /></View>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Jane ka waqt')} value={timeDate(f.end)} onChange={(d) => set({ end: dateTime24(d) })} error={show('time')} /></View>
        </Row>
        <MoneyInput label={t('Test fees')} value={f.fee} onChangeValue={(fee) => set({ fee })} />
        <MoneyInput label={t('Dobara aane ki fees')} value={f.followFee} onChangeValue={(followFee) => set({ followFee })} hint={t('Marzi hai')} />
        <View style={{ gap: th.space(1.5) }}>
          <Text size="sm" weight="medium" tone="secondary">{t('Khaas kaam')}</Text>
          <MultiChoices options={SPECIALTIES} value={f.specializations} onChange={(specializations) => set({ specializations })} />
        </View>
      </View>
    </Sheet>
  );
}
