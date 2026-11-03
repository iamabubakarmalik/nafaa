/**
 * Damaged stock (web DamagePage): staff report broken, expired or spoilt
 * goods; a manager approves (stock goes out and the line shows in
 * Adjustments) or rejects. Tabs: the approval queue, the full record and
 * analytics. Swipe a waiting report to approve or reject; long-press to pick
 * many. Reporting works offline; the record and decisions need internet.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, PackageX, Plus, Printer, XCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { formatDateTime, formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Chip, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Sheet, SwipeRow, Text, TextArea, toast, useDebouncedValue, useTheme,
} from '@/design';
import { apiErrorMessage } from '@/core/api/errors';
import { ProductThumb } from '../../components/ProductThumb';
import { INV, qty, useCostMask, useRefreshInventory } from '../../lib/shared';
import { damageApi, type DamageAnalytics, type DamageLog, type DamageQuery, type DamageStatus } from '../api';
import { DAMAGE_REASONS, DAMAGE_STATUS, damageReasonOf, periodRange, type PeriodPreset } from '../meta';
import { Bars, OnlineOnly, PeriodChips, StatStrip, printTable } from '../components/parts';
import { usePaged } from '../usePaged';

type Tab = 'pending' | 'all' | 'analytics';

const itemLabel = (d: DamageLog) => (d.variant ? `${d.product.name} (${d.variant.name})` : d.product.name);
function qtyLabel(d: DamageLog) {
  const base = `${qty(d.quantity)} ${d.product.unit}`;
  const rate = Number(d.unit?.conversionRate) || 1;
  return d.unit && rate !== 1 ? `${qty(d.quantity / rate)} ${d.unit.unitName} (${base})` : base;
}

export function DamageScreen() {
  const th = useTheme();
  const can = usePermission();
  const canApprove = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const { cost } = useCostMask();
  const [tab, setTab] = useState<Tab>('pending');
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [status, setStatus] = useState<'all' | DamageStatus>('all');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [decide, setDecide] = useState<{ mode: 'approve' | 'reject'; rows: DamageLog[] } | null>(null);

  const range = periodRange(period);
  const f: DamageQuery = tab === 'pending'
    ? { status: 'REPORTED', reasonCode: reason as DamageQuery['reasonCode'], search: query || undefined }
    : { ...(range ?? {}), status, reasonCode: reason as DamageQuery['reasonCode'], search: query || undefined };
  const list = usePaged([INV, 'damage', 'list', f], (page) => damageApi.list({ ...f, page, limit: 30 }), tab !== 'analytics');
  const queue = useQuery({ queryKey: [INV, 'damage', 'queue'], queryFn: damageApi.queue });
  const periodQ = useQuery({ queryKey: [INV, 'damage', 'period', range], queryFn: () => damageApi.list({ ...(range ?? {}), page: 1, limit: 1 }) });
  const analytics = useQuery({ queryKey: [INV, 'damage', 'analytics', range, reason], queryFn: () => damageApi.analytics({ ...(range ?? {}), reasonCode: reason as DamageQuery['reasonCode'] }), enabled: tab === 'analytics' });
  const pt = periodQ.data?.totals;
  const pickedRows = useMemo(() => list.items.filter((r) => picked.has(r.id)), [list.items, picked]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const print = async () => {
    const all = await damageApi.list({ ...f, page: 1, limit: 200 });
    await printTable({
      title: t('Kharab maal'), subtitle: tab === 'pending' || !range ? t('Sab tareekhen') : `${range.from} — ${range.to}`,
      columns: [t('Waqt'), t('Cheez'), t('Wajah'), t('Quantity'), t('Haal'), t('Nuqsan')],
      rows: all.items.map((d) => [formatDateTime(d.createdAt), itemLabel(d), damageReasonOf(d.reasonCode, d.reason).label, qtyLabel(d), t(DAMAGE_STATUS[d.status].label), formatPKR(d.netLoss)]),
    });
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      {tab !== 'pending' && <PeriodChips value={period} onChange={setPeriod} />}
      <StatStrip items={[
        { label: t('Approval baqi'), value: String(queue.data?.pending ?? '—'), hint: queue.data?.aging ? t('{{aging}} report {{agingHours}} ghante se purani', { aging: queue.data.aging, agingHours: queue.data.agingHours }) : queue.data?.pending ? cost(queue.data.pendingValue) : t('Sab faislay ho chuke'), tone: 'warning', onPress: () => setTab('pending') },
        { label: t('Is period ka nuqsan'), value: pt ? cost(pt.lost) : '—', hint: pt ? t('{{approved}} approve report', { approved: pt.approved, count: pt.approved }) : undefined, tone: 'danger' },
        { label: t('Rad hui'), value: String(pt?.rejected ?? '—'), hint: t('In se stock nahi badla'), tone: 'neutral' },
      ]} />
      <Segmented value={tab} onChange={(v) => { setTab(v); setPicked(new Set()); }}
        options={[{ value: 'pending', label: t('Approval baqi') }, { value: 'all', label: t('Sab record') }, { value: 'analytics', label: t('Analytics') }]} />
      <ChipGroup value={reason} onChange={setReason} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: '', label: t('Sab wajah') }, ...DAMAGE_REASONS.filter((r) => r.id === r.code).map((r) => ({ value: r.code, label: t(r.label), icon: r.icon }))]} />
      {tab === 'all' && (
        <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: 'all', label: t('Sab') }, ...(Object.keys(DAMAGE_STATUS) as DamageStatus[]).map((k) => ({ value: k, label: t(DAMAGE_STATUS[k].label), icon: DAMAGE_STATUS[k].icon }))]} />
      )}
      {tab === 'pending' && canApprove && list.items.length > 0 && (
        <Row gap={2} wrap>
          <Text size="xs" tone="muted" style={{ flex: 1 }}>{pickedRows.length ? t('{{count}} chuni · {{value}}', { count: pickedRows.length, value: cost(pickedRows.reduce((s, r) => s + r.netLoss, 0)) }) : t('Kai reports ek sath: dabaa kar rakhein')}</Text>
          {pickedRows.length > 0 && <>
            <Button size="sm" variant="secondary" icon={XCircle} onPress={() => setDecide({ mode: 'reject', rows: pickedRows })}>{t('Rad')}</Button>
            <Button size="sm" icon={CheckCircle2} onPress={() => setDecide({ mode: 'approve', rows: pickedRows })}>{t('Approve')}</Button>
          </>}
        </Row>
      )}
      {tab !== 'analytics' && <OnlineOnly feature="reports" updatedAt={list.cached.fromCache ? list.cached.updatedAt : null} />}
      {tab === 'analytics' && <DamageAnalyticsView data={analytics.data} loading={analytics.isLoading} cost={cost} />}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Kharab maal')}
        actions={<IconButton icon={Printer} label={t('Print')} onPress={() => void print()} disabled={!list.items.length} />}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Product, SKU, report number ya wajah…') } : undefined}
        summary={summary}
        data={tab === 'analytics' ? [] : list.items}
        loading={tab !== 'analytics' && list.loading}
        error={tab !== 'analytics' ? list.error : null}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={() => { list.refetch(); void queue.refetch(); }}
        onEndReached={list.loadMore}
        footer={list.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
        keyExtractor={(d) => d.id}
        renderItem={({ item: d }) => {
          const st = DAMAGE_STATUS[d.status];
          const r = damageReasonOf(d.reasonCode, d.reason);
          const waiting = d.status === 'REPORTED' && canApprove;
          return (
            <SwipeRow enabled={waiting} end={[
              { icon: CheckCircle2, label: t('Approve'), tone: 'success', onPress: () => setDecide({ mode: 'approve', rows: [d] }) },
              { icon: XCircle, label: t('Rad'), tone: 'danger', onPress: () => setDecide({ mode: 'reject', rows: [d] }) },
            ]}>
              <ListRow
                selected={picked.has(d.id)}
                leading={<ProductThumb name={d.product.name} category={d.product.category?.name} url={d.photos?.[0] ?? d.product.images?.[0]?.url} size={42} />}
                title={itemLabel(d)}
                overline={`${d.damageNumber} · ${formatDateTime(d.createdAt)}`}
                subtitle={[r.label, qtyLabel(d), d.reportedBy?.fullName, d.batch?.batchNumber, d.rejectionReason].filter(Boolean).join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text size="sm" weight="bold" tone="danger" ltr>{cost(d.netLoss)}</Text>
                  <Badge tone={st.tone}>{t(st.label)}</Badge>
                </View>}
                onLongPress={waiting ? () => toggle(d.id) : undefined}
                onPress={picked.size && waiting ? () => toggle(d.id) : waiting ? () => setDecide({ mode: 'approve', rows: [d] }) : undefined}
              />
            </SwipeRow>
          );
        }}
        empty={tab === 'analytics' ? <View /> : (
          <EmptyState icon={PackageX}
            title={tab === 'pending' ? t('Koi report approval ke intezar me nahi') : t('Is period me koi kharab maal report nahi')}
            message={t('Maal toota, expire hua ya chuhe ne kaata? Report karein taake stock aur nuqsan ka hisaab sahi rahe.')}
            action={<Button icon={Plus} onPress={() => router.push('/damage/new' as never)}>{t('Report karein')}</Button>} />
        )}
        fab={{ icon: Plus, label: t('Report karein'), onPress: () => router.push('/damage/new' as never) }}
      />
      <DecideSheet decide={decide} onClose={() => setDecide(null)} onDone={() => setPicked(new Set())} cost={cost} />
    </>
  );
}

const REJECT_CHIPS = [msg('Maal theek hai'), msg('Ghalat quantity'), msg('Photo saaf nahi'), msg('Dobara report karein')];

function DecideSheet({ decide, onClose, onDone, cost }: { decide: { mode: 'approve' | 'reject'; rows: DamageLog[] } | null; onClose: () => void; onDone: () => void; cost: (n: number) => string }) {
  const th = useTheme();
  const qc = useQueryClient();
  const refresh = useRefreshInventory();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  if (!decide) return null;
  const approve = decide.mode === 'approve';
  const many = decide.rows.length > 1;
  const total = decide.rows.reduce((s, r) => s + r.netLoss, 0);
  const run = async () => {
    setBusy(true);
    try {
      if (approve) {
        if (many) {
          const r = await damageApi.approveMany(decide.rows.map((x) => x.id), text.trim() || undefined);
          toast.success(t('{{ok}} report approve — stock se nikal gaya', { ok: r.approved }));
          if (r.failed.length) toast.error(t('{{count}} nahi hue: {{value}}', { count: r.failed.length, value: r.failed[0].message }));
        } else {
          await damageApi.approve(decide.rows[0].id, text.trim() || undefined);
          toast.success(t('{{ok}} report approve — stock se nikal gaya', { ok: 1 }));
        }
      } else {
        let ok = 0;
        for (const r of decide.rows) { await damageApi.reject(r.id, text.trim() || undefined); ok++; }
        toast.success(t('{{ok}} report rad', { ok }));
      }
      await qc.invalidateQueries({ queryKey: [INV, 'damage'] });
      void refresh();
      onDone();
      setText('');
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, approve ? t('Approve nahi hua') : t('Rad nahi hua')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose}
      title={approve ? (many ? t('{{count}} report approve karein', { count: decide.rows.length }) : t('Report approve karein')) : (many ? t('{{count}} report rad karein', { count: decide.rows.length }) : t('Report rad karein'))}
      description={approve ? t('Approval par maal branch ke stock se nikal jayega aur Stock adjustments me "Kharab" ya "Gum" ban kar dikhega.') : t('Rad karne se stock nahi badalta. Report record me "Rad" likhi rahegi.')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button variant={approve ? 'success' : 'danger'} style={{ flex: 1 }} loading={busy} onPress={() => void run()}>{approve ? t('Approve karein') : t('Rad karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        {decide.rows.slice(0, 6).map((r) => (
          <Row key={r.id} justify="between" gap={2}>
            <Text size="sm" style={{ flex: 1 }} numberOfLines={1}>{itemLabel(r)} · {qtyLabel(r)}</Text>
            <Text size="sm" weight="semibold" ltr>{cost(r.netLoss)}</Text>
          </Row>
        ))}
        <Row justify="between"><Text weight="bold">{t('Kul nuqsan')}</Text><Text weight="bold" tone="danger" ltr>{cost(total)}</Text></Row>
        {!approve && (
          <Row gap={1.5} wrap>{REJECT_CHIPS.map((c) => <Chip key={c} label={t(c)} selected={text === t(c)} onPress={() => setText(t(c))} />)}</Row>
        )}
        <TextArea label={approve ? t('Note') : t('Rad karne ki wajah')} value={text} onChangeText={setText}
          placeholder={approve ? t('Marzi hai — maslan: Supplier ko wapas bhejna hai') : t('Staff ko pata chale kyun rad hua')}
          hint={approve ? t('Report ke sath save hota hai.') : t('Report karne wala record me yeh wajah dekhega.')} />
      </View>
    </Sheet>
  );
}

function DamageAnalyticsView({ data, loading, cost }: { data?: Awaited<ReturnType<typeof damageApi.analytics>>; loading: boolean; cost: (n: number) => string }) {
  const th = useTheme();
  if (loading || !data) return loading ? <ActivityIndicator /> : <OnlineOnly feature="reports" />;
  type B = DamageAnalytics['byReason'][number];
  const rows = (list: B[], labelOf: (b: B) => string) =>
    list.map((b) => ({ key: b.key, label: labelOf(b), amount: b.value + b.pending, value: cost(b.value + b.pending), hint: t('{{count}} report', { count: b.count }) }));
  return (
    <View style={{ gap: th.space(3) }}>
      <StatStrip items={[
        { label: t('Nuqsan'), value: cost(data.totals.lost), tone: 'danger' },
        { label: t('Approval baqi'), value: cost(data.totals.pendingValue), tone: 'warning' },
        { label: t('Kuch paise wapas mile?'), value: cost(data.totals.salvage), tone: 'success' },
      ]} />
      <Bars title={t('Wajah')} tone="danger" rows={rows(data.byReason, (b) => damageReasonOf(b.key as DamageLog['reasonCode'], b.label).label)} />
      <Bars title={t('Cheez')} tone="warning" rows={rows(data.byProduct, (b) => b.label)} />
      <Bars title={t('Category')} tone="info" rows={rows(data.byCategory, (b) => b.label)} />
      <Bars title={t('Kis ne report kiya')} tone="neutral" rows={rows(data.byPerson, (b) => b.label)} />
    </View>
  );
}
