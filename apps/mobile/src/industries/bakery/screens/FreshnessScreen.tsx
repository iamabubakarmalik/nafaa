/**
 * Freshness and waste (web FreshnessPage): batches on the shelf by time left
 * (sell, sell cheap or throw away — swipe a row), day-old and expired goods,
 * the waste record for a period and its analytics. Needs the server; the
 * last loaded shelf stays readable offline. A thrown-away batch's damage
 * report is queued offline.
 */

import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock, Flame, Package, Plus, RefreshCw, Tag, Timer, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { fmtQty, liveBatches, shelfState } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText, useProductSearch } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, ProgressBar, Row, Segmented, StatTile, SwipeRow, Text, toast, useTheme, type SwipeAction } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { freshnessApi, type FreshnessLog } from '../api';
import { BatchActionSheet, NewBatchSheet, WasteAnalytics, WasteRecord, useWastage, type BatchAction } from '../components/Freshness';
import { FRESH_KEY, dateTime, refreshBakery } from '../meta';

type Tab = 'live' | 'waste' | 'analytics';
type View_ = 'urgent' | 'all' | 'expired';
const VIEWS: Array<{ value: View_; label: string }> = [{ value: 'urgent', label: msg('24 ghante me kharab') }, { value: 'expired', label: msg('Waqt guzar gaya') }, { value: 'all', label: msg('Sab shelf par') }];

function leftPhrase(h: number) {
  if (h <= 0) { const p = -h; return p < 24 ? t('{{value}} ghante pehle guzar gaya', { value: Math.max(Math.round(p), 1) }) : t('{{value}} din pehle guzar gaya', { value: Math.round(p / 24) }); }
  if (h < 1) return t('{{value}} minute baqi', { value: Math.max(Math.round(h * 60), 1) });
  return h < 24 ? t('{{h}} ghante baqi', { h: Math.round(h) }) : t('{{value}} din baqi', { value: Math.round(h / 24) });
}

