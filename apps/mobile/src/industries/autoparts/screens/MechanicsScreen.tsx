/**
 * Mechanics (web MechanicsPage): staff members who work on vehicles, with their
 * skills, rate and commission, the jobs they have open, and this month's
 * finished jobs, labour earned and commission due. Mechanics are picked on job
 * cards and credited with the labour lines they do.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Coffee, Hammer, Pencil, Plus, Power, UserCog, Wallet, Wrench } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Avatar, Badge, Button, Card, ChipGroup, EmptyState, FormSection, Input, ListRow, ListTemplate, MoneyInput, Row, Select, Sheet, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatGrid } from '../../_shared/trade/kit';
import { mechanicsApi, type MechanicProfile } from '../api';
import { MECHANIC_KEY, refreshAuto } from '../meta';

const SKILLS = ['Engine', 'Electrician', 'AC', 'Denter', 'Painter', 'Suspension', 'Gear box', 'Tyre / alignment', 'Bike mechanic', 'Diesel', 'Hybrid', 'Scanner'];

export function MechanicsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const canEdit = can(P.STAFF_MANAGE);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<MechanicProfile | 'new' | null>(null);
  const q = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list() });
  const all = q.data ?? [];
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((m) => !s || [m.staff?.fullName, m.staff?.phone, ...m.specialization].some((v) => v?.toLowerCase().includes(s)));
  }, [all, search]);
  const totals = useMemo(() => ({
    available: all.filter((m) => m.isAvailable).length, open: all.reduce((s, m) => s + (m.openJobs ?? 0), 0),
    labour: all.reduce((s, m) => s + (m.monthLabour ?? 0), 0), commission: all.reduce((s, m) => s + (m.monthCommission ?? 0), 0),
  }), [all]);

  const run = (fn: () => Promise<unknown>, ok: string) => guard(async () => {
    try { await fn(); toast.success(ok); refreshAuto([MECHANIC_KEY], { money: false }); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
  });
  const toggle = (m: MechanicProfile) => run(() => mechanicsApi.toggleAvailability(m.id), m.isAvailable ? t('{{fullName}} chutti par', { fullName: m.staff?.fullName }) : t('{{fullName}} kaam par', { fullName: m.staff?.fullName }));
  const remove = async (m: MechanicProfile) => {
    if (!(await confirm({ title: t('{{fullName}} ko hatayein?', { fullName: m.staff?.fullName ?? '' }), message: t('Purane jobs waise hi rehte hain.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    void run(() => mechanicsApi.remove(m.id), t('{{fullName}} mechanic list se hata — purane jobs waise hi', { fullName: m.staff?.fullName }));
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: UserCog, tone: 'info', label: t('Kaam par'), loading: q.isLoading, value: String(totals.available), hint: t('{{value}} chutti par', { value: all.length - totals.available }) },
        { icon: Wrench, tone: 'accent', label: t('Chalte job'), loading: q.isLoading, value: String(totals.open) },
        { icon: Hammer, tone: 'success', label: t('Mahine ki mazdoori'), loading: q.isLoading, value: formatMoney(totals.labour), hint: t('Di gayi gaariyon par') },
        { icon: Wallet, tone: 'warning', label: t('Commission bana'), loading: q.isLoading, value: formatMoney(totals.commission), hint: t('Mazdoori × commission %') },
      ]} />
      <OfflineNote feature="autopartsDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<MechanicProfile>
        title={t('Mechanic')}
        subtitle={t('Kaun kis gaari par hai, is mahine kitna kaam kiya aur kitna commission bana')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone ya hunar — AC, denter…') }}
        summary={summary}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => (
          <RowCard>
            <ListRow
              avatar={<Avatar name={m.staff?.fullName ?? 'M'} size={44} />}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{m.staff?.fullName ?? t('Mechanic')}</Text><Badge tone={m.isAvailable ? 'success' : 'neutral'}>{m.isAvailable ? t('Kaam par') : t('Chutti')}</Badge></Row>}
              subtitle={<View style={{ gap: 3 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[m.staff?.phone, m.yearsOfExperience ? t('{{yearsOfExperience}} saal tajurba', { yearsOfExperience: m.yearsOfExperience }) : null].filter(Boolean).join(' · ') || '—'}</Text>
                {m.specialization.length > 0 ? <Text size="2xs" tone="secondary" numberOfLines={1}>{m.specialization.join(' · ')}</Text> : null}
                <Text size="xs" ltr>{t('Chalte')} {m.openJobs ?? 0} · {t('Mahine me')} {m.monthJobs ?? 0} · {t('Mazdoori')} {formatMoney(m.monthLabour ?? 0)}</Text>
                <Text size="2xs" tone="muted">{m.hourlyRate > 0 ? t('Rate {{hourlyRate}}/ghanta · ', { hourlyRate: formatMoney(m.hourlyRate) }) : ''}{m.commissionPct > 0 ? t('Commission {{commissionPct}}% = {{sales}}', { commissionPct: m.commissionPct, sales: formatMoney(m.monthCommission ?? 0) }) : ''}</Text>
              </View>}
              chevron={false}
              onPress={() => router.push({ pathname: '/autoparts/jobs', params: { mechanic: m.id, view: 'all' } } as never)}
              trailing={canEdit ? <View style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" icon={Coffee} onPress={() => toggle(m)}>{m.isAvailable ? t('Chutti') : t('Kaam par')}</Button>
                <Row gap={1}><Button size="sm" variant="ghost" icon={Pencil} onPress={() => guard(() => setForm(m))}>{t('Badlein')}</Button><Button size="sm" variant="ghost" icon={Power} onPress={() => void remove(m)}>{t('Hatayein')}</Button></Row>
              </View> : undefined}
            />
          </RowCard>
        )}
        empty={<EmptyState icon={UserCog} title={search ? t('Koi mechanic nahi mila') : t('Abhi koi mechanic nahi')} message={t('Pehle Staff me banda banayein, phir yahan use mechanic banayein — job card par chuna jata hai.')} />}
        fab={canEdit ? { icon: Plus, label: t('Mechanic'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <MechanicSheet mechanic={form === 'new' ? null : form} open={!!form} taken={all.map((m) => m.staffId)} onClose={() => setForm(null)} />
    </>
  );
}

function MechanicSheet({ mechanic, open, taken, onClose }: { mechanic: MechanicProfile | null; open: boolean; taken: string[]; onClose: () => void }) {
  const th = useTheme();
  const staff = useOfflineList<{ id: string; fullName: string; designation?: string | null }>('staff');
  const free = (staff.data ?? []).filter((s) => !taken.includes(s.id));
  const [staffId, setStaffId] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [years, setYears] = useState<number | null>(null);
  const save = useMutation({
    mutationFn: () => mechanicsApi.upsert({ staffId, specialization: skills, hourlyRate: rate ?? 0, commissionPct: pct ?? 0, yearsOfExperience: years ?? undefined }),
    onSuccess: () => { toast.success(t('Mechanic save ho gaya')); refreshAuto([MECHANIC_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  useEffect(() => {
    if (!open) return;
    setStaffId(mechanic?.staffId ?? ''); setSkills(mechanic?.specialization ?? []); setRate(mechanic?.hourlyRate || null); setPct(mechanic?.commissionPct || null); setYears(mechanic?.yearsOfExperience ?? null);
  }, [open, mechanic]);
  const pctBad = (pct ?? 0) > 100;
  const bad = !staffId || pctBad;
  return (
    <Sheet open={open} onClose={onClose} title={mechanic ? t('{{fullName}} — badlein', { fullName: mechanic.staff?.fullName }) : t('Mechanic banayein')} height={0.85}
      footer={<Button fullWidth size="lg" disabled={bad} loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!mechanic && (
          <Select label={t('Staff me se')} value={staffId} searchable onChange={setStaffId} placeholder={t('Chunein')} hint={!staff.isLoading && !free.length ? t('Pehle Staff me banda banayein') : t('Jo banda gaariyon par kaam karta hai')}
            options={free.map((s) => ({ value: s.id, label: `${s.fullName}${s.designation ? ` — ${s.designation}` : ''}` }))} />
        )}
        <Text size="sm" weight="medium" tone="secondary">{t('Hunar')}</Text>
        <ChipGroup wrap multiple value={skills} onChange={setSkills} options={SKILLS.map((x) => ({ value: x, label: x }))} />
        <MoneyInput label={t('Rate (ghanta)')} value={rate} onChangeValue={setRate} hint={t('Mazdoori ghante se ho to')} />
        <NumberInput label={t('Commission %')} value={pct} onChangeValue={setPct} error={pctBad ? t('100 se zyada nahi') : undefined} hint={t('Mazdoori ka hissa')} />
        <NumberInput label={t('Tajurba (saal)')} integer value={years} onChangeValue={setYears} placeholder="5" />
      </View>
    </Sheet>
  );
}
