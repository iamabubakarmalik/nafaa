/** Milk quality tests (web QualityTestsPage): fat, SNF, water and adulteration per test, pass or fail, and what was done about it. */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Beaker, CheckCircle2, ListChecks, Plus, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Checkbox, ChipGroup, EmptyState, Input, ListRow, ListTemplate, Row, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { farmersApi, qualityTestsApi, type QualityTest } from '../api';
import { ADULTERATION, DAIRY_KEYS, QUALITY, TEST_SOURCES, opt, refreshDairy } from '../meta';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';

type Tab = 'all' | 'failed' | 'passed';

export function QualityTestsScreen() {
  const th = useTheme();
  const canAdd = usePermission()(P.PURCHASES_CREATE);
  const { guard } = useDeskOnline('dairyDesk');
  const per = usePeriod('month');
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const range = { from: per.period.from, to: per.period.to };
  const listQ = useQuery({ queryKey: [DAIRY_KEYS.tests, range.from, range.to, search.trim()], queryFn: () => qualityTestsApi.all({ ...range, search: search.trim() || undefined }) });
  const sumQ = useQuery({ queryKey: [DAIRY_KEYS.tests, 'summary', range.from, range.to], queryFn: () => qualityTestsApi.totals(range) });
  const all = listQ.data ?? [];
  const rows = all.filter((x) => (tab === 'all' ? true : tab === 'failed' ? !x.passed : x.passed));
  const s = sumQ.data;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
      <StatRow tiles={[
        { icon: Beaker, tone: 'info', label: t('Sab test'), loading: sumQ.isLoading, value: String(s?.total ?? 0), hint: s?.avgFat ? `${t('Ausat fat')} ${s.avgFat.toFixed(1)}%` : undefined, onPress: () => setTab('all') },
        { icon: AlertTriangle, tone: (s?.adulteration ?? 0) > 0 ? 'warning' : 'neutral', label: t('Milawat mili'), loading: sumQ.isLoading, value: String(s?.adulteration ?? 0), hint: s?.avgSnf ? `${t('Ausat SNF')} ${s.avgSnf.toFixed(1)}%` : undefined },
      ]} />
      <StatRow tiles={[
        { icon: CheckCircle2, tone: 'success', label: t('Pass'), loading: sumQ.isLoading, value: String(s?.passed ?? 0), onPress: () => setTab('passed') },
        { icon: XCircle, tone: 'danger', label: t('Fail'), loading: sumQ.isLoading, value: String(s?.failed ?? 0), onPress: () => setTab('failed') },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'all', label: t('Sab') }, { value: 'failed', label: t('Fail') }, { value: 'passed', label: t('Pass') }]} />
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<QualityTest>
        title={t('Quality tests')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Test, gawala ya detail…') }}
        summary={header}
        data={rows}
        loading={listQ.isLoading}
        error={listQ.data ? null : listQ.error}
        onRetry={() => void listQ.refetch()}
        refreshing={listQ.isRefetching}
        onRefresh={() => { void listQ.refetch(); void sumQ.refetch(); }}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => (
          <RowCard>
            <ListRow icon={x.passed ? CheckCircle2 : XCircle} iconTone={x.passed ? 'success' : 'danger'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.sourceName || t(TEST_SOURCES[x.sourceType] ?? x.sourceType)}</Text>{x.quality && QUALITY[x.quality] && <Badge tone={QUALITY[x.quality].tone}>{t(QUALITY[x.quality].label)}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{`${t(TEST_SOURCES[x.sourceType] ?? x.sourceType)} · ${formatDateTime(x.testedAt)}`}</Text>
                <Text size="xs" tone="secondary" numberOfLines={2}>{[x.fatContent != null ? `fat ${x.fatContent}%` : '', x.snfContent != null ? `SNF ${x.snfContent}%` : '', x.waterContent != null ? `${t('Paani')} ${x.waterContent}%` : '', x.adulterationTypes?.length ? x.adulterationTypes.join(', ') : '', x.actionTaken ?? ''].filter(Boolean).join(' · ')}</Text>
              </View>}
              trailing={<Badge tone={x.passed ? 'success' : 'danger'}>{x.passed ? t('Pass') : t('Fail')}</Badge>} />
          </RowCard>
        )}
        empty={<EmptyState icon={ListChecks} title={t('Abhi koi test nahi')} message={t('Doodh ka fat, SNF aur milawat ka test yahan likhein.')} />}
        fab={canAdd ? { icon: Plus, label: t('Naya test'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <TestSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function TestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const blank = { sourceType: 'FARMER', sourceId: '', sourceName: '', fat: null as number | null, snf: null as number | null, water: null as number | null, temp: null as number | null, quality: '', action: '', notes: '' };
  const [f, setF] = useState(blank);
  const [types, setTypes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const farmersQ = useQuery({ queryKey: [DAIRY_KEYS.farmers, 'active'], queryFn: () => farmersApi.all({ active: true }), enabled: open, staleTime: 60_000 });
  useEffect(() => { if (open) { setF(blank); setTypes([]); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const error = f.fat != null && (f.fat < 0 || f.fat > 15) ? t('Fat 0 se 15') : f.snf != null && (f.snf < 0 || f.snf > 15) ? t('SNF 0 se 15') : f.water != null && (f.water < 0 || f.water > 100) ? t('Paani 0 se 100') : f.sourceType === 'FARMER' && !f.sourceId ? t('Gawala chunein')
    : f.fat == null && f.snf == null && f.water == null && !types.length && !f.quality ? t('Kam se kam fat, SNF ya milawat likhein') : '';
  const save = async () => {
    if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      const r = await qualityTestsApi.create({
        sourceType: f.sourceType, sourceId: f.sourceType === 'FARMER' ? f.sourceId || undefined : undefined, sourceName: opt(f.sourceName), fatContent: f.fat ?? undefined, snfContent: f.snf ?? undefined, waterContent: f.water ?? undefined,
        temperature: f.temp ?? undefined, adulterationDetected: types.length > 0, adulterationTypes: types, quality: opt(f.quality), actionTaken: opt(f.action), notes: opt(f.notes),
      } as Partial<QualityTest>);
      refreshDairy([DAIRY_KEYS.tests]);
      toast.success(r.passed ? t('Test pass likha') : t('Test fail likha'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('Naya quality test')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Kahan se')} value={f.sourceType} onChange={(v) => set('sourceType', v)} options={Object.entries(TEST_SOURCES).map(([value, label]) => ({ value, label: t(label) }))} />
        {f.sourceType === 'FARMER'
          ? <Select label={t('Gawala')} value={f.sourceId} onChange={(v) => set('sourceId', v)} searchable placeholder={t('Chunein…')} options={(farmersQ.data ?? []).map((x) => ({ value: x.id, label: `${x.name}${x.village ? ` — ${x.village}` : ''}` }))} />
          : <Input label={t('Naam / detail')} value={f.sourceName} onChangeText={(v) => set('sourceName', v)} placeholder={t('Tanki 1, customer ka naam')} />}
        <NumberInput label={t('Fat %')} value={f.fat} onChangeValue={(v) => set('fat', v)} />
        <NumberInput label={t('SNF %')} value={f.snf} onChangeValue={(v) => set('snf', v)} />
        <NumberInput label={t('Paani %')} value={f.water} onChangeValue={(v) => set('water', v)} />
        <NumberInput label={t('Temp °C')} value={f.temp} onChangeValue={(v) => set('temp', v)} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Milawat')}</Text>
        {ADULTERATION.map((a) => <Checkbox key={a} value={types.includes(a)} onChange={(on) => setTypes((x) => (on ? [...x, a] : x.filter((y) => y !== a)))} label={t(a)} />)}
        <Select label={t('Grade')} value={f.quality} onChange={(v) => set('quality', v)} options={[{ value: '', label: '—' }, ...Object.entries(QUALITY).map(([value, x]) => ({ value, label: t(x.label) }))]} />
        <Input label={t('Kya kiya')} value={f.action} onChangeText={(v) => set('action', v)} placeholder={t('Rate kam kiya, doodh wapas')} />
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set('notes', v)} />
      </View>
    </Sheet>
  );
}
