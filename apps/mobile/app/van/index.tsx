/**
 * The salesman's van: the open day's sales and cash, the stock on the van,
 * and the two field actions (spot sale, market return). The office loads
 * the van and closes the day.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PackageOpen, ShoppingCart, Undo2 } from 'lucide-react-native';
import { ActionButton, ACCENT, Card, Empty, Row, ScreenHeader, rs } from '@/features/booker/ui/parts';
import { vanApi, type MyVan } from '@/features/van/api';

export default function VanHome() {
  const router = useRouter();
  const [van, setVan] = useState<MyVan | null>(null);
  const [state, setState] = useState<'loading' | 'none' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { vans } = await vanApi.mine();
      if (!vans.length) { setState('none'); return; }
      setVan(await vanApi.van(vans[0].id));
      setState('ok');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title={van?.name ?? 'Van'} subtitle={van ? [van.vehicleNo, van.routeName].filter(Boolean).join(' · ') : null} onBack={() => router.replace('/(tabs)')} />
      {state === 'loading' ? <ActivityIndicator className="mt-10" color={ACCENT} /> : (
        <ScrollView contentContainerClassName="p-4 gap-3" refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          {state === 'none' && <Empty icon={PackageOpen} title="Aap ko koi van nahi di gayi" text="Office se van aur salesman set karwayein" />}
          {state === 'error' && <Empty icon={PackageOpen} title="Van nahi khuli" text={error} />}
          {van && (
            <>
              <Card>
                <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">{van.session ? `Aaj (${van.session.dayKey})` : 'Din shuru nahi hua'}</Text>
                {van.session ? (
                  <>
                    <Row label="Invoices" value={String(van.session.money.invoices)} />
                    <Row label="Sale" value={rs(van.session.money.salesValue)} strong />
                    <Row label="Cash paas hona chahiye" value={rs(van.session.money.expectedCash)} />
                  </>
                ) : <Text className="text-sm text-neutral-500">Office van load karega to din shuru ho jayega.</Text>}
              </Card>
              <View className="flex-row gap-3">
                <ActionButton label="New sale" icon={ShoppingCart} className="flex-1" disabled={!van.session || !van.stock.length} onPress={() => router.push({ pathname: '/van/sell' as never, params: { vanId: van.id } })} />
                <ActionButton label="Return" icon={Undo2} tone="white" className="flex-1" onPress={() => router.push({ pathname: '/van/return' as never, params: { vanId: van.id } })} />
              </View>
              <Card>
                <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">Van par maal ({van.stock.length})</Text>
                {!van.stock.length && <Text className="text-sm text-neutral-500">Van khaali hai</Text>}
                {van.stock.map((s) => <Row key={`${s.productId}:${s.variantId ?? ''}`} label={[s.name, s.variantName].filter(Boolean).join(' · ')} value={s.text} />)}
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
