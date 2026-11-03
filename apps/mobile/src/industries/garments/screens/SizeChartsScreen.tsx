/**
 * Size charts (web SizeChartsPage): the S/M/L table of each garment type for
 * customers who ask "mera size kya hoga". A ready template fills a new chart
 * in one tap; rows and columns are edited in the sheet. Charts are switched
 * off, never deleted. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Star, Table2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { CHART_TEMPLATES } from '@nafaa/core/industries/garments';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Select, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { sizeChartsApi, type SizeChart, type SizeRow } from '../api';
import { GARMENT_TYPES, GENDERS, MEASURE_LABELS, SIZE_CHART_KEY, genderLabel, garmentLabel, measureLabel, opt, refreshGarments } from '../meta';

const colsOf = (rows: SizeRow[]) => [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== 'size')))];

function ChartForm({ item, seed, onClose }: { item: SizeChart | null; seed?: (typeof CHART_TEMPLATES)[number]; onClose: () => void }) {
  const th = useTheme();
  const [name, setName] = useState(item?.name ?? seed?.name ?? '');
  const [type, setType] = useState(item?.categoryType ?? seed?.categoryType ?? '');
  const [gender, setGender] = useState(item?.gender ?? seed?.gender ?? '');
  const [unit, setUnit] = useState<'INCH' | 'CM'>(item?.unit ?? 'INCH');
  const [desc, setDesc] = useState(item?.description ?? '');
  const [rows, setRows] = useState<SizeRow[]>(item?.rows ?? seed?.rows ?? [{ size: 'S' }, { size: 'M' }, { size: 'L' }]);
  const [cols, setCols] = useState<string[]>(item ? colsOf(item.rows) : seed?.cols ?? ['chest', 'kurtaLength']);
  const [isDefault, setDefault] = useState(item?.isDefault ?? false);
  const [active, setActive] = useState(item?.isActive ?? true);
  const setCell = (i: number, key: string, v: string) => setRows(rows.map((r, x) => (x === i ? { ...r, [key]: key === 'size' ? v : v === '' ? '' : Number(v) || 0 } : r)));
  const save = useMutation({
    mutationFn: () => {
      const clean = rows.filter((r) => String(r.size).trim()).map((r) => ({ size: String(r.size).trim(), ...Object.fromEntries(cols.filter((c) => r[c] !== '' && r[c] != null).map((c) => [c, r[c]])) })) as SizeRow[];
      const body = { name: name.trim(), categoryType: opt(type), gender: opt(gender), unit, description: opt(desc), rows: clean, isDefault, isActive: active };
      return item ? sizeChartsApi.update(item.id, body) : sizeChartsApi.create(body);
    },
    onSuccess: () => { toast.success(t('Save ho gaya')); refreshGarments([SIZE_CHART_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open onClose={onClose} title={item ? t('Edit size chart') : t('Naya size chart')} height={0.94}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!name.trim() || !rows.length} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} />
        <Select label={t('Kapre ki type')} value={type} searchable onChange={setType} options={[{ value: '', label: '—' }, ...GARMENT_TYPES.map((g) => ({ value: g.value, label: t(g.label) }))]} />
        <Select label={t('Kis ke liye')} value={gender} onChange={setGender} options={[{ value: '', label: '—' }, ...GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))]} />
        <Segmented value={unit} onChange={setUnit} options={[{ value: 'INCH', label: t('Inch') }, { value: 'CM', label: 'cm' }]} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Columns')}</Text>
        <ChipGroup multiple wrap value={cols} onChange={setCols} options={Object.keys(MEASURE_LABELS).map((k) => ({ value: k, label: measureLabel(k) }))} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ gap: th.space(2) }}>
            <Row gap={2}>
              <Text size="xs" weight="bold" style={{ width: 90 }}>{t('Size')}</Text>
              {cols.map((c) => <Text key={c} size="xs" weight="bold" style={{ width: 84 }} numberOfLines={1}>{measureLabel(c)}</Text>)}
            </Row>
            {rows.map((r, i) => (
              <Row key={i} gap={2} style={{ alignItems: 'center' }}>
                <Input containerStyle={{ width: 90 }} size="sm" value={String(r.size ?? '')} onChangeText={(v) => setCell(i, 'size', v)} />
                {cols.map((c) => <Input key={c} containerStyle={{ width: 84 }} size="sm" keyboardType="decimal-pad" value={r[c] == null ? '' : String(r[c])} onChangeText={(v) => setCell(i, c, v)} />)}
                <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => setRows(rows.filter((_, x) => x !== i))} />
              </Row>
            ))}
          </View>
        </ScrollView>
        <Button variant="soft" icon={Plus} onPress={() => setRows([...rows, { size: '' }])}>{t('Row jorein')}</Button>
        <TextArea label={t('Tafseel')} value={desc} onChangeText={setDesc} />
        <Switch value={isDefault} onChange={setDefault} label={t('Is type ka default chart')} />
        <Switch value={active} onChange={setActive} label={t('Chaalu hai')} />
      </View>
    </Sheet>
  );
}

export function SizeChartsScreen() {
  const th = useTheme();
  const can = usePermission();
  const edit = can(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('garmentsDesk');
  const [form, setForm] = useState<{ item: SizeChart | null; seed?: (typeof CHART_TEMPLATES)[number] } | null>(null);
  const [tpl, setTpl] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: [SIZE_CHART_KEY], queryFn: () => sizeChartsApi.list() });
  const off = useMutation({ mutationFn: (c: SizeChart) => sizeChartsApi.remove(c.id), onSuccess: () => { toast.success(t('Chart band ho gaya')); refreshGarments([SIZE_CHART_KEY]); }, onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))) });
  return (
    <>
      <ListTemplate<SizeChart> title={t('Size charts')} data={list.data ?? []} loading={list.isLoading} error={list.error} onRetry={() => void list.refetch()}
        refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(c) => c.id} summary={<OfflineNote feature="garmentsDesk" />}
        empty={<EmptyState icon={Table2} title={t('Koi size chart nahi')} action={edit ? <Button icon={Plus} onPress={() => setTpl(true)}>{t('Template se banayein')}</Button> : undefined} />}
        renderItem={({ item: c }) => (
          <View>
            <ListRow divider icon={Table2} iconTone={c.isActive ? 'brand' : 'neutral'} title={c.name}
              subtitle={[c.categoryType ? garmentLabel(c.categoryType) : null, c.gender ? genderLabel(c.gender) : null, c.unit === 'CM' ? 'cm' : t('Inch')].filter(Boolean).join(' · ')}
              trailing={c.isDefault ? <Star size={16} color={th.colors.warning.text} /> : undefined} chevron onPress={() => setOpen(open === c.id ? null : c.id)}
              onLongPress={edit ? () => guard(() => setForm({ item: c })) : undefined} />
            {open === c.id && (
              <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: th.space(2) }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ gap: 4 }}>
                    <Row gap={3}><Text size="xs" weight="bold" style={{ width: 64 }}>{t('Size')}</Text>{colsOf(c.rows).map((k) => <Text key={k} size="xs" weight="bold" style={{ width: 80 }} numberOfLines={1}>{measureLabel(k)}</Text>)}</Row>
                    {c.rows.map((r, i) => <Row key={i} gap={3}><Text size="sm" weight="semibold" style={{ width: 64 }}>{r.size}</Text>{colsOf(c.rows).map((k) => <Text key={k} size="sm" style={{ width: 80 }} ltr>{r[k] ?? '—'}</Text>)}</Row>)}
                  </View>
                </ScrollView>
                {edit && <Row gap={2}><Button size="sm" variant="soft" onPress={() => guard(() => setForm({ item: c }))}>{t('Edit')}</Button><Button size="sm" variant="ghost" onPress={() => guard(() => off.mutate(c))}>{t('Band karein')}</Button></Row>}
              </View>
            )}
          </View>
        )}
        fab={edit ? { icon: Plus, label: t('New'), onPress: () => guard(() => setTpl(true)) } : undefined} />
      <Sheet open={tpl} onClose={() => setTpl(false)} title={t('Naya size chart')}>
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" tone="muted">{t('Ready template se shuru karein ya khali chart banayein.')}</Text>
          {CHART_TEMPLATES.map((x) => <ListRow key={x.name} dense icon={Table2} title={t(x.name)} subtitle={`${garmentLabel(x.categoryType)} · ${genderLabel(x.gender)}`} chevron onPress={() => { setTpl(false); setForm({ item: null, seed: x }); }} />)}
          <Button variant="soft" onPress={() => { setTpl(false); setForm({ item: null }); }}>{t('Khali chart')}</Button>
        </View>
      </Sheet>
      {form && <ChartForm key={form.item?.id ?? form.seed?.name ?? 'new'} item={form.item} seed={form.seed} onClose={() => setForm(null)} />}
    </>
  );
}
