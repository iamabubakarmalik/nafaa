/**
 * Cheque register (PDC): customers' cheques with their dates. Deposit them
 * at the bank when the date comes, then mark them cleared or bounced. A
 * bounce takes the payment back off the khata.
 */

import { keepPreviousData, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Landmark, XCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, SwipeRow, toast, useDebouncedValue, useTheme } from '@/design';
import { DIST_KEY, distError } from '../api/distribution.api';
import { CHEQUE_STATUS_LABEL, phase2Api, type ChequeRow, type ChequeStatus } from '../api/phase2.api';
import { CachedNote, ReasonSheet, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { dayLabel, partyName, rs } from '../lib/meta';

type Tab = 'due' | 'open' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
const KEY = [DIST_KEY, 'cheques'] as const;
const TONE: Record<ChequeStatus, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = { RECEIVED: 'warning', DEPOSITED: 'info', CLEARED: 'success', BOUNCED: 'danger', CANCELLED: 'neutral' };

export function ChequesScreen() {
  return <DistributionGate title={t('Cheques')}><Cheques /></DistributionGate>;
}

function Cheques() {
  const th = useTheme();
  const refresh = useRefreshDistribution();
  const canManage = usePermission()(P.DISTRIBUTION_CHEQUES_MANAGE);
  const [tab, setTab] = useState<Tab>('due');
  const [search, setSearch] = useState('');
  const s = useDebouncedValue(search.trim(), 250);
  const [bouncing, setBouncing] = useState<ChequeRow | null>(null);

  const params = tab === 'due' ? { due: 'week' as const } : tab === 'open' ? { status: 'RECEIVED,DEPOSITED' } : { status: tab };
  const q = useInfiniteQuery({
    queryKey: [...KEY, tab, s],
    queryFn: ({ pageParam }) => phase2Api.cheques({ ...params, search: s || undefined, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page * l.limit < l.total ? l.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.cheques) ?? [], [q.data]);
  const due = q.data?.pages[0]?.due;

  const done = (msg: string) => () => { toast.success(msg); void refresh(); };
  const deposit = useMutation({ mutationFn: (id: string) => phase2Api.depositCheque(id), onSuccess: done(t('Bank me jama likh diya')), onError: (e) => toast.error(distError(e)) });
  const clear = useMutation({ mutationFn: (id: string) => phase2Api.clearCheque(id), onSuccess: done(t('Cheque clear')), onError: (e) => toast.error(distError(e, t('Clear nahi hua'))) });
  const cancel = useMutation({ mutationFn: (id: string) => phase2Api.cancelCheque(id), onSuccess: done(t('Cheque cancel')), onError: (e) => toast.error(distError(e)) });
  const bounce = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => phase2Api.bounceCheque(id, reason),
    onSuccess: () => { toast.success(t('Bounce likh diya')); setBouncing(null); void refresh(); },
    onError: (e) => toast.error(distError(e)),
  });

  const TABS = [
    { value: 'due', label: t('Is hafte') }, { value: 'open', label: t('Sab khule') }, { value: 'DEPOSITED', label: t('Bank me') }, { value: 'CLEARED', label: t('Clear') }, { value: 'BOUNCED', label: t('Bounce') },
  ];

  return (
    <>
      <ListTemplate<ChequeRow>
        title={t('Cheques')}
        subtitle={t('PDC register')}
        search={{ value: search, onChange: setSearch, placeholder: t('Cheque no. ya bank') }}
        filters={{ value: tab, onChange: (v) => setTab(v as Tab), options: TABS }}
        summary={<View style={{ gap: th.space(2) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone="warning" label={t('Aaj tak jama karne wale')} value={<Amount value={due?.today.amount ?? 0} weight="bold" />} hint={t('{{value}} cheques', { value: due?.today.count ?? 0 })} onPress={() => setTab('due')} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone="info" label={t('Is hafte')} value={<Amount value={due?.week.amount ?? 0} weight="bold" />} hint={t('{{value}} cheques', { value: due?.week.count ?? 0 })} onPress={() => setTab('due')} />
          </Row>
          <CachedNote query={q} />
        </View>}
        data={rows}
        loading={q.isLoading}
        error={q.isError && !rows.length ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        keyExtractor={(c) => c.id}
        renderItem={({ item: c }) => {
          const open = c.status === 'RECEIVED' || c.status === 'DEPOSITED';
          const busy = deposit.isPending || clear.isPending || cancel.isPending;
          return (
            <SwipeRow enabled={canManage && open} end={[
              ...(c.status === 'RECEIVED' ? [{ icon: Landmark, label: t('Deposit'), tone: 'info' as const, onPress: () => !busy && deposit.mutate(c.id) }] : []),
              { icon: CheckCircle2, label: t('Clear'), tone: 'success' as const, onPress: () => !busy && clear.mutate(c.id) },
              { icon: XCircle, label: t('Bounce'), tone: 'danger' as const, onPress: () => setBouncing(c) },
            ]}>
              <ListRow
                title={partyName(c.customer)}
                subtitle={`${c.bankName} · #${c.chequeNo} · ${dayLabel(c.chequeDate)}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Amount value={c.amount} weight="bold" />
                  <Row gap={1}>
                    {c.postDated && <StatusPill tone="accent">{t('PDC')}</StatusPill>}
                    {c.overdue && <StatusPill tone="danger">{t('Date guzar gayi')}</StatusPill>}
                    <StatusPill tone={TONE[c.status]} dot>{t(CHEQUE_STATUS_LABEL[c.status])}</StatusPill>
                  </Row>
                </View>}
              />
              {canManage && c.status === 'RECEIVED' && c.collectionStatus !== 'VERIFIED' && (
                <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(2) }}>
                  <Button size="sm" variant="ghost" disabled={busy} onPress={() => cancel.mutate(c.id)}>{t('Cancel')}</Button>
                </View>
              )}
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Landmark} title={t('Is filter me koi cheque nahi.')} message={t('Cheque Recoveries me \'Cheque\' chun kar ya phone se recovery me likha jata hai.')} />}
      />
      <ReasonSheet open={!!bouncing} title={bouncing ? t('Cheque #{{chequeNo}} bounce', { chequeNo: bouncing.chequeNo }) : ''}
        description={bouncing ? `${partyName(bouncing.customer)} · ${bouncing.bankName} · ${rs(bouncing.amount)}` : undefined}
        placeholder={t('Account me paise nahi (insufficient funds)')} confirmLabel={t('Bounce likhein')} busy={bounce.isPending}
        onClose={() => setBouncing(null)} onSubmit={(reason) => bouncing && bounce.mutate({ id: bouncing.id, reason: reason || undefined })} />
    </>
  );
}
