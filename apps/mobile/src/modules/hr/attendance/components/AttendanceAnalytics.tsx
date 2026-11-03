/**
 * Attendance analytics for the chosen month: attendance rate, on-time share,
 * who came each day, late minutes by weekday, and who is late, absent or works
 * overtime most.
 */

import { View } from 'react-native';
import { t } from '@/core/i18n';
import { BarChart, Card, HBarList, StatTile, Text, useTheme } from '@/design';
import { AlarmClock, CalendarCheck, Timer, UserX } from 'lucide-react-native';
import type { Sheet } from '../api/attendance';
import { absentDays, hours, mins } from '../lib/meta';

const WEEK = [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];

export function AttendanceAnalytics({ sheet, rows }: { sheet: Sheet; rows: Sheet['rows'] }) {
  const th = useTheme();
  const past = sheet.byDay.filter((d) => d.key <= sheet.today);
  const x = rows.reduce((a, r) => {
    a.worked += r.totals.daysWorked - r.totals.halfDay / 2;
    a.expected += r.totals.workingDays - r.totals.leave - r.totals.unpaidLeave - r.totals.holiday;
    a.present += r.totals.present; a.late += r.totals.late; a.lateMinutes += r.totals.lateMinutes;
    a.ot += r.totals.overtimeHours; a.absent += absentDays(r.totals);
    return a;
  }, { worked: 0, expected: 0, present: 0, late: 0, lateMinutes: 0, ot: 0, absent: 0 });
  const rate = x.expected > 0 ? Math.round((x.worked / x.expected) * 100) : 0;
  const onTime = x.present > 0 ? Math.round(((x.present - x.late) / x.present) * 100) : 0;
  const weekday = WEEK.map((name, i) => ({ name, v: past.filter((d) => new Date(`${d.key}T12:00:00Z`).getUTCDay() === i).reduce((s, d) => s + d.lateMinutes, 0) }));
  const ranked = (pick: (r: Sheet['rows'][number]) => number, fmt: (r: Sheet['rows'][number]) => string) =>
    rows.map((r) => ({ key: r.staff.id, label: r.staff.fullName, value: pick(r), display: fmt(r) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  const block = (title: string, body: React.ReactNode) => <Card title={title}>{body}</Card>;
  const none = (text: string) => <Text tone="muted" size="sm" align="center" style={{ paddingVertical: th.space(4) }}>{text}</Text>;

  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={CalendarCheck} tone="success" label={t('Hazri ki sharah')} value={<Text size="xl" weight="bold" ltr>{`${rate}%`}</Text>}
          hint={t('{{worked}} din kaam / {{expected}} hone chahiye the', { worked: x.worked, expected: x.expected })} />
        <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={AlarmClock} tone="warning" label={t('Waqt par aaye')} value={<Text size="xl" weight="bold" ltr>{`${onTime}%`}</Text>}
          hint={t('{{late}} dafa late · {{lateMinutes}} kul', { late: x.late, lateMinutes: mins(x.lateMinutes) })} />
        <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={UserX} tone="danger" label={t('Ghair hazir din')} value={<Text size="xl" weight="bold" ltr>{String(x.absent)}</Text>} hint={t('Absent + jin dinon hazri nahi lagi')} />
        <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Timer} tone="info" label={t('Overtime')} value={<Text size="xl" weight="bold" ltr>{hours(Math.round(x.ot * 10) / 10)}</Text>} hint={t('Roz ke ghante se zyada kaam')} />
      </View>
      {block(t('Roz kitne aaye'), !past.length ? none(t('Is mahine abhi koi din nahi guzra'))
        : <BarChart labels={past.map((d) => String(Number(d.key.slice(8))))} series={[{ key: 'present', label: t('Hazir'), values: past.map((d) => d.present) }]} height={170} />)}
      {block(t('Hafte ke kis din late'), !x.lateMinutes ? none(t('Is mahine sab waqt par aaye'))
        : <BarChart labels={weekday.map((w) => w.name.slice(0, 3))} series={[{ key: 'late', label: t('Late'), values: weekday.map((w) => w.v) }]} format={(v) => mins(Math.round(v))} height={150} />)}
      {([
        [t('Sab se zyada late'), ranked((r) => r.totals.lateMinutes, (r) => t('{{late}} dafa · {{lateMinutes}}', { late: r.totals.late, lateMinutes: mins(r.totals.lateMinutes) }))],
        [t('Sab se zyada ghair hazir'), ranked((r) => absentDays(r.totals), (r) => t('{{count}} din', { count: absentDays(r.totals) }))],
        [t('Sab se zyada overtime'), ranked((r) => r.totals.overtimeHours, (r) => hours(r.totals.overtimeHours))],
      ] as const).map(([title, list]) => <View key={title}>{block(title, !list.length ? none(t('Koi nahi — shabash')) : <HBarList rows={list} />)}</View>)}
    </View>
  );
}
