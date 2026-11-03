/**
 * Size conversion charts (web ShoeSizeChartsPage): PK / EU / US / cm side by
 * side so staff can tell a customer "Bata 8 = EU 42". The standard tables fill
 * a new chart in one tap; charts are switched off, never deleted. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Ruler, Trash2 } from 'lucide-react-native';
import { CONVERSION } from '@nafaa/core/industries/shoe';
import { cleanChartRows } from '@nafaa/core/industries/shoe';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { shoeSizeChartsApi, type ChartRow, type ShoeSizeChart } from '../api';
import { CHART_KEY, GENDERS, genderLabel, opt, refreshShoe } from '../meta';

type Std = keyof typeof CONVERSION;
const STD: Array<{ value: Std; label: string; gender: string }> = [
  { value: 'men', label: msg('Gents'), gender: 'MEN' }, { value: 'women', label: msg('Ladies'), gender: 'WOMEN' }, { value: 'kids', label: msg('Bachay'), gender: 'BOYS' },
];
const COLS: Array<{ key: string; label: string }> = [{ key: 'pk', label: msg('PK / UK') }, { key: 'eu', label: msg('EU') }, { key: 'us', label: msg('US') }, { key: 'cm', label: msg('cm') }];

function ChartSheet({ chart, onClose }: { chart: ShoeSizeChart | null; onClose: () => void }) {
  const th = useTheme();
  const [name, setName] = useState(chart?.name ?? '');
  const [gender, setGender] = useState(chart?.gender ?? 'MEN');
  const [notes, setNotes] = useState(chart?.notes ?? '');
  const [rows, setRows] = useState<ChartRow[]>(chart?.mappings?.length ? chart.mappings : [{ pk: '', eu: '', us: '', cm: '' }]);
  const filled = cleanChartRows(rows);
  const save = useMutation({
    mutationFn: () => { const body = { name: name.trim(), gender, notes: opt(notes), mappings: filled }; return chart ? shoeSizeChartsApi.update(chart.id, body) : shoeSizeChartsApi.create(body); },
    onSuccess: () => { toast.success(t('Save ho gaya')); refreshShoe([CHART_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const fill = (k: Std) => { const s = STD.find((x) => x.value === k)!; setRows(CONVERSION[k].map((r) => ({ ...r }))); setGender(s.gender); if (!name.trim()) setName(`${t(s.label)} — ${t('size chart')}`); };
  return (
    <Sheet open onClose={onClose} title={chart ? t('Edit size chart') : t('Naya size chart')} height={0.94}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={name.trim().length < 2 || !filled.length} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} />
        <ChipGroup wrap value={gender} onChange={setGender} options={GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Standard table bhar dein')}</Text>
        <Row gap={2}>{STD.map((s) => <Button key={s.value} size="sm" variant="soft" onPress={() => fill(s.value)}>{t(s.label)}</Button>)}</Row>
        <Row gap={2}>{COLS.map((c) => <Text key={c.key} size="xs" weight="bold" style={{ flex: 1 }} align="center">{t(c.label)}</Text>)}<View style={{ width: 36 }} /></Row>
        {rows.map((r, i) => (
          <Row key={i} gap={2} style={{ alignItems: 'center' }}>
            {COLS.map((c) => <Input key={c.key} containerStyle={{ flex: 1 }} size="sm" value={r[c.key] ?? ''} onChangeText={(v) => setRows(rows.map((x, k) => (k === i ? { ...x, [c.key]: v } : x)))} ltr />)}
            <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => setRows(rows.filter((_, k) => k !== i))} />
          </Row>
        ))}
        <Button variant="soft" icon={Plus} onPress={() => setRows([...rows, { pk: '', eu: '', us: '', cm: '' }])}>{t('Row jorein')}</Button>
        <TextArea label={t('Note')} value={notes} onChangeText={setNotes} />
      </View>
    </Sheet>
  );
}

export function ShoeSizeChartsScreen() {
  const th = useTheme();
  const can = usePermission();
  const edit = can(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('shoeDesk');
  const [form, setForm] = useState<{ chart: ShoeSizeChart | null } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: [CHART_KEY], queryFn: () => shoeSizeChartsApi.list() });
  const off = useMutation({ mutationFn: (c: ShoeSizeChart) => shoeSizeChartsApi.deactivate(c.id), onSuccess: () => { toast.success(t('Chart band ho gaya')); refreshShoe([CHART_KEY]); }, onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))) });
  return (
    <>
      <ListTemplate<ShoeSizeChart> title={t('Size charts')} data={(list.data ?? []).filter((c) => c.isActive)} loading={list.isLoading} error={list.error} onRetry={() => void list.refetch()}
        refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(c) => c.id} summary={<OfflineNote feature="shoeDesk" />}
        empty={<EmptyState icon={Ruler} title={t('Koi size chart nahi')} />}
        renderItem={({ item: c }) => (
          <View>
            <ListRow divider icon={Ruler} iconTone="brand" title={c.name} subtitle={`${c.gender ? genderLabel(c.gender) : ''}${c.mappings.length ? ` · ${t('{{n}} size', { n: c.mappings.length })}` : ''}`} chevron onPress={() => setOpen(open === c.id ? null : c.id)} />
            {open === c.id && (
              <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: th.space(1) }}>
                <Row gap={2}>{COLS.map((k) => <Text key={k.key} size="xs" weight="bold" style={{ flex: 1 }} align="center">{t(k.label)}</Text>)}</Row>
                {c.mappings.map((r, i) => <Row key={i} gap={2}>{COLS.map((k) => <Text key={k.key} size="sm" style={{ flex: 1 }} align="center" ltr>{r[k.key] || '—'}</Text>)}</Row>)}
                {!!c.notes && <Text size="xs" tone="muted">{c.notes}</Text>}
                {edit && <Row gap={2}><Button size="sm" variant="soft" onPress={() => guard(() => setForm({ chart: c }))}>{t('Edit')}</Button><Button size="sm" variant="ghost" onPress={() => guard(() => off.mutate(c))}>{t('Band karein')}</Button></Row>}
              </View>
            )}
          </View>
        )}
        fab={edit ? { icon: Plus, label: t('New'), onPress: () => guard(() => setForm({ chart: null })) } : undefined} />
      {form && <ChartSheet key={form.chart?.id ?? 'new'} chart={form.chart} onClose={() => setForm(null)} />}
    </>
  );
}
