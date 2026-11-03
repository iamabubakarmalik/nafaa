/**
 * Slaughter log, halal (web SlaughterLogPage): each zibah / dressing with the live
 * and dressed weight, method, halal certificate and vet check. The live item
 * leaves stock and the meat comes in at the same cost; offal can go to its own
 * items. Analytics shows the halal compliance and the dressing yield.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Plus, Scale, ShieldCheck, Stethoscope, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { cutsTooHeavy, dressingPct } from '@nafaa/core/industries/meat';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DatePicker, DetailRow, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Select, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { liveAnimalsApi, slaughterApi, type LiveAnimal, type SlaughterInput, type SlaughterLog } from '../api';
import { ANIMALS, MEAT_KEYS, SLAUGHTER_METHODS, animalOf, animalText, kg, opt, pct, refreshMeat } from '../meta';

export function SlaughterScreen() {
  const th = useTheme();
  const { animal: animalParam } = useLocalSearchParams<{ animal?: string }>();
  const canWrite = usePermission()(P.PRODUCTS_EDIT) || usePermission()(P.PRODUCTS_CREATE);
  const { guard } = useDeskOnline('meatDesk');
  const per = usePeriod('month');
  const [view, setView] = useState<'log' | 'analytics'>('log');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (animalParam && canWrite) setAdding(true); }, [animalParam, canWrite]);
  const range = { from: per.period.from, to: per.period.to };
  const q = useQuery({ queryKey: [MEAT_KEYS.slaughter, type, range.from, range.to], queryFn: () => slaughterApi.list({ animalType: type || undefined, ...range }) });
  const stats = useQuery({ queryKey: [MEAT_KEYS.slaughter, 'halal', range.from, range.to], queryFn: () => slaughterApi.halalCompliance(range.from, range.to) });
  const s = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((x) => !s || [x.slaughterNumber, x.animalTag, x.slaughteredBy].join(' ').toLowerCase().includes(s));
  const h = stats.data;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
      <StatRow tiles={[
        { icon: ShieldCheck, tone: 'info', label: t('Zibah'), loading: stats.isLoading, value: String(h?.total ?? 0), hint: `${t('Zinda wazan')} ${kg(h?.liveKg)}` },
        { icon: Scale, tone: 'success', label: t('Yield'), loading: stats.isLoading, value: pct(h?.yieldPct), hint: kg(h?.dressedKg) },
      ]} />
      <StatRow tiles={[
        { icon: BadgeCheck, tone: 'success', label: t('Halal'), loading: stats.isLoading, value: pct(h?.halalPct), hint: t('Certificate ke saath') + ' ' + pct(h?.certPct) },
        { icon: Stethoscope, tone: 'info', label: t('Vet check'), loading: stats.isLoading, value: pct(h?.vetPct) },
      ]} />
      <Segmented value={view} onChange={setView} options={[{ value: 'log', label: t('Zibah log') }, { value: 'analytics', label: t('Analytics') }]} />
      <ChipGroup value={type} onChange={setType} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab janwar') }, ...ANIMALS.map((a) => ({ value: a.value, label: `${a.emoji} ${t(a.label)}` }))]} />
      <OfflineNote feature="meatDesk" />
      {view === 'analytics' && h && (
        <Card flush>
          <DetailRow label={t('Zibah')} value={String(h.total)} />
          <DetailRow label={t('Halal zabiha')} value={`${h.halal} · ${pct(h.halalPct)}`} />
          <DetailRow label={t('Halal certificate')} value={`${h.withCert} · ${pct(h.certPct)}`} />
          <DetailRow label={t('Vet ne dekha')} value={`${h.withVet} · ${pct(h.vetPct)}`} />
          <DetailRow label={t('Zinda wazan (kg)')} value={kg(h.liveKg)} />
          <DetailRow label={t('Gosht (kg)')} value={kg(h.dressedKg)} last />
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<SlaughterLog>
        title={t('Slaughter (halal)')}
        grouped={false}
        search={view === 'log' ? { value: search, onChange: setSearch, placeholder: t('Number, tag ya kis ne zibah kiya…') } : undefined}
        summary={header}
        data={view === 'log' ? rows : []}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => { void q.refetch(); void stats.refetch(); }}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => (
          <RowCard>
            <ListRow leading={<Text style={{ fontSize: 26 }}>{animalOf(x.animalType).emoji}</Text>}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.slaughterNumber}</Text>{x.isHalal && <Badge tone="success">{t('Halal')}</Badge>}{x.vetInspection && <Badge tone="info">{t('Vet check')}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" numberOfLines={1}>{[animalText(x.animalType), x.animalTag, formatDateTime(x.slaughterDate)].filter(Boolean).join(' · ')}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{`${kg(x.liveWeightKg)} → ${kg(x.dressedWeightKg)}${x.slaughteredBy ? ` · ${x.slaughteredBy}` : ''}`}</Text></View>}
              trailing={x.yieldPct ? <Text size="sm" weight="semibold">{pct(x.yieldPct)}</Text> : undefined}
              chevron onPress={() => setOpen(x.id)} />
          </RowCard>
        )}
        empty={view === 'log' ? <EmptyState icon={ShieldCheck} title={t('Abhi koi zibah nahi')} message={t('Zinda janwar ya murgi zibah karne par yahan likhein — gosht stock me aa jata hai.')} /> : undefined}
        fab={canWrite ? { icon: Plus, label: t('Zibah / dressing'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <NewSlaughter open={adding} animalId={animalParam ?? null} onClose={() => setAdding(false)} />
      <DetailSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}

function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [MEAT_KEYS.slaughter, 'one', id], queryFn: () => slaughterApi.getOne(id!), enabled: !!id });
  const x = q.data;
  return (
    <Sheet open={!!id} onClose={onClose} height={0.85} title={x?.slaughterNumber} description={x ? [animalText(x.animalType), x.animalTag].filter(Boolean).join(' · ') : undefined}>
      {x && (
        <View style={{ gap: th.space(3) }}>
          <Card flush>
            <DetailRow label={t('Tareekh')} value={formatDateTime(x.slaughterDate)} />
            <DetailRow label={t('Zinda wazan (kg)')} value={kg(x.liveWeightKg)} />
            <DetailRow label={t('Gosht (kg)')} value={kg(x.dressedWeightKg)} />
            <DetailRow label={t('Yield')} value={pct(x.yieldPct)} />
            <DetailRow label={t('Tareeqa')} value={t(SLAUGHTER_METHODS.find((m) => m.value === x.slaughterMethod)?.label ?? x.slaughterMethod)} />
            {!!x.slaughteredBy && <DetailRow label={t('Kis ne zibah kiya')} value={x.slaughteredBy} />}
            <DetailRow label={t('Halal')} value={x.isHalal ? t('Haan') : t('Nahi')} />
            {!!x.halalCertNumber && <DetailRow label={t('Halal certificate #')} value={x.halalCertNumber} />}
            <DetailRow label={t('Vet ne dekha')} value={x.vetInspection ? t('Haan') : t('Nahi')} last />
          </Card>
          {(x.moves ?? []).length > 0 && (
            <Card flush title={t('Stock')}>
              {x.moves.map((m, i) => <ListRow key={i} dense divider={i < x.moves.length - 1} title={m.name} subtitle={m.type} trailing={<Text size="sm" weight="semibold" ltr>{`${m.qty > 0 ? '+' : ''}${kg(m.qty, m.unit)}`}</Text>} />)}
            </Card>
          )}
        </View>
      )}
    </Sheet>
  );
}

interface Pick { id: string; name: string }

function NewSlaughter({ open, animalId, onClose }: { open: boolean; animalId: string | null; onClose: () => void }) {
  const th = useTheme();
  const animals = useQuery({ queryKey: [MEAT_KEYS.animals, { isSlaughtered: 'false' }], queryFn: () => liveAnimalsApi.list({ isSlaughtered: 'false' }), enabled: open });
  const [mode, setMode] = useState<'birds' | 'animal'>('birds');
  const [animal, setAnimal] = useState<LiveAnimal | null>(null);
  const [type, setType] = useState('CHICKEN');
  const [source, setSource] = useState<Pick | null>(null);
  const [meat, setMeat] = useState<Pick | null>(null);
  const [liveKg, setLiveKg] = useState<number | null>(null);
  const [dressedKg, setDressedKg] = useState<number | null>(null);
  const [extras, setExtras] = useState<Array<{ item: Pick; kg: number | null }>>([]);
  const [method, setMethod] = useState('HALAL_HAND');
  const [by, setBy] = useState('');
  const [isHalal, setIsHalal] = useState(true);
  const [cert, setCert] = useState('');
  const [vet, setVet] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [picker, setPicker] = useState<'source' | 'meat' | 'extra' | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && animalId) setMode('animal'); }, [open, animalId]);
  useEffect(() => { const a = (animals.data ?? []).find((x) => x.id === animalId); if (a) { setAnimal(a); setLiveKg(a.weightKg); } }, [animals.data, animalId]);
  const out = (dressedKg ?? 0) + extras.reduce((s, e) => s + (e.kg ?? 0), 0);
  const error = mode === 'animal' && !animal ? t('Janwar chunein') : mode === 'birds' && !source ? t('Zinda maal ka item chunein — stock usi se nikalta hai') : !((liveKg ?? 0) > 0) ? t('Zinda wazan likhein') : !meat ? t('Gosht kis item me stock me aaye — chunein') : !((dressedKg ?? 0) > 0) ? t('Gosht ka wazan likhein')
    : cutsTooHeavy(liveKg ?? 0, out) ? t('Gosht aur baqi cheezein zinda wazan se zyada nahi ho saktin') : extras.some((e) => !((e.kg ?? 0) > 0)) ? t('Har cheez ka kg likhein ya line hatayein') : '';
  const save = useMutation({
    mutationFn: () => slaughterApi.create({
      liveAnimalId: mode === 'animal' ? animal?.id : undefined, animalType: mode === 'animal' ? animal?.animalType : type, sourceProductId: mode === 'birds' ? source?.id : undefined, stockProductId: meat?.id,
      liveWeightKg: liveKg ?? 0, dressedWeightKg: dressedKg ?? 0, extras: extras.map((e) => ({ productId: e.item.id, kg: e.kg ?? 0 })), slaughterMethod: method, slaughteredBy: opt(by), isHalal, halalCertNumber: opt(cert), vetInspection: vet, slaughterDate: date,
    } as SlaughterInput),
    onSuccess: (r) => { refreshMeat([MEAT_KEYS.slaughter, MEAT_KEYS.animals, MEAT_KEYS.daySheet, 'inv'], true); toast.success(t('{{slaughterNumber}} — {{kg}} gosht stock me', { slaughterNumber: r.slaughterNumber, kg: kg(dressedKg) })); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Zibah save nahi hua'))),
  });
  const y = dressingPct(liveKg ?? 0, dressedKg ?? 0);
  return (
    <>
      <Sheet open={open && !picker} onClose={onClose} height={0.95} title={t('Zibah / dressing')} description={t('Zinda maal stock se nikalta hai, gosht usi cost par stock me aata hai')}
        footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => (error ? toast.error(error) : save.mutate())}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'birds', label: t('Murgi / wazan se') }, { value: 'animal', label: t('Tag wala janwar') }]} />
          {mode === 'animal' ? (
            <Select label={t('Janwar')} value={animal?.id ?? ''} onChange={(v) => { const a = (animals.data ?? []).find((x) => x.id === v) ?? null; setAnimal(a); if (a) setLiveKg(a.weightKg); }} searchable placeholder={t('Chunein…')}
              options={(animals.data ?? []).map((a) => ({ value: a.id, label: `${animalOf(a.animalType).emoji} ${a.tagNumber} · ${kg(a.weightKg)}` }))} />
          ) : (
            <>
              <Select label={t('Kya zibah hua')} value={type} onChange={setType} options={ANIMALS.map((a) => ({ value: a.value, label: `${a.emoji} ${t(a.label)}` }))} />
              <ListRow icon={ShieldCheck} title={source ? source.name : t('Zinda maal ka item')} subtitle={t('Stock usi se nikalta hai')} chevron onPress={() => setPicker('source')} />
            </>
          )}
          <NumberInput label={t('Zinda wazan (kg)')} value={liveKg} onChangeValue={setLiveKg} />
          <ListRow icon={ShieldCheck} title={meat ? meat.name : t('Gosht ka item')} subtitle={t('Gosht isi item me stock me aayega')} chevron onPress={() => setPicker('meat')} />
          <NumberInput label={t('Gosht (kg)')} value={dressedKg} onChangeValue={setDressedKg} hint={y != null ? `${t('Yield')} ${pct(y)}` : undefined} />
          {extras.map((e, i) => (
            <Row key={i} gap={2} align="end">
              <View style={{ flex: 2 }}><Text size="sm" weight="medium" numberOfLines={2}>{e.item.name}</Text></View>
              <View style={{ flex: 1 }}><NumberInput value={e.kg} onChangeValue={(v) => setExtras((xs) => xs.map((x, j) => (j === i ? { ...x, kg: v } : x)))} hint="kg" /></View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="ghost" onPress={() => setExtras((xs) => xs.filter((_, j) => j !== i))} />
            </Row>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setPicker('extra')}>{t('Kaleji / paaye / haddi jorein')}</Button>
          <Text size="sm" weight="medium" tone="secondary">{t('Tareeqa')}</Text>
          <ChipGroup wrap value={method} onChange={setMethod} options={SLAUGHTER_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
          <Input label={t('Kis ne zibah kiya')} value={by} onChangeText={setBy} />
          <DatePicker label={t('Tareekh')} value={keyToDate(date)} onChange={(d) => setDate(dateToKey(d))} maximumDate={keyToDate(todayKey()) ?? undefined} />
          <Switch value={isHalal} onChange={setIsHalal} label={t('Halal zabiha')} />
          <Input label={t('Halal certificate #')} value={cert} onChangeText={setCert} />
          <Switch value={vet} onChange={setVet} label={t('Vet ne dekha')} />
        </View>
      </Sheet>
      <ProductPicker open={open && !!picker} onClose={() => setPicker(null)} title={picker === 'source' ? t('Zinda maal ka item') : picker === 'meat' ? t('Gosht ka item') : t('Kaleji / paaye / haddi jorein')} variants={false} includeRaw
        onPick={({ product }) => {
          const p = { id: product.id, name: product.name };
          if (picker === 'source') setSource(p); else if (picker === 'meat') setMeat(p); else setExtras((xs) => (xs.some((x) => x.item.id === p.id) ? xs : [...xs, { item: p, kg: null }]));
          setPicker(null);
        }} />
    </>
  );
}
