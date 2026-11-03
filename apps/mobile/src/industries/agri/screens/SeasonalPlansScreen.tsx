/**
 * Seasonal plans (web SeasonalPlansPage): per crop, the sowing and harvest
 * window, the products needed per acre and the spray / fertilizer calendar.
 * Plans repeat every year; the list shows what is sowing now or soon and whether
 * the stock is ready.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Plus, Sprout, Trash2, Wheat } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { planCycle, planLineCover, planProducts, planSteps } from '@nafaa/core/industries/agri';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DatePicker, DetailRow, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Select, Sheet, Switch, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { OfflineNote, dateToKey, errorText, keyToDate, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { seasonalPlansApi, type PlanInput, type SeasonalPlan } from '../api';
import { useStockLines } from '../facts';
import { AGRI_KEYS, CROPS, SEASONS, qty, refreshAgri, seasonLabel, todayKey } from '../meta';

type View_ = 'now' | 'all';

export function SeasonalPlansScreen() {
  const th = useTheme();
  const manage = usePermission()(P.AGRI_ORDERS_MANAGE);
  const { guard } = useDeskOnline('agriDesk');
  const [view, setView] = useState<View_>('now');
  const [season, setSeason] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SeasonalPlan | null>(null);
  const [form, setForm] = useState<SeasonalPlan | 'new' | null>(null);
  const plansQ = useQuery({ queryKey: [AGRI_KEYS.plans, 'all'], queryFn: () => seasonalPlansApi.list({}) });
  const stockQ = useStockLines();
  const stockBy = useMemo(() => new Map((stockQ.data ?? []).map((s) => [s.productId, s])), [stockQ.data]);
  const today = todayKey();

  const rows = useMemo(() => (plansQ.data ?? []).map((p) => {
    const c = planCycle(p, today);
    const lines = planProducts(p.recommendedProducts).map((x) => {
      const s = x.productId ? stockBy.get(x.productId) : undefined;
      const stock = s ? s.stock : null;
      return { ...x, unit: x.unit || s?.unit || '', stock, acres: planLineCover(x.perAcre, stock) };
    });
    const short = lines.filter((l) => l.stock !== null && l.stock <= 0).length;
    return { p, c, lines, short, risky: short > 0 || lines.length === 0 };
  }), [plansQ.data, stockBy, today]);
  const sowingNow = rows.filter((r) => r.p.isActive && r.c.now);
  const sowingSoon = rows.filter((r) => r.p.isActive && r.c.soon);
  const risky = [...sowingNow, ...sowingSoon].filter((r) => r.risky);
  const s = search.trim().toLowerCase();
  const shown = rows.filter((r) => (view === 'all' ? true : r.p.isActive && (r.c.now || r.c.soon)) && (!season || r.p.season === season) && (!s || r.p.cropName.toLowerCase().includes(s)))
    .sort((a, b) => Number(b.risky) - Number(a.risky) || a.c.toSow - b.c.toSow);
  const live = open ? rows.find((r) => r.p.id === open.id) : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Sprout, tone: 'success', label: t('Bijai abhi'), loading: plansQ.isLoading, value: String(sowingNow.length) },
        { icon: CalendarDays, tone: 'info', label: t('Bijai qareeb'), loading: plansQ.isLoading, value: String(sowingSoon.length) },
      ]} />
      <StatRow tiles={[
        { icon: Wheat, tone: 'warning', label: t('Katai chal rahi'), loading: plansQ.isLoading, value: String(rows.filter((r) => r.p.isActive && r.c.harvest <= today && r.c.harvestEnd >= today).length) },
        { icon: AlertTriangle, tone: risky.length ? 'danger' : 'neutral', label: t('Maal kam'), loading: plansQ.isLoading, value: String(risky.length) },
      ]} />
      <Segmented value={view} onChange={setView} options={[{ value: 'now', label: t('Bijai qareeb hai') }, { value: 'all', label: t('Sab') }]} />
      <ChipGroup value={season} onChange={setSeason} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har season') }, ...SEASONS.filter((x) => x.value !== 'ALL_SEASON').map((x) => ({ value: x.value, label: t(x.label) }))]} />
      <OfflineNote feature="agriDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<(typeof rows)[number]>
        title={t('Seasonal plans')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Fasal…') }}
        summary={header}
        data={shown}
        loading={plansQ.isLoading}
        error={plansQ.data ? null : plansQ.error}
        onRetry={() => void plansQ.refetch()}
        refreshing={plansQ.isRefetching}
        onRefresh={() => void plansQ.refetch()}
        keyExtractor={(r) => r.p.id}
        renderItem={({ item: r }) => (
          <RowCard dim={!r.p.isActive}>
            <ListRow icon={Sprout} iconTone={r.risky ? 'danger' : r.c.now ? 'success' : 'info'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.p.cropName}</Text><Badge tone="neutral">{`${seasonLabel(r.p.season)} ${r.p.year}`}</Badge>{!r.p.isActive && <Badge tone="neutral">{t('Band')}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted">{`${t('Bijai')}: ${formatDate(r.c.start)} – ${formatDate(r.c.end)}`}</Text>
                <Text size="xs" tone={r.risky ? 'danger' : 'secondary'}>{r.lines.length === 0 ? t('Koi maal is fasal se juda nahi') : r.short > 0 ? t('{{out}} cheezein khatam · {{items}} kul', { out: r.short, items: r.lines.length }) : t('{{items}} cheezein maujood', { items: r.lines.length })}</Text>
              </View>}
              trailing={<Badge tone={r.c.now ? 'success' : 'neutral'}>{r.c.now ? t('Chal rahi') : t('{{toSow}} din', { toSow: r.c.toSow })}</Badge>}
              chevron onPress={() => setOpen(r.p)} />
          </RowCard>
        )}
        empty={<EmptyState icon={Sprout} title={view === 'now' ? t('Agle 45 din me kisi fasal ki bijai nahi — ya calendar khali hai') : t('Abhi koi plan nahi')} message={t('Har fasal ka plan ek baar likhein — har saal khud chalega.')} />}
        fab={manage ? { icon: Plus, label: t('Naya plan'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <PlanSheet row={live} manage={manage} onClose={() => setOpen(null)} onEdit={(p) => { setOpen(null); guard(() => setForm(p)); }} />
      <PlanForm value={form} onClose={() => setForm(null)} />
    </>
  );
}

function PlanSheet({ row, manage, onClose, onEdit }: { row: { p: SeasonalPlan; c: ReturnType<typeof planCycle>; lines: Array<{ name: string; perAcre: number; unit: string; stock: number | null; acres: number | null }> } | null | undefined; manage: boolean; onClose: () => void; onEdit: (p: SeasonalPlan) => void }) {
  const th = useTheme();
  const p = row?.p;
  const steps = p ? planSteps(p.applicationSchedule) : [];
  const remove = useMutation({ mutationFn: () => seasonalPlansApi.remove(p!.id), onSuccess: () => { refreshAgri([AGRI_KEYS.plans]); toast.success(t('Plan hat gaya')); onClose(); }, onError: (e) => toast.error(errorText(e, t('Nahi hua'))) });
  const del = async () => { if (await confirm({ title: t('Plan hatayein?'), tone: 'danger', confirmLabel: t('Hatayein') })) remove.mutate(); };
  return (
    <Sheet open={!!p} onClose={onClose} height={0.88} title={p ? `${p.cropName} — ${seasonLabel(p.season)} ${p.year}` : ''}
      footer={p && manage ? <Row gap={2}><Button style={{ flex: 1 }} size="lg" variant="secondary" icon={Trash2} onPress={() => void del()}>{t('Hatayein')}</Button><Button style={{ flex: 1 }} size="lg" onPress={() => onEdit(p)}>{t('Badlein')}</Button></Row> : undefined}>
      {p && row && (
        <View style={{ gap: th.space(3) }}>
          <Card flush>
            <DetailRow label={t('Bijai')} value={`${formatDate(row.c.start)} – ${formatDate(row.c.end)}`} />
            <DetailRow label={t('Katai')} value={`${formatDate(p.harvestStart)} – ${formatDate(p.harvestEnd)}`} last />
          </Card>
          <Card flush title={t('Fi acre maal')}>
            {row.lines.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Koi maal is fasal se juda nahi')}</Text></View> : row.lines.map((l, i) => (
              <ListRow key={i} dense divider={i < row.lines.length - 1} title={l.name} subtitle={l.stock === null ? undefined : l.stock <= 0 ? t('Khatam') : `${t('Stock')} ${qty(l.stock)} ${l.unit}${l.acres != null ? ` · ${t('{{count}} acre', { count: l.acres })}` : ''}`}
                trailing={<Text size="sm" weight="semibold" tone={l.stock !== null && l.stock <= 0 ? 'danger' : undefined}>{l.perAcre ? `${qty(l.perAcre)} ${l.unit}` : '—'}</Text>} />
            ))}
          </Card>
          {steps.length > 0 && (
            <Card flush title={t('Bijai ke baad')}>
              {steps.map((s, i) => <ListRow key={i} dense divider={i < steps.length - 1} title={s.what} trailing={<Badge tone="info">{t('{{count}} din', { count: s.day })}</Badge>} />)}
            </Card>
          )}
        </View>
      )}
    </Sheet>
  );
}

function PlanForm({ value, onClose }: { value: SeasonalPlan | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const p = value === 'new' ? null : value;
  const [d, setD] = useState({ cropName: '', season: 'RABI', year: new Date().getFullYear(), sowingStart: null as string | null, sowingEnd: null as string | null, harvestStart: null as string | null, harvestEnd: null as string | null, isActive: true });
  const [products, setProducts] = useState<Array<{ productId?: string; name: string; perAcre: number | null; unit: string }>>([]);
  const [steps, setSteps] = useState<Array<{ day: number | null; what: string }>>([]);
  const [picking, setPicking] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!value) return;
    setTouched(false);
    setD({ cropName: p?.cropName ?? '', season: p?.season ?? 'RABI', year: p?.year ?? new Date().getFullYear(), sowingStart: p?.sowingStart.slice(0, 10) ?? null, sowingEnd: p?.sowingEnd.slice(0, 10) ?? null, harvestStart: p?.harvestStart.slice(0, 10) ?? null, harvestEnd: p?.harvestEnd.slice(0, 10) ?? null, isActive: p?.isActive ?? true });
    setProducts(planProducts(p?.recommendedProducts).map((x) => ({ ...x, perAcre: x.perAcre || null })));
    setSteps(planSteps(p?.applicationSchedule).map((x) => ({ ...x })));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const error = !d.cropName.trim() ? t('Fasal likhein') : !d.sowingStart || !d.sowingEnd || !d.harvestStart || !d.harvestEnd ? t('Bijai aur katai ki date likhein') : d.sowingEnd < d.sowingStart ? t('Bijai khatam shuru se pehle nahi') : d.harvestEnd < d.harvestStart ? t('Katai khatam shuru se pehle nahi') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    const body: PlanInput = {
      season: d.season, year: d.year, cropName: d.cropName.trim(), sowingStart: d.sowingStart!, sowingEnd: d.sowingEnd!, harvestStart: d.harvestStart!, harvestEnd: d.harvestEnd!, isActive: d.isActive,
      recommendedProducts: products.filter((x) => x.name.trim()).map((x) => ({ productId: x.productId, name: x.name.trim(), perAcre: x.perAcre ?? 0, unit: x.unit })),
      applicationSchedule: steps.filter((x) => x.what.trim()).map((x) => ({ day: x.day ?? 0, what: x.what.trim() })),
    };
    setBusy(true);
    try {
      if (p) await seasonalPlansApi.update(p.id, body); else await seasonalPlansApi.create(body);
      refreshAgri([AGRI_KEYS.plans]);
      toast.success(p ? t('Save ho gaya') : t('Plan ban gaya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  const date = (k: 'sowingStart' | 'sowingEnd' | 'harvestStart' | 'harvestEnd', label: string) => <DatePicker label={label} value={keyToDate(d[k])} onChange={(x) => set(k, dateToKey(x))} />;
  return (
    <>
      <Sheet open={!!value && !picking} onClose={onClose} height={0.94} title={p ? t('Plan badlein') : t('Naya plan')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Input label={t('Fasal')} value={d.cropName} onChangeText={(v) => set('cropName', v)} placeholder={t('Gandum')} error={touched && !d.cropName.trim() ? error : undefined} />
          <ChipGroup wrap value={d.cropName} onChange={(v) => set('cropName', v)} options={CROPS.map((c) => ({ value: t(c), label: t(c) }))} />
          <Select label={t('Season')} value={d.season} onChange={(v) => set('season', v)} options={SEASONS.filter((x) => x.value !== 'ALL_SEASON').map((x) => ({ value: x.value, label: t(x.label) }))} />
          <NumberInput label={t('Saal')} integer value={d.year} onChangeValue={(v) => set('year', v ?? new Date().getFullYear())} />
          {date('sowingStart', t('Bijai shuru'))}
          {date('sowingEnd', t('Bijai khatam'))}
          {date('harvestStart', t('Katai shuru'))}
          {date('harvestEnd', t('Katai khatam'))}
          {touched && !!error && <Text size="xs" tone="danger">{error}</Text>}
          <Text size="sm" weight="semibold" tone="secondary">{t('Fi acre maal')}</Text>
          {products.map((x, i) => (
            <Row key={i} gap={2} align="end">
              <View style={{ flex: 2 }}><Text size="sm" weight="medium" numberOfLines={2}>{x.name}</Text></View>
              <View style={{ flex: 1 }}><NumberInput label={t('Fi acre')} value={x.perAcre} onChangeValue={(v) => setProducts((l) => l.map((y, n) => (n === i ? { ...y, perAcre: v } : y)))} /></View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="ghost" onPress={() => setProducts((l) => l.filter((_, n) => n !== i))} />
            </Row>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Cheez jorein')}</Button>
          <Text size="sm" weight="semibold" tone="secondary">{t('Bijai ke baad')}</Text>
          {steps.map((x, i) => (
            <Row key={i} gap={2} align="end">
              <View style={{ width: 80 }}><NumberInput label={t('Din')} integer value={x.day} onChangeValue={(v) => setSteps((l) => l.map((y, n) => (n === i ? { ...y, day: v } : y)))} /></View>
              <View style={{ flex: 1 }}><Input label={t('Kya karna hai')} value={x.what} onChangeText={(v) => setSteps((l) => l.map((y, n) => (n === i ? { ...y, what: v } : y)))} placeholder={t('Pehla paani + Urea 1 bori')} /></View>
              <IconButton icon={Trash2} label={t('Line hatayein')} variant="ghost" onPress={() => setSteps((l) => l.filter((_, n) => n !== i))} />
            </Row>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setSteps((l) => [...l, { day: null, what: '' }])}>{t('Line jorein')}</Button>
          <Switch value={d.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu')} />
        </View>
      </Sheet>
      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Maal')} variants={false} includeRaw={false}
        onPick={({ product }) => { setProducts((l) => [...l, { productId: product.id, name: product.name, perAcre: null, unit: product.unit }]); setPicking(false); }} />
    </>
  );
}
