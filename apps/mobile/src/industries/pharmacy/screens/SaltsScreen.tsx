/**
 * Salts (generic names; web SaltsPage): every formula the shop stocks, the
 * brands that carry it with price and shelf stock (so the counter can offer a
 * cheaper or available substitute), its schedule, and which salts clash with
 * each other. Salts are switched off, never deleted. Needs the server.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Baby, Beaker, Pencil, Plus, Power, Trash2, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { REGISTER_CLASSES } from '@nafaa/core/industries/pharmacy';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, EmptyState, Input, ListRow, ListTemplate, Select, Sheet, Switch, SwipeRow, Text, TextArea, confirm, toast, useTheme, type SwipeAction } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { interactionsApi, saltsApi, type DrugInteraction, type Salt } from '../api';
import { SALTS_KEY, SCHEDULE_META, SEVERITY, scheduleLabel } from '../meta';

type Tab = 'all' | 'rx' | 'register' | 'off' | 'clash';
const isRegister = (s: Salt) => s.isNarcotic || REGISTER_CLASSES.includes(s.scheduleClass);
const opt = (v: string) => v.trim() || undefined;

function SaltSheet({ salt, onClose }: { salt: Salt | null | 'new'; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const edit = salt && salt !== 'new' ? salt : null;
  const [d, setD] = useState({
    name: edit?.name ?? '', genericName: edit?.genericName ?? '', category: edit?.category ?? '', standardDose: edit?.standardDose ?? '', maxDailyDose: edit?.maxDailyDose ?? '',
    scheduleClass: edit?.scheduleClass ?? 'OTC', requiresPrescription: edit?.requiresPrescription ?? false, isNarcotic: edit?.isNarcotic ?? false,
    isPregnancySafe: edit?.isPregnancySafe ?? false, isPediatricSafe: edit?.isPediatricSafe ?? false, sideEffects: edit?.sideEffects ?? '', warnings: edit?.warnings ?? '',
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: d.name.trim(), genericName: opt(d.genericName), category: opt(d.category), standardDose: opt(d.standardDose), maxDailyDose: opt(d.maxDailyDose),
        scheduleClass: d.scheduleClass, requiresPrescription: d.requiresPrescription || d.isNarcotic, isNarcotic: d.isNarcotic,
        isPregnancySafe: d.isPregnancySafe, isPediatricSafe: d.isPediatricSafe, sideEffects: opt(d.sideEffects), warnings: opt(d.warnings),
      };
      return edit ? saltsApi.update(edit.id, body) : saltsApi.create(body);
    },
    onSuccess: () => { toast.success(edit ? t('Salt update ho gaya') : t('Salt ban gaya')); void qc.invalidateQueries({ queryKey: [SALTS_KEY] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={!!salt} onClose={onClose} height={0.92} title={edit ? t('{{name}} — badlein', { name: edit.name }) : t('Naya salt')} description={t('Generic naam — jaise Paracetamol')}
      footer={<Button fullWidth loading={save.isPending} onPress={() => { setTried(true); if (d.name.trim().length < 2) return; save.mutate(); }}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={d.name} onChangeText={(v) => set('name', v)} placeholder="Paracetamol" error={tried && d.name.trim().length < 2 ? t('Naam likhein') : undefined} />
        <Input label={t('Doosra naam')} value={d.genericName} onChangeText={(v) => set('genericName', v)} placeholder="Acetaminophen" />
        <Input label={t('Group')} value={d.category} onChangeText={(v) => set('category', v)} placeholder={t('Dard, Antibiotic…')} />
        <Select label={t('Schedule')} value={d.scheduleClass} onChange={(v) => set('scheduleClass', v)} options={Object.keys(SCHEDULE_META).map((k) => ({ value: k, label: scheduleLabel(k), description: t(SCHEDULE_META[k].hint) }))} />
        <Input label={t('Aam dose')} value={d.standardDose} onChangeText={(v) => set('standardDose', v)} placeholder={t('500mg 3 dafa')} />
        <Input label={t('Din me zyada se zyada')} value={d.maxDailyDose} onChangeText={(v) => set('maxDailyDose', v)} placeholder="4g" />
        <Switch value={d.requiresPrescription} onChange={(v) => set('requiresPrescription', v)} label={t('Nuskhe par')} description="Rx" />
        <Switch value={d.isNarcotic} onChange={(v) => set('isNarcotic', v)} label={t('Narcotic / register')} description={t('Har sale register me')} />
        <Switch value={d.isPregnancySafe} onChange={(v) => set('isPregnancySafe', v)} label={t('Hamal me theek')} />
        <Switch value={d.isPediatricSafe} onChange={(v) => set('isPediatricSafe', v)} label={t('Bachon ke liye theek')} />
        <TextArea label={t('Side effects')} value={d.sideEffects} onChangeText={(v) => set('sideEffects', v)} />
        <TextArea label={t('Ehtiyat')} value={d.warnings} onChangeText={(v) => set('warnings', v)} />
      </View>
    </Sheet>
  );
}

function BrandsSheet({ salt, onClose }: { salt: Salt | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['pharmacy-salt-products', salt?.id], queryFn: () => saltsApi.productsBySalt(salt!.id), enabled: !!salt });
  const rows = [...(q.data ?? [])].filter((r) => r.product.isActive).sort((a, b) => Number(b.product.stock > 0) - Number(a.product.stock > 0) || a.product.price - b.product.price);
  return (
    <Sheet open={!!salt} onClose={onClose} height={0.8} title={t('{{name}} — brands', { name: salt?.name ?? '' })} description={t('Isi formula ki dawaiyan, sasti aur shelf wali pehle')}>
      {q.isLoading ? <Text tone="muted">{t('Dhoond rahe hain…')}</Text> : rows.length === 0 ? <Text tone="muted">{t('Kisi dawai me ye salt nahi jora — dawai ke Formula step me jorein')}</Text> : (
        <Card flush>{rows.map((r, i) => (
          <ListRow key={r.product.id} divider={i < rows.length - 1} title={r.product.name} subtitle={[r.strength, r.product.brand?.name].filter(Boolean).join(' · ')}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={r.product.price} weight="bold" /><Text size="2xs" tone={r.product.stock > 0 ? 'success' : 'danger'} ltr>{r.product.stock > 0 ? t('{{value}} stock', { value: Number(r.product.stock.toFixed(2)) }) : t('Stock nahi')}</Text></View>}
            onPress={() => { onClose(); router.push(`/products/${r.product.id}` as never); }} />
        ))}</Card>
      )}
    </Sheet>
  );
}

function ClashSheet({ open, salts, onClose }: { open: boolean; salts: Salt[]; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [d, setD] = useState({ saltAId: '', saltBId: '', severity: 'MODERATE', description: '', management: '' });
  const options = salts.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }));
  const ok = d.saltAId && d.saltBId && d.saltAId !== d.saltBId && d.description.trim().length >= 3;
  const save = useMutation({
    mutationFn: () => interactionsApi.create({ ...d, description: d.description.trim(), management: opt(d.management) }),
    onSuccess: () => { toast.success(t('Asar likh diya — nuskhe par warning aayegi')); void qc.invalidateQueries({ queryKey: ['pharmacy-interactions'] }); setD({ saltAId: '', saltBId: '', severity: 'MODERATE', description: '', management: '' }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} height={0.85} title={t('Do salts ka aapas me asar')} description={t('Nuskhe me dono hon to pharmacist ko warning dikhegi')}
      footer={<Button fullWidth disabled={!ok} loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Pehla salt')} value={d.saltAId} onChange={(v) => setD({ ...d, saltAId: v })} options={options} />
        <Select label={t('Doosra salt')} value={d.saltBId} onChange={(v) => setD({ ...d, saltBId: v })} options={options} error={d.saltAId && d.saltAId === d.saltBId ? t('Do alag salt chunein') : undefined} />
        <ChipGroup value={d.severity} onChange={(v) => setD({ ...d, severity: v })} options={Object.entries(SEVERITY).map(([value, v]) => ({ value, label: t(v.label) }))} />
        <TextArea label={t('Kya hota hai')} value={d.description} onChangeText={(v) => setD({ ...d, description: v })} placeholder={t('Khoon patla hone ka khatra badhta hai')} />
        <TextArea label={t('Kya karein')} value={d.management} onChangeText={(v) => setD({ ...d, management: v })} placeholder={t('Doctor se poochein, dose kam')} />
      </View>
    </Sheet>
  );
}

export function SaltsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const { guard } = useDeskOnline('pharmacyDesk');
  const canEdit = can(P.PRODUCTS_EDIT);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Salt | null | 'new'>(null);
  const [brands, setBrands] = useState<Salt | null>(null);
  const [clash, setClash] = useState(false);

  const saltsQ = useQuery({ queryKey: [SALTS_KEY, 'all'], queryFn: () => saltsApi.list(), staleTime: 60_000 });
  const clashesQ = useQuery({ queryKey: ['pharmacy-interactions', 'all'], queryFn: () => interactionsApi.list() });
  const all = saltsQ.data ?? [];
  const clashes = clashesQ.data ?? [];
  const live = all.filter((s) => s.isActive);
  const counts = { all: live.length, rx: live.filter((s) => s.requiresPrescription).length, register: live.filter(isRegister).length, off: all.length - live.length, clash: clashes.length };
  const needle = search.trim().toLowerCase();
  const shown = useMemo(() => all
    .filter((s) => (tab === 'off' ? !s.isActive : s.isActive && (tab === 'rx' ? s.requiresPrescription : tab === 'register' ? isRegister(s) : true)))
    .filter((s) => !needle || [s.name, s.genericName, s.code].some((v) => (v ?? '').toLowerCase().includes(needle)))
    .sort((a, b) => (b._count?.productSalts ?? 0) - (a._count?.productSalts ?? 0) || a.name.localeCompare(b.name)), [all, tab, needle]);

  const toggle = useMutation({
    mutationFn: (s: Salt) => saltsApi.update(s.id, { isActive: !s.isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [SALTS_KEY] }),
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const dropClash = async (c: DrugInteraction) => {
    if (!(await confirm({ title: t('Ye asar hatayein?'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { await interactionsApi.remove(c.id); void qc.invalidateQueries({ queryKey: ['pharmacy-interactions'] }); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
  };

  return (
    <>
      <ListTemplate<Salt | DrugInteraction>
        title={t('Salts / formula')}
        grouped={false}
        search={tab !== 'clash' ? { value: search, onChange: setSearch, placeholder: t('Salt ka naam ya doosra naam…') } : undefined}
        summary={
          <View style={{ gap: th.space(2) }}>
            <ChipGroup value={tab} onChange={setTab} style={{ marginHorizontal: -th.space(4) }}
              options={[{ value: 'all', label: t('Sab'), count: counts.all }, { value: 'rx', label: t('Nuskhe wale'), count: counts.rx }, { value: 'register', label: t('Register'), count: counts.register },
                { value: 'clash', label: t('Aapas me asar'), count: counts.clash }, { value: 'off', label: t('Band'), count: counts.off }]} />
            <OfflineNote feature="pharmacyDesk" />
            <CachedNote query={saltsQ} />
          </View>
        }
        data={tab === 'clash' ? clashes : shown}
        loading={saltsQ.isLoading}
        error={!saltsQ.data ? saltsQ.error : undefined}
        onRetry={() => void saltsQ.refetch()}
        refreshing={saltsQ.isRefetching}
        onRefresh={() => { void saltsQ.refetch(); void clashesQ.refetch(); }}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => {
          if (tab === 'clash') {
            const c = item as DrugInteraction;
            const sev = SEVERITY[c.severity];
            return (
              <SwipeRow end={canEdit ? [{ icon: Trash2, label: t('Hatayein'), tone: 'danger', onPress: () => guard(() => void dropClash(c)) }] : []}>
                <ListRow icon={Zap} iconTone={sev.tone} title={`${c.saltA?.name ?? ''} + ${c.saltB?.name ?? ''}`} subtitle={`${c.description}${c.management ? ` — ${c.management}` : ''}`} trailing={<Badge tone={sev.tone}>{t(sev.label)}</Badge>} />
              </SwipeRow>
            );
          }
          const s = item as Salt;
          const end: SwipeAction[] = canEdit ? [
            { icon: Pencil, label: t('Badlein'), tone: 'brand', onPress: () => guard(() => setEditing(s)) },
            { icon: Power, label: s.isActive ? t('Band karein') : t('Chalu karein'), tone: 'danger', onPress: () => guard(() => toggle.mutate(s)) },
          ] : [];
          return (
            <SwipeRow end={end}>
              <ListRow icon={Beaker} iconTone={isRegister(s) ? 'danger' : s.requiresPrescription ? 'warning' : 'brand'} title={s.name}
                subtitle={[s.genericName, s.standardDose, s.isPediatricSafe ? t('bachon ke liye') : ''].filter(Boolean).join(' · ') || undefined}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Badge tone={SCHEDULE_META[s.scheduleClass]?.tone ?? 'neutral'}>{scheduleLabel(s.scheduleClass)}</Badge>
                  <Text size="2xs" tone="muted">{t('{{count}} brands', { count: s._count?.productSalts ?? 0 })}</Text>
                  {s.isPediatricSafe ? <Baby size={12} color={th.colors.success.text} /> : null}
                </View>}
                onPress={() => setBrands(s)} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={tab === 'clash' ? Zap : Beaker} title={tab === 'clash' ? t('Abhi kuch nahi likha') : needle ? t('Is filter me koi salt nahi') : t('Abhi koi salt nahi')}
          message={tab === 'clash' ? t('Jaise: Warfarin + Aspirin — khoon patla hone ka khatra.') : t('Dawai banate waqt Formula step me salt likhein — yahan khud aa jayega.')} />}
        fab={canEdit ? { icon: Plus, label: tab === 'clash' ? t('Asar likhein') : t('Naya salt'), onPress: () => guard(() => (tab === 'clash' ? setClash(true) : setEditing('new'))) } : undefined}
      />
      {editing ? <SaltSheet salt={editing} onClose={() => setEditing(null)} /> : null}
      <BrandsSheet salt={brands} onClose={() => setBrands(null)} />
      <ClashSheet open={clash} salts={all} onClose={() => setClash(false)} />
    </>
  );
}
