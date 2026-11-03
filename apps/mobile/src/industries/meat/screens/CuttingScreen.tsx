/**
 * Cutting (web CuttingJobsPage): boneless, qeema, chaanp from a carcass or
 * dressed bird. Start a job (stock does not change yet), finish it with the kg of
 * each cut and the waste (the input leaves stock, the cuts come in with a cost
 * share by sale value), or cancel it. Analytics shows how much each cut gave.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ban, CheckCircle2, Clock, Plus, Scale, Scissors, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { autoWaste, cutsTooHeavy, r3, yieldPct } from '@nafaa/core/industries/meat';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, HBarList, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Sheet, SwipeRow, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { cuttingJobsApi, type CuttingJob } from '../api';
import { CUT_STATUS, MEAT_KEYS, kg, opt, pct, refreshMeat } from '../meta';

export function CuttingScreen() {
  const th = useTheme();
  const canWrite = usePermission()(P.STOCK_ADJUSTMENTS_MANAGE);
  const { guard } = useDeskOnline('meatDesk');
  const per = usePeriod('month');
  const [view, setView] = useState<'jobs' | 'analytics'>('jobs');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'start' } | { kind: 'done' | 'cancel'; j: CuttingJob } | null>(null);
  const query = { from: per.period.from, to: per.period.to, status: status || undefined };
  const q = useQuery({ queryKey: [MEAT_KEYS.cutting, query], queryFn: () => cuttingJobsApi.list(query as Record<string, string | undefined>), placeholderData: (p) => p });
  const s = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((j) => !s || [j.jobNumber, j.butcherName, j.cutsProduced?.source?.name].join(' ').toLowerCase().includes(s));
  const done = rows.filter((j) => j.status === 'COMPLETED');
  const open = rows.filter((j) => j.status === 'IN_PROGRESS').length;
  const inKg = done.reduce((a, j) => a + j.inputWeightKg, 0);
  const outKg = done.reduce((a, j) => a + (j.outputWeightKg ?? 0), 0);
  const wasteKg = done.reduce((a, j) => a + (j.wasteWeightKg ?? 0), 0);
  const byCut = new Map<string, number>();
  done.forEach((j) => (j.cutsProduced?.cuts ?? []).forEach((c) => byCut.set(c.name, (byCut.get(c.name) ?? 0) + c.qty)));

  const header = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
      <StatRow tiles={[
        { icon: Clock, tone: open ? 'warning' : 'neutral', label: t('Chal raha'), loading: q.isLoading, value: String(open), onPress: () => setStatus('IN_PROGRESS') },
        { icon: Scale, tone: 'info', label: t('Andar gaya'), loading: q.isLoading, value: kg(inKg), hint: t('{{count}} mukammal', { count: done.length }) },
      ]} />
      <StatRow tiles={[
        { icon: Scissors, tone: 'success', label: t('Cuts bane'), loading: q.isLoading, value: kg(outKg), hint: t('Yield {{pct}}', { pct: pct(yieldPct(outKg, inKg)) }) },
        { icon: Trash2, tone: wasteKg ? 'danger' : 'neutral', label: t('Waste'), loading: q.isLoading, value: kg(wasteKg) },
      ]} />
      <Segmented value={view} onChange={setView} options={[{ value: 'jobs', label: t('Kaam') }, { value: 'analytics', label: t('Analytics') }]} />
      <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab halat') }, ...Object.entries(CUT_STATUS).map(([value, x]) => ({ value, label: t(x.label) }))]} />
      <Button variant="secondary" icon={ShieldCheck} onPress={() => router.push('/meat/slaughter' as never)}>{t('Zibah')}</Button>
      <OfflineNote feature="meatDesk" />
      {view === 'analytics' && (byCut.size ? <Card title={t('Kaunsa cut kitna bana')}><HBarList colorful rows={[...byCut.entries()].sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ key: name, label: name, value: v, display: <Text size="xs" tone="muted">{kg(v)}</Text> }))} /></Card> : <Text size="sm" tone="muted">{t('Is period me koi mukammal kaam nahi')}</Text>)}
    </View>
  );

  return (
    <>
      <ListTemplate<CuttingJob>
        title={t('Cutting')}
        grouped={false}
        search={view === 'jobs' ? { value: search, onChange: setSearch, placeholder: t('Kaam #, kaarigar…') } : undefined}
        summary={header}
        data={view === 'jobs' ? rows : []}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(j) => j.id}
        renderItem={({ item: j }) => {
          const st = CUT_STATUS[j.status] ?? { label: j.status, tone: 'neutral' as const };
          const row = (
            <RowCard dim={j.status === 'CANCELLED'}>
              <ListRow icon={Scissors} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{j.cutsProduced?.source?.name ?? t('Item nahi likha')}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" ltr numberOfLines={1}>{`${j.jobNumber} · ${kg(j.inputWeightKg)}`}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{`${formatDateTime(j.startedAt)}${j.butcherName ? ` · ${j.butcherName}` : ''}`}</Text></View>}
                trailing={j.status === 'COMPLETED' ? <View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold">{t('Yield {{yieldPct}}', { yieldPct: pct(j.yieldPct) })}</Text><Text size="2xs" tone="muted">{kg(j.outputWeightKg)}</Text></View> : undefined}
                onPress={j.status === 'IN_PROGRESS' && canWrite ? () => guard(() => setDialog({ kind: 'done', j })) : undefined} chevron={j.status === 'IN_PROGRESS' && canWrite} />
            </RowCard>
          );
          return j.status === 'IN_PROGRESS' && canWrite
            ? <SwipeRow end={[{ icon: CheckCircle2, label: t('Mukammal'), tone: 'success', onPress: () => guard(() => setDialog({ kind: 'done', j })) }, { icon: Ban, label: t('Cancel'), tone: 'danger', onPress: () => guard(() => setDialog({ kind: 'cancel', j })) }]}>{row}</SwipeRow>
            : row;
        }}
        empty={view === 'jobs' ? <EmptyState icon={Scissors} title={t('Koi cutting ka kaam nahi')} message={t('Dressed murgi ya carcass se boneless, qeema banana ho to yahan shuru karein.')} /> : undefined}
        fab={canWrite ? { icon: Plus, label: t('Cutting shuru'), onPress: () => guard(() => setDialog({ kind: 'start' })) } : undefined}
      />
      <StartSheet open={dialog?.kind === 'start'} onClose={() => setDialog(null)} />
      <DoneSheet j={dialog?.kind === 'done' ? dialog.j : null} onClose={() => setDialog(null)} />
      <ReasonSheet open={dialog?.kind === 'cancel'} title={dialog?.kind === 'cancel' ? t('{{jobNumber}} cancel karein?', { jobNumber: dialog.j.jobNumber }) : ''} description={t('Stock nahi badla tha, kuch wapas nahi karna')} cta={t('Cancel')} required={false} label={t('Wajah (marzi)')}
        onClose={() => setDialog(null)} onConfirm={async (reason) => { try { await cuttingJobsApi.cancel((dialog as { j: CuttingJob }).j.id, reason || undefined); refreshMeat([MEAT_KEYS.cutting]); toast.success(t('Kaam cancel')); } catch (e) { toast.error(errorText(e, t('Cancel nahi hua'))); throw e; } }} />
    </>
  );
}

interface Picked { id: string; name: string; stock: number | null }

function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [source, setSource] = useState<Picked | null>(null);
  const [picking, setPicking] = useState(false);
  const [input, setInput] = useState<number | null>(null);
  const [butcher, setButcher] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!source) { toast.error(t('Kis item se cutting — chunein (carcass, murgi dressed)')); return; }
    if (!(input && input > 0)) { toast.error(t('Kitne kg kaatne hain')); return; }
    setBusy(true);
    try { const j = await cuttingJobsApi.create({ sourceProductId: source.id, inputWeightKg: input, butcherName: opt(butcher) }); refreshMeat([MEAT_KEYS.cutting]); toast.success(t('{{jobNumber}} shuru — mukammal hone par cuts likhein', { jobNumber: j.jobNumber })); setSource(null); setInput(null); setButcher(''); onClose(); }
    catch (e) { toast.error(errorText(e, t('Kaam shuru nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Cutting shuru karein')} description={t('Stock abhi nahi badalta — mukammal karne par badalta hai')} footer={<Button fullWidth size="lg" icon={Scissors} loading={busy} onPress={() => void save()}>{t('Shuru')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <ListRow icon={Scissors} title={source ? source.name : t('Kis item se')} subtitle={source ? (source.stock != null ? t('Stock {{stock}}', { stock: kg(source.stock) }) : undefined) : t('Item chunein')} chevron onPress={() => setPicking(true)} />
          <NumberInput label={t('Kitne kg')} value={input} onChangeValue={setInput} hint={source?.stock != null && (input ?? 0) > source.stock ? t('Stock sirf {{stock}} hai', { stock: kg(source.stock) }) : undefined} />
          <Input label={t('Kaarigar (marzi)')} value={butcher} onChangeText={setButcher} placeholder={t('Naam')} />
        </View>
      </Sheet>
      <ProductPicker open={open && picking} onClose={() => setPicking(false)} title={t('Kis item se')} variants={false} includeRaw onPick={({ product, stock }) => { setSource({ id: product.id, name: product.name, stock }); setPicking(false); }} />
    </>
  );
}

function DoneSheet({ j, onClose }: { j: CuttingJob | null; onClose: () => void }) {
  const th = useTheme();
  const [cuts, setCuts] = useState<Array<{ id: string; name: string; kg: number | null }>>([]);
  const [waste, setWaste] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (j && seen !== j.id) { setSeen(j.id); setCuts([]); setWaste(null); }
  if (!j && seen) setSeen(null);
  const out = cuts.reduce((a, c) => a + (c.kg ?? 0), 0);
  const auto = j ? autoWaste(j.inputWeightKg, out) : 0;
  const wasteKg = waste ?? auto;
  const bad = !cuts.length || cuts.some((c) => !((c.kg ?? 0) > 0)) || (j ? cutsTooHeavy(j.inputWeightKg, out, wasteKg) : false);
  const save = async () => {
    if (!j || bad) return;
    setBusy(true);
    try { const r = await cuttingJobsApi.complete(j.id, { cuts: cuts.map((c) => ({ productId: c.id, kg: c.kg ?? 0 })), wasteWeightKg: waste ?? undefined }); refreshMeat([MEAT_KEYS.cutting, MEAT_KEYS.daySheet, 'inv']); toast.success(t('{{jobNumber}} mukammal — yield {{yieldPct}}', { jobNumber: r.jobNumber, yieldPct: pct(r.yieldPct) })); onClose(); }
    catch (e) { toast.error(errorText(e, t('Mukammal nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!j && !picking} onClose={onClose} height={0.92} title={j ? t('{{jobNumber}} — kya nikla', { jobNumber: j.jobNumber }) : ''} description={j ? t('{{value}} {{inputWeightKg}} se', { value: j.cutsProduced?.source?.name ?? '', inputWeightKg: kg(j.inputWeightKg) }) : undefined}
        footer={<Button fullWidth size="lg" variant="success" icon={CheckCircle2} loading={busy} disabled={bad} onPress={() => void save()}>{t('Mukammal')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          {cuts.map((c, i) => (
            <Row key={c.id} gap={2} align="end">
              <View style={{ flex: 2 }}><Text size="sm" weight="medium" numberOfLines={2}>{c.name}</Text></View>
              <View style={{ flex: 1 }}><NumberInput value={c.kg} onChangeValue={(v) => setCuts((cs) => cs.map((x, k) => (k === i ? { ...x, kg: v } : x)))} hint="kg" autoFocus={i === cuts.length - 1 && !c.kg} /></View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="ghost" onPress={() => setCuts((cs) => cs.filter((_, k) => k !== i))} />
            </Row>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Cut jorein: boneless, qeema…')}</Button>
          <NumberInput label={t('Waste (kg)')} value={waste} onChangeValue={setWaste} placeholder={`${r3(auto)}`} hint={t('{{value}} (khud)', { value: r3(auto) })} />
          {j && <Card tone={j && cutsTooHeavy(j.inputWeightKg, out, wasteKg) ? 'danger' : 'muted'}><Text size="sm">{j && cutsTooHeavy(j.inputWeightKg, out, wasteKg) ? t('Cuts andar wale wazan se zyada hain') : t('Yield {{pct}} · cost har cut par us ki sale value ke hisaab se lagti hai', { pct: pct(yieldPct(out, j.inputWeightKg)) })}</Text></Card>}
        </View>
      </Sheet>
      <ProductPicker open={!!j && picking} onClose={() => setPicking(false)} title={t('Cut jorein: boneless, qeema…')} variants={false} includeRaw pickedIds={new Set(cuts.map((c) => c.id))}
        onPick={({ product }) => { setCuts((cs) => (cs.some((c) => c.id === product.id) ? cs : [...cs, { id: product.id, name: product.name, kg: null }])); setPicking(false); }} />
    </>
  );
}
