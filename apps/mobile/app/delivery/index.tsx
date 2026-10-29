/**
 * Delivery home: today's dispatched load sheet(s) with every invoice in
 * route order, what has been reported, the cash to hand in, and quick call
 * and map buttons. Pull down to send what waits and fetch the sheet again.
 */

import { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, HandCoins, MapPin, Menu, Navigation, Phone, Truck } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { useDeliveryQuery, useDeliveryStore } from '@/features/delivery/store';
import { effectiveReport, listSheets, reportsByOrder, returnsValue, sheetRecoveries, type LocalReport } from '@/features/delivery/core/repo';
import type { Invoice, Sheet } from '@/features/delivery/core/types';
import { openMap } from '@/features/booker/native/device';
import { ACCENT, ACCENT_DARK, ActionButton, Empty, FilterChip, rs } from '@/features/booker/ui/parts';
import { DeliverySyncButton, ReportTag } from '@/features/delivery/ui/parts';

type Filter = 'all' | 'left' | 'done';

interface Row { inv: Invoice; report: LocalReport | null }

export default function DeliveryHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { me, loading, error, issues, offline, lastDownloadAt, refresh } = useDeliveryStore();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, loading: reading } = useDeliveryQuery(async (db) => {
    const sheets = await listSheets(db);
    const local = await reportsByOrder(db);
    return Promise.all(sheets.map(async (sheet) => ({
      sheet,
      rows: sheet.invoices.map((inv) => ({ inv, report: effectiveReport(inv, local.get(inv.orderId)) })),
      recoveries: await sheetRecoveries(db, sheet),
    })));
  }, []);
  const trips = data ?? [];
  const canCollect = !!me?.canCollect;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refresh()} tintColor={ACCENT} />}
      >
        <View className="px-4 pt-3 pb-3 flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-2xl bg-teal-100 dark:bg-teal-950 items-center justify-center">
            <Truck size={20} color={ACCENT} />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">Delivery</Text>
            <Text numberOfLines={1} className="text-xs text-neutral-500">{user?.fullName}</Text>
          </View>
          <DeliverySyncButton />
          <Pressable
            onPress={() => router.push('/(tabs)/more')}
            hitSlop={8}
            className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
          >
            <Menu size={18} color="#525252" />
          </Pressable>
        </View>

        {!!error && (
          <View className="mx-4 mb-3 rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3 flex-row gap-2">
            <AlertTriangle size={16} color="#dc2626" />
            <Text className="flex-1 text-xs text-red-700 dark:text-red-300">{error}</Text>
          </View>
        )}

        {issues > 0 && (
          <Pressable onPress={() => router.push('/delivery/issues')} className="mx-4 mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 flex-row items-center gap-2">
            <AlertTriangle size={16} color="#d97706" />
            <Text className="flex-1 text-xs font-extrabold text-amber-800 dark:text-amber-200">{issues} entry server ne nahi li — dekhein</Text>
            <ChevronRight size={16} color="#d97706" />
          </Pressable>
        )}

        {!trips.length && !reading && (
          <Empty
            icon={Truck}
            title={loading ? 'Load sheet aa rahi hai…' : 'Aaj koi load sheet nahi'}
            text={offline ? 'Internet nahi hai — internet aane par neeche kheench kar taaza karein' : 'Office gaari dispatch kare to yahan aa jayegi. Neeche kheench kar taaza karein.'}
          />
        )}

        {trips.map(({ sheet, rows, recoveries }) => (
          <TripBlock key={sheet.id} sheet={sheet} rows={rows} recoveries={recoveries} filter={filter} setFilter={setFilter} canCollect={canCollect} />
        ))}

        {!!lastDownloadAt && trips.length > 0 && (
          <Text className="text-[10px] text-neutral-400 text-center mt-2">
            Sheet: {new Date(lastDownloadAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
            {offline ? ' · Internet nahi — kaam phone par save ho raha hai' : ''}
          </Text>
        )}
      </ScrollView>

      {trips.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-neutral-50/95 dark:bg-neutral-950/95 flex-row gap-3">
          {canCollect && (
            <ActionButton label="Recovery likhein" icon={HandCoins} tone="white" className="flex-1"
              onPress={() => router.push({ pathname: '/delivery/recovery', params: { sheetId: trips[0].sheet.id } })} />
          )}
          {issues > 0 && <ActionButton label={`Sync issues (${issues})`} icon={AlertTriangle} tone="accent" className="flex-1" onPress={() => router.push('/delivery/issues')} />}
        </View>
      )}
    </SafeAreaView>
  );
}

