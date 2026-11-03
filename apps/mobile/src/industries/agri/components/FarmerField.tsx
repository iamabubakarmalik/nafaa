/** Field that picks a farmer by name, phone, CNIC or village (web FarmerPick); shows the chosen one with a clear button. */

import { Tractor, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Card, IconButton, ListRow, Text, useTheme } from '@/design';
import { PickerSheet } from '../../_shared/farm/PickerSheet';
import { farmersApi, type Farmer } from '../api';

export function FarmerField({ value, onChange, error, label }: { value: Farmer | null; onChange: (f: Farmer | null) => void; error?: string; label?: string }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: th.space(1.5) }}>
      {!!label && <Text size="sm" weight="medium" tone="secondary">{label}</Text>}
      <Card flush tone={error ? 'danger' : 'default'}>
        {value ? (
          <ListRow icon={Tractor} iconTone="success" title={value.fullName} subtitle={[value.farmerNumber, value.phone, value.village, value.currentBalance > 0 ? t('Udhaar {{amount}}', { amount: formatMoney(value.currentBalance) }) : ''].filter(Boolean).join(' · ')}
            trailing={<IconButton icon={X} label={t('Farmer hatayein')} size="sm" variant="ghost" onPress={() => onChange(null)} />} onPress={() => setOpen(true)} />
        ) : (
          <ListRow icon={Tractor} title={t('Farmer chunein')} subtitle={t('Naam, phone, CNIC ya gaon…')} chevron onPress={() => setOpen(true)} />
        )}
      </Card>
      {!!error && <Text size="xs" tone="danger">{error}</Text>}
      <PickerSheet<Farmer> open={open} title={t('Farmer chunein')} cacheKey="agri-farmers" onClose={() => setOpen(false)} placeholder={t('Farmer ka naam, phone, CNIC ya gaon…')}
        load={(term) => farmersApi.list({ search: term || undefined }).then((l) => l.slice(0, 30))}
        onPick={(f) => { onChange(f); setOpen(false); }}
        row={(f, pick) => <ListRow dense icon={Tractor} title={f.fullName} subtitle={[f.phone, f.village, f.district].filter(Boolean).join(' · ')} trailing={f.currentBalance > 0 ? <Amount value={f.currentBalance} size="sm" tone="danger" /> : undefined} onPress={pick} />} />
    </View>
  );
}
