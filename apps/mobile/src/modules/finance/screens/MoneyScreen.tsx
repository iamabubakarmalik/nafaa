/**
 * Shop accounts: money in and out of each account (cash, bank, card,
 * JazzCash, Easypaisa), the cash that should be in each open drawer, the
 * balance of safe, bank and wallet accounts, what the shop owns and owes, a
 * merged ledger of every movement, and analytics. Cash can be put into or
 * taken out of the drawer and moved between the drawer and accounts.
 */

import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, Banknote, Building2, Landmark, Plus, Vault, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, BarChart, Button, Card, ChipGroup, DonutChart, EmptyState, ErrorState, HBarList, IconButton, ListRow, ListTemplate, Sheet, Tabs, Text, StatusPill, useTheme } from '@/design';
import { PeriodBar } from '@/modules/reports/components/PeriodBar';
import { CachedNote, ChartCard, KpiGrid, LineItem } from '@/modules/reports/components/ui';
import { ExportButton } from '@/modules/reports/components/ExportButton';
import type { ReportDoc } from '@/modules/reports/lib/doc';
import { usePeriod } from '@/modules/reports/lib/period';
import { useReport } from '@/modules/reports/lib/useReport';
import { moneyApi, type MoneyAccount, type MoneyAccountRow, type MoneyEntry, type MoneySource } from '../api/money';
import { AccountSheet, MoveSheet, type MoveMode } from '../components/MoneySheets';
import { methodOf } from '../lib/meta';

type Tab = 'accounts' | 'ledger' | 'analytics';
const SOURCES: Record<MoneySource, string> = { SALE: 'Sale', KHATA: 'Khata wasool', CASH_IN: 'Cash in', REFUND: 'Return', PURCHASE: 'Purchase', SUPPLIER: 'Supplier ko ada', EXPENSE: 'Expense', CASH_OUT: 'Cash out' };
const PAGE = 40;
const monthName = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short' });