function TripBlock({ sheet, rows, recoveries, filter, setFilter, canCollect }: {
  sheet: Sheet; rows: Row[]; recoveries: Array<{ amount: number; method: string }>; filter: Filter; setFilter: (f: Filter) => void; canCollect: boolean;
}) {
  const router = useRouter();
  const open = rows.filter((r) => !r.report || r.report.state === 'issue');
  const done = rows.length - open.length;
  const money = useMemo(() => {
    let cash = 0;
    let other = 0;
    let back = 0;
    for (const { inv, report } of rows) {
      if (!report) continue;
      if (report.method === 'CASH') cash += report.cashCollected; else other += report.cashCollected;
      back += returnsValue(inv, report.outcome, report.lines);
    }
    const recCash = recoveries.filter((r) => r.method === 'CASH').reduce((s, r) => s + r.amount, 0);
    return { cash, other, back, recCash, handIn: cash + recCash };
  }, [rows, recoveries]);
  const shown = rows.filter((r) => (filter === 'left' ? !r.report || r.report.state === 'issue' : filter === 'done' ? r.report && r.report.state !== 'issue' : true));

  return (
    <View className="mb-2">
      <View className="px-4 mb-3">
        <View className="rounded-3xl p-5" style={{ backgroundColor: ACCENT_DARK }}>
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">{sheet.number} · {new Date(sheet.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</Text>
          <Text numberOfLines={2} className="text-lg font-extrabold text-white mt-1">{sheet.routeName ?? 'Mili juli route'}</Text>
          <Text numberOfLines={1} className="text-xs text-white/75 mt-0.5">
            {[sheet.vehicleNo, sheet.driverName, sheet.shopName].filter(Boolean).join(' · ') || 'Gaari'}
          </Text>
          <View className="mt-4 pt-3 border-t border-white/20 flex-row">
            <Stat label="Invoices" value={`${done}/${rows.length}`} />
            <Stat label="Maal value" value={rs(sheet.totalValue)} border />
            <Stat label="Wapas" value={rs(money.back)} border />
          </View>
          <View className="mt-3 rounded-2xl px-4 py-3 flex-row items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <View className="flex-1 pr-2">
              <Text className="text-[10px] font-extrabold uppercase text-white/70">Office ko cash dena hai</Text>
              <Text numberOfLines={1} className="text-[11px] text-white/70 mt-0.5">
                Invoice {rs(money.cash)}{canCollect ? ` · Recovery ${rs(money.recCash)}` : ''}{money.other ? ` · Bank/wallet ${rs(money.other)}` : ''}
              </Text>
            </View>
            <Text className="text-xl font-extrabold text-white">{rs(money.handIn)}</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} className="mb-3">
        <FilterChip label="Sab" count={rows.length} active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Jaana hai" count={open.length} active={filter === 'left'} onPress={() => setFilter('left')} />
        <FilterChip label="Ho gaye" count={done} active={filter === 'done'} onPress={() => setFilter('done')} />
      </ScrollView>

      {shown.map(({ inv, report }) => (
        <InvoiceRow key={inv.orderId} inv={inv} report={report} onPress={() => router.push(`/delivery/invoice/${inv.orderId}`)} />
      ))}
      {!shown.length && <Text className="text-xs text-neutral-500 text-center py-6">Is list me koi invoice nahi</Text>}
    </View>
  );
}

function Stat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <View className={border ? 'flex-1 border-l border-white/20 pl-2' : 'flex-1'}>
      <Text className="text-[9px] font-extrabold uppercase text-white/70">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className="text-sm font-extrabold text-white mt-0.5">{value}</Text>
    </View>
  );
}

function InvoiceRow({ inv, report, onPress }: Row & { onPress: () => void }) {
  const c = inv.customer;
  const back = report ? returnsValue(inv, report.outcome, report.lines) : 0;
  return (
    <Pressable onPress={onPress} className="mx-4 mb-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950 items-center justify-center">
          <Text className="text-sm font-extrabold" style={{ color: ACCENT }}>{inv.stop}</Text>
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-sm font-extrabold text-neutral-900 dark:text-white">{c?.businessName || c?.name || '—'}</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <MapPin size={10} color="#9ca3af" />
            <Text numberOfLines={1} className="flex-1 text-[11px] text-neutral-500">{[c?.businessName ? c?.name : null, c?.area || c?.address].filter(Boolean).join(' · ') || '—'}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{rs(inv.total)}</Text>
          <Text className="text-[10px] text-neutral-400 mt-0.5">{inv.saleNumber ?? inv.orderNumber}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2 mt-2.5 pl-[52px]">
        <View className="flex-1 flex-row flex-wrap gap-1">
          <ReportTag report={report} />
          {!!report && report.cashCollected > 0 && <Text className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">{rs(report.cashCollected)} mila</Text>}
          {back > 0 && report?.outcome === 'PARTIAL' && <Text className="text-[11px] font-extrabold text-red-600">−{rs(back)}</Text>}
          {report?.state === 'waiting' && <Text className="text-[11px] font-extrabold text-amber-600">· Phone par, sync hona hai</Text>}
        </View>
        {!!c?.phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)} hitSlop={6} className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
            <Phone size={14} color={ACCENT} />
          </Pressable>
        )}
        {c?.latitude != null && c?.longitude != null && (
          <Pressable onPress={() => openMap(c.latitude!, c.longitude!)} hitSlop={6} className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
            <Navigation size={14} color={ACCENT} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
