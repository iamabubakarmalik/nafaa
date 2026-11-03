/** Pick a customer vehicle by its number, owner or model (server search; the last answer stays readable offline). */

import { useQuery } from '@tanstack/react-query';
import { Car } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { EmptyState, ListGroup, ListRow, SearchBar, Sheet, SkeletonRows, Text, useDebouncedValue, useTheme } from '@/design';
import { customerVehiclesApi, type CustomerVehicle } from '../api';
import { VEHICLE_KEY, vehicleName } from '../meta';

export function VehiclePickSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (v: CustomerVehicle) => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim(), 250);
  const list = useQuery({ queryKey: [VEHICLE_KEY, 'pick', search], queryFn: () => customerVehiclesApi.page({ search: search || undefined, limit: 30 }), enabled: open, placeholderData: (p) => p });
  const items = list.data?.items ?? [];
  return (
    <Sheet open={open} onClose={onClose} title={t('Gaari')} height={0.8} scrollable={false}>
      <View style={{ flex: 1, gap: th.space(3) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Gaari ka number')} autoFocus />
        {list.isLoading ? <SkeletonRows count={4} /> : items.length === 0 ? <EmptyState title={t('Koi gaari nahi mili')} /> : (
          <ListGroup>
            {items.map((v) => (
              <ListRow key={v.id} dense icon={Car} title={<Text weight="semibold" ltr>{v.registrationNumber}</Text>} subtitle={[vehicleName(v), v.ownerName].filter(Boolean).join(' · ') || undefined} onPress={() => { onPick(v); setQ(''); }} />
            ))}
          </ListGroup>
        )}
      </View>
    </Sheet>
  );
}
