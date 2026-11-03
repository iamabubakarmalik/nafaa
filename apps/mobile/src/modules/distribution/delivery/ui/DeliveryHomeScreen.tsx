/**
 * Delivery run: today's dispatched load sheets with every invoice in route
 * order, progress, what has been reported, the cash to hand in, and call /
 * map buttons. Pull down to send what waits and fetch the sheet again.
 */

import { router } from 'expo-router';
import { AlertTriangle, HandCoins, MapPin, Navigation, Phone, Truck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { formatDateTime, formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, ChipGroup, EmptyState, IconButton, PageHero, HeroAmount, PressableScale, ProgressBar, Row, Screen, SkeletonRows, Text, useTheme } from '@/design';
import { openMap } from '@/modules/distribution/booker/native/device';
import { useAuthStore } from '@/core/auth/store';
import { effectiveReport, listSheets, reportsByOrder, returnsValue, sheetRecoveries, type LocalReport } from '../core/repo';
import type { Invoice, Sheet } from '../core/types';
import { useDeliveryQuery, useDeliveryStore } from '../store';
import { DeliverySyncButton, ReportPill } from './parts';

type Filter = 'all' | 'left' | 'done';
interface StopRow { inv: Invoice; report: LocalReport | null }

export function DeliveryHomeScreen() {
  const th = useTheme();
  const user = useAuthStore((s) => s.user);
  const { me, loading, error, issues, offline, lastDownloadAt, refresh } = useDeliveryStore();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, loading: reading } = useDeliveryQuery(async (db) => {
    const sheets = await listSheets(db);
    const local = await reportsByOrder(db);
    return Promise.all(sheets.map(async (sheet) => ({
      sheet,
      rows: sheet.invoices.map((inv) => ({ inv, report: effectiveReport(inv, local.get(inv.orderId)) })),
      recoveries: await sheetRecoveries(db, sheet),
    })));
  }, []);
  const trips = data ?? [];
  const canCollect = !!me?.canCollect;

  return (
    <Screen
      title={t('Delivery')}
      subtitle={user?.fullName}
      onBack={() => router.replace('/(tabs)')}
      actions={<DeliverySyncButton />}
      refreshing={loading}
      onRefresh={() => refresh()}
      footer={trips.length > 0 && (canCollect || issues > 0) ? (
        <Row gap={3}>
          {canCollect && <Button size="xl" variant="secondary" icon={HandCoins} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/delivery/recovery', params: { sheetId: trips[0].sheet.id } })}>{t('Recovery likhein')}</Button>}
          {issues > 0 && <Button size="xl" variant="soft" icon={AlertTriangle} style={{ flex: 1 }} onPress={() => router.push('/delivery/issues')}>{t('Sync issues')} ({issues})</Button>}
        </Row>
      ) : undefined}
    >
      {!!error && <Card tone="danger"><Row gap={2}><AlertTriangle size={16} color={th.colors.danger.text} /><Text size="sm" tone="danger" style={{ flex: 1 }}>{error}</Text></Row></Card>}
      {issues > 0 && (
        <Card tone="warning" onPress={() => router.push('/delivery/issues')}>
          <Row gap={2}><AlertTriangle size={16} color={th.colors.warning.text} /><Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('{{count}} entry server ne nahi li — dekhein', { count: issues })}</Text></Row>
        </Card>
      )}
      {reading && !trips.length ? <SkeletonRows count={4} /> : null}
      {!trips.length && !reading && (
        <EmptyState
          icon={Truck}
          title={loading ? t('Load sheet aa rahi hai…') : t('Aaj koi load sheet nahi')}
          message={offline ? t('Internet nahi hai — internet aane par neeche kheench kar taaza karein') : t('Office gaari dispatch kare to yahan aa jayegi. Neeche kheench kar taaza karein.')}
        />
      )}
      {trips.map(({ sheet, rows, recoveries }) => (
        <Trip key={sheet.id} sheet={sheet} rows={rows} recoveries={recoveries} filter={filter} setFilter={setFilter} canCollect={canCollect} />
      ))}
      {!!lastDownloadAt && trips.length > 0 && (
        <Text size="xs" tone="muted" align="center">
          {t('Sheet: {{time}}', { time: formatDateTime(lastDownloadAt) })}{offline ? ` · ${t('Internet nahi — kaam phone par save ho raha hai')}` : ''}
        </Text>
      )}
    </Screen>
  );
}

