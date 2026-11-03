/**
 * Bookings: advance orders and reservations. Open bookings by pickup day (late
 * ones first), the full record for a period, and analytics. Swipe a row for a
 * WhatsApp reminder, a payment or the ready mark. Bookings need the server;
 * the last loaded lists stay readable offline.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlarmClock, BarChart3, BookmarkPlus, CalendarDays, ListChecks, PackageCheck, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatWeekdayDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, ChipGroup, EmptyState, ListTemplate, Row, Segmented, StatTile, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { bookingsApi, type Booking, type BookingQuery, type BookingStatusFilter } from '../api/bookings';
import { BookingAnalyticsView } from '../components/BookingAnalytics';
import { BookingRow } from '../components/BookingRow';
import { PaymentSheet, refreshBookings } from '../components/BookingSheets';
import { ALL_FILTERS, BOOKINGS_KEY, bookingText, OPEN_FILTERS } from '../lib/meta';

type Tab = 'upcoming' | 'all' | 'analytics';
type Row = { kind: 'day'; key: string; label: string } | { kind: 'booking'; key: string; b: Booking };

export function BookingsScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const canManage = can(P.SERVICE_BOOKINGS_MANAGE);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [openStatus, setOpenStatus] = useState<BookingStatusFilter>('ACTIVE');
  const [status, setStatus] = useState<BookingStatusFilter | 'all'>('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const { preset, setPreset, period, startHour } = usePeriod('month');
  const [paying, setPaying] = useState<Booking | null>(null);

  const base = { search: query || undefined };
  const filters: BookingQuery = tab === 'upcoming' ? { ...base, status: openStatus, sort: 'pickup' } : { ...base, from: period.from === 'all' ? undefined : period.from, to: period.to, status: status === 'all' ? undefined : status };
  const list = useInfiniteQuery({
    queryKey: [BOOKINGS_KEY, 'records', filters],
    queryFn: ({ pageParam }) => bookingsApi.records({ ...filters, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    placeholderData: (p) => p,
    enabled: tab !== 'analytics',
  });
  const over = useQuery({ queryKey: [BOOKINGS_KEY, 'overview', period], queryFn: () => bookingsApi.overview(tab === 'all' ? { from: period.from === 'all' ? undefined : period.from, to: period.to } : {}), placeholderData: (p) => p, refetchInterval: 60_000 });
  const o = over.data;
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const rows = useMemo<Row[]>(() => {
    if (tab !== 'upcoming') return items.map((b) => ({ kind: 'booking', key: b.id, b }));
    const out: Row[] = [];
    let last = '';
    for (const b of items) {
      const label = b.expectedPickupAt ? formatWeekdayDate(b.expectedPickupAt) : t('Pickup ki date nahi');
      if (label !== last) { out.push({ kind: 'day', key: `d-${label}-${out.length}`, label }); last = label; }
      out.push({ kind: 'booking', key: b.id, b });
    }
    return out;
  }, [items, tab]);

  const ready = async (b: Booking) => {
    try { await bookingsApi.markReady(b.id, b.status !== 'READY_FOR_PICKUP'); refreshBookings(); toast.success(b.status === 'READY_FOR_PICKUP' ? t('Abhi tayyar nahi') : t('Tayyar')); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'upcoming', label: t('Pickup'), icon: CalendarDays }, { value: 'all', label: t('Sab'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      {tab !== 'analytics' && (
        <>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Khuli bookings ki amount')} loading={!o} value={<Amount value={o?.active.value ?? 0} size="lg" weight="bold" compact />} hint={t('{{count}} booking', { count: o?.active.count ?? 0 })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Advance hath me')} loading={!o} value={<Amount value={o?.active.held ?? 0} size="lg" weight="bold" compact />} hint={t('{{balance}} baqi', { balance: Math.round(o?.active.balance ?? 0) })} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" icon={AlarmClock} label={t('Late')} loading={!o} value={String(o?.overdue.count ?? 0)} onPress={() => { setTab('upcoming'); setOpenStatus('OVERDUE'); }} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" icon={CalendarDays} label={t('Aaj pickup')} loading={!o} value={String(o?.pickupToday ?? 0)} hint={t('Agle 7 din: {{count}}', { count: o?.upcoming ?? 0 })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="accent" icon={PackageCheck} label={t('Tayyar')} loading={!o} value={String(o?.ready.count ?? 0)} onPress={() => { setTab('upcoming'); setOpenStatus('READY_FOR_PICKUP'); }} />
          </Row>
          {tab === 'upcoming'
            ? <ChipGroup value={openStatus} onChange={(v) => setOpenStatus(v as BookingStatusFilter)} style={{ marginHorizontal: -th.space(4) }} options={OPEN_FILTERS.map((f) => ({ value: f.value, label: t(f.label), icon: f.icon }))} />
            : (
              <>
                <ChipGroup value={preset} onChange={(v) => setPreset(v as typeof preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
                <ChipGroup value={status} onChange={(v) => setStatus(v as typeof status)} style={{ marginHorizontal: -th.space(4) }} options={ALL_FILTERS.map((f) => ({ value: f.value, label: t(f.label) }))} />
              </>
            )}
          <CachedNote query={list} />
        </>
      )}
      {tab === 'analytics' && <BookingAnalyticsView period={period} />}
    </View>
  );

  return (
    <>
      <ListTemplate<Row>
        title={t('Bookings')}
        grouped={false}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Booking number, customer, phone ya note…') } : undefined}
        summary={header}
        data={tab === 'analytics' ? [] : rows}
        loading={tab !== 'analytics' && list.isLoading}
        error={tab !== 'analytics' && !list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void over.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => item.kind === 'day'
          ? <Text size="sm" weight="semibold" tone="secondary" style={{ paddingHorizontal: th.space(5), paddingTop: th.space(4), paddingBottom: th.space(1.5) }}>{item.label}</Text>
          : (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <BookingRow b={item.b} startHour={startHour} canManage={canManage}
                onWhatsApp={() => openWhatsApp(item.b.customer?.phone, bookingText(item.b, shop, startHour, lang))}
                onPay={() => setPaying(item.b)} onReady={() => void ready(item.b)} />
            </View>
          )}
        empty={<EmptyState icon={BookmarkPlus} title={t('Koi booking nahi')} message={t('Advance lein, maal rakhein, pickup par bill banayein')} />}
        fab={canManage ? { icon: Plus, label: t('Nayi booking'), onPress: () => router.push('/bookings/new' as never) } : undefined}
      />
      {paying && <PaymentSheet booking={paying} open onClose={() => setPaying(null)} />}
    </>
  );
}
