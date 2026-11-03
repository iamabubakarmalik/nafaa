/** Occupancy report (web HotelReportsPage, Occupancy tab): occupied rooms per night as a chart, with ADR, RevPAR and a breakdown by room type. */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { BarChart, Card, HBarList, KpiStrip, LineChart, Segmented, Skeleton, Text } from '@/design';
import { shiftKey, todayKey } from '../../_shared/deskKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { hotelApi, type OccupancyReport } from '../api';
import { HOTEL_KEYS, shortDate } from '../meta';

type Span = '7' | '14' | '30';

const reportDoc = (r: OccupancyReport, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `occupancy-${r.from}`, title: L(lang, 'Occupancy report', 'اوکوپنسی رپورٹ', 'Occupancy report'), subtitle: `${r.from} – ${r.to}`,
  rows: [[L(lang, 'Occupancy', 'اوکوپنسی', 'Occupancy'), `${Math.round(r.totals.occupancyPct)}%`], ['ADR', formatMoney(r.totals.adr)], ['RevPAR', formatMoney(r.totals.revpar)], [L(lang, 'Room revenue', 'کمرے کی آمدنی', 'Room revenue'), formatMoney(r.totals.revenue), 'strong']],
  tables: [{ heading: L(lang, 'By room type', 'کمرے کی قسم', 'Room type'), columns: [L(lang, 'Type', 'قسم', 'Qism'), L(lang, 'Nights', 'راتیں', 'Raatein'), 'ADR', L(lang, 'Revenue', 'آمدنی', 'Revenue')], rows: r.byType.map((x) => [x.name, x.nights, formatMoney(x.adr), formatMoney(x.revenue)]) },
    { heading: L(lang, 'By night', 'رات وار', 'Raat war'), columns: [L(lang, 'Date', 'تاریخ', 'Date'), L(lang, 'Sold', 'بکے', 'Bike'), '%', L(lang, 'Revenue', 'آمدنی', 'Revenue')], rows: r.series.map((x) => [x.date.slice(0, 10), `${x.sold}/${x.rooms}`, `${Math.round(x.occupancyPct)}%`, formatMoney(x.revenue)]) }],
});

export function OccupancyPanel() {
  const [span, setSpan] = useState<Span>('14');
  const to = todayKey();
  const from = shiftKey(to, -(Number(span) - 1));
  const q = useQuery({ queryKey: [HOTEL_KEYS.audit, 'occupancy', from, to], queryFn: () => hotelApi.occupancy({ from, to }) });
  const r = q.data;
  const labels = (r?.series ?? []).map((x) => shortDate(`${x.date.slice(0, 10)}T12:00:00+05:00`));
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}><Segmented value={span} onChange={(v) => setSpan(v as Span)} options={[{ value: '7', label: t('7 din') }, { value: '14', label: t('14 din') }, { value: '30', label: t('30 din') }]} /></View>
        <DocActions disabled={!r} build={(lang) => (r ? reportDoc(r, lang) : null)} />
      </View>
      {!r ? <Skeleton height={160} /> : (
        <>
          <KpiStrip items={[{ key: 'o', label: t('Occupancy'), value: `${Math.round(r.totals.occupancyPct)}%` }, { key: 'a', label: 'ADR', value: formatMoney(r.totals.adr) }, { key: 'p', label: 'RevPAR', value: formatMoney(r.totals.revpar) }]} />
          <Card title={t('Occupancy (%)')}><LineChart labels={labels} series={[{ key: 'occ', data: r.series.map((x) => Math.round(x.occupancyPct)) }]} format={(v) => `${Math.round(v)}%`} /></Card>
          <Card title={t('Room revenue')}><BarChart labels={labels} series={[{ key: 'rev', values: r.series.map((x) => x.revenue) }]} format={(v) => formatMoney(v)} /></Card>
          <Card title={t('Room type ke hisaab se')}>
            {r.byType.length === 0 ? <Text tone="muted" size="sm">{t('Koi data nahi')}</Text> : <HBarList colorful rows={r.byType.map((x) => ({ key: x.roomTypeId, label: x.name, value: x.revenue, display: formatMoney(x.revenue), hint: `${Math.round(x.occupancyPct)}% · ADR ${formatMoney(x.adr)}` }))} />}
          </Card>
        </>
      )}
    </View>
  );
}
