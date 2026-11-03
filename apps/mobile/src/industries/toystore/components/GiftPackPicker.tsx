/**
 * The "Gift packs" tab on the counter: gift packs on sale now (each sells as
 * one line and its toys leave stock), the gift wrapping service line, and a
 * way to the gift finder. Packs are read from the server and need internet.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Gift, Scissors, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import type { ComboInput } from '@nafaa/core/pos';
import { isLive } from '@nafaa/core/industries/toystore';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, EmptyState, ListRow, Skeleton, Text, useTheme } from '@/design';
import { usePos } from '@/modules/pos/engine/usePos';
import { toyGiftPacksApi, toyProductsApi, type ToyGiftPack } from '../api';
import { KEYS } from '../meta';

/** Gift packs on the counter now: switched on, inside their dates, with toys. */
export const livePacks = (packs: ToyGiftPack[]) => packs.filter((g) => isLive(g) && (g.items ?? []).length > 0);

export const comboOf = (g: ToyGiftPack): ComboInput => ({
  id: g.id, name: g.name, price: Number(g.giftPackPrice), image: g.imageUrl ?? undefined, savings: Number(g.savings || 0),
  items: g.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: Number(i.quantity) || 1, originalPrice: Number(i.unitPrice) || 0 })),
});

export function GiftPackPicker({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const api = usePos();
  const [busy, setBusy] = useState<string | null>(null);
  const packs = useQuery({ queryKey: [KEYS.posPacks], queryFn: () => toyGiftPacksApi.list({ active: true }), staleTime: 60_000, retry: 1 });
  const wrap = useQuery({ queryKey: [KEYS.wrap, 'pos'], queryFn: () => toyProductsApi.giftWrap(), staleTime: 60_000, retry: 1 });
  const list = livePacks(packs.data ?? []);
  const w = wrap.data?.isActive ? wrap.data : null;
  const card = { borderRadius: th.radius('xl'), overflow: 'hidden' as const, backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border };
  if (packs.isLoading) return <View style={{ padding: th.space(4) }}><Skeleton height={80} /></View>;
  return (
    <FlatList
      data={list}
      keyExtractor={(g) => g.id}
      contentContainerStyle={{ padding: th.space(3), paddingBottom: padBottom, gap: th.space(2) }}
      onRefresh={() => { void packs.refetch(); void wrap.refetch(); }}
      refreshing={packs.isRefetching}
      ListHeaderComponent={(
        <View style={{ gap: th.space(2), marginBottom: th.space(2) }}>
          {w && (
            <View style={{ ...card, opacity: busy === 'wrap' ? 0.6 : 1 }}>
              <ListRow icon={Scissors} iconTone="info" title={w.name || t('Gift wrap')} subtitle={t('Service — stock nahi ginta')} trailing={<Text weight="bold" ltr>{formatMoney(w.price)}</Text>}
                onPress={() => { setBusy('wrap'); void api.addProduct(w.id, { oversell: true }).finally(() => setBusy(null)); }} />
            </View>
          )}
          <View style={card}><ListRow icon={Sparkles} iconTone="accent" title={t('Gift finder')} subtitle={t('Umar aur budget se khilone')} chevron onPress={() => router.push('/toystore/gift-finder' as never)} /></View>
        </View>
      )}
      ListEmptyComponent={<EmptyState compact icon={Gift} title={t('Abhi koi gift pack nahi')} message={t('Gift packs page par pack banayein — yahan se ek tap me bikta hai.')} />}
      renderItem={({ item: g }) => (
        <View style={{ ...card, opacity: busy === g.id ? 0.6 : 1 }}>
          <ListRow icon={Gift} iconTone="accent" title={g.name} subtitle={g.items.map((i) => `${i.product?.name ?? ''} × ${i.quantity}`).join(', ')}
            trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Text weight="bold" ltr>{formatMoney(g.giftPackPrice)}</Text>{g.savings > 0 ? <Badge tone="success">{t('Bachat {{pct}}%', { pct: g.savingsPct })}</Badge> : null}</View>}
            onPress={() => { setBusy(g.id); void api.addCombo(comboOf(g)).finally(() => setBusy(null)); }} />
        </View>
      )}
    />
  );
}
