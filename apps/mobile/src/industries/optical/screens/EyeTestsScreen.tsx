/**
 * Eye tests (web EyeTestsPage): book, start, write the result, take the fee.
 * Views by day and state, doctor filter, and doctor analytics. Swipe a row
 * for start, result, fee, WhatsApp, move, no-show or cancel. Needs the server;
 * the last loaded lists stay readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BarChart3, CalendarClock, CalendarPlus, CheckCircle2, Clock, Eye, ListChecks, MessageCircle, Play, SlidersHorizontal, Stethoscope, UserX, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { powerSummary } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Card, ChipGroup, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, SkeletonRows, StatTile, SwipeRow, Text, useDebouncedValue, useTheme, type SwipeAction } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { eyeTestsApi, optometristsApi, type EyeTestPage, type EyeTestView, type OpticalEyeTest } from '../api';
import { Pill } from '../components/parts';
import { TestDialogs, useTestActions, type TestDialog } from '../components/TestSheets';
import { usePaged } from '../hooks';
import { OPEN_TEST, OPTICAL_KEYS, dayOnly, testBookedText, testStatusOf } from '../meta';

type Tab = 'tests' | 'analytics';

const VIEWS: Array<{ value: EyeTestView; label: string }> = [
  { value: 'today', label: msg('Aaj') }, { value: 'waiting', label: msg('Baqi') }, { value: 'upcoming', label: msg('Aage') }, { value: 'done', label: msg('Ho gaye') },
  { value: 'unpaid', label: msg('Fees baqi') }, { value: 'followup', label: msg('Dobara aana') }, { value: 'closed', label: msg('Cancel / nahi aaye') }, { value: 'all', label: msg('Sab') },
];

export function EyeTestsScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const { cost } = useCostMask();
  const canBill = can(P.POS_USE);
  const params = useLocalSearchParams<{ view?: string }>();
  const [tab, setTab] = useState<Tab>('tests');
  const [view, setView] = useState<EyeTestView>((params.view as EyeTestView) || 'today');
  const [doctor, setDoctor] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(false);
  const [dialog, setDialog] = useState<TestDialog>(null);
  const q = useDebouncedValue(search.trim(), 250);
  const actions = useTestActions(() => setDialog(null));
  useEffect(() => { if (params.view) { setTab('tests'); setView(params.view as EyeTestView); } }, [params.view]);

  const doctors = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'all'], queryFn: () => optometristsApi.list() });
  const query = { view, search: q || undefined, optometristId: doctor || undefined };
  const { q: list, rows, first, more } = usePaged<OpticalEyeTest, EyeTestPage>([OPTICAL_KEYS.tests, 'page', query], (page) => eyeTestsApi.page({ ...query, page, limit: 30 }), tab === 'tests');
  const sum = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'summary'], queryFn: eyeTestsApi.summary, refetchInterval: 60_000 });
  const s = sum.data;
  const pick = (v: EyeTestView) => { setTab('tests'); setView(v); };

  const swipe = (x: OpticalEyeTest): SwipeAction[] => {
    const open = OPEN_TEST.includes(x.status);
    const due = x.isWaivedOff ? 0 : Math.max(x.testFee - x.paidAmount, 0);
    const out: SwipeAction[] = [];
    if (open && x.status !== 'IN_PROGRESS') out.push({ icon: Play, label: t('Shuru'), tone: 'brand', onPress: () => actions.start.mutate(x) });
    if (x.status === 'IN_PROGRESS' || x.status === 'COMPLETED') out.push({ icon: Stethoscope, label: x.status === 'COMPLETED' ? t('Result') : t('Result likhein'), tone: 'brand', onPress: () => router.push(`/optical/eye-tests/${x.id}` as never) });
    if (canBill && due > 0.009 && !['CANCELLED', 'NO_SHOW'].includes(x.status)) out.push({ icon: Wallet, label: t('Fees'), tone: 'info', onPress: () => setDialog({ kind: 'fee', test: x }) });
    if (open) {
      out.push({ icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => { openWhatsApp(x.customerPhone, testBookedText(x.customerName, dayOnly(x.appointmentDate), x.scheduledSlot, lang)); } });
      out.push({ icon: CalendarClock, label: t('Waqt badlein'), tone: 'neutral', onPress: () => setDialog({ kind: 'move', test: x }) });
      out.push({ icon: UserX, label: t('Nahi aaya'), tone: 'warning', onPress: () => setDialog({ kind: 'noshow', test: x }) });
      out.push({ icon: XCircle, label: t('Cancel'), tone: 'danger', onPress: () => setDialog({ kind: 'cancel', test: x }) });
    }
    return out;
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'tests', label: t('Tests'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Clock} tone="info" label={t('Booked')} loading={!s} value={String(s?.scheduled ?? 0)} hint={t('Test jaari: {{count}}', { count: s?.inProgress ?? 0 })} onPress={() => pick('waiting')} />
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Aaj ho gaye')} loading={!s} value={String(s?.completedToday ?? 0)} hint={t('Is mahine {{count}}', { count: s?.monthCount ?? 0 })} onPress={() => pick('today')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Fees baqi')} loading={!s} value={<Amount value={s?.unpaidAmount ?? 0} size="lg" weight="bold" compact />} hint={t('{{value}} test', { value: s?.unpaidCount ?? 0 })} onPress={() => pick('unpaid')} />
        <StatTile style={{ flex: 1 }} icon={CalendarClock} tone="accent" label={t('Dobara aana')} loading={!s} value={String(s?.pendingFollowUps ?? 0)} onPress={() => pick('followup')} />
      </Row>
      {tab === 'tests' && (
        <>
          <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }} options={VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} />
          {first && first.total > 0 && <Text size="sm" tone="secondary">{t('Fees: {{fees}} · mili {{paid}}', { fees: cost(first.totals.fees), paid: cost(first.totals.paid) })}</Text>}
          <CachedNote query={list} />
        </>
      )}
      {tab === 'analytics' && <Analytics />}
    </View>
  );

  return (
    <>
      <ListTemplate<OpticalEyeTest>
        title={t('Eye tests')} subtitle={t('Book → shuru → result → fees')}
        grouped={false}
        actions={tab === 'tests' ? <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={doctor ? 1 : undefined} onPress={() => setFilters(true)} /> : undefined}
        search={tab === 'tests' ? { value: search, onChange: setSearch, placeholder: t('Test number, customer ya mobile…') } : undefined}
        summary={header}
        data={tab === 'tests' ? rows : []}
        loading={tab === 'tests' && list.isLoading}
        error={tab === 'tests' && !list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        onEndReached={more}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const due = x.isWaivedOff ? 0 : Math.max(x.testFee - x.paidAmount, 0);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={swipe(x)}>
                <ListRow
                  overline={`${x.scheduledSlot ?? '—'} · ${dayOnly(x.appointmentDate)} · ${x.testNumber}`}
                  title={`${x.customerName}${x.customerAge ? ` · ${t('{{count}} saal', { count: x.customerAge })}` : ''}`}
                  subtitle={<Text size="xs" tone="muted" numberOfLines={2}>{[x.optometristName, powerSummary(x, t('Plano')) || x.chiefComplaint].filter(Boolean).join(' · ') || '—'}</Text>}
                  trailing={(
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Pill meta={testStatusOf(x.status)} />
                      <Text size="xs" weight="semibold" ltr>{formatMoney(x.testFee)}</Text>
                      {x.isWaivedOff ? <Text size="2xs" tone="muted">{t('Maaf')}</Text> : due > 0.009 ? <Text size="2xs" weight="semibold" tone="warning">{t('{{due}} baqi', { due: formatMoney(due) })}</Text> : x.testFee > 0 ? <Text size="2xs" tone="success">{t('Mil gayi')}</Text> : null}
                    </View>
                  )}
                  chevron onPress={() => router.push(`/optical/eye-tests/${x.id}` as never)} />
              </SwipeRow>
            </View>
          );
        }}
        empty={tab === 'tests' ? <EmptyState icon={Eye} title={view === 'today' ? t('Aaj koi test book nahi') : t('Is list me koi test nahi')} message={t('Customer aaye to test book karein — walk-in bhi.')} /> : undefined}
        fab={{ icon: CalendarPlus, label: t('Test book'), onPress: () => setDialog({ kind: 'book' }) }}
      />
      <TestDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} onBooked={() => pick('today')} />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Doctor')} value={doctor} onChange={setDoctor} options={[{ value: '', label: t('Sab doctor') }, ...(doctors.data ?? []).map((d) => ({ value: d.id, label: d.name }))]} />
          {doctor ? <ListRow title={t('Filter saaf karein')} destructive onPress={() => setDoctor('')} /> : null}
        </View>
      </Sheet>
    </>
  );
}

function Analytics() {
  const th = useTheme();
  const { cost } = useCostMask();
  const doctors = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'all'], queryFn: () => optometristsApi.list() });
  const rows = (doctors.data ?? []).filter((d) => d.totalTests > 0 || d.isActive);
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Doctor ke test')} description={t('Ab tak mukammal test')}>
        {doctors.isLoading ? <SkeletonRows count={2} /> : rows.length ? <HBarList colorful rows={rows.map((d) => ({ key: d.id, label: d.name, value: d.totalTests }))} /> : <Text tone="muted">{t('Abhi koi doctor nahi')}</Text>}
      </Card>
      <Card title={t('Doctor ki fees')} description={t('Ab tak li gayi fees (bill)')}>
        {doctors.isLoading ? <SkeletonRows count={2} /> : rows.length ? <HBarList colorful rows={rows.map((d) => ({ key: d.id, label: d.name, value: d.totalRevenue, display: cost(d.totalRevenue) }))} /> : <Text tone="muted">{t('Abhi koi fees nahi')}</Text>}
      </Card>
    </View>
  );
}
