/**
 * Booker home: start of day download, today's routes and the customer list
 * with each shop's status for the day (visited, order, no order, waiting
 * to sync), search, and links to the day summary and sync issues.
 */

import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, BarChart3, ChevronRight, Download, MapPin, Menu, Search, Store, Truck, X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRCompact } from '@/lib/format';
import { useBookerStore, useDbQuery } from '@/features/booker/store';
import { listRoutes, localDayStats, routeCustomers, type CustomerFilter, type RouteCustomer } from '@/features/booker/core/repo';
import { ActionButton, Empty, FilterChip, ACCENT, ACCENT_DARK, ProgressBar, SyncButton, Tag, daysSince, rs } from '@/features/booker/ui/parts';

const STEP_LABEL: Record<string, string> = {
  manifest: 'Routes aur settings',
  customers: 'Customers',
  products: 'Products',
  prices: 'Price list',
  done: 'Ho gaya',
};

export default function BookerHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    manifest, today, lastFullDay, lastDownloadAt, downloading, progress, downloadError, syncError, issues, download, sync, offline,
  } = useBookerStore();
  const [routeSel, setRouteSel] = useState<string>('today');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');

  const { data: routes = [] } = useDbQuery((db) => listRoutes(db, today), [today]);
  const dueIds = useMemo(() => routes.filter((r) => r.dueToday).map((r) => r.id), [routes]);
  const routeIds = routeSel === 'all' ? null : routeSel === 'today' ? dueIds : [routeSel];
  const { data: rows = [], loading } = useDbQuery(
    (db) => routeCustomers(db, { dayKey: today, routeIds, search }),
    [today, JSON.stringify(routeIds), search],
  );
  const { data: stats } = useDbQuery((db) => localDayStats(db, today), [today]);

  const counts = useMemo(() => ({
    all: rows.length,
    left: rows.filter((c) => !c.orders && !c.visits).length,
    ordered: rows.filter((c) => c.orders > 0).length,
    noOrder: rows.filter((c) => c.noOrders > 0 && !c.orders).length,
    pending: rows.filter((c) => c.pending > 0).length,
  }), [rows]);
  const shown = useMemo(() => rows.filter((c) => {
    switch (filter) {
      case 'left': return !c.orders && !c.visits;
      case 'ordered': return c.orders > 0;
      case 'noOrder': return c.noOrders > 0 && !c.orders;
      case 'pending': return c.pending > 0;
      default: return true;
    }
  }), [rows, filter]);

  const needsDay = !manifest || lastFullDay !== today;
  const dueNames = routes.filter((r) => r.dueToday).map((r) => r.name);
  const planned = routes.filter((r) => r.dueToday).reduce((s, r) => s + r.customers, 0);
  const pct = progress && progress.total > 0 ? progress.done / progress.total : 0;

  const header = (
    <View>
      {/* Top bar */}
      <View className="px-4 pt-3 pb-3 flex-row items-center gap-3">
        <View className="h-10 w-10 rounded-2xl bg-teal-100 dark:bg-teal-950 items-center justify-center">
          <Truck size={20} color={ACCENT} />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">Order Booking</Text>
          <Text numberOfLines={1} className="text-xs text-neutral-500">{user?.fullName}</Text>
        </View>
        <SyncButton />
        <Pressable
          onPress={() => router.push('/(tabs)/more')}
          hitSlop={8}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <Menu size={18} color="#525252" />
        </Pressable>
      </View>

      {/* Day card */}
      <View className="px-4 mb-3">
        <View className="rounded-3xl p-5" style={{ backgroundColor: ACCENT_DARK }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">Aaj · {today}</Text>
              <Text numberOfLines={2} className="text-lg font-extrabold text-white mt-1">
                {dueNames.length ? dueNames.join(', ') : manifest ? 'Aaj koi route nahi' : 'Din shuru karein'}
              </Text>
            </View>
            {!needsDay && !downloading && (
              <Pressable onPress={() => download()} hitSlop={8} className="h-9 px-3 rounded-xl bg-white/15 flex-row items-center gap-1.5">
                <Download size={14} color="#fff" />
                <Text className="text-xs font-extrabold text-white">Update</Text>
              </Pressable>
            )}
          </View>

          {downloading ? (
            <View className="mt-4 gap-2">
              <Text className="text-xs font-extrabold text-white/90">
                {STEP_LABEL[progress?.step ?? 'manifest']} {progress && progress.step !== 'manifest' && progress.step !== 'done' ? `${progress.done}/${progress.total}` : ''}
              </Text>
              <ProgressBar value={progress?.step === 'manifest' ? 0.05 : pct} />
            </View>
          ) : needsDay ? (
            <View className="mt-4">
              <Text className="text-xs text-white/80 mb-3">
                {manifest ? 'Naye din ke liye customers, products aur price list dobara download karein.' : 'Pehli dafa: apne routes ke customers, products aur price list phone par download karein.'}
              </Text>
              <Pressable onPress={() => download()} className="h-12 rounded-2xl bg-white items-center justify-center flex-row gap-2">
                <Download size={18} color={ACCENT_DARK} />
                <Text className="text-sm font-extrabold" style={{ color: ACCENT_DARK }}>Din shuru karein</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-4 pt-3 border-t border-white/20 flex-row">
              <Stat label="Visit" value={`${stats?.visits ?? 0}/${planned}`} />
              <Stat label="Orders" value={String(stats?.orders ?? 0)} border />
              <Stat label="Order value" value={formatPKRCompact(stats?.value ?? 0).replace('.00', '')} border />
              <Stat label="Recovery" value={formatPKRCompact(stats?.collected ?? 0).replace('.00', '')} border />
            </View>
          )}
          {!!lastDownloadAt && !downloading && (
            <Text className="text-[10px] text-white/60 mt-3">
              Data: {new Date(lastDownloadAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
              {offline ? ' · Internet nahi — kaam phone par save ho raha hai' : ''}
            </Text>
          )}
        </View>
      </View>

      {!!(downloadError || syncError) && (
        <View className="mx-4 mb-3 rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3 flex-row gap-2">
          <AlertTriangle size={16} color="#dc2626" />
          <Text className="flex-1 text-xs text-red-700 dark:text-red-300">{downloadError ?? syncError}</Text>
        </View>
      )}

      {issues > 0 && (
        <Pressable onPress={() => router.push('/booker/issues')} className="mx-4 mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 flex-row items-center gap-2">
          <AlertTriangle size={16} color="#d97706" />
          <Text className="flex-1 text-xs font-extrabold text-amber-800 dark:text-amber-200">{issues} entry server ne nahi li — dekhein</Text>
          <ChevronRight size={16} color="#d97706" />
        </Pressable>
      )}

      {manifest && (
        <>
          {/* Routes */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} className="mb-3">
            <FilterChip label="Aaj ke routes" active={routeSel === 'today'} onPress={() => setRouteSel('today')} />
            {routes.map((r) => (
              <FilterChip key={r.id} label={r.name} count={r.customers} active={routeSel === r.id} onPress={() => setRouteSel(r.id)} />
            ))}
            <FilterChip label="Sab" active={routeSel === 'all'} onPress={() => setRouteSel('all')} />
          </ScrollView>

          {/* Search */}
          <View className="px-4 mb-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                placeholder="Dukaan, naam ya phone"
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
                className="flex-1 text-sm text-neutral-900 dark:text-white"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={12} className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                  <X size={14} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Status filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} className="mb-3">
            <FilterChip label="Sab" count={counts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label="Baqi" count={counts.left} active={filter === 'left'} onPress={() => setFilter('left')} />
            <FilterChip label="Order mila" count={counts.ordered} active={filter === 'ordered'} onPress={() => setFilter('ordered')} />
            <FilterChip label="No order" count={counts.noOrder} active={filter === 'noOrder'} onPress={() => setFilter('noOrder')} />
            <FilterChip label="Sync baqi" count={counts.pending} active={filter === 'pending'} onPress={() => setFilter('pending')} />
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <FlatList
        data={manifest ? shown : []}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => sync()} tintColor={ACCENT} />}
        renderItem={({ item }) => <CustomerRowCard c={item} showBalance={!!manifest?.me.canSeeBalance} onPress={() => router.push(`/booker/customer/${item.id}`)} />}
        ListEmptyComponent={manifest && !loading ? (
          <Empty
            icon={Store}
            title={search ? 'Koi dukaan nahi mili' : routeSel === 'today' && !dueIds.length ? 'Aaj aap ka koi route nahi' : 'Is list me koi dukaan nahi'}
            text={routeSel === 'today' && !dueIds.length ? 'Upar se koi aur route chunein' : undefined}
          />
        ) : null}
      />

      {manifest && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-neutral-50/95 dark:bg-neutral-950/95 flex-row gap-3">
          <ActionButton label="Din ka hisaab" icon={BarChart3} tone="white" className="flex-1" onPress={() => router.push('/booker/summary')} />
          {issues > 0 && <ActionButton label={`Sync issues (${issues})`} icon={AlertTriangle} tone="accent" className="flex-1" onPress={() => router.push('/booker/issues')} />}
        </View>
      )}
    </SafeAreaView>
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

function CustomerRowCard({ c, showBalance, onPress }: { c: RouteCustomer; showBalance: boolean; onPress: () => void }) {
  const due = daysSince(c.oldestDueAt);
  const overdue = !!(c.creditDays && due != null && due > c.creditDays);
  return (
    <Pressable onPress={onPress} className="mx-4 mb-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 flex-row items-center gap-3">
      <View className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950 items-center justify-center">
        <Text className="text-sm font-extrabold" style={{ color: ACCENT }}>{c.routeSeq ?? '–'}</Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-extrabold text-neutral-900 dark:text-white">{c.businessName || c.name}</Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <MapPin size={10} color="#9ca3af" />
          <Text numberOfLines={1} className="flex-1 text-[11px] text-neutral-500">{[c.businessName ? c.name : null, c.area || c.address].filter(Boolean).join(' · ') || '—'}</Text>
        </View>
        <View className="flex-row flex-wrap gap-1 mt-1.5">
          {c.orders > 0 && <Tag tone="green">Order {rs(c.orderValue)}</Tag>}
          {c.noOrders > 0 && !c.orders && <Tag tone="gray">No order</Tag>}
          {c.collected > 0 && <Tag tone="blue">Recovery {rs(c.collected)}</Tag>}
          {!c.orders && !c.visits && c.checkedIn > 0 && <Tag tone="accent">Check-in</Tag>}
          {c.pending > 0 && <Tag tone="amber">Sync baqi</Tag>}
        </View>
      </View>
      {showBalance && c.balance != null && (
        <View className="items-end">
          <Text className={`text-xs font-extrabold ${c.balance > 0 ? 'text-red-600' : 'text-neutral-400'}`}>{rs(c.balance)}</Text>
          {overdue && <Text className="text-[10px] font-extrabold text-red-500 mt-0.5">{due} din</Text>}
        </View>
      )}
      <ChevronRight size={16} color="#cbd5e1" />
    </Pressable>
  );
}
