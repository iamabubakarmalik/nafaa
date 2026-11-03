/**
 * Recoveries: who owes what and for how long (ageing by customer), the queue
 * of field collections waiting for the office to verify (verify or reject),
 * money taken at the office, WhatsApp reminders and a shareable recovery
 * sheet for a route.
 */

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, CheckCircle2, MessageCircle, Printer, SlidersHorizontal, Wallet, X, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { msg, t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Checkbox, EmptyState, IconButton, ListRow, ListTemplate, Row, Select, Sheet, StatTile, SwipeRow, Text, toast, useDebouncedValue, useTheme,
} from '@/design';
import { DIST_KEY, distError, distributionApi, type Ageing, type CollectionRow, type RecoveryRow } from '../api/distribution.api';
import { CachedNote, ReasonSheet, StatusChip, shareText, useRefreshDistribution } from '../components/parts';
import { CollectSheet, ReminderSheet } from '../components/RecoverySheets';
import { DistributionGate } from '../components/DistributionGate';
import { hasWhatsapp, reminderLink } from '../lib/reminder';
import { recoverySheetText } from '../lib/share';
import { COLLECTION_STATUS, dayLabel, METHOD_LABEL, partyName, rs } from '../lib/meta';

type Tab = 'ageing' | 'verify' | 'history';
type Item = { kind: 'cust'; r: RecoveryRow } | { kind: 'col'; c: CollectionRow };

const BUCKETS: Array<{ k: keyof Ageing; label: string; tone: 'success' | 'info' | 'warning' | 'danger' }> = [
  { k: 'd0_7', label: msg('0–7 din'), tone: 'success' }, { k: 'd8_15', label: msg('8–15 din'), tone: 'info' }, { k: 'd16_30', label: msg('16–30 din'), tone: 'warning' },
  { k: 'd31_60', label: msg('31–60 din'), tone: 'warning' }, { k: 'd60_plus', label: msg('60+ din'), tone: 'danger' },
];

export function RecoveriesScreen() {
  return <DistributionGate title={t('Recoveries')}><Recoveries /></DistributionGate>;
}

