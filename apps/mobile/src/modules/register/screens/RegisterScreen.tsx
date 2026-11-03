/**
 * Cash register (galla) of the active shop: open the shift with the
 * opening cash, cash in / out with a reason, close with the count (notes or
 * one total) and the difference, plus the day's summary. Opening, cash moves
 * and closing work offline (the close waits for this phone's bills); the
 * live count and the day summary need internet and show the last saved copy.
 */

import { ArrowDownToLine, ArrowUpFromLine, Lock, PlayCircle, RotateCcw, Wallet } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';
import { formatDateTime, formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { offline, useApiQuery, useCachedNotice } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, DetailRow, DetailSection, EmptyState, HeroAmount, PageHero, Row, Screen, Skeleton, StatTile, Text, useLayout, useTheme,
} from '@/design';
import { CashMoveSheet, CloseSheet, OpenSheet } from '../components/RegisterSheets';
import { ledgerRows, type CashBreakdown, type CurrentRegister, type DayReport } from '../lib/register';

export const REGISTER_KEY = ['offline', 'register'];

export function useRegisterState(shopId: string | null) {
  return useQuery({
    queryKey: [...REGISTER_KEY, shopId],
    queryFn: () => offline.register.state(shopId!),
    enabled: !!shopId,
    networkMode: 'always',
    staleTime: 0,
  });
}

