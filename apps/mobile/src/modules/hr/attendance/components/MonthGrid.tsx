/**
 * The month as a grid for tablets: one row per person, one coloured cell per
 * day, and the totals payroll needs on the right. Tap a name for the calendar.
 */

import { ScrollView, View } from 'react-native';
import { t } from '@/core/i18n';
import { PressableScale, Text, useTheme } from '@/design';
import type { Sheet } from '../api/attendance';
import { absentDays, hours } from '../lib/meta';
import { DayCellBox } from './DayCellBox';

const ROW = 44;

export function MonthGrid({ sheet, rows, onOpen }: { sheet: Sheet; rows: Sheet['rows']; onOpen: (staffId: string) => void }) {
  const th = useTheme();
  const head = { height: 40, justifyContent: 'center' as const };
  return (
    <View style={{ flexDirection: 'row', backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
      <View style={{ width: 160, borderEndWidth: 1, borderColor: th.colors.divider }}>
        <View style={[head, { paddingHorizontal: 12 }]}><Text size="xs" weight="semibold" tone="muted">{t('Staff')}</Text></View>
        {rows.map((r) => (
          <PressableScale key={r.staff.id} onPress={() => onOpen(r.staff.id)} style={{ height: ROW, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text size="sm" weight="semibold" numberOfLines={1}>{r.staff.fullName}</Text>
            <Text size="2xs" tone="subtle" numberOfLines={1}>{r.staff.designation}</Text>
          </PressableScale>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View>
          <View style={{ flexDirection: 'row', height: 40, alignItems: 'center' }}>
            {sheet.keys.map((k) => {
              const off = !sheet.byDay.find((d) => d.key === k)?.workingDay;
              return <View key={k} style={{ width: 32, alignItems: 'center' }}><Text size="2xs" tone={k === sheet.today ? 'brand' : off ? 'subtle' : 'muted'} weight={k === sheet.today ? 'bold' : 'regular'} ltr>{Number(k.slice(8))}</Text></View>;
            })}
            {[t('Kaam'), t('Late'), t('Ghair'), t('Chhutti'), t('OT')].map((h) => <View key={h} style={{ width: 52, alignItems: 'flex-end', paddingEnd: 8 }}><Text size="2xs" weight="semibold" tone="muted" numberOfLines={1}>{h}</Text></View>)}
          </View>
          {rows.map((r) => {
            const x = r.totals;
            return (
              <View key={r.staff.id} style={{ flexDirection: 'row', height: ROW, alignItems: 'center' }}>
                {sheet.keys.map((k) => <View key={k} style={{ width: 32, alignItems: 'center' }}><DayCellBox code={r.days[k].code} size={26} /></View>)}
                <Cell text={`${x.daysWorked - x.halfDay / 2}/${x.workingDays}`} bold />
                <Cell text={String(x.late)} tone={x.late ? 'warning' : 'subtle'} />
                <Cell text={String(absentDays(x))} tone={absentDays(x) ? 'danger' : 'subtle'} />
                <Cell text={String(x.leave + x.unpaidLeave)} />
                <Cell text={hours(x.overtimeHours)} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function Cell({ text, bold, tone }: { text: string; bold?: boolean; tone?: 'warning' | 'danger' | 'subtle' }) {
  return <View style={{ width: 52, alignItems: 'flex-end', paddingEnd: 8 }}><Text size="sm" weight={bold ? 'semibold' : 'regular'} tone={tone} ltr tabular>{text}</Text></View>;
}
