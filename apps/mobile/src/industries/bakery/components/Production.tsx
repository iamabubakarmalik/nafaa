/**
 * Baking pieces (web production/*): a plan with its lines (start, oven,
 * made, remove, close), the plan builder, "what to bake" suggestions and
 * the analytics. "Made" can take the recipe's raw materials out of the
 * store, put the pieces into stock and start a freshness batch, as on the web.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Cake, CheckCircle2, Flame, ListPlus, Package, Play, Plus, Sparkles, Timer, Trash2, Wheat } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { byWeight, fmtQty, planStats, qtyInput, qtyValue } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { kv } from '@/core/storage/kv';
import {
  Badge, BarChart, Button, Card, Checkbox, Chip, confirm, EmptyState, HBarList, IconButton, Input, ListRow, ProgressBar, Row, Sheet, Skeleton, StatTile, Switch, Text, toast, useTheme,
} from '@/design';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { useCostMask } from '@/modules/sales/lib/mask';
import { shortKey, type Period } from '@/modules/sales/lib/period';
import { productionApi, type PlanItemInput, type ProductionItem, type ProductionPlan } from '../api';
import { FRESH_KEY, PRODUCTION_KEY, RAW_KEY, SHIFTS, dayOnly, flavorLabel, itemStatus, refreshBakery, sizeLabel, timeOnly } from '../meta';

const FINISH_PREFS = 'nafaa.bakery.finish';
interface FinishPrefs { useIngredients: boolean; addToStock: boolean; makeBatch: boolean; hours: number }
const readPrefs = (): FinishPrefs => ({ useIngredients: false, addToStock: false, makeBatch: true, hours: 24, ...(kv.get<Partial<FinishPrefs>>(FINISH_PREFS, {}) ?? {}) });

function useGuard() {
  const online = useOnlineStatus();
  return (run: () => void) => { if (!online) { toast.warning(onlineNeededText('production')); return; } run(); };
}
const SHIFT_CODES: Record<string, string> = { MORNING: 'Subah', AFTERNOON: 'Dopahar', EVENING: 'Shaam', NIGHT: 'Raat' };
const shiftLabel = (s?: string | null) => (s ? t(SHIFT_CODES[s.toUpperCase()] ?? s) : '');

export function PlanCard({ plan, canManage, onAddItems }: { plan: ProductionPlan; canManage: boolean; onAddItems: (plan: ProductionPlan) => void }) {
  const th = useTheme();
  const guard = useGuard();
  const [bake, setBake] = useState<ProductionItem | null>(null);
  const [finish, setFinish] = useState<ProductionItem | null>(null);
  const items = plan.items ?? [];
  const s = planStats(items);
  const closed = plan.status === 'COMPLETED';
  const refresh = () => refreshBakery([PRODUCTION_KEY]);

  const step = useMutation({
    mutationFn: (to: 'start' | 'complete') => (to === 'start' ? productionApi.startPlan(plan.id) : productionApi.completePlan(plan.id)),
    onSuccess: (_d, to) => { toast.success(to === 'start' ? t('Kaam shuru') : t('Plan mukammal')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: (it: ProductionItem) => productionApi.removeItem(it.id),
    onSuccess: () => { toast.success(t('Plan se hata diya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hata'))),
  });
  const complete = () => guard(async () => {
    if (s.done < items.length && !(await confirm({ title: t('Plan complete karein?'), message: t('{{value}} cheezein abhi "ban gaya" nahi hui. Phir bhi plan band karein?', { value: items.length - s.done }), confirmLabel: t('Haan, complete karein') }))) return;
    step.mutate('complete');
  });

  return (
    <Card flush
      title={<Row gap={1.5} wrap><Text weight="bold">{plan.planNumber}</Text><Badge tone={itemStatus(plan.status).tone}>{t(itemStatus(plan.status).label)}</Badge>{!!plan.shift && <Text size="xs" tone="muted">{shiftLabel(plan.shift)}</Text>}</Row>}
      description={t('{{count}} cheezein · {{made}} / {{planned}} bane{{value}}', { count: items.length, made: fmtQty(s.produced), planned: fmtQty(s.planned), value: plan.notes ? ` · ${plan.notes}` : '' })}
      footer={canManage && !closed ? (
        <Row gap={2} wrap>
          <Button size="sm" variant="secondary" icon={Plus} onPress={() => guard(() => onAddItems(plan))}>{t('Item')}</Button>
          {plan.status === 'PLANNED' && <Button size="sm" icon={Play} loading={step.isPending} onPress={() => guard(() => step.mutate('start'))}>{t('Kaam shuru')}</Button>}
          {plan.status !== 'PLANNED' && <Button size="sm" variant="success" icon={CheckCircle2} loading={step.isPending} onPress={complete}>{t('Plan mukammal')}</Button>}
        </Row>
      ) : undefined}>
      <View style={{ paddingHorizontal: th.space(4), paddingTop: th.space(1), gap: 4 }}>
        <ProgressBar value={s.linePct / 100} tone="success" />
        <Text size="2xs" tone="muted">{t('{{done}} / {{count}} ban gaya', { done: s.done, count: items.length })}</Text>
      </View>
      {items.map((i, n) => {
        const done = i.status === 'COMPLETED';
        const st = itemStatus(i.status);
        const meta = [i.ovenNumber && `${t('Oven')} ${i.ovenNumber}`, i.bakingTempC && `${i.bakingTempC}°C`, i.bakerName, i.batchNumber && `${t('Batch')} ${i.batchNumber}`, i.bakingDurationMin && `${i.bakingDurationMin} min`].filter(Boolean).join(' · ');
        return (
          <View key={i.id}>
            <ListRow divider={n < items.length - 1 || (canManage && !done && !closed)} icon={done ? CheckCircle2 : i.status === 'BAKING' ? Flame : Package} iconTone={done ? 'success' : i.status === 'BAKING' ? 'warning' : 'neutral'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{i.productName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge>{!!i.cakeOrderId && <Badge tone="accent">{t('Order')}</Badge>}</Row>}
              subtitle={meta || (done ? i.qualityNotes || undefined : t('Abhi shuru nahi hua'))}
              trailing={<View style={{ alignItems: 'flex-end' }}>
                <Text weight="bold" ltr>{done ? fmtQty(i.producedQty) : fmtQty(i.plannedQty)}{byWeight(i.unit) ? ` ${i.unit}` : ''}</Text>
                <Text size="2xs" tone="muted">{done ? t('{{plannedQty}} socha tha', { plannedQty: fmtQty(i.plannedQty) }) : t('banana hai')}</Text>
                {done && i.failedQty > 0 && <Text size="2xs" tone="danger">{t('{{failedQty}} kharab', { failedQty: fmtQty(i.failedQty) })}</Text>}
              </View>} />
            {canManage && !done && !closed && (
              <Row gap={2} style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3) }}>
                {i.status === 'PLANNED' && <Button size="sm" variant="secondary" icon={Flame} onPress={() => guard(() => setBake(i))}>{t('Oven me')}</Button>}
                <Button size="sm" variant="success" icon={CheckCircle2} onPress={() => guard(() => setFinish(i))}>{t('Ban gaya')}</Button>
                {i.status === 'PLANNED' && <IconButton icon={Trash2} label={t('Plan se hatayein')} variant="danger" onPress={() => guard(async () => {
                  if (await confirm({ title: t('"{{productName}}" plan se hatayein?', { productName: i.productName }), tone: 'danger', confirmLabel: t('Hatayein') })) remove.mutate(i);
                })} />}
              </Row>
            )}
          </View>
        );
      })}
      {bake && <BakeSheet item={bake} onClose={() => setBake(null)} onDone={() => { setBake(null); refresh(); }} />}
      {finish && <FinishSheet item={finish} onClose={() => setFinish(null)} onDone={() => { setFinish(null); refreshBakery([PRODUCTION_KEY, FRESH_KEY, RAW_KEY, 'inv']); }} />}
    </Card>
  );
}

function BakeSheet({ item, onClose, onDone }: { item: ProductionItem; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [temp, setTemp] = useState('180');
  const [oven, setOven] = useState(item.ovenNumber ?? '');
  const go = useMutation({
    mutationFn: () => productionApi.startBaking(item.id, { bakingTempC: Number(temp) || undefined, ovenNumber: oven.trim() || undefined }),
    onSuccess: () => { toast.success(t('Oven me daal diya')); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <Sheet open onClose={onClose} title={t('Oven me daala')} description={`${item.productName} · ${fmtQty(item.plannedQty)}`}
      footer={<Button fullWidth size="lg" icon={Flame} loading={go.isPending} onPress={() => go.mutate()}>{t('Shuru')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Temperature (°C)')} value={temp} onChangeText={(v) => setTemp(v.replace(/\D/g, ''))} keyboardType="number-pad" ltr />
        <Row gap={2}>{['160', '180', '200', '220'].map((x) => <Chip key={x} label={`${x}°`} selected={temp === x} onPress={() => setTemp(x)} />)}</Row>
        <Input label={t('Oven')} value={oven} onChangeText={setOven} placeholder={t('1, 2, bara wala…')} hint={t('Baad me pata chalta hai kis oven me kharabi zyada hoti hai')} />
      </View>
    </Sheet>
  );
}

function FinishSheet({ item, onClose, onDone }: { item: ProductionItem; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [prefs, setPrefs] = useState<FinishPrefs>(readPrefs);
  const [made, setMade] = useState(String(item.plannedQty));
  const [failed, setFailed] = useState('0');
  const [notes, setNotes] = useState('');
  const setPref = (p: Partial<FinishPrefs>) => setPrefs((x) => { const next = { ...x, ...p }; kv.set(FINISH_PREFS, next); return next; });
  const weight = byWeight(item.unit);
  const producedQty = qtyValue(made, weight);
  const failedQty = qtyValue(failed, weight);
  const linked = !!item.productId;
  const save = useMutation({
    mutationFn: () => productionApi.completeItem(item.id, {
      producedQty, failedQty, qualityNotes: notes.trim() || undefined,
      useIngredients: linked && prefs.useIngredients, addToStock: linked && prefs.addToStock,
      freshHours: linked && prefs.makeBatch ? prefs.hours : undefined,
    }),
    onSuccess: (r) => {
      toast.success(t('{{productName}}: {{producedQty}}{{value}} ban gaye{{value2}}', { productName: item.productName, producedQty: fmtQty(producedQty), value: weight ? ` ${item.unit}` : '', value2: r.stockAdded ? t(' · {{stockAdded}} stock me', { stockAdded: fmtQty(r.stockAdded) }) : '' }));
      (r.warnings ?? []).forEach((w) => toast.warning(w));
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const short = Math.round((item.plannedQty - producedQty) * 1000) / 1000;
  return (
    <Sheet open onClose={onClose} title={t('Ban gaya')} description={t('{{productName}} · {{plannedQty}} socha tha', { productName: item.productName, plannedQty: fmtQty(item.plannedQty) })}
      footer={<Button fullWidth size="lg" variant="success" icon={CheckCircle2} disabled={producedQty + failedQty <= 0} loading={save.isPending} onPress={() => save.mutate()}>{t('Darj karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2}>
          <Input containerStyle={{ flex: 1 }} size="lg" label={weight ? t('Kitna bana ({{unit}})', { unit: item.unit }) : t('Kitne bane (theek)')} value={made} onChangeText={(v) => setMade(qtyInput(v, weight))} keyboardType={weight ? 'decimal-pad' : 'number-pad'} ltr />
          <Input containerStyle={{ flex: 1 }} size="lg" label={t('Kitne kharab')} value={failed} onChangeText={(v) => setFailed(qtyInput(v, weight))} keyboardType={weight ? 'decimal-pad' : 'number-pad'} ltr hint={t('Waste ke record me jata hai')} />
        </Row>
        {short > 0 && <Text size="sm" tone="warning">{t('Socha {{plannedQty}} tha — {{short}} kam ban rahe hain.', { plannedQty: fmtQty(item.plannedQty), short: fmtQty(short) })}</Text>}
        <Input label={t('Koi baat')} value={notes} onChangeText={setNotes} placeholder={t('Thora jal gaya, oven garam tha…')} hint={failedQty > 0 ? t('Kharabi ki wajah likhein — waste ke record me dikhti hai') : undefined} />
        {linked ? (
          <Card tone="muted">
            <View style={{ gap: th.space(2) }}>
              <Switch value={prefs.addToStock} onChange={(v) => setPref({ addToStock: v })} label={t('Bana hua maal stock me daalein')} description={t('Counter par bechne se pehle stock barh jaye. Agar aap stock alag se daalte hain to band rakhein.')} />
              <Switch value={prefs.useIngredients} onChange={(v) => setPref({ useIngredients: v })} label={t('Recipe ka saamaan ghatayein')} description={t('Maida, cheeni waghera recipe ke hisaab se kachche maal se kam honge. Recipe na bani ho to kuch nahi hota.')} />
              <Switch value={prefs.makeBatch} onChange={(v) => setPref({ makeBatch: v })} label={t('Freshness ka batch banayein')} description={t('Kab tak theek rahega — waqt guzarne par yaad dilaye ga')} />
              {prefs.makeBatch && (
                <Row gap={2} wrap>{[6, 12, 24, 48, 72].map((h) => <Chip key={h} icon={Timer} label={h < 24 ? t('{{h}} ghante', { h }) : t('{{value}} din', { value: h / 24 })} selected={prefs.hours === h} onPress={() => setPref({ hours: h })} />)}</Row>
              )}
            </View>
          </Card>
        ) : <Text size="sm" tone="muted">{t('Yeh cheez maal se juri nahi, is liye stock, saamaan aur freshness ka hisaab nahi hoga.')}</Text>}
      </View>
    </Sheet>
  );
}

export interface BuilderLine { key: string; productId?: string; productName: string; plannedQty: string; unit?: string | null; cakeOrderId?: string; note?: string }

export function PlanBuilderSheet({ date, plan, initial, onClose, onDone }: { date: string; plan?: ProductionPlan; initial?: BuilderLine[]; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [shift, setShift] = useState(() => { const h = new Date().getHours(); return h < 12 ? SHIFTS[0] : h < 16 ? SHIFTS[1] : SHIFTS[2]; });
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<BuilderLine[]>(initial ?? []);
  const [picking, setPicking] = useState(false);
  const [free, setFree] = useState('');
  const items: PlanItemInput[] = lines.map((l) => ({ productId: l.productId, productName: l.productName.trim(), plannedQty: qtyValue(l.plannedQty, byWeight(l.unit)), cakeOrderId: l.cakeOrderId, notes: l.note }));
  const bad = !items.length || items.some((i) => !i.productName || i.plannedQty <= 0);
  const save = useMutation({
    mutationFn: () => (plan ? productionApi.addItems(plan.id, items) : productionApi.createPlan({ planDate: date, shift, notes: notes.trim() || undefined, items })),
    onSuccess: (p) => { toast.success(plan ? t('Plan me daal diya') : t('Plan {{planNumber}} ban gaya', { planNumber: p.planNumber })); refreshBakery([PRODUCTION_KEY]); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Plan nahi bana'))),
  });
  const update = (key: string, patch: Partial<BuilderLine>) => setLines((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const picked = useMemo(() => new Set(lines.map((l) => l.productId).filter(Boolean) as string[]), [lines]);
  return (
    <>
      <Sheet open={!picking} onClose={onClose} title={plan ? t('{{planNumber}} me cheezein', { planNumber: plan.planNumber }) : t('Naya baking plan')}
        description={plan ? t('Jo aur banana hai woh daalein') : t('{{dayOnly}} ke liye — kya aur kitna banana hai', { dayOnly: dayOnly(`${date}T12:00:00+05:00`) })}
        footer={<Button fullWidth size="lg" icon={Plus} disabled={bad} loading={save.isPending} onPress={() => save.mutate()}>{plan ? t('Plan me daalein') : t('Plan banayein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          {!plan && (
            <>
              <Text size="sm" weight="semibold" tone="secondary">{t('Shift')}</Text>
              <Row gap={2} wrap>{SHIFTS.map((s) => <Chip key={s} label={t(s)} selected={shift === s} onPress={() => setShift(s)} />)}</Row>
              <Input label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Maslan: shadi wala order pehle')} />
            </>
          )}
          {lines.map((l) => (
            <Row key={l.key} gap={2}>
              <View style={{ flex: 1 }}>
                {l.productId ? <Text weight="semibold" numberOfLines={1}>{l.productName}</Text>
                  : <Input value={l.productName} onChangeText={(v) => update(l.key, { productName: v })} placeholder={t('Cheez ka naam')} />}
                {!!l.note && <Text size="2xs" tone="muted" numberOfLines={1}>{l.note}</Text>}
              </View>
              <Input containerStyle={{ width: 92 }} value={l.plannedQty} onChangeText={(v) => update(l.key, { plannedQty: qtyInput(v, byWeight(l.unit)) })} keyboardType={byWeight(l.unit) ? 'decimal-pad' : 'number-pad'} ltr
                placeholder={byWeight(l.unit) ? t('Kitna ({{unit}})', { unit: l.unit }) : t('Kitne')} error={Number(l.plannedQty) > 0 ? undefined : ' '} />
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setLines((xs) => xs.filter((x) => x.key !== l.key))} />
            </Row>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Kya banana hai — cheez search…')}</Button>
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} value={free} onChangeText={setFree} placeholder={t('Cheez ka naam')} />
            <Button variant="ghost" disabled={!free.trim()} onPress={() => { setLines((xs) => [...xs, { key: `free-${Date.now()}`, productName: free.trim(), plannedQty: '' }]); setFree(''); }}>{t('"{{value}}" — bina maal ke', { value: free.trim() || '…' })}</Button>
          </Row>
        </View>
      </Sheet>
      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Kya banana hai')} includeRaw={false} variants={false} keepOpen pickedIds={picked}
        onPick={(p) => { if (!picked.has(p.product.id)) setLines((xs) => [...xs, { key: p.product.id, productId: p.product.id, productName: p.product.name, plannedQty: '', unit: p.product.unit }]); }} />
    </>
  );
}

/** "What to bake": orders due that day plus the expected counter sale, less fresh stock and what is planned. */
export function SuggestView({ date, canManage, onPlan }: { date: string; canManage: boolean; onPlan: (lines: BuilderLine[]) => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [PRODUCTION_KEY, 'suggest', date], queryFn: () => productionApi.suggest(date), staleTime: 60_000 });
  const d = q.data;
  const [qty, setQty] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!d) return;
    setQty(Object.fromEntries(d.rows.map((r) => [r.productId, String(r.suggested)])));
    setPicked(new Set(d.rows.filter((r) => r.suggested > 0).map((r) => r.productId)));
  }, [d]);
  if (!d) return <View style={{ gap: th.space(2) }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</View>;
  const chosen = d.rows.filter((r) => picked.has(r.productId) && Number(qty[r.productId]) > 0);
  const make = () => onPlan(chosen.map((r) => ({
    key: r.productId, productId: r.productId, productName: r.name, plannedQty: qty[r.productId], unit: r.unit,
    note: r.orderRefs.length ? t('Orders: {{value}}', { value: r.orderRefs.join(', ') }) : undefined,
  })));
  return (
    <View style={{ gap: th.space(3) }}>
      <Card tone="brand">
        <Text size="sm">{d.basis === 'guess'
          ? t('Abhi kisi cheez par "khud banate hain" nahi laga, is liye pichle {{days}} din ki sab se zyada biki cheezein dikh rahi hain.', { days: d.days })
          : t('Us din ke orders + pichle 4 hafton me usi din ki ausat sale, minus jo taaza maal pehle se para hai aur jo plan me hai.')}</Text>
        {canManage && <Button style={{ marginTop: th.space(3) }} icon={ListPlus} disabled={!chosen.length} onPress={make}>{chosen.length ? t('{{count}} cheezon ka plan banayein', { count: chosen.length }) : t('Cheezein chunein')}</Button>}
      </Card>
      {(d.customCakes.length > 0 || d.bulkOrders.length > 0) && (
        <Card flush title={t('Us din ke order')} description={t('Jo cake kisi maal se jure nahi, unhein alag se plan me daalein')}>
          {d.customCakes.map((c, i) => (
            <ListRow key={c.id} divider={i < d.customCakes.length - 1 || d.bulkOrders.length > 0} icon={Cake} title={`${timeOnly(c.neededBy)} · ${c.customerName}`}
              subtitle={`${sizeLabel(c.size)} ${flavorLabel(c.flavor)}${c.messageOnCake ? ` · "${c.messageOnCake}"` : ''}`} onPress={() => router.push(`/bakery/cake-orders/${c.id}` as never)}
              trailing={canManage ? <Button size="sm" variant="secondary" onPress={() => onPlan([{ key: c.id, productName: t('Cake {{orderNumber}} — {{size}} {{flavor}}', { orderNumber: c.orderNumber, size: sizeLabel(c.size), flavor: flavorLabel(c.flavor) }), plannedQty: '1', cakeOrderId: c.id, note: c.customerName }])}>{t('Plan me daalein')}</Button> : undefined} />
          ))}
          {d.bulkOrders.map((b, i) => <ListRow key={b.id} divider={i < d.bulkOrders.length - 1} icon={Package} title={b.organizationName} subtitle={t('{{orderNumber}} — is ki cheezein neeche ginti me shamil hain', { orderNumber: b.orderNumber })} />)}
        </Card>
      )}
      {!d.rows.length ? <EmptyState icon={Sparkles} title={t('Andaza lagane ke liye abhi data nahi')} message={t('Kuch din counter par sale hogi ya products par "Khud banate hain" lagega to yahan roz ka plan khud banne lagega.')} /> : (
        <Card flush>
          {d.rows.map((r, i) => (
            <View key={r.productId} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: 6, borderBottomWidth: i < d.rows.length - 1 ? 0.5 : 0, borderColor: th.colors.divider, opacity: picked.has(r.productId) ? 1 : 0.6 }}>
              <Row gap={2}>
                <Checkbox value={picked.has(r.productId)} onChange={(v) => setPicked((s) => { const x = new Set(s); if (v) x.add(r.productId); else x.delete(r.productId); return x; })} />
                <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{r.name}</Text>
                <Input containerStyle={{ width: 88 }} value={qty[r.productId] ?? ''} keyboardType={byWeight(r.unit) ? 'decimal-pad' : 'number-pad'} ltr disabled={!canManage}
                  onChangeText={(v) => { const x = qtyInput(v, byWeight(r.unit)); setQty((s) => ({ ...s, [r.productId]: x })); if (Number(x) > 0) setPicked((s) => new Set(s).add(r.productId)); }} />
              </Row>
              <Text size="xs" tone="muted">{[
                r.orders ? t('Orders {{n}}', { n: fmtQty(r.orders) }) : '', t('Hafte ka din ausat {{n}}', { n: fmtQty(r.weekdayAvg) }), t('Roz ausat {{n}}', { n: fmtQty(r.avgDaily) }),
                r.freshLeft ? t('Taaza para {{n}}', { n: fmtQty(r.freshLeft) }) : '', r.planned ? t('Plan me {{n}}', { n: fmtQty(r.planned) }) : '',
              ].filter(Boolean).join(' · ')}</Text>
              {r.wasteRate > 15 && <Text size="xs" tone="warning">{t('{{wasteRate}}% waste hota hai — andaza thora kam kiya', { wasteRate: r.wasteRate })}</Text>}
              {r.orderRefs.length > 0 && <Text size="xs" tone="brand" numberOfLines={1}>{r.orderRefs.join(', ')}</Text>}
            </View>
          ))}
        </Card>
      )}
      <Text size="xs" tone="muted">{t('Yeh sirf andaza hai — mausam, chhutti aur mauqe ke hisaab se ginti badal lein.')}</Text>
    </View>
  );
}