export function RegisterScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const online = useOnlineStatus();
  const shopId = shopParam(useAuthStore((s) => s.currentShopId)) ?? null;
  const state = useRegisterState(shopId);
  const current = useApiQuery<CurrentRegister | null>('/cash-register/current', undefined, { enabled: !!shopId && can(P.CASH_REGISTER_VIEW) });
  const day = useApiQuery<DayReport>('/dashboard/day-report', shopId ? { shopId } : undefined, { enabled: !!shopId && can(P.CASH_REGISTER_VIEW) });
  const cached = useCachedNotice(current);
  const [sheet, setSheet] = useState<null | 'open' | 'in' | 'out' | 'close'>(null);

  const refresh = () => { void state.refetch(); void current.refetch(); void day.refetch(); };
  const done = () => { setSheet(null); refresh(); };

  if (!can(P.CASH_REGISTER_VIEW)) return <Screen title={t('Cash register')}><EmptyState icon={Lock} title={t('You do not have access to the cash register')} /></Screen>;
  if (!shopId) return <Screen title={t('Cash register')}><EmptyState icon={Wallet} title={t('Choose a shop first')} /></Screen>;

  if (state.isLoading) return <Screen title={t('Cash register')}><View style={{ gap: 16 }}><Skeleton height={120} radius={20} /><Skeleton height={200} radius={20} /></View></Screen>;

  const st = state.data;
  const open = !!st?.open;
  // The server's live count is the truth when it is for the same shift.
  const live: CashBreakdown | undefined = open && current.data && current.data.status === 'OPEN' ? current.data.live : undefined;
  const expected = live?.expected ?? (st ? st.openingBalance + st.cashIn - st.cashOut : 0);

  return (
    <Screen title={t('Cash register')} refreshing={current.isRefetching} onRefresh={refresh} narrow={isTablet}
      footer={open ? (
        <Row gap={2}>
          {can(P.CASH_REGISTER_OPEN) && <Button variant="secondary" icon={ArrowDownToLine} style={{ flex: 1 }} onPress={() => setSheet('in')}>{t('Cash in')}</Button>}
          {can(P.CASH_REGISTER_OPEN) && <Button variant="secondary" icon={ArrowUpFromLine} style={{ flex: 1 }} onPress={() => setSheet('out')}>{t('Cash out')}</Button>}
          {can(P.CASH_REGISTER_CLOSE) && <Button variant="danger" icon={Lock} style={{ flex: 1 }} onPress={() => setSheet('close')}>{t('Close')}</Button>}
        </Row>
      ) : can(P.CASH_REGISTER_OPEN) ? (
        <Button size="xl" fullWidth icon={PlayCircle} onPress={() => setSheet('open')}>{t('Open register')}</Button>
      ) : undefined}>
      <View style={{ gap: th.space(4) }}>
        {open ? (
          <PageHero
            title={t('Cash in the drawer')}
            chip={st?.pending ? t('Waiting to sync') : t('Open')}
            stats={[{ label: t('Should be'), value: <HeroAmount value={expected} size="3xl" /> }]}
          />
        ) : (
          <Card tone="muted">
            <View style={{ alignItems: 'center', gap: th.space(2), paddingVertical: th.space(4) }}>
              <Wallet size={40} color={th.colors.textMuted} />
              <Text size="lg" weight="bold">{t('The register is closed')}</Text>
              <Text size="sm" tone="muted" align="center">{t('Open it with the cash in the drawer to start the day. Sales still work without it.')}</Text>
            </View>
          </Card>
        )}

        {open && (
          <DetailSection title={t('This shift')}>
            <DetailRow label={t('Opened')} value={st?.openedAt ? formatDateTime(st.openedAt) : '—'} />
            {live ? ledgerRows(live).filter((r) => r.keep || r.value).map((r) => (
              <DetailRow key={r.label} label={`${r.sign === '−' ? '−' : '+'} ${r.label}`} value={<Amount value={r.value} weight="semibold" />} />
            )) : (
              <>
                <DetailRow label={`+ ${t('Opening cash')}`} value={<Amount value={st?.openingBalance ?? 0} weight="semibold" />} />
                {!!st?.cashIn && <DetailRow label={`+ ${t('Cash put in')}`} value={<Amount value={st.cashIn} weight="semibold" />} />}
                {!!st?.cashOut && <DetailRow label={`− ${t('Cash taken out')}`} value={<Amount value={st.cashOut} weight="semibold" />} />}
              </>
            )}
            <DetailRow label={t('Should be in the drawer')} value={<Amount value={expected} size="lg" weight="bold" />} last />
          </DetailSection>
        )}
        {open && !live && <Text size="xs" tone="muted">{online ? t('Getting the live count…') : t('Cash sales are added to this count when the phone is online.')}</Text>}
        {cached.fromCache && cached.updatedAt && <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text>}

        {live && live.byMethod.length > 0 && (
          <DetailSection title={t('Not in the drawer')}>
            {live.byMethod.filter((m) => m.method !== 'CASH').map((m) => (
              <DetailRow key={m.method} label={`${t(m.method === 'BANK_TRANSFER' ? 'Bank' : m.method === 'JAZZCASH' ? 'JazzCash' : m.method === 'EASYPAISA' ? 'Easypaisa' : m.method === 'CARD' ? 'Card' : m.method)} · ${m.count}`} value={<Amount value={m.paid} weight="semibold" />} />
            ))}
            <DetailRow label={t('Khata given')} value={<Amount value={live.creditGiven} weight="semibold" />} last />
          </DetailSection>
        )}

        {day.data && (
          <View style={{ gap: th.space(2) }}>
            <Text size="xs" weight="semibold" tone="muted" uppercase>{t('Today')}</Text>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Sale')} value={<Amount value={day.data.sales.total} size="lg" weight="bold" />} hint={t('{{count}} bills', { count: day.data.sales.bills })} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Cash collected')} tone="success" value={<Amount value={day.data.cashCollected} size="lg" weight="bold" />} />
            </Row>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Online / card')} tone="info" value={<Amount value={day.data.onlineCollected} size="lg" weight="bold" />} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Khata given')} tone="warning" value={<Amount value={day.data.sales.credit} size="lg" weight="bold" />} />
            </Row>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Expense')} tone="danger" value={<Amount value={day.data.expenses.total} size="lg" weight="bold" />} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Returns')} icon={RotateCcw} value={<Amount value={day.data.sales.refunds} size="lg" weight="bold" />} hint={t('{{count}} returns', { count: day.data.sales.refundCount })} />
            </Row>
            {can(P.PROFIT_REPORT_VIEW) && day.data.profit && (
              <StatTile label={t('Profit today')} tone="success" value={<Amount value={day.data.profit.netProfit} size="xl" weight="bold" colorize />} />
            )}
            {day.data.cash.allClosed && day.data.cash.difference != null && (
              <Row justify="between" style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
                <Text weight="semibold">{t('Counted at close')}</Text>
                <Row gap={2}>
                  <Amount value={day.data.cash.countedClosing ?? 0} weight="bold" />
                  <Badge tone={Math.abs(day.data.cash.difference) < 0.5 ? 'success' : day.data.cash.difference < 0 ? 'danger' : 'info'}>
                    {Math.abs(day.data.cash.difference) < 0.5 ? t('Matched') : `${day.data.cash.difference > 0 ? '+' : '−'}${formatMoney(Math.abs(day.data.cash.difference))}`}
                  </Badge>
                </Row>
              </Row>
            )}
          </View>
        )}
      </View>
      <OpenSheet open={sheet === 'open'} shopId={shopId} onClose={() => setSheet(null)} onDone={done} />
      <CashMoveSheet type={sheet === 'in' ? 'CASH_IN' : sheet === 'out' ? 'CASH_OUT' : null} shopId={shopId} onClose={() => setSheet(null)} onDone={done} />
      <CloseSheet open={sheet === 'close'} shopId={shopId} expected={expected} exact={!!live} onClose={() => setSheet(null)} onDone={done} />
    </Screen>
  );
}
