/** The "Janwar" tab on the counter (animal cards) and the retry notice for animals not marked sold. */

import { useQuery } from '@tanstack/react-query';
import { PawPrint, RotateCw, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, EmptyState, IconButton, ListRow, Row, Skeleton, Text, useTheme } from '@/design';
import { useCounter } from '@/modules/pos/engine/counter';
import { usePos } from '@/modules/pos/engine/usePos';
import { liveAnimalsApi, type LiveAnimal } from '../api';
import { addAnimalToBill, failedStore, markAnimalsSold, useFailedAnimalBill } from '../animalBill';
import { AnimalThumb } from '../screens/LiveAnimalsScreen';
import { PET_KEYS, ageText, speciesLabel } from '../meta';

export function AnimalPicker({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const api = usePos();
  const q = useQuery({ queryKey: [PET_KEYS.posAnimals], queryFn: () => liveAnimalsApi.paged({ status: 'ON_SALE', limit: 100 }).then((r) => r.items), staleTime: 30_000, retry: 1 });
  const [busy, setBusy] = useState<string | null>(null);
  const add = async (a: LiveAnimal) => { setBusy(a.id); try { await addAnimalToBill(a, api); } finally { setBusy(null); } };
  if (q.isLoading) return <View style={{ padding: th.space(4) }}><Skeleton height={80} /></View>;
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: th.space(3), paddingBottom: padBottom, gap: th.space(2) }}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      ListEmptyComponent={<EmptyState compact icon={PawPrint} title={t('Abhi koi janwar darj nahi')} message={t('Pehle Live animals me janwar darj karein.')} />}
      renderItem={({ item: a }) => (
        <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: busy === a.id ? 0.6 : 1 }}>
          <ListRow leading={<AnimalThumb a={a} size={52} />} title={a.name || a.breed || speciesLabel(a.species)}
            subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" numberOfLines={1}>{[a.animalNumber, a.breed, ageText(a.ageMonths)].filter(Boolean).join(' · ')}</Text>
              <Row gap={1}>{a.status === 'RESERVED' && <Badge tone="warning">{t('Rok liya')}</Badge>}<Badge tone={a.isVaccinated ? 'success' : 'danger'}>{a.isVaccinated ? t('Vaccine') : t('Vaccine nahi')}</Badge></Row></View>}
            trailing={<Text weight="bold" ltr>{formatMoney(a.askingPrice)}</Text>} onPress={() => void add(a)} />
        </View>
      )}
    />
  );
}

export function AnimalBillRetry() {
  const th = useTheme();
  const failed = useFailedAnimalBill();
  const [busy, setBusy] = useState(false);
  useCounter();
  if (!failed) return null;
  return (
    <Row gap={2} style={{ padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.danger.soft }}>
      <Text size="xs" tone="danger" style={{ flex: 1 }}>{t('Bill {{saleNumber}}: janwar "bik gaya" nahi likha', { saleNumber: failed.saleNumber })}</Text>
      <IconButton icon={RotateCw} label={t('Dobara')} size="sm" disabled={busy} onPress={() => { setBusy(true); void markAnimalsSold(failed.saleId, failed.saleNumber).finally(() => setBusy(false)); }} />
      <IconButton icon={X} label={t('Chhor dein')} size="sm" onPress={() => failedStore.set(null)} />
    </Row>
  );
}
