/**
 * End of day: the server's summary for the booker (visits, strike rate,
 * orders, recoveries, no-order reasons, shops not visited) after a sync,
 * and today's orders from the phone with their sync state.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, CloudOff, MapPinOff } from 'lucide-react-native';
import { bookerApi } from '@/features/booker/core/api';
import { dayOrders } from '@/features/booker/core/repo';
import type { DaySummary } from '@/features/booker/core/types';
import { http } from '@/features/booker/native/device';
import { useBookerStore, useDbQuery } from '@/features/booker/store';
import { ActionButton, Card, ACCENT_DARK, Row, ScreenHeader, SyncButton, Tag, rs } from '@/features/booker/ui/parts';

export default function BookerSummary() {
  const router = useRouter();
  const { today, pending, sync } = useBookerStore();
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: orders = [] } = useDbQuery((d) => dayOrders(d, today), [today]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useBookerStore.getState().pending > 0) await sync({ quiet: true });
      setSummary(await bookerApi(http).summary(today));
    } catch (e) {
      setError((e as Error)?.message || 'Hisaab nahi aaya');
    } finally {
      setLoading(false);
    }
  }, [sync, today]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title="Din ka hisaab" subtitle={today} right={<SyncButton />} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {pending > 0 && (
          <View className="rounded-2xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 flex-row gap-2">
            <CloudOff size={16} color="#d97706" />
            <Text className="flex-1 text-xs text-amber-800 dark:text-amber-200">{pending} entries abhi phone par hain. Sync hone ke baad hisaab poora hoga.</Text>
          </View>
        )}
        {!!error && (
          <View className="rounded-2xl bg-red-50 dark:bg-red-950 p-3 flex-row gap-2">
            <AlertTriangle size={16} color="#dc2626" />
            <Text className="flex-1 text-xs text-red-700 dark:text-red-300">{error}</Text>
          </View>
        )}
        {loading && !summary && <ActivityIndicator className="mt-6" />}

        {summary && (
          <>
            <View className="rounded-3xl p-5" style={{ backgroundColor: ACCENT_DARK }}>
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">Order value</Text>
              <Text className="text-3xl font-extrabold text-white mt-1">{rs(summary.orders.value)}</Text>
              <View className="mt-4 pt-3 border-t border-white/20 flex-row">
                <Big label="Visit" value={`${summary.visited}/${summary.planned}`} />
                <Big label="Orders" value={String(summary.orders.count)} />
                <Big label="Strike rate" value={`${Math.round(summary.strikeRate)}%`} />
                <Big label="Lines" value={String(summary.orders.lines)} />
              </View>
            </View>

            {!!summary.targets?.length && (
              <Card>
                <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">Target (is mahine)</Text>
                {summary.targets.map((t) => {
                  const fmt = (n: number) => (t.metric === 'VALUE' ? rs(n) : `${Math.round(n * 10) / 10} ${t.unitName ?? 'pcs'}`);
                  return (
                    <View key={t.id} className="mb-2">
                      <Row label={t.label} value={`${Math.round(t.pct)}%`} strong />
                      <View className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <View className={t.onTrack ? 'h-2 bg-emerald-600' : 'h-2 bg-amber-500'} style={{ width: `${Math.min(100, Math.max(0, t.pct))}%` }} />
                      </View>
                      <Text className="text-[11px] text-neutral-500 mt-1">{fmt(t.achieved)} / {fmt(t.target)} · baqi {fmt(t.remaining)} · roz {fmt(t.perDayNeeded)}</Text>
                    </View>
                  );
                })}
              </Card>
            )}

            <Card>
              <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">Recovery</Text>
              <Row label="Kul recovery" value={rs(summary.collections.amount)} strong />
              <Row label="Cash" value={rs(summary.collections.cash)} />
              <Row label="Office check baqi" value={rs(summary.collections.pending)} />
            </Card>

            {summary.noOrder.length > 0 && (
              <Card>
                <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">Order nahi mila</Text>
                {summary.noOrder.map((n) => <Row key={n.reason} label={n.label} value={String(n.count)} />)}
              </Card>
            )}

            {summary.notVisited.length > 0 && (
              <Card>
                <View className="flex-row items-center gap-1.5 mb-1">
                  <MapPinOff size={13} color="#dc2626" />
                  <Text className="text-[11px] font-extrabold uppercase text-neutral-400">Visit nahi hua ({summary.notVisited.length})</Text>
                </View>
                {summary.notVisited.map((c) => (
                  <Text key={c.id} onPress={() => router.push(`/booker/customer/${c.id}`)} className="text-sm text-neutral-700 dark:text-neutral-200 py-1">{c.name}</Text>
                ))}
              </Card>
            )}
          </>
        )}

        {orders.length > 0 && (
          <Card>
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Aaj ke orders (phone)</Text>
            <View className="gap-2">
              {orders.map((o) => (
                <View key={o.clientRef} className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{o.businessName || o.customerName}</Text>
                    <Text className="text-[11px] text-neutral-500">{o.number ?? 'Number sync ke baad'} · {o.lineCount} lines</Text>
                  </View>
                  <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{rs(o.serverTotal ?? o.localTotal)}</Text>
                  {o.status === 'SYNCED' ? <Tag tone="green">Office</Tag> : o.status === 'CONFLICT' ? <Tag tone="red">Nahi gaya</Tag> : <Tag tone="amber">Sync baqi</Tag>}
                </View>
              ))}
            </View>
          </Card>
        )}

        <ActionButton label="Route par wapas" tone="white" onPress={() => router.replace('/booker')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[9px] font-extrabold uppercase text-white/70">{label}</Text>
      <Text className="text-base font-extrabold text-white mt-0.5">{value}</Text>
    </View>
  );
}