export function FreshnessScreen() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnlineStatus();
  const canManage = can(P.BAKERY_PRODUCTION_MANAGE);
  const { cost, costHidden } = useCostMask();
  const [tab, setTab] = useState<Tab>('live');
  const [view, setView] = useState<View_>('urgent');
  const [search, setSearch] = useState('');
  const per = usePeriod('month');
  const [action, setAction] = useState<{ log: FreshnessLog; mode: BatchAction } | null>(null);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);

  const liveQ = useQuery({ queryKey: [FRESH_KEY, 'live'], queryFn: () => freshnessApi.list({ active: 'true' }), refetchInterval: 60_000 });
  const products = useProductSearch({ query: '', limit: 2000 });
  const costOf = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, Number(p.costPrice || 0)])), [products.data]);
  const live = useMemo(() => liveBatches(liveQ.data ?? []).map((f) => ({ ...f, value: f.currentQty * (costOf.get(f.productId) ?? 0) })), [liveQ.data, costOf]);
  const wasteQ = useWastage(per.period);
  const w = wasteQ.data?.totals;
  const stats = useMemo(() => {
    const expired = live.filter((f) => f.left <= 0);
    const soon = live.filter((f) => f.left > 0 && f.left <= 6);
    const day = live.filter((f) => f.left <= 24);
    return { expired, soon, day, pieces: live.reduce((s, f) => s + f.currentQty, 0), atRisk: day.reduce((s, f) => s + f.value, 0) };
  }, [live]);
  const q = search.trim().toLowerCase();
  const shown = live.filter((f) => (view === 'all' || (view === 'expired' ? f.left <= 0 : f.left <= 24)) && (!q || f.productName.toLowerCase().includes(q) || (f.batchNumber ?? '').toLowerCase().includes(q)));
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('production')); return; } run(); };
  const runCheck = () => guard(async () => {
    setChecking(true);
    try { const r = await freshnessApi.runCheck(); toast.success(t('{{value}} batch dekhe — {{value2}} ka waqt guzar gaya', { value: r?.checked ?? 0, value2: r?.expired ?? 0 })); refreshBakery([FRESH_KEY]); }
    catch (e) { toast.error(apiErrorMessage(e, t('Check nahi hua'))); } finally { setChecking(false); }
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Flame} tone={stats.expired.length ? 'danger' : 'neutral'} label={t('Waqt guzar gaya')} loading={liveQ.isLoading} value={String(stats.expired.length)} hint={stats.expired.length ? t('Aaj hi hatayein') : t('Koi nahi')} onPress={() => { setTab('live'); setView('expired'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone="warning" label={t('6 ghante me')} loading={liveQ.isLoading} value={String(stats.soon.length)} hint={t('Discount laga dein')} onPress={() => { setTab('live'); setView('urgent'); }} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Package} tone="info" label={t('Shelf par')} loading={liveQ.isLoading} value={fmtQty(stats.pieces)} hint={t('{{count}} batch', { count: live.length })} onPress={() => { setTab('live'); setView('all'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Trash2} tone="danger" label={t('24 ghante me kharab')} value={costHidden ? String(stats.day.length) : cost(stats.atRisk)} hint={w?.wastePct != null ? t('Waste {{pct}}%', { pct: w.wastePct }) : undefined} onPress={() => setTab('analytics')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'live', label: t('Shelf par'), icon: Timer }, { value: 'waste', label: t('Waste ka record'), icon: Trash2 }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      {tab === 'live' && <><ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }} options={VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} /><CachedNote query={liveQ} /></>}
      {tab !== 'live' && <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />}
      {tab === 'waste' && <WasteRecord period={per.period} search={search} />}
      {tab === 'analytics' && <WasteAnalytics period={per.period} onReason={(r) => { setSearch(t(r)); setTab('waste'); }} />}
    </View>
  );

  return (
    <>
      <ListTemplate<(typeof live)[number]>
        title={t('Freshness aur waste')}
        grouped={false}
        actions={canManage ? <IconButton icon={RefreshCw} label={t('Dobara check')} disabled={checking} onPress={runCheck} /> : undefined}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: tab === 'live' ? t('Cheez ya batch…') : t('Cheez ya wajah…') } : undefined}
        summary={header}
        data={tab === 'live' ? shown : []}
        loading={tab === 'live' && liveQ.isLoading}
        error={tab === 'live' && !liveQ.data ? liveQ.error : undefined}
        onRetry={() => void liveQ.refetch()}
        refreshing={liveQ.isRefetching}
        onRefresh={() => { void liveQ.refetch(); void wasteQ.refetch(); }}
        keyExtractor={(f) => f.id}
        renderItem={({ item: f }) => {
          const state = shelfState(f.left);
          const sold = f.initialQty ? Math.round((f.soldQty / f.initialQty) * 100) : 0;
          const end: SwipeAction[] = canManage ? [
            { icon: CheckCircle2, label: t('Bik gaya'), tone: 'success', onPress: () => guard(() => setAction({ log: f, mode: 'sale' })) },
            { icon: Tag, label: t('Sasta becha'), tone: 'brand', onPress: () => guard(() => setAction({ log: f, mode: 'discount' })) },
            { icon: Trash2, label: t('Phenk diya'), tone: 'danger', onPress: () => guard(() => setAction({ log: f, mode: 'discard' })) },
          ] : [];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={end}>
                <ListRow icon={Clock} iconTone={state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'success'}
                  title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{f.productName}</Text>{!!f.batchNumber && <Text size="xs" tone="muted">#{f.batchNumber}</Text>}{f.status === 'DAY_OLD' && <Badge tone="warning">{t('Kal ka')}</Badge>}</Row>}
                  subtitle={<View style={{ gap: 4 }}>
                    <Text size="xs" tone={state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'muted'} weight={state === 'expired' || state === 'soon' ? 'semibold' : 'regular'}>{leftPhrase(f.left)} · {dateTime(f.expiryDate || f.bestBefore)}</Text>
                    <ProgressBar value={Math.min(sold, 100) / 100} tone="success" height={4} />
                    <Text size="2xs" tone="muted">{t('{{sold}}% bik chuka{{value}}{{value2}}', { sold, value: f.discountedQty ? t(' · {{discountedQty}} sasta', { discountedQty: fmtQty(f.discountedQty) }) : '', value2: f.wastedQty ? t(' · {{wastedQty}} waste', { wastedQty: fmtQty(f.wastedQty) }) : '' })}</Text>
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end' }}>
                    <Text weight="bold" ltr>{fmtQty(f.currentQty)} <Text size="xs" tone="muted">/ {fmtQty(f.initialQty)}</Text></Text>
                    {f.value > 0 && !costHidden && <Text size="2xs" tone="warning" ltr>{cost(f.value)}</Text>}
                  </View>}
                  onPress={canManage ? () => guard(() => setAction({ log: f, mode: 'sale' })) : undefined} />
              </SwipeRow>
            </View>
          );
        }}
        empty={tab === 'live' ? <EmptyState icon={CheckCircle2}
          title={view === 'expired' ? t('Kisi batch ka waqt nahi guzra') : view === 'urgent' ? t('Agle 24 ghante me kuch kharab nahi ho raha') : t('Shelf par koi batch nahi')}
          message={t('Baking me "Ban gaya" par freshness ka batch khud banta hai — ya "Naya batch" se haath se jorein.')} /> : undefined}
        fab={canManage && tab === 'live' ? { icon: Plus, label: t('Naya batch'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      {action && <BatchActionSheet log={action.log} mode={action.mode} onClose={() => setAction(null)} />}
      {adding && <NewBatchSheet onClose={() => setAdding(false)} />}
    </>
  );
}
