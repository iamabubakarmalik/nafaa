/**
 * Market returns desk: expiry, damaged or unsold goods that retailers hand
 * back. Approving credits the customer's khata, good stock goes back on the
 * shelf and damaged stock is written off. The booker and van screens collect
 * the returns; this is where the office approves or rejects them.
 */

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Undo2, X, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { askManagerPin } from '@/core/security/ManagerPin';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, DetailRow, EmptyState, IconButton, ListRow, ListTemplate, Row, Sheet, SkeletonRows, StatusPill, StatTile, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distError } from '../api/distribution.api';
import { phase2Api, RETURN_CONDITION_LABEL, type ApproveResult, type MarketReturnRow, type MarketReturnStatus, type ReturnCondition } from '../api/phase2.api';
import { CachedNote, ReasonSheet, StatusChip, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { dayTime, partyName, rs, trim, type Tone } from '../lib/meta';

const KEY = [DIST_KEY, 'market-returns'] as const;
const STATUS: Record<MarketReturnStatus, { label: string; tone: Tone }> = {
  PENDING: { label: msg('Approve baqi'), tone: 'amber' }, APPROVED: { label: msg('Approved'), tone: 'green' }, REJECTED: { label: msg('Reject'), tone: 'slate' },
};
const COND_TONE: Record<ReturnCondition, 'success' | 'danger' | 'warning'> = { GOOD: 'success', DAMAGED: 'danger', EXPIRED: 'warning' };

export function ReturnsScreen() {
  return <DistributionGate title={t('Market returns')}><Returns /></DistributionGate>;
}

function Returns() {
  const th = useTheme();
  const refresh = useRefreshDistribution();
  const canApprove = usePermission()(P.DISTRIBUTION_RETURNS_APPROVE);
  const [tab, setTab] = useState<MarketReturnStatus>('PENDING');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  useEffect(() => setPicked(new Set()), [tab]);

  const q = useInfiniteQuery({
    queryKey: [...KEY, tab],
    queryFn: ({ pageParam }) => phase2Api.returns({ status: tab, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page * l.limit < l.total ? l.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const counts = useQuery({ queryKey: [...KEY, 'counts'], queryFn: () => phase2Api.returns({ limit: 1 }) });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.returns) ?? [], [q.data]);
  const totals = counts.data?.totals ?? {};

  const approve = useMutation({
    mutationFn: async (ids: string[]): Promise<ApproveResult> => {
      let r = await phase2Api.approveReturns(ids);
      if (r.needsPin) {
        const pinIds = r.results.filter((x) => x.needsPin).map((x) => x.id);
        const pin = await askManagerPin(t('{{count}} return approve', { count: pinIds.length }), 'refund');
        if (pin) {
          const again = await phase2Api.approveReturns(pinIds, pin);
          const byId = new Map(again.results.map((x) => [x.id, x]));
          r = { ...again, results: r.results.map((x) => byId.get(x.id) ?? x), approved: r.approved + again.approved };
        }
      }
      return r;
    },
    onSuccess: (r) => {
      if (r.approved) toast.success(t('{{approved}} return approve — khata credit ho gaya', { approved: r.approved }));
      const bad = r.results.find((x) => !x.ok);
      if (bad) toast.error(`${bad.number ?? ''} ${bad.error ?? ''}`.trim());
      setPicked(new Set()); setOpen(null); void refresh();
    },
    onError: (e) => toast.error(distError(e, t('Approve nahi hua'))),
  });
  const reject = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) => phase2Api.rejectReturns(ids, reason),
    onSuccess: (r) => { toast.success(`${r.rejected} ${t('Reject')}`); setRejecting(null); setPicked(new Set()); setOpen(null); void refresh(); },
    onError: (e) => toast.error(distError(e, t('Reject nahi hua'))),
  });
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const TABS = [
    { value: 'PENDING', label: t('Approve baqi'), count: totals.PENDING?.count }, { value: 'APPROVED', label: t('Approved'), count: totals.APPROVED?.count }, { value: 'REJECTED', label: t('Reject'), count: totals.REJECTED?.count },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate<MarketReturnRow>
        title={t('Market returns')}
        subtitle={t('Retailer se wapsi')}
        filters={{ value: tab, onChange: (v) => setTab(v as MarketReturnStatus), options: TABS }}
        summary={<View style={{ gap: th.space(2) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Approve baqi')} value={String(totals.PENDING?.count ?? 0)} hint={rs(totals.PENDING?.value ?? 0)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Approved')} value={String(totals.APPROVED?.count ?? 0)} hint={t('credit {{value}}', { value: rs(totals.APPROVED?.credited ?? 0) })} />
          </Row>
          <CachedNote query={q} />
        </View>}
        data={rows}
        loading={q.isLoading}
        error={q.isError && !rows.length ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => { void q.refetch(); void counts.refetch(); }}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <ListRow selected={picked.has(r.id)} title={partyName(r.customer)}
            subtitle={`${r.number} · ${t('{{count}} items', { count: r.itemCount })} · ${r.collectedByName ?? ''} · ${dayTime(r.collectedAt)}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={r.totalValue} weight="bold" /><StatusChip meta={STATUS[r.status]} /></View>}
            onPress={() => (picked.size ? toggle(r.id) : setOpen(r.id))} onLongPress={tab === 'PENDING' && canApprove ? () => toggle(r.id) : undefined} />
        )}
        empty={<EmptyState icon={Undo2} title={t('Koi market return nahi')} message={t('Booker ya van se aayi wapsi yahan nazar aayegi.')} />}
      />

      {picked.size > 0 && canApprove && tab === 'PENDING' && (
        <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(4), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border, borderRadius: th.radius('xl'), padding: th.space(3), gap: th.space(2), elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <Row justify="between">
            <Text size="sm" weight="semibold">{t('{{size}} chune', { size: picked.size })}</Text>
            <IconButton icon={X} label={t('Chunna khatam')} size="sm" onPress={() => setPicked(new Set())} />
          </Row>
          <Row gap={2}>
            <Button style={{ flex: 1 }} icon={CheckCircle2} loading={approve.isPending} onPress={() => approve.mutate([...picked])}>{t('Approve')}</Button>
            <Button style={{ flex: 1 }} variant="secondary" icon={XCircle} onPress={() => setRejecting([...picked])}>{t('Reject')}</Button>
          </Row>
        </View>
      )}

      <ReturnSheet id={open} canApprove={canApprove} busy={approve.isPending} onClose={() => setOpen(null)}
        onApprove={(id) => approve.mutate([id])} onReject={(id) => setRejecting([id])} />
      <ReasonSheet open={!!rejecting} title={t('{{count}} return reject karein?', { count: rejecting?.length ?? 0 })} confirmLabel={t('Reject')} busy={reject.isPending}
        onClose={() => setRejecting(null)} onSubmit={(reason) => reject.mutate({ ids: rejecting ?? [], reason: reason || undefined })} />
    </View>
  );
}

function ReturnSheet({ id, canApprove, busy, onClose, onApprove, onReject }: {
  id: string | null; canApprove: boolean; busy: boolean; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  const th = useTheme();
  const q = useQuery({ queryKey: [...KEY, 'one', id], queryFn: () => phase2Api.marketReturn(id!), enabled: !!id });
  const r = q.data;
  return (
    <Sheet open={!!id} onClose={onClose} title={r?.number ?? t('Market returns')} description={r ? partyName(r.customer) : undefined}
      footer={r && r.status === 'PENDING' && canApprove ? (
        <Row gap={2}>
          <Button style={{ flex: 1 }} variant="secondary" icon={XCircle} onPress={() => onReject(r.id)}>{t('Reject')}</Button>
          <Button style={{ flex: 1 }} icon={CheckCircle2} loading={busy} onPress={() => onApprove(r.id)}>{t('Approve')}</Button>
        </Row>
      ) : undefined}>
      {!r ? <SkeletonRows count={3} /> : (
        <View style={{ gap: th.space(3) }}>
          <Row gap={2} wrap><StatusChip meta={STATUS[r.status]} /><Text size="sm" tone="muted">{r.collectedByName} · {dayTime(r.collectedAt)}</Text></Row>
          {r.items.map((i) => (
            <ListRow key={i.id} dense title={i.productName ?? ''} subtitle={[`${trim(i.qty)} ${i.unitName ?? i.baseUnit} × ${rs(i.rate)}`, i.reason, i.batchNo && `#${i.batchNo}`].filter(Boolean).join(' · ')}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={i.value} weight="semibold" /><StatusPill tone={COND_TONE[i.condition]}>{t(RETURN_CONDITION_LABEL[i.condition])}</StatusPill></View>} />
          ))}
          <DetailRow label={t('Total')} value={<Amount value={r.totalValue} weight="bold" />} last={r.status !== 'APPROVED' && !r.rejectReason} />
          {r.status === 'APPROVED' && <DetailRow label={t('Credit')} value={<Amount value={r.creditedAmount} />} last />}
          {r.rejectReason ? <Text size="sm" tone="danger">{r.rejectReason}</Text> : null}
          {r.note ? <Text size="sm" tone="muted">{r.note}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}
