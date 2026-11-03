/** One day with previous / next arrows; the next arrow stops at today. Dates are `yyyy-mm-dd` keys on the shop's calendar. */

import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { DatePicker, IconButton, Row } from '@/design';
import { dateToKey, keyToDate, shiftKey, todayKey } from '../deskKit';

export function DayBar({ value, onChange, allowFuture = false }: { value: string; onChange: (key: string) => void; allowFuture?: boolean }) {
  const today = todayKey();
  return (
    <Row gap={2} align="center">
      <IconButton icon={ChevronLeft} flip label={t('Pichla din')} variant="soft" onPress={() => onChange(shiftKey(value, -1))} />
      <View style={{ flex: 1 }}>
        <DatePicker value={keyToDate(value)} onChange={(d) => onChange(dateToKey(d))} maximumDate={allowFuture ? undefined : keyToDate(today) ?? undefined} />
      </View>
      <IconButton icon={ChevronRight} flip label={t('Agla din')} variant="soft" disabled={!allowFuture && value >= today} onPress={() => onChange(shiftKey(value, 1))} />
    </Row>
  );
}