export function ProductionAnalytics({ period }: { period: Period }) {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  const q = useQuery({ queryKey: [PRODUCTION_KEY, 'insights', period], queryFn: () => productionApi.insights(period.from === 'all' ? { to: period.to } : period), placeholderData: (p) => p });
  const d = q.data;
  if (!d) return <View style={{ gap: th.space(2) }}><Skeleton height={90} /><Skeleton height={180} /></View>;
  const x = d.totals;
  const worst = d.byProduct.filter((p) => p.failed > 0).sort((a, b) => b.failRate - a.failRate || b.failed - a.failed).slice(0, 8);
  return (
    <View style={{ gap: th.space(3) }}>
      {x.failRate > 5 && <Card tone="danger"><Text size="sm">{t('Har 100 me se {{failRate}} kharab ho rahe hain. Neeche dekhein kis cheez me sab se zyada — oven ka temperature ya batch ka size dekhein.', { failRate: Math.round(x.failRate) })}</Text></Card>}
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Package} label={t('Socha tha')} value={fmtQty(x.planned)} hint={t('{{plans}} plan · {{items}} cheezein', { plans: x.plans, items: x.items })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Ban gaya')} value={fmtQty(x.produced)} hint={t('{{doneRate}}% poora', { doneRate: x.doneRate })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Flame} tone={x.failRate > 5 ? 'danger' : 'warning'} label={t('Kharab hua')} value={fmtQty(x.failed)} hint={t('{{failRate}}% nuqsaan', { failRate: x.failRate })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wheat} tone="accent" label={t('Saamaan ki cost')} value={costHidden ? '••••' : cost(x.cost ?? 0)} />
      </Row>
      {d.byDay.length > 0 && (
        <Card title={t('Har din')} description={t('Socha kitna, bana kitna, kharab kitna')}>
          <BarChart labels={d.byDay.map((b) => shortKey(b.key))} series={[
            { key: 'p', label: t('Socha'), values: d.byDay.map((b) => b.planned) },
            { key: 'm', label: t('Bane'), values: d.byDay.map((b) => b.produced), color: th.colors.success.solid },
            { key: 'f', label: t('Kharab'), values: d.byDay.map((b) => b.failed), color: th.colors.danger.solid },
          ]} />
        </Card>
      )}
      {worst.length > 0 && <Card title={t('Sab se zyada kharab')}><HBarList rows={worst.map((p) => ({ key: p.name, label: p.name, value: p.failRate, display: <Text size="xs" tone="danger">{`${p.failRate}% · ${fmtQty(p.failed)}`}</Text> }))} /></Card>}
      {d.byShift.length > 0 && <Card title={t('Shift')}><HBarList rows={d.byShift.map((s) => ({ key: s.key, label: shiftLabel(s.key) || '—', value: s.produced, display: <Text size="xs" tone="muted">{`${fmtQty(s.produced)} · ${s.failRate}%`}</Text> }))} /></Card>}
      {d.byBaker.length > 0 && <Card title={t('Baker')}><HBarList rows={d.byBaker.map((s) => ({ key: s.key, label: s.key || '—', value: s.produced, display: <Text size="xs" tone="muted">{`${fmtQty(s.produced)} · ${s.failRate}%`}</Text> }))} /></Card>}
    </View>
  );
}

export function PlanRecord({ plans, onOpen }: { plans: ProductionPlan[]; onOpen: (p: ProductionPlan) => void }) {
  if (!plans.length) return <EmptyState icon={ListPlus} title={t('Is period me koi plan nahi')} />;
  return (
    <Card flush>
      {plans.map((p, i) => {
        const s = planStats(p.items ?? []);
        const st = itemStatus(p.status);
        return (
          <ListRow key={p.id} divider={i < plans.length - 1} title={<Row gap={1.5} wrap><Text weight="semibold">{p.planNumber}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
            subtitle={`${dayOnly(p.planDate)}${p.shift ? ` · ${shiftLabel(p.shift)}` : ''} · ${t('{{count}} cheezein', { count: p.items.length })}`}
            trailing={<View style={{ alignItems: 'flex-end' }}>
              <Text weight="bold" tone="success" ltr>{fmtQty(s.produced)} / {fmtQty(s.planned)}</Text>
              {s.failed > 0 && <Text size="2xs" tone="danger">{t('{{failedQty}} kharab', { failedQty: fmtQty(s.failed) })}</Text>}
            </View>}
            chevron onPress={() => onOpen(p)} />
        );
      })}
    </Card>
  );
}
