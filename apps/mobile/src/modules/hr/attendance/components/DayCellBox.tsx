/** One coloured day (code letter) used by the calendar and the month grid. */

import { View } from 'react-native';
import { Text, useTheme } from '@/design';
import type { DayCode } from '../api/attendance';
import { CODE } from '../lib/meta';

export function DayCellBox({ code, size = 28 }: { code: DayCode; size?: number }) {
  const th = useTheme();
  const meta = CODE[code];
  const tc = meta.tone ? th.colors[meta.tone] : null;
  return (
    <View style={{ width: size, height: size, borderRadius: th.radius('sm'), alignItems: 'center', justifyContent: 'center', backgroundColor: tc ? tc.soft : 'transparent' }}>
      {!!meta.short && <Text size="xs" weight="bold" color={tc?.text} ltr>{meta.short}</Text>}
    </View>
  );
}