export function MoneyScreen() {
  const th = useTheme();
  const can = usePermission();
  const canMove = can(P.EXPENSES_CREATE);
  const canCash = can(P.CASH_REGISTER_OPEN);
  const canSetup = can(P.SETTINGS_EDIT);
  const period = usePeriod('month');
  const [tab, setTab] = useState<Tab>('accounts');
  const [account, setAccount] = useState<'' | MoneyAccount>('');
  const [source, setSource] = useState<'' | MoneySource>('');
  const [search, setSearch] = useState('');
  const [move, setMove] = useState<{ mode: MoveMode; account?: MoneyAccountRow } | null>(null);
  const [form, setForm] = useState<{ account: MoneyAccountRow | null } | null>(null);
  const [menu, setMenu] = useState<MoneyAccountRow | null>(null);

  const base = { from: period.period.from === 'all' ? undefined : period.period.from, to: period.period.to, account: account || undefined };
  const accountsQ = useReport('money-accounts', base, () => moneyApi.accounts(base), { refetchInterval: 60_000 });
  const posQ = useReport('money-position', {}, moneyApi.position, { refetchInterval: 60_000 });
  const listQ = useReport('money-list', {}, () => moneyApi.moneyAccounts(), { refetchInterval: 60_000 });
  const analyticsQ = useReport('money-analytics', base, () => moneyApi.analytics(base), { enabled: tab === 'analytics' });
  const ledger = useInfiniteQuery({
    queryKey: ['report', 'money-ledger', base, source, search],
    queryFn: ({ pageParam }) => moneyApi.ledger({ ...base, source: source || undefined, search: search.trim() || undefined, page: pageParam, limit: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    enabled: tab === 'ledger',
    placeholderData: keepPreviousData,
  });

  const acc = accountsQ.data;
  const pos = posQ.data;
  const accounts = listQ.data?.accounts ?? [];
  const rows = useMemo(() => ledger.data?.pages.flatMap((p) => p.items) ?? [], [ledger.data]);
  const totalBalance = (acc?.cash.inHand ?? 0) + (listQ.data?.total ?? 0);

  const doc = (): ReportDoc | null => {
    if (!acc) return null;
    return {
      title: t('Shop accounts'), subtitle: period.label, fileName: `accounts-${base.from ?? 'all'}-${base.to}`,
      summary: [[t('Galle me cash'), formatMoney(acc.cash.inHand)], [t('Accounts ka balance'), formatMoney(listQ.data?.total ?? 0)], [t('Aaya'), formatMoney(acc.totals.in)], [t('Gaya'), formatMoney(acc.totals.out)]],
      tables: [{ heading: t('Accounts'), columns: [t('Account'), t('Aaya'), t('Gaya'), t('Bacha')], rows: acc.accounts.map((a) => [t(methodOf(a.method).label), formatMoney(a.in), formatMoney(a.out), formatMoney(a.net)]) },
        ...(rows.length ? [{ heading: t('Ledger'), columns: [t('Waqt'), t('Kis liye'), t('Party'), t('Amount')], rows: rows.map((r) => [formatDateTime(r.at), t(SOURCES[r.source]), r.party ?? '', formatMoney(r.direction === 'in' ? r.amount : -r.amount)]) }] : [])],
    };
  };

  const actions = (
    <>
      <ExportButton build={doc} disabled={!acc} />
      {canMove && <IconButton icon={ArrowLeftRight} label={t('Paisa move karein')} onPress={() => setMove({ mode: 'transfer' })} />}
    </>
  );

  const accountsView = (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid loading={!acc} items={[
        { label: t('Galle me cash'), icon: Vault, tone: 'success', value: <Amount value={acc?.cash.inHand} size="xl" weight="bold" />, hint: acc?.cash.drawers.length ? t('Khule register ka hisaab') : t('Register band hai') },
        { label: t('Accounts ka balance'), icon: Building2, tone: 'info', value: <Amount value={listQ.data?.total} size="xl" weight="bold" />, hint: t('Asal balance') },
        { label: t('Kul paisa'), icon: Landmark, tone: 'brand', value: <Amount value={totalBalance} size="xl" weight="bold" /> },
        { label: t('Net worth'), icon: Wallet, tone: 'accent', value: <Amount value={pos?.netWorth} size="xl" weight="bold" colorize />, hint: pos ? `${t('Lena')} ${formatMoney(pos.receivables, { compact: true })} · ${t('Dena')} ${formatMoney(pos.payables, { compact: true })}` : undefined },
      ]} />
      {canCash && (
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Button variant="soft" icon={ArrowDownCircle} style={{ flex: 1 }} onPress={() => setMove({ mode: 'cashIn' })}>{t('Cash in')}</Button>
          <Button variant="soft" icon={ArrowUpCircle} style={{ flex: 1 }} onPress={() => setMove({ mode: 'cashOut' })}>{t('Cash out')}</Button>
        </View>
      )}
      {pos && (
        <Card title={t('Dukaan ke paas kya hai')}>
          <LineItem label={t('Galle me cash')} value={<Amount value={pos.cashInHand} />} />
          <LineItem label={t('Maal (cost par)')} hint={t('{{count}} items', { count: Math.round(pos.stockUnits) })} value={<Amount value={pos.stockCost} />} />
          <LineItem label={t('Customers se lena')} hint={t('{{count}} customers', { count: pos.receivableCount })} value={<Amount value={pos.receivables} />} />
          <LineItem label={t('Suppliers ko dena')} hint={t('{{count}} suppliers', { count: pos.payableCount })} value={<Amount value={-pos.payables} />} />
          <LineItem bold last label={t('Net worth')} value={<Amount value={pos.netWorth} weight="bold" colorize />} />
          {pos.shortfall > 0 && <Text size="sm" tone="warning" style={{ marginTop: th.space(2) }}>{t('Galle me suppliers ke paise se {{amount}} kam hain', { amount: formatMoney(pos.shortfall) })}</Text>}
        </Card>
      )}
      <Card flush title={t('Safe, bank aur wallet')} action={canSetup ? <Button variant="link" size="sm" icon={Plus} onPress={() => setForm({ account: null })}>{t('New')}</Button> : undefined}>
        {accounts.length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted" size="sm">{t('Abhi koi account nahi')}</Text></View> : accounts.map((a, i) => (
          <ListRow key={a.id} divider={i < accounts.length - 1} icon={a.kind === 'BANK' ? Building2 : a.kind === 'WALLET' ? Wallet : Banknote} title={a.name}
            subtitle={`${a.shop?.name ?? t('Poora business')}${a.auto ? ` · ${t('Khud judta hai')}` : ''}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={a.balance} weight="bold" colorize /><Text size="2xs" tone="muted" ltr>{`+${formatMoney(a.todayIn, { compact: true })} / -${formatMoney(a.todayOut, { compact: true })}`}</Text></View>}
            onPress={() => setMenu(a)} />
        ))}
      </Card>
      {acc && (
        <Card flush title={t('Is period me')} description={period.label}>
          {acc.accounts.map((a, i) => (
            <ListRow key={a.method} dense divider={i < acc.accounts.length - 1} icon={methodOf(a.method).icon} title={t(methodOf(a.method).label)} subtitle={`${t('Aaya')} ${formatMoney(a.in)} · ${t('Gaya')} ${formatMoney(a.out)}`} trailing={<Amount value={a.net} weight="bold" colorize />}
              onPress={() => { setAccount(a.method); setTab('ledger'); }} />
          ))}
        </Card>
      )}
      {acc && acc.cash.drawers.map((dr) => (
        <Card key={dr.id} title={`${dr.registerNumber}${dr.shop ? ` · ${dr.shop.name}` : ''}`} description={dr.openedBy ? `${dr.openedBy} · ${formatDateTime(dr.openedAt)}` : undefined} action={<StatusPill tone="warning">{t('Khuli')}</StatusPill>}>
          <LineItem label={t('Opening')} value={<Amount value={dr.opening} />} />
          <LineItem label={t('Cash sale')} value={<Amount value={dr.sales} />} />
          <LineItem label={t('Khata wasool')} value={<Amount value={dr.khata} />} />
          <LineItem label={t('Cash in / out')} value={<Amount value={dr.cashIn - dr.cashOut} signed />} />
          <LineItem label={t('Return, expense, purchase')} value={<Amount value={-(dr.refunds + dr.expenses + dr.purchases + dr.suppliers)} />} />
          <LineItem bold last label={t('Hona chahiye')} value={<Amount value={dr.expected} weight="bold" />} />
        </Card>
      ))}
    </View>
  );

  const analyticsView = !analyticsQ.data ? (analyticsQ.isError ? <ErrorState error={analyticsQ.error} onRetry={() => void analyticsQ.refetch()} /> : null) : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[{ label: t('Aaya'), tone: 'success', value: <Amount value={analyticsQ.data.totals.in} size="lg" weight="bold" /> }, { label: t('Gaya'), tone: 'danger', value: <Amount value={analyticsQ.data.totals.out} size="lg" weight="bold" /> }]} />
      {analyticsQ.data.trend.length > 1 && (
        <ChartCard title={t('Paisa aaya aur gaya')}>
          <BarChart labels={analyticsQ.data.trend.map((x) => (analyticsQ.data!.grouping === 'month' ? monthName(x.key) : x.key.slice(8)))} series={[{ key: 'in', label: t('Aaya'), values: analyticsQ.data.trend.map((x) => x.in), color: '#16a34a' }, { key: 'out', label: t('Gaya'), values: analyticsQ.data.trend.map((x) => x.out), color: '#e11d48' }]} format={formatMoney} />
        </ChartCard>
      )}
      <ChartCard title={t('Kahan se aaya, kahan gaya')}>
        <HBarList rows={analyticsQ.data.bySource.map((s) => ({ key: `${s.source}${s.direction}`, label: t(SOURCES[s.source]), value: s.amount, color: s.direction === 'in' ? '#16a34a' : '#e11d48', display: formatMoney(s.amount), hint: t('{{count}} entries', { count: s.count }) }))} />
      </ChartCard>
      <ChartCard title={t('Account ke hisaab se')}><DonutChart slices={analyticsQ.data.byAccount.map((a) => ({ key: a.method, label: t(methodOf(a.method).label), value: a.in, color: methodOf(a.method).color }))} /></ChartCard>
      {analyticsQ.data.expenseCategories.length > 0 && <ChartCard title={t('Expense category')}><HBarList rows={analyticsQ.data.expenseCategories.map((c) => ({ key: c.id ?? c.name, label: c.name, value: c.amount, color: c.color, display: formatMoney(c.amount) }))} /></ChartCard>}
    </View>
  );

  const renderEntry = ({ item: e }: { item: MoneyEntry }) => (
    <ListRow title={e.party ?? t(SOURCES[e.source])} subtitle={`${t(SOURCES[e.source])} · ${t(methodOf(e.method).label)} · ${formatDateTime(e.at)}${e.reference ? ` · ${e.reference}` : ''}`}
      icon={e.direction === 'in' ? ArrowDownCircle : ArrowUpCircle} iconTone={e.direction === 'in' ? 'success' : 'danger'} trailing={<Amount value={e.direction === 'in' ? e.amount : -e.amount} weight="bold" colorize />} />
  );

  return (
    <>
      <ListTemplate
        title={t('Shop accounts')}
        actions={actions}
        search={tab === 'ledger' ? { value: search, onChange: setSearch, placeholder: t('Party, reference ya wajah…') } : undefined}
        summary={<View style={{ gap: th.space(3) }}>
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'accounts', label: t('Accounts') }, { value: 'ledger', label: t('Ledger') }, { value: 'analytics', label: t('Analytics') }]} />
          <PeriodBar state={period} allowAll />
          {tab === 'ledger' && (
            <View style={{ gap: th.space(2) }}>
              <ChipGroup value={account} onChange={(v) => setAccount(v as '' | MoneyAccount)} options={[{ value: '', label: t('Sab accounts') }, ...(['CASH', 'BANK_TRANSFER', 'CARD', 'JAZZCASH', 'EASYPAISA'] as const).map((m) => ({ value: m, label: t(methodOf(m).label) }))]} />
              <ChipGroup value={source} onChange={(v) => setSource(v as '' | MoneySource)} options={[{ value: '', label: t('Sab') }, ...(Object.keys(SOURCES) as MoneySource[]).map((s) => ({ value: s, label: t(SOURCES[s]) }))]} />
            </View>
          )}
          <CachedNote query={tab === 'ledger' ? ledger : tab === 'analytics' ? analyticsQ : accountsQ} />
        </View>}
        data={tab === 'ledger' ? rows : []}
        loading={tab === 'ledger' ? ledger.isLoading : false}
        error={tab === 'ledger' ? ledger.error : null}
        onRetry={() => void ledger.refetch()}
        refreshing={accountsQ.isRefetching}
        onRefresh={() => { void accountsQ.refetch(); void posQ.refetch(); void listQ.refetch(); if (tab === 'ledger') void ledger.refetch(); }}
        onEndReached={() => { if (tab === 'ledger' && ledger.hasNextPage && !ledger.isFetchingNextPage) void ledger.fetchNextPage(); }}
        keyExtractor={(e) => e.id}
        renderItem={renderEntry}
        empty={tab === 'ledger' ? <EmptyState title={t('Is period me koi entry nahi')} />
          : <View style={{ paddingHorizontal: th.space(4) }}>{tab === 'accounts' ? (accountsQ.isError && !acc ? <ErrorState error={accountsQ.error} onRetry={() => void accountsQ.refetch()} /> : accountsView) : analyticsView}</View>}
      />
      <MoveSheet mode={move?.mode ?? null} account={move?.account} accounts={accounts} onClose={() => setMove(null)} />
      <AccountSheet open={!!form} account={form?.account ?? null} onClose={() => setForm(null)} />
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name} description={menu ? `${t('Balance')}: ${formatMoney(menu.balance)}` : undefined}>
        {menu && (
          <View style={{ gap: th.space(2) }}>
            {canMove && <>
              <Button variant="soft" icon={ArrowDownCircle} onPress={() => { const a = menu; setMenu(null); setTimeout(() => setMove({ mode: 'deposit', account: a }), 300); }}>{t('Jama karein')}</Button>
              <Button variant="soft" icon={ArrowUpCircle} onPress={() => { const a = menu; setMenu(null); setTimeout(() => setMove({ mode: 'withdraw', account: a }), 300); }}>{t('Nikalein')}</Button>
              <Button variant="soft" icon={ArrowLeftRight} onPress={() => { const a = menu; setMenu(null); setTimeout(() => setMove({ mode: 'transfer', account: a }), 300); }}>{t('Dusre account me bhejein')}</Button>
              {canCash && <Button variant="soft" icon={Vault} onPress={() => { const a = menu; setMenu(null); setTimeout(() => setMove({ mode: 'toAccount', account: a }), 300); }}>{t('Galle se is me daalein')}</Button>}
              {canCash && <Button variant="soft" icon={Banknote} onPress={() => { const a = menu; setMenu(null); setTimeout(() => setMove({ mode: 'fromAccount', account: a }), 300); }}>{t('Is se galle me daalein')}</Button>}
              <Button variant="soft" onPress={() => { const a = menu; setMenu(null); setTimeout(() => setMove({ mode: 'adjust', account: a }), 300); }}>{t('Balance theek karein')}</Button>
            </>}
            {canSetup && <Button variant="secondary" onPress={() => { const a = menu; setMenu(null); setTimeout(() => setForm({ account: a }), 300); }}>{t('Edit')}</Button>}
          </View>
        )}
      </Sheet>
    </>
  );
}
