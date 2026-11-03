/**
 * Doctor directory (web PharmacyDoctorsPage): who sends prescriptions here,
 * how many and for how much medicine. Counter staff add and correct doctors;
 * verifying or switching one off needs customer edit rights. Doctors are never
 * deleted, so old prescriptions keep their name. Needs the server.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BadgeCheck, Pencil, Plus, Power, Stethoscope } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { cnicOk, drName, formatCnic } from '@nafaa/core/industries/pharmacy';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, Input, ListRow, ListTemplate, Sheet, SwipeRow, Text, TextArea, toast, useTheme, type SwipeAction } from '@/design';
import { apiErrorMessage } from '@/core/api/errors';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { doctorsApi, type Doctor } from '../api';
import { DOCTORS_KEY, SPECIALITIES } from '../meta';

type Tab = 'active' | 'verified' | 'inactive';
const EMPTY = { name: '', registrationNumber: '', phone: '', cnic: '', qualification: '', specialization: '', clinicName: '', clinicAddress: '', hospitalAffiliation: '', notes: '' };
const opt = (v: string) => v.trim() || undefined;

function DoctorSheet({ doctor, onClose }: { doctor: Doctor | null | 'new'; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const edit = doctor && doctor !== 'new' ? doctor : null;
  const [d, setD] = useState(() => (edit ? { ...EMPTY, ...Object.fromEntries(Object.entries(edit).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } as typeof EMPTY : EMPTY));
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof EMPTY, v: string) => setD((x) => ({ ...x, [k]: v }));
  const errors = {
    name: d.name.trim().length < 2 ? t('Naam likhein') : undefined,
    registrationNumber: d.registrationNumber.trim().length < 2 ? t('PMDC number likhein') : undefined,
    cnic: !cnicOk(d.cnic) ? t('CNIC 13 hindsay ka hota hai') : undefined,
  };
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: d.name.trim(), registrationNumber: d.registrationNumber.trim(), phone: opt(d.phone), cnic: opt(d.cnic), qualification: opt(d.qualification),
        specialization: opt(d.specialization), clinicName: opt(d.clinicName), clinicAddress: opt(d.clinicAddress), hospitalAffiliation: opt(d.hospitalAffiliation), notes: opt(d.notes),
      };
      return edit ? doctorsApi.update(edit.id, body) : doctorsApi.create(body);
    },
    onSuccess: () => { toast.success(edit ? t('Doctor update ho gaya') : t('Doctor jur gaya')); void qc.invalidateQueries({ queryKey: [DOCTORS_KEY] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (Object.values(errors).some(Boolean)) return; save.mutate(); };
  return (
    <Sheet open={!!doctor} onClose={onClose} height={0.92} title={edit ? t('{{name}} — badlein', { name: edit.name }) : t('Naya doctor')} description={t('PMDC number se doctor pehchana jata hai')}
      footer={<Button fullWidth loading={save.isPending} onPress={submit}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={d.name} onChangeText={(v) => set('name', v)} placeholder={t('Ahmed Raza')} error={tried ? errors.name : undefined} />
        <Input label={t('PMDC number')} value={d.registrationNumber} onChangeText={(v) => set('registrationNumber', v)} placeholder="12345-P" ltr error={tried ? errors.registrationNumber : undefined} />
        <Input label={t('Specialist')} value={d.specialization} onChangeText={(v) => set('specialization', v)} />
        <ChipGroup wrap value={d.specialization} onChange={(v) => set('specialization', v)} options={SPECIALITIES.map((s) => ({ value: s, label: s }))} />
        <Input label={t('Phone')} value={d.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" ltr />
        <Input label={t('Degree')} value={d.qualification} onChangeText={(v) => set('qualification', v)} placeholder="MBBS, FCPS" />
        <Input label={t('Clinic')} value={d.clinicName} onChangeText={(v) => set('clinicName', v)} />
        <Input label={t('Hospital')} value={d.hospitalAffiliation} onChangeText={(v) => set('hospitalAffiliation', v)} />
        <Input label={t('Clinic ka pata')} value={d.clinicAddress} onChangeText={(v) => set('clinicAddress', v)} />
        <Input label={t('CNIC')} value={d.cnic} onChangeText={(v) => set('cnic', formatCnic(v))} keyboardType="number-pad" ltr error={tried ? errors.cnic : undefined} />
        <TextArea label={t('Note')} value={d.notes} onChangeText={(v) => set('notes', v)} />
      </View>
    </Sheet>
  );
}

export function DoctorsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('pharmacyDesk');
  const canAdd = can(P.POS_USE);
  const canManage = can(P.CUSTOMERS_EDIT);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Doctor | null | 'new'>(null);
  const q = useQuery({ queryKey: [DOCTORS_KEY, 'all'], queryFn: () => doctorsApi.list(), staleTime: 60_000 });
  const all = q.data ?? [];
  const refresh = () => void qc.invalidateQueries({ queryKey: [DOCTORS_KEY] });

  const verify = useMutation({ mutationFn: (id: string) => doctorsApi.verify(id), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))) });
  const toggle = useMutation({
    mutationFn: (d: Doctor) => (d.isActive ? doctorsApi.remove(d.id) : doctorsApi.update(d.id, { name: d.name, registrationNumber: d.registrationNumber, isActive: true })),
    onSuccess: (_r, d) => { toast.success(d.isActive ? t('{{name}} band — purane nuskhon me naam rahega', { name: d.name }) : t('{{name}} phir chalu', { name: d.name })); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  const counts = { active: all.filter((d) => d.isActive).length, verified: all.filter((d) => d.isActive && d.isVerified).length, inactive: all.filter((d) => !d.isActive).length };
  const needle = search.trim().toLowerCase();
  const shown = useMemo(() => all
    .filter((d) => (tab === 'inactive' ? !d.isActive : d.isActive && (tab !== 'verified' || d.isVerified)))
    .filter((d) => !needle || [d.name, d.registrationNumber, d.phone, d.specialization, d.clinicName].some((v) => (v ?? '').toLowerCase().includes(needle)))
    .sort((a, b) => b.totalPrescriptions - a.totalPrescriptions || a.name.localeCompare(b.name)), [all, tab, needle]);

  return (
    <>
      <ListTemplate<Doctor>
        title={t('Doctors')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, PMDC, phone, clinic…') }}
        summary={
          <View style={{ gap: th.space(2) }}>
            <ChipGroup value={tab} onChange={setTab} style={{ marginHorizontal: -th.space(4) }}
              options={[{ value: 'active', label: t('Chalu'), count: counts.active }, { value: 'verified', label: t('Verified'), count: counts.verified }, { value: 'inactive', label: t('Band'), count: counts.inactive }]} />
            <OfflineNote feature="pharmacyDesk" />
            <CachedNote query={q} />
          </View>
        }
        data={shown}
        loading={q.isLoading}
        error={!q.data ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(d) => d.id}
        renderItem={({ item: d }) => {
          const end: SwipeAction[] = [
            ...(canAdd ? [{ icon: Pencil, label: t('Badlein'), tone: 'brand' as const, onPress: () => guard(() => setForm(d)) }] : []),
            ...(canManage && d.isActive ? [{ icon: BadgeCheck, label: d.isVerified ? t('Verified hatayein') : t('Verify karein'), tone: 'success' as const, onPress: () => guard(() => verify.mutate(d.id)) }] : []),
            ...(canManage ? [{ icon: Power, label: d.isActive ? t('Band karein') : t('Chalu karein'), tone: 'danger' as const, onPress: () => guard(() => toggle.mutate(d)) }] : []),
          ];
          return (
            <SwipeRow end={end}>
              <ListRow icon={Stethoscope} iconTone={d.isVerified ? 'success' : 'neutral'}
                title={drName(d.name)} subtitle={[d.specialization, `PMDC ${d.registrationNumber}`, d.clinicName].filter(Boolean).join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text weight="bold" ltr>{t('{{count}} nuskhe', { count: d.totalPrescriptions })}</Text>
                  <Text size="2xs" tone="muted">{cost(d.totalBusiness)}</Text>
                  {d.isVerified ? <Badge tone="success">{t('Verified')}</Badge> : null}
                  {d.lastPrescriptionAt ? <Text size="2xs" tone="muted">{formatRelative(d.lastPrescriptionAt)}</Text> : null}
                </View>}
                onPress={() => router.push(`/pharmacy/prescriptions?doctor=${d.id}` as never)} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Stethoscope} title={needle ? t('Is naam ka doctor nahi mila') : t('Abhi koi doctor nahi')} message={t('PMDC number se doctor jorein — nuskhe aur register me naam khud aa jata hai.')}
          action={canAdd ? <Button icon={Plus} onPress={() => guard(() => setForm('new'))}>{t('Naya doctor')}</Button> : undefined} />}
        fab={canAdd ? { icon: Plus, label: t('Naya doctor'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      {form ? <DoctorSheet doctor={form} onClose={() => setForm(null)} /> : null}
    </>
  );
}
