/** Previous / next month control used by attendance, payroll and commission. */

import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { IconButton, Text, useTheme } from '@/design';
import { t } from '@/core/i18n';
import { monthLabel, shiftMonth } from '../lib/meta';

export function MonthStepper({ month, onChange, max }: { month: string; onChange: (m: string) => void; max?: string }) {
  const th = useTheme();
  const atMax = !!max && month >= max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, paddingHorizontal: th.space(1) }}>
      <IconButton icon={ChevronLeft} flip label={t('Pichla mahina')} onPress={() => onChange(shiftMonth(month, -1))} />
      <Text weight="semibold">{monthLabel(month)}</Text>
      <IconButton icon={ChevronRight} flip label={t('Agla mahina')} disabled={atMax} onPress={() => onChange(shiftMonth(month, 1))} />
    </View>
  );
}