function Trip({ sheet, rows, recoveries, filter, setFilter, canCollect }: {
  sheet: Sheet; rows: StopRow[]; recoveries: Array<{ amount: number; method: string }>; filter: Filter; setFilter: (f: Filter) => void; canCollect: boolean;
}) {
  const th = useTheme();
  const open = rows.filter((r) => !r.report || r.report.state === 'issue');
  const done = rows.length - open.length;
  const money = useMemo(() => {
    let cash = 0;
    let other = 0;
    let back = 0;
    for (const { inv, report } of rows) {
      if (!report) continue;
      if (report.method === 'CASH') cash += report.cashCollected; else other += report.cashCollected;
      back += returnsValue(inv, report.outcome, report.lines);
    }
    const recCash = recoveries.filter((r) => r.method === 'CASH').reduce((s, r) => s + r.amount, 0);
    return { cash, other, back, recCash, handIn: cash + recCash };
  }, [rows, recoveries]);
  const shown = rows.filter((r) => (filter === 'left' ? !r.report || r.report.state === 'issue' : filter === 'done' ? r.report && r.report.state !== 'issue' : true));

  return (
    <View style={{ gap: th.space(3) }}>
      <PageHero
        title={sheet.routeName ?? t('Mili juli route')}
        subtitle={[sheet.vehicleNo, sheet.driverName, sheet.shopName].filter(Boolean).join(' · ') || t('Gaari')}
        chip={`${sheet.number} · ${formatDate(sheet.date)}`}
        stats={[
          { label: t('Invoices'), value: <Text size="2xl" weight="bold" tone="onBrand" ltr>{`${done}/${rows.length}`}</Text> },
          { label: t('Maal value'), value: <HeroAmount value={sheet.totalValue} size="xl" /> },
          { label: t('Wapas'), value: <HeroAmount value={money.back} size="xl" /> },
        ]}
      >
        <ProgressBar value={rows.length ? done / rows.length : 0} />
      </PageHero>

      <Card tone="brand">
        <Row justify="between" gap={3}>
          <View style={{ flex: 1 }}>
            <Text size="xs" weight="semibold" tone="muted">{t('Office ko cash dena hai')}</Text>
            <Text size="xs" tone="muted">
              {t('Invoice')} <Amount value={money.cash} size="xs" />{canCollect ? <> · {t('Recovery')} <Amount value={money.recCash} size="xs" /></> : null}{money.other ? <> · {t('Bank/wallet')} <Amount value={money.other} size="xs" /></> : null}
            </Text>
          </View>
          <Amount value={money.handIn} size="2xl" weight="bold" />
        </Row>
      </Card>

      <ChipGroup wrap
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        options={[
          { value: 'all', label: t('Sab'), count: rows.length },
          { value: 'left', label: t('Jaana hai'), count: open.length },
          { value: 'done', label: t('Ho gaye'), count: done },
        ]}
      />

      {shown.map((r) => <StopCard key={r.inv.orderId} {...r} onPress={() => router.push(`/delivery/invoice/${r.inv.orderId}`)} />)}
      {!shown.length && <Text size="sm" tone="muted" align="center">{t('Is list me koi invoice nahi')}</Text>}
    </View>
  );
}

function StopCard({ inv, report, onPress }: StopRow & { onPress: () => void }) {
  const th = useTheme();
  const c = inv.customer;
  const back = report ? returnsValue(inv, report.outcome, report.lines) : 0;
  return (
    <Card onPress={onPress} accessibilityLabel={c?.businessName || c?.name || inv.orderNumber}>
      <Row gap={3} align="start">
        <View style={{ height: 44, width: 44, borderRadius: th.radius('md'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Text weight="bold" tone="brand" ltr>{String(inv.stop)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semibold" numberOfLines={1}>{c?.businessName || c?.name || '—'}</Text>
          <Row gap={1}>
            <MapPin size={12} color={th.colors.textMuted} />
            <Text size="xs" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{[c?.businessName ? c?.name : null, c?.area || c?.address].filter(Boolean).join(' · ') || '—'}</Text>
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Amount value={inv.total} weight="bold" />
          <Text size="2xs" tone="muted" ltr>{inv.saleNumber ?? inv.orderNumber}</Text>
        </View>
      </Row>
      <Row gap={2} justify="between" style={{ marginTop: th.space(2.5) }}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: th.space(1.5) }}>
          <ReportPill report={report} />
          {!!report && report.cashCollected > 0 && <Text size="xs" weight="semibold" tone="success">{t('{{amount}} mila', { amount: `Rs ${Math.round(report.cashCollected).toLocaleString('en-US')}` })}</Text>}
          {back > 0 && report?.outcome === 'PARTIAL' && <Amount value={-back} size="xs" weight="semibold" tone="danger" />}
          {report?.state === 'waiting' && <Text size="xs" weight="semibold" tone="warning">{t('Phone par, sync hona hai')}</Text>}
        </View>
        {!!c?.phone && <IconButton icon={Phone} label={t('Call')} variant="soft" onPress={() => Linking.openURL(`tel:${c.phone}`)} />}
        {c?.latitude != null && c?.longitude != null && <IconButton icon={Navigation} label={t('Raasta')} variant="soft" onPress={() => openMap(c.latitude!, c.longitude!)} />}
      </Row>
    </Card>
  );
}
