/**
 * One person's month as a calendar: a week per line, each day with its code,
 * check-in time and late minutes. A manager taps a day to fix it.
 */

import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PressableScale, Sheet, Text, useTheme } from '@/design';
import type { AttStaff, DayCell, Sheet as SheetData } from '../api/attendance';
import { CODE, absentDays, clockOf, hours, mins, mondayIndex } from '../lib/meta';
import { DayCellBox } from './DayCellBox';

const WEEK = [t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta'), t('Itwar')];

export function StaffCalendarSheet({ sheet, row, canCorrect, onCell, onClose }: {
  sheet: SheetData; row: SheetData['rows'][number] | null; canCorrect: boolean;
  onCell: (staff: AttStaff, key: string, cell: DayCell) => void; onClose: () => void;
}) {
  const th = useTheme();
  const tot = row?.totals;
  const lead = sheet.keys.length ? mondayIndex(sheet.keys[0]) : 0;
  const slots: Array<string | null> = [...Array<null>(lead).fill(null), ...sheet.keys];
  while (slots.length % 7) slots.push(null);
  const weeks: Array<Array<string | null>> = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));

  return (
    <Sheet open={!!row} onClose={onClose} title={row?.staff.fullName} description={row?.staff.designation} height={0.85}>
      {row && tot && (
        <View style={{ gap: 10, paddingBottom: 12 }}>
          <Text size="sm" tone="muted">
            {t('{{value}}/{{workingDays}} din kaam · {{late}} late ({{lateMinutes}}) · {{absentDays}} ghair hazir · {{value2}} chhutti · {{overtimeHours}} OT', {
              value: tot.daysWorked - tot.halfDay / 2, workingDays: tot.workingDays, late: tot.late, lateMinutes: mins(tot.lateMinutes),
              absentDays: absentDays(tot), value2: tot.leave + tot.unpaidLeave, overtimeHours: hours(tot.overtimeHours),
            })}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {WEEK.map((d) => <Text key={d} size="2xs" tone="subtle" align="center" style={{ flex: 1 }} numberOfLines={1}>{d.slice(0, 3)}</Text>)}
          </View>
          {weeks.map((w, wi) => (
            <View key={wi} style={{ flexDirection: 'row', gap: 4 }}>
              {w.map((key, i) => {
                if (!key) return <View key={`x${i}`} style={{ flex: 1 }} />;
                const c = row.days[key];
                const clickable = canCorrect && c.code !== 'FUT' && c.code !== 'NA';
                return (
                  <PressableScale key={key} disabled={!clickable} onPress={() => onCell(row.staff, key, c)} accessibilityLabel={`${key}: ${t(CODE[c.code].label)}`}
                    style={{ flex: 1, minHeight: 64, padding: 4, borderRadius: th.radius('md'), borderWidth: key === sheet.today ? 2 : 1, borderColor: key === sheet.today ? th.colors.brand.solid : th.colors.border, alignItems: 'center', gap: 2 }}>
                    <Text size="xs" weight="semibold" tabular ltr>{Number(key.slice(8))}</Text>
                    <DayCellBox code={c.code} size={22} />
                    {c.in ? <Text size="2xs" tone="muted" ltr numberOfLines={1}>{clockOf(c.in).replace(' ', '')}</Text> : null}
                    {c.late > 0 ? <Text size="2xs" tone="warning" ltr>{`+${c.late}m`}</Text> : null}
                  </PressableScale>
                );
              })}
            </View>
          ))}
          {canCorrect && <Text size="xs" tone="subtle">{t('Kisi khane par tap karein to theek kar sakte hain')}</Text>}
        </View>
      )}
    </Sheet>
  );
}
