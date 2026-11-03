/**
 * Today at a glance (web widgets/TodayHero): sales so far against yesterday,
 * how the day built up hour by hour, the daily target ring, bills, average,
 * items and credit given, and the cash / online split.
 */

import { Target } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney, formatQty, formatWeekdayDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { HeroAmount, HeroText, Icon, PageHero, PressableScale, ProgressRing, Skeleton, Sparkline, useHero, useLayout, useTheme } from '@/design';
import { useDashboard, useDayReport, useHourlySales } from '../api/dashboard';
import { ChangeBadge, hourLabel } from '../components/parts';
import { useHomeContext } from '../layout/useHomeLayout';
import { MASK, useMasked } from '../lib/privacy';

export function TodayHero() {
  return (
    <PageHero>
      <HeroBody />
    </PageHero>
  );
}

function HeroBody() {
  const th = useTheme();
  const h = useHero()!;
  const can = usePermission();
  const { isTablet } = useLayout();
  const { target, openTarget } = useHomeContext();
  const { salesHidden } = useMasked();
  const o = useDashboard();
  const day = useDayReport();
  const hourly = useHourlySales(1);
  const s = o.data?.stats;
  const today = s?.salesToday ?? 0;
  const yesterday = s?.salesYesterday ?? 0;
  const change = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;
  const [chartWidth, setChartWidth] = useState(0);

  const curve = useMemo(() => {
    const now = hourly.data?.currentHour ?? 23;
    let running = 0;
    return (hourly.data?.hours ?? [])
      .filter((x) => x.hour <= now)
      .map((x) => (running += Number(x.total || 0)))
      .filter((v, i, all) => v > 0 || all.slice(i).some((x) => x > 0));
  }, [hourly.data]);

  const cash = day.data?.cashCollected ?? 0;
  const online = day.data?.onlineCollected ?? 0;
  const cashPct = !salesHidden && cash + online > 0 ? (cash / (cash + online)) * 100 : 0;
  const progress = target > 0 ? today / target : 0;
  const ring = isTablet ? 132 : 108;
  const loading = o.isLoading && !o.data;

  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <PressableScale style={{ flex: 1, minWidth: 0 }} onPress={can(P.SALES_VIEW) ? () => router.push('/sales') : undefined} disabled={!can(P.SALES_VIEW)} accessibilityLabel={t('Aaj ki sale')}>
          <HeroText size="xs" weight="medium" tone="muted" numberOfLines={1}>{t('Aaj ki sale · {{dateLine}}', { dateLine: formatWeekdayDate(Date.now()) })}</HeroText>
          {loading
            ? <Skeleton width={170} height={36} style={{ marginTop: 6, backgroundColor: h.skeleton }} />
            : <HeroAmount value={today} hidden={salesHidden} size={isTablet ? '4xl' : '3xl'} weight="heavy" numberOfLines={1} adjustsFontSizeToFit />}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: th.space(2), marginTop: 4 }}>
            {!salesHidden && <ChangeBadge change={change} onHero={!h.light} />}
            <HeroText size="xs" tone="soft" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t('kal poore din: {{yesterday}}', { yesterday: salesHidden ? MASK : formatMoney(yesterday) })}
            </HeroText>
          </View>
        </PressableScale>
        <TargetRing size={ring} progress={progress} target={target} today={today} hidden={salesHidden} onPress={openTarget} />
      </View>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <HeroText size="2xs" tone="muted">{t('Din bhar ka safar')}</HeroText>
          {hourly.data?.peakHour != null && <HeroText size="2xs" tone="muted">{t('Rush: {{peakHour}}', { peakHour: hourLabel(hourly.data.peakHour) })}</HeroText>}
        </View>
        <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)} style={{ height: 56 }}>
          {salesHidden || curve.length < 2 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: th.radius('lg'), borderWidth: 1, borderStyle: 'dashed', borderColor: h.line }}>
              <HeroText size="xs" tone="muted">{salesHidden ? t('Sale chhupi hui hai') : t('Pehli sale ke baad yahan graph banega')}</HeroText>
            </View>
          ) : chartWidth > 0 ? (
            <Sparkline data={curve} color={h.fg} width={chartWidth} height={56} />
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        <Chip label={t('Bill')} value={String(s?.ordersToday ?? 0)} wide={isTablet} />
        <Chip label={t('Ausat')} value={salesHidden ? MASK : formatMoney(s?.aovToday ?? 0)} wide={isTablet} />
        <Chip label={t('Items')} value={formatQty(day.data?.sales.itemsSold ?? 0)} wide={isTablet} />
        <Chip label={t('Udhaar diya')} value={salesHidden ? MASK : formatMoney(day.data?.sales.credit ?? 0)} wide={isTablet} />
      </View>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <HeroText size="2xs" tone="soft">{t('Cash {{value}}', { value: salesHidden ? MASK : formatMoney(cash) })}</HeroText>
          <HeroText size="2xs" tone="soft">{t('Online {{value}}', { value: salesHidden ? MASK : formatMoney(online) })}</HeroText>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: h.tileBg, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: `${cashPct}%`, backgroundColor: h.fg, borderRadius: 3 }} />
        </View>
      </View>
    </View>
  );
}

function Chip({ label, value, wide }: { label: string; value: string; wide: boolean }) {
  const th = useTheme();
  const h = useHero()!;
  return (
    <View style={{ flexBasis: wide ? '23%' : '47%', flexGrow: 1, minWidth: 0, paddingHorizontal: th.space(3), paddingVertical: th.space(2), borderRadius: th.radius('lg'), backgroundColor: h.tileBg, borderWidth: 1, borderColor: h.tileBorder }}>
      <HeroText size="2xs" weight="medium" tone="muted" numberOfLines={1}>{label}</HeroText>
      <HeroText size="md" weight="bold" ltr tabular numberOfLines={1}>{value}</HeroText>
    </View>
  );
}

function TargetRing({ size, progress, target, today, hidden, onPress }: { size: number; progress: number; target: number; today: number; hidden: boolean; onPress: () => void }) {
  const h = useHero()!;
  if (target <= 0) {
    return (
      <PressableScale onPress={onPress} haptic="tap" accessibilityLabel={t('Rozana target set karein')}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: h.line, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10 }}>
        <Icon icon={Target} size={20} color={h.fg} />
        <HeroText size="2xs" weight="semibold" align="center" numberOfLines={2}>{t('Rozana target set karein')}</HeroText>
      </PressableScale>
    );
  }
  const done = today >= target;
  return (
    <PressableScale onPress={onPress} haptic="tap" accessibilityLabel={t('Target badlein')}>
      <ProgressRing value={progress} size={size} stroke={size > 120 ? 11 : 9} color={h.fg} track={h.tileBg}>
        <HeroText size="xl" weight="heavy" ltr tabular>{hidden ? MASK : `${Math.round(progress * 100)}%`}</HeroText>
        <HeroText size="2xs" tone="muted">{t('target ka')}</HeroText>
        {!hidden && (
          <HeroText size="2xs" weight="semibold" tone="soft" align="center" numberOfLines={1} adjustsFontSizeToFit>
            {done ? t('Poora ho gaya!') : t('{{value}} baqi', { value: formatMoney(Math.round(target - today), { compact: true }) })}
          </HeroText>
        )}
      </ProgressRing>
    </PressableScale>
  );
}