function Recoveries() {
  const th = useTheme();
  const refresh = useRefreshDistribution();
  const can = usePermission();
  const canVerify = can(P.DISTRIBUTION_COLLECTIONS_VERIFY);
  const canCollect = can(P.DISTRIBUTION_COLLECTIONS_COLLECT);
  const params = useLocalSearchParams<{ tab?: string; routeId?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'verify' ? 'verify' : 'ageing');
  const [routeId, setRouteId] = useState(params.routeId ?? '');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const [filters, setFilters] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [collectFor, setCollectFor] = useState<RecoveryRow | 'pick' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [remind, setRemind] = useState(false);
  const shop = useAuthStore((s) => s.tenant?.name ?? '');

  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const recQ = useQuery({
    queryKey: [DIST_KEY, 'recoveries', routeId, overdueOnly, q],
    queryFn: () => distributionApi.recoveries({ routeId: routeId || undefined, overdueOnly: overdueOnly || undefined, search: q || undefined, limit: 300 }),
    placeholderData: keepPreviousData,
  });
  const pendQ = useQuery({ queryKey: [DIST_KEY, 'collections', 'PENDING', routeId], queryFn: () => distributionApi.collections({ status: 'PENDING', routeId: routeId || undefined, limit: 200 }) });
  const histQ = useQuery({
    queryKey: [DIST_KEY, 'collections', 'history', historyStatus, routeId],
    queryFn: () => distributionApi.collections({ status: historyStatus || undefined, routeId: routeId || undefined, limit: 100 }),
    enabled: tab === 'history', placeholderData: keepPreviousData,
  });
  const r = recQ.data;
  const pending = pendQ.data?.collections ?? [];
  const pendingTotal = pendQ.data?.totals.PENDING;
  useEffect(() => setPicked(new Set()), [tab, routeId]);

  const verify = useMutation({
    mutationFn: (ids: string[]) => distributionApi.verify(ids),
    onSuccess: (res) => {
      if (res.verified) toast.success(t('{{verified}} recovery verify — khata me jama', { verified: res.verified }));
      res.results.filter((x) => !x.ok).forEach((b) => toast.error(b.error ?? t('Verify nahi hui')));
      setPicked(new Set()); void refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });
  const reject = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) => distributionApi.reject(ids, reason || undefined),
    onSuccess: (res) => { toast.success(t('{{rejected}} recovery reject', { rejected: res.rejected })); setRejecting(false); setPicked(new Set()); void refresh(); },
    onError: (e) => toast.error(distError(e)),
  });
  const shareSheet = async () => {
    if (!routeId) return setFilters(true);
    try { await shareText(recoverySheetText(await distributionApi.recoverySheet(routeId))); } catch (e) { toast.error(distError(e, t('Print nahi hua'))); }
  };

  const data: Item[] = useMemo(() => {
    if (tab === 'ageing') return (r?.customers ?? []).map((x) => ({ kind: 'cust', r: x }));
    if (tab === 'verify') return pending.map((c) => ({ kind: 'col', c }));
    return (histQ.data?.collections ?? []).map((c) => ({ kind: 'col', c }));
  }, [tab, r, pending, histQ.data]);
  const active = tab === 'ageing' ? recQ : tab === 'verify' ? pendQ : histQ;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pickedValue = pending.filter((c) => picked.has(c.id)).reduce((a, c) => a + c.amount, 0);
  const routeName = routesQ.data?.find((x) => x.id === routeId)?.name;

  const TABS = [
    { value: 'ageing', label: t('Udhaar'), count: r?.total },
    { value: 'verify', label: t('Verify baqi'), count: pendingTotal?.count ?? pending.length },
    { value: 'history', label: t('Recoveries') },
  ];

  const summary = (
    <View style={{ gap: th.space(2) }}>
      {tab === 'ageing' && r && <>
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Kul udhaar')} value={<Amount value={r.totals.balance} size="lg" weight="bold" />} hint={t('{{customers}} customers', { customers: r.totals.customers })} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Purana (overdue)')} value={<Amount value={r.totals.overdueBalance} size="lg" weight="bold" />} hint={t('{{overdueCustomers}} customers', { overdueCustomers: r.totals.overdueCustomers })}
            onPress={() => setOverdueOnly(!overdueOnly)} />
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {BUCKETS.map((b) => (
            <StatTile key={b.k} tone={b.tone} style={{ width: 130 }} label={t(b.label)} value={<Amount value={r.totals.ageing[b.k]} weight="bold" />}
              hint={r.totals.balance ? t('{{value}}% udhaar ka', { value: Math.round((r.totals.ageing[b.k] / r.totals.balance) * 100) }) : '—'} />
          ))}
        </ScrollView>
      </>}
      {tab === 'verify' && pendingTotal && <StatTile label={t('Verify baqi')} tone="warning" value={<Amount value={pendingTotal.amount} size="lg" weight="bold" />} hint={t('{{value}} recovery', { value: pendingTotal.count })} />}
      <CachedNote query={active} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate<Item>
        title={t('Recoveries')}
        subtitle={routeName ?? t('Udhaar ki wasooli')}
        actions={<>
          {!!r?.totals.overdueCustomers && <IconButton icon={MessageCircle} label={t('Sab overdue ko bhejein')} onPress={() => setRemind(true)} />}
          <IconButton icon={Printer} label={t('Recovery sheet')} onPress={() => void shareSheet()} />
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={routeId || overdueOnly || historyStatus ? 1 : undefined} onPress={() => setFilters(true)} />
        </>}
        search={tab === 'ageing' ? { value: search, onChange: setSearch, placeholder: t('Customer, dukaan ya phone') } : undefined}
        filters={{ value: tab, onChange: (v) => setTab(v as Tab), options: TABS }}
        summary={summary}
        data={data}
        loading={active.isLoading}
        error={active.isError && !data.length ? active.error : undefined}
        onRetry={() => void active.refetch()}
        refreshing={active.isRefetching}
        onRefresh={() => void refresh()}
        keyExtractor={(x) => (x.kind === 'cust' ? x.r.customer.id : x.c.id)}
        renderItem={({ item }) => {
          if (item.kind === 'cust') {
            const row = item.r;
            const wa = hasWhatsapp(row.customer.phone);
            const url = wa ? reminderLink(row.customer, row.balance, row.dueDays, shop) : null;
            return (
              <SwipeRow end={[
                ...(canCollect ? [{ icon: Wallet, label: t('Paisa mila'), tone: 'success' as const, onPress: () => setCollectFor(row) }] : []),
                ...(url ? [{ icon: MessageCircle, label: 'WhatsApp', tone: 'brand' as const, onPress: () => void Linking.openURL(url) }] : []),
              ]}>
                <ListRow title={partyName(row.customer)}
                  subtitle={[row.routeName ?? t('Route nahi'), row.dueDays ? t('{{dueDays}} din', { dueDays: row.dueDays }) : null, row.pendingCollected > 0 ? t('{{pendingCollected}} verify baqi', { pendingCollected: rs(row.pendingCollected) }) : null].filter(Boolean).join(' · ')}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={row.balance} weight="bold" tone={row.overdue ? 'danger' : undefined} />
                    <Text size="xs" tone="muted">{row.lastPaymentAt ? `${dayLabel(row.lastPaymentAt)} · ${rs(row.lastPaymentAmount ?? 0)}` : t('Kabhi nahi')}</Text></View>}
                  onPress={canCollect ? () => setCollectFor(row) : undefined} />
              </SwipeRow>
            );
          }
          const c = item.c;
          const isPending = tab === 'verify';
          return (
            <ListRow selected={picked.has(c.id)} title={c.customer ? partyName(c.customer) : '—'}
              subtitle={`${c.collectedByName ?? ''} · ${dayLabel(c.collectedAt)} · ${t(METHOD_LABEL[c.method])}${c.saleNumber ? ` · ${c.saleNumber}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={c.amount} weight="bold" />{!isPending && <StatusChip meta={COLLECTION_STATUS[c.status]} />}</View>}
              onPress={isPending && canVerify ? () => toggle(c.id) : undefined} />
          );
        }}
        empty={<EmptyState icon={tab === 'verify' ? BadgeCheck : CheckCircle2} title={tab === 'verify' ? t('Koi recovery verify ke liye baqi nahi. Booker ya delivery wale ki recovery yahan aayegi.') : tab === 'history' ? t('Abhi koi recovery nahi.') : overdueOnly ? t('Kisi ka udhaar purana nahi.') : t('Is filter me kisi par udhaar nahi.')} />}
        fab={canCollect && tab !== 'verify' ? { icon: Wallet, label: t('Paisa mila'), onPress: () => setCollectFor('pick') } : undefined}
      />

      {tab === 'verify' && picked.size > 0 && canVerify && (
        <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(4), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border, borderRadius: th.radius('xl'), padding: th.space(3), gap: th.space(2), elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <Row justify="between">
            <Text size="sm" weight="semibold">{t('{{size}} chune · {{value}}', { size: picked.size, value: rs(pickedValue) })}</Text>
            <IconButton icon={X} label={t('Chunna khatam')} size="sm" onPress={() => setPicked(new Set())} />
          </Row>
          <Row gap={2}>
            <Button style={{ flex: 1 }} variant="success" icon={BadgeCheck} loading={verify.isPending} onPress={() => verify.mutate([...picked])}>{t('Verify')}</Button>
            <Button style={{ flex: 1 }} variant="secondary" icon={XCircle} onPress={() => setRejecting(true)}>{t('Reject')}</Button>
          </Row>
        </View>
      )}
      {tab === 'verify' && !canVerify && pending.length > 0 && <Text size="sm" tone="muted" align="center" style={{ padding: th.space(3) }}>{t('Verify sirf manager ya malik kar sakta hai.')}</Text>}

      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')} footer={<Button fullWidth variant="secondary" onPress={() => { setRouteId(''); setOverdueOnly(false); setHistoryStatus(''); setFilters(false); }}>{t('Clear')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Route')} value={routeId} onChange={setRouteId} placeholder={t('Sab routes')} options={[{ value: '', label: t('Sab routes') }, ...(routesQ.data ?? []).map((x) => ({ value: x.id, label: x.name, description: x.area ?? undefined }))]} />
          {tab === 'ageing' && <Checkbox value={overdueOnly} onChange={setOverdueOnly} label={t('Sirf purana')} description={t('Credit days se zyada')} />}
          {tab === 'history' && <Select label={t('Halat')} value={historyStatus} onChange={setHistoryStatus} placeholder={t('Sab')}
            options={[{ value: '', label: t('Sab') }, ...(['PENDING', 'VERIFIED', 'REJECTED'] as const).map((s) => ({ value: s, label: t(COLLECTION_STATUS[s].label) }))]} />}
        </View>
      </Sheet>
      <CollectSheet open={!!collectFor} row={collectFor && collectFor !== 'pick' ? collectFor : null} rows={r?.customers ?? []} onClose={() => setCollectFor(null)} />
      <ReminderSheet open={remind} rows={r?.customers ?? []} shop={shop} onClose={() => setRemind(false)} />
      <ReasonSheet open={rejecting} title={t('{{rejected}} recovery reject', { rejected: picked.size })} confirmLabel={t('Reject')} busy={reject.isPending}
        onClose={() => setRejecting(false)} onSubmit={(reason) => reject.mutate({ ids: [...picked], reason })} />
    </View>
  );
}
