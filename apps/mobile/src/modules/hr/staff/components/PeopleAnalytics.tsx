/**
 * Staff analytics for the chosen period: who sold how much, attendance per
 * person, headcount by role and branch, joining and leaving by month, logins
 * per day and people who never logged in. Blocks the viewer may not see are
 * replaced by a short note naming the permission.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarCheck, LogIn, ShieldAlert, Trophy, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { endOfBusinessDay, formatMoney, startOfBusinessDay } from '@/core/format';
import { BarChart, Card, DonutChart, ErrorState, HBarList, ListGroup, ListRow, ProgressBar, Row, Segmented, Skeleton, StatTile, Text, useTheme } from '@/design';
import { peopleApi } from '../api/people';
import { PEOPLE_KEY, ROLES, STATUS, roleLabel, type RoleKey } from '../lib/meta';

type Preset = '7' | '30' | 'month' | 'last';

function rangeOf(p: Preset) {
  const now = new Date();
  const todayStart = startOfBusinessDay(now);
  if (p === '7' || p === '30') return { from: new Date(todayStart.getTime() - (Number(p) - 1) * 86_400_000).toISOString(), to: endOfBusinessDay(now).toISOString() };
  const pk = new Date(now.getTime() + 5 * 3_600_000);
  const y = pk.getUTCFullYear();
  const m = pk.getUTCMonth() - (p === 'last' ? 1 : 0);
  const first = new Date(Date.UTC(y, m, 1) - 5 * 3_600_000);
  const last = new Date(Date.UTC(y, m + 1, 1) - 5 * 3_600_000 - 1);
  return { from: first.toISOString(), to: (p === 'month' ? endOfBusinessDay(now) : last).toISOString() };
}

const dayLabel = (k: string) => new Date(`${k}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthLabel = (k: string) => new Date(`${k}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

export function PeopleAnalytics() {
  const th = useTheme();
  const [preset, setPreset] = useState<Preset>('month');
  const period = useMemo(() => rangeOf(preset), [preset]);
  const q = useQuery({ queryKey: [PEOPLE_KEY, 'analytics', preset], queryFn: () => peopleApi.analytics(period), placeholderData: (p) => p });
  const d = q.data;

  const head = (
    <Segmented value={preset} onChange={setPreset} options={[
      { value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: 'month', label: t('Is mahine') }, { value: 'last', label: t('Pichla mahina') },
    ]} />
  );
  if (q.isError && !d) return <View style={{ gap: th.space(3) }}>{head}<ErrorState error={q.error} onRetry={q.refetch} /></View>;
  if (!d) return <View style={{ gap: th.space(3) }}>{head}<Skeleton height={96} /><Skeleton height={180} /></View>;

  const top = d.sellers?.[0];
  const att = d.attendance.reduce((a, r) => ({ present: a.present + r.present, absent: a.absent + r.absent }), { present: 0, absent: 0 });
  const rate = att.present + att.absent ? Math.round((att.present / (att.present + att.absent)) * 100) : null;
  const note = (text: string) => <Text size="sm" tone="muted" align="center" style={{ paddingVertical: th.space(4) }}>{text}</Text>;
  const tenure: Array<[string, number]> = [[t('3 mahine se kam'), d.headcount.tenure.under3m], [t('3 se 12 mahine'), d.headcount.tenure.under1y], [t('1 se 3 saal'), d.headcount.tenure.under3y], [t('3 saal se zyada'), d.headcount.tenure.over3y]];

  return (
    <View style={{ gap: th.space(3) }}>
      {head}
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Users} label={t('Log (kaam par ya chhutti)')} value={String(d.headcount.total)} hint={d.headcount.byStatus.map((s) => `${STATUS[s.key as keyof typeof STATUS] ? t(STATUS[s.key as keyof typeof STATUS].label) : s.key} ${s.count}`).join(' · ')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Trophy} tone="warning" label={t('Sab se zyada sale')} value={top ? top.name : '—'}
          hint={d.sellers ? (top ? t('{{sales}} · {{bills}} bill', { sales: formatMoney(top.sales), bills: top.bills }) : t('Is period me koi sale nahi')) : t('"Sale dekhna" ki permission chahiye')} />
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarCheck} tone="success" label={t('Haazri')} value={rate == null ? '—' : `${rate}%`}
          hint={rate == null ? t('Is period me haazri nahi lagi') : t('{{present}} din haazir · {{absent}} ghair haazir', { present: att.present, absent: att.absent })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ShieldAlert} tone="danger" label={t('Ghalat login')} value={d.logins ? String(d.logins.failed) : '—'}
          hint={d.logins ? (d.logins.failed ? t('Ghalat password ki koshishein') : t('Koi ghalat koshish nahi')) : t('"Team dekhna" ki permission chahiye')} />
      </View>

      <Card title={t('Kis ne kitna becha')} description={t('Counter par jis ka naam chuna gaya, warna jis ne bill banaya — return ghata kar')}>
        {!d.sellers ? note(t('Yeh dekhne ke liye "Sale dekhna" ki permission chahiye.')) : !d.sellers.length ? note(t('Is period me kuch nahi'))
          : <HBarList colorful rows={d.sellers.slice(0, 12).map((s) => ({ key: s.userId, label: s.name, value: s.sales, display: <Text size="xs" ltr weight="semibold">{formatMoney(s.sales)}</Text>, hint: t('{{count}} bill', { count: s.bills }) }))} />}
      </Card>

      <Card title={t('Haazri')} description={t('Har bande ke haazir din')}>
        {!d.attendance.length ? note(t('Is period me haazri nahi lagi.'))
          : <HBarList rows={d.attendance.slice(0, 12).map((a) => ({ key: a.name, label: a.name, value: a.present, display: <Text size="xs" ltr>{`${a.present} / ${a.absent} / ${a.leave}`}</Text>, hint: a.lateMinutes ? t('{{lateMinutes}} min late', { lateMinutes: a.lateMinutes }) : undefined }))} />}
        {d.attendance.length > 0 && <Text size="xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('Haazir / ghair haazir / chhutti')}</Text>}
      </Card>

      <Card title={t('Role')} description={t('Kaam par aur chhutti wale log')}>
        {!d.headcount.byRole.length ? note(t('Is period me kuch nahi')) : (
          <DonutChart legend slices={d.headcount.byRole.map((r) => ({ key: r.key, label: ROLES[r.key as RoleKey] ? roleLabel(r.key) : r.key, value: r.count }))} center={<Text weight="bold" size="xl" ltr>{String(d.headcount.total)}</Text>} />
        )}
      </Card>

      <Card title={t('Aaye aur gaye')} description={t('Pichle 12 mahine — kitne jure, kitne chhor gaye')}>
        <BarChart labels={d.months.map((m) => monthLabel(m.key))} series={[
          { key: 'joined', label: t('Jure'), values: d.months.map((m) => m.joined) },
          { key: 'left', label: t('Chhor gaye'), values: d.months.map((m) => m.left), color: th.colors.danger.solid },
        ]} />
      </Card>

      <Card title={t('Kitne arse se')} description={t('Kaam par logon ka arsa')}>
        <View style={{ gap: th.space(3) }}>
          {tenure.map(([k, n]) => (
            <View key={k} style={{ gap: 4 }}>
              <Row justify="between"><Text size="sm" tone="secondary">{k}</Text><Text size="sm" weight="semibold" ltr>{String(n)}</Text></Row>
              <ProgressBar value={d.headcount.total ? n / d.headcount.total : 0} />
            </View>
          ))}
        </View>
        {d.headcount.byBranch.length > 1 && (
          <View style={{ marginTop: th.space(3), gap: th.space(1) }}>
            <Text size="xs" weight="semibold" tone="muted">{t('Branch')}</Text>
            {d.headcount.byBranch.map((b) => <Row key={b.key} justify="between"><Text size="sm">{b.key}</Text><Text size="sm" weight="semibold" ltr>{String(b.count)}</Text></Row>)}
          </View>
        )}
      </Card>

      <Card title={t('Login')} description={t('Roz kitni dafa login hua, aur ghalat password ki koshishein')}>
        {!d.logins ? note(t('Yeh dekhne ke liye "Team dekhna" ki permission chahiye.')) : (
          <View style={{ gap: th.space(3) }}>
            {d.logins.daily.length > 0 && (
              <BarChart labels={d.logins.daily.map((x) => dayLabel(x.day))} series={[
                { key: 'ok', label: t('Login'), values: d.logins.daily.map((x) => x.ok) },
                { key: 'failed', label: t('Ghalat password'), values: d.logins.daily.map((x) => x.failed), color: th.colors.danger.solid },
              ]} />
            )}
            <Text size="xs" weight="semibold" tone="muted">{t('Abhi tak login nahi kiya')}</Text>
            {!d.logins.neverLoggedIn.length ? <Text size="sm" tone="success">{t('Sab ne login kar liya')}</Text> : (
              <ListGroup>
                {d.logins.neverLoggedIn.map((p) => <ListRow key={p.id} icon={LogIn} title={p.name} chevron dense onPress={() => router.push(`/staff/${p.id}` as never)} />)}
              </ListGroup>
            )}
          </View>
        )}
      </Card>
    </View>
  );
}
