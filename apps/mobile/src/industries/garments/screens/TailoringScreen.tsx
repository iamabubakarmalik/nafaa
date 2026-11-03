/**
 * Stitching orders (web TailoringPage): due today and tomorrow, late, at
 * trial or ready, and the money still to collect; the record by view with
 * search; swipe a row for the next step, money or cancel. Orders need the
 * server; the last loaded lists stay readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, Clock, Scissors, Wallet } from 'lucide-react-native';
import { tailoringNext, type TailoringStatus } from '@nafaa/core/industries/garments';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { View } from 'react-native';
import { Amount, ListRow, Row, StatTile, StatusPill, SwipeRow, type SwipeAction } from '@/design';
import { tailoringApi, type TailoringOrder, type TailoringView } from '../api';
import { JobList } from '../components/JobList';
import { useTailoringActions } from '../components/useJobActions';
import { TAILORING_KEY, dueOf, priorityOf, stepLabel, tailoringStatus, whenText } from '../meta';

const VIEWS: Array<{ value: TailoringView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'today', label: msg('Aaj dena hai') }, { value: 'tomorrow', label: msg('Kal dena hai') },
  { value: 'late', label: msg('Late') }, { value: 'trial', label: msg('Trial / fitting') }, { value: 'ready', label: msg('Tayyar — lene aana hai') },
  { value: 'unpaid', label: msg('Paisa baqi') }, { value: 'done', label: msg('De diye / cancel') }, { value: 'all', label: msg('Sab') },
];

export function TailoringRowView({ o, act }: { o: TailoringOrder; act: ReturnType<typeof useTailoringActions> }) {
  const can = usePermission();
  const manage = can(P.POS_USE);
  const st = tailoringStatus(o.orderStatus);
  const next = tailoringNext(o.orderStatus);
  const due = dueOf(o);
  const open = o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED';
  const end: SwipeAction[] = manage && open ? [
    ...(next ? [{ icon: CheckCircle2, label: stepLabel(next.step), tone: 'success' as const, onPress: () => act.next(o) }] : []),
    ...(due > 0 ? [{ icon: Wallet, label: t('Payment'), tone: 'brand' as const, onPress: () => act.pay(o) }] : []),
  ] : [];
  const items = o.items.map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}`).join(', ');
  const pr = priorityOf(o.priority);
  return (
    <SwipeRow end={end}>
      <ListRow divider icon={Scissors} iconTone={st.tone} title={o.customerName || o.orderNumber}
        subtitle={`${o.orderNumber} · ${items}`}
        overline={open ? `${whenText(o.promisedDate)}${o.priority === 'HIGH' || o.priority === 'URGENT' ? ` · ${t(pr.label)}` : ''}` : undefined}
        trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>
          {due > 0 && open ? <Amount value={due} size="sm" tone="danger" /> : <Amount value={o.total} size="sm" />}
        </View>}
        chevron onPress={() => router.push(`/garments/tailoring/${o.id}` as never)} />
    </SwipeRow>
  );
}

export function TailoringScreen() {
  const can = usePermission();
  const act = useTailoringActions();
  const sum = useQuery({ queryKey: [TAILORING_KEY, 'summary', 'open'], queryFn: () => tailoringApi.summary(), refetchInterval: 60_000 });
  const open = sum.data?.open;
  return (
    <>
      <JobList<TailoringOrder, TailoringView, Awaited<ReturnType<typeof tailoringApi.page>>>
        title={t('Tailoring orders')} queryKey={TAILORING_KEY} views={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} defaultView="active"
        fetch={({ view, search, page }) => tailoringApi.page({ view, search, page, limit: 30, sort: 'due' })}
        searchPlaceholder={t('Customer, phone ya order #')} emptyIcon={Scissors} emptyTitle={t('Koi order nahi')}
        onNew={can(P.POS_USE) ? () => router.push('/garments/tailoring/new' as never) : undefined} newLabel={t('New')}
        line={(f) => (f.totals ? `${t('{{total}} orders · {{sales}}', { total: f.total, sales: formatMoney(f.totals.value) })}${f.totals.due > 0 ? ` · ${t('Lena baqi {{due}}', { due: formatMoney(f.totals.due) })}` : ''}` : null)}
        tiles={(setView) => (
          <>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone="warning" label={t('Aaj dena hai')} loading={!open} value={String(open?.today ?? 0)} onPress={() => setView('today')} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={open?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!open} value={String(open?.late ?? 0)} onPress={() => setView('late')} />
            </Row>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={!open} value={String(open?.ready ?? 0)} onPress={() => setView('ready')} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="info" label={t('Lena baqi')} loading={!open} value={<Amount value={open?.due ?? 0} size="lg" weight="bold" compact />} onPress={() => setView('unpaid')} />
            </Row>
          </>
        )}
        renderRow={(o) => <TailoringRowView o={o} act={act} />}
      />
      {act.modals}
    </>
  );
}

export type { TailoringStatus };
