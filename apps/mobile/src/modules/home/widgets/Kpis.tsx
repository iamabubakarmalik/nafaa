/**
 * Headline numbers (web widgets/kpis.ts + KpiGrid): the cards picked under
 * Customize → Numbers, each with its change and a short trend line. Ids are
 * the web ids, so the same picks show on both.
 */

import {
  AlertTriangle, Banknote, BookOpen, CalendarRange, Lock, Package, Receipt, Settings2, ShoppingBasket, Smartphone, Target,
  TrendingUp, Users, Wallet,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney, formatQty } from '@/core/format';
import { t } from '@/core/i18n';
import { Icon, PressableScale, Skeleton, Sparkline, Text, useChartColors, useLayout, useTheme, withAlpha } from '@/design';
import { useDashboard, useDayReport, useMoneyMap } from '../api/dashboard';
import { ChangeBadge, pctChange } from '../components/parts';
import type { KpiDef, KpiValue } from '../layout/layout';
import { useHomeContext } from '../layout/useHomeLayout';
import { MASK, useMasked } from '../lib/privacy';

function useLast7(key: 'sales' | 'profit' | 'orders') {
  const { data } = useDashboard();
  return (data?.salesTrend7Days ?? []).map((p) => Number(p[key] || 0));
}

export const KPI_DEFS: KpiDef[] = [
  {
    id: 'sales', label: t('Aaj ki sale'), icon: TrendingUp, tone: 'brand',
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const trend = useLast7('sales');
      const s = data?.stats;
      return { loading: isLoading, value: s?.salesToday ?? 0, money: true, kind: 'sales', href: '/sales', change: s?.salesGrowthVsYesterday, hint: t('kal se'), trend };
    },
  },
  {
    id: 'bills', label: t('Aaj ke bill'), icon: Receipt, tone: 'info',
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const trend = useLast7('orders');
      const s = data?.stats;
      return { loading: isLoading, value: s?.ordersToday ?? 0, kind: 'plain', href: '/sales', change: pctChange(s?.ordersToday ?? 0, s?.ordersYesterday ?? 0), hint: t('kal {{value}}', { value: s?.ordersYesterday ?? 0 }), trend };
    },
  },
  {
    id: 'average', label: t('Ausat bill'), icon: ShoppingBasket, tone: 'neutral',
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const { salesHidden } = useMasked();
      const s = data?.stats;
      return { loading: isLoading, value: s?.aovToday ?? 0, money: true, kind: 'sales', hint: t('mahine ka {{aovMonth}}', { aovMonth: salesHidden ? MASK : formatMoney(s?.aovMonth ?? 0) }) };
    },
  },
  {
    id: 'profit', label: t('Aaj ka profit'), icon: Target, tone: 'success', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const trend = useLast7('profit');
      const s = data?.stats;
      const onKhata = s?.profitSplitToday?.basis === 'PAID' ? s.profitSplitToday.pending : 0;
      return {
        loading: isLoading, value: s?.netProfitToday ?? 0, money: true, kind: 'cost', href: '/profit-report', trend,
        hint: onKhata > 0.5 ? t('udhaar mein {{pending}}', { pending: formatMoney(onKhata) }) : t('cost aur expense nikal kar'),
      };
    },
  },
  {
    id: 'items', label: t('Items biki'), icon: Package, tone: 'warning',
    useValue: () => {
      const { data, isLoading } = useDayReport();
      return { loading: isLoading, value: formatQty(data?.sales.itemsSold ?? 0), kind: 'plain', hint: t('{{value}} alag cheezein', { value: data?.items.length ?? 0 }), href: '/day-report' };
    },
  },
  {
    id: 'cash', label: t('Galle me cash'), icon: Banknote, tone: 'success',
    useValue: () => {
      const { data: m, isLoading } = useMoneyMap();
      const { salesHidden } = useMasked();
      const open = !!m?.cash.registerOpen;
      return {
        loading: isLoading, href: '/cash-register', value: open ? m!.cash.expected : '—', money: open, kind: 'sales',
        hint: open ? t('opening {{opening}}', { opening: salesHidden ? MASK : formatMoney(m!.cash.opening) }) : t('Register band hai'),
      };
    },
  },
  {
    id: 'online', label: t('Aaj online aaya'), icon: Smartphone, tone: 'info',
    useValue: () => {
      const { data, isLoading } = useDayReport();
      const { salesHidden } = useMasked();
      return { loading: isLoading, value: data?.onlineCollected ?? 0, money: true, kind: 'sales', hint: t('cash {{cashCollected}}', { cashCollected: salesHidden ? MASK : formatMoney(data?.cashCollected ?? 0) }), href: '/day-report' };
    },
  },
  {
    id: 'expenses', label: t('Aaj ka expense'), icon: Wallet, tone: 'warning', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const s = data?.stats;
      return { loading: isLoading, value: s?.expensesToday ?? 0, money: true, kind: 'cost', hint: t('mahine {{value}}', { value: formatMoney(s?.expensesMonth ?? 0) }), href: '/expenses' };
    },
  },
  {
    id: 'udhaar', label: t('Udhaar baqi'), icon: BookOpen, tone: 'danger', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const s = data?.stats;
      return { loading: isLoading, value: s?.totalUdhaar ?? 0, money: true, kind: 'cost', hint: t('{{value}} customers', { value: s?.customersWithUdhaar ?? 0 }), href: '/khata' };
    },
  },
  {
    id: 'month', label: t('Mahine ki sale'), icon: CalendarRange, tone: 'brand',
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const s = data?.stats;
      return { loading: isLoading, value: s?.salesMonth ?? 0, money: true, kind: 'sales', change: s?.salesGrowthVsLastMonth, hint: t('pichhle mahine se') };
    },
  },
  {
    id: 'low-stock', label: t('Kam stock'), icon: AlertTriangle, tone: 'warning',
    useValue: () => {
      const { data, isLoading } = useDashboard();
      const s = data?.stats;
      return { loading: isLoading, value: s?.lowStockCount ?? 0, kind: 'plain', hint: t('{{value}} khatam', { value: s?.outOfStockCount ?? 0 }), href: '/low-stock', alert: (s?.outOfStockCount ?? 0) > 0 };
    },
  },
  {
    id: 'customers', label: t('Customers'), icon: Users, tone: 'neutral',
    useValue: () => {
      const { data, isLoading } = useDashboard();
      return { loading: isLoading, value: data?.stats.totalCustomers ?? 0, kind: 'plain', href: '/customers' };
    },
  },
];

export const DEFAULT_KPIS = ['profit', 'month', 'cash', 'online', 'low-stock', 'udhaar'];

function display(v: KpiValue, hidden: boolean) {
  if (v.money) return hidden ? `Rs ${MASK}` : formatMoney(v.value);
  return String(v.value);
}

function KpiCard({ def }: { def: KpiDef }) {
  const th = useTheme();
  const cc = useChartColors();
  const v = def.useValue();
  const { salesHidden, costHidden } = useMasked();
  const hidden = v.kind === 'cost' ? costHidden : v.kind === 'sales' ? salesHidden : false;
  const [w, setW] = useState(0);
  const toneColor = def.tone === 'neutral' ? th.colors.textMuted : def.tone === 'brand' ? cc.brand : th.colors[def.tone].solid;
  const body = (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: th.space(2) }}>
        <Text size="xs" weight="medium" tone="muted" numberOfLines={2} style={{ flex: 1 }}>{def.label}</Text>
        <View style={{ width: 28, height: 28, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(toneColor, th.isDark ? 0.22 : 0.12) }}>
          <Icon icon={def.icon} size={15} color={toneColor} />
        </View>
      </View>
      {v.loading
        ? <Skeleton width={90} height={24} style={{ marginTop: 4 }} />
        : <Text size="xl" weight="bold" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{display(v, hidden)}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), minHeight: 18 }}>
        {!hidden && <ChangeBadge change={v.change} />}
        {v.hint && !hidden ? <Text size="2xs" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{v.hint}</Text> : null}
      </View>
      {!hidden && v.trend && v.trend.length > 1 && w > 0 && <View style={{ marginTop: 4 }}><Sparkline data={v.trend} color={toneColor} width={w} height={26} /></View>}
    </View>
  );
  const frame = {
    flexGrow: 1, flexBasis: '46%' as const, minWidth: 0, padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface,
    borderWidth: v.alert ? 1 : th.isDark ? 1 : 0.5, borderColor: v.alert ? th.colors.danger.border : th.colors.border,
  };
  return v.href
    ? <PressableScale onPress={() => router.push(v.href as never)} haptic="tap" accessibilityLabel={def.label} style={frame}>{body}</PressableScale>
    : <View style={frame}>{body}</View>;
}

function LockedCard({ def }: { def: KpiDef }) {
  const th = useTheme();
  return (
    <View style={{ flexGrow: 1, flexBasis: '46%', minWidth: 0, padding: th.space(3), borderRadius: th.radius('xl'), borderWidth: 1, borderStyle: 'dashed', borderColor: th.colors.border, gap: th.space(2) }}>
      <Text size="xs" weight="medium" tone="muted" numberOfLines={1}>{def.label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon icon={Lock} size={14} tone="subtle" />
        <Text size="sm" tone="subtle">{t('Cost lock hai')}</Text>
      </View>
    </View>
  );
}

export function KpiGrid() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const { kpis, openNumbers } = useHomeContext();
  const { noCost } = useMasked();
  if (kpis.length === 0) {
    return (
      <PressableScale onPress={openNumbers} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: th.space(2), padding: th.space(5), borderRadius: th.radius('xl'), borderWidth: 1, borderStyle: 'dashed', borderColor: th.colors.border }}>
        <Icon icon={Settings2} size={16} tone="muted" />
        <Text size="sm" tone="secondary">{t('Numbers chunein')}</Text>
      </PressableScale>
    );
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(isTablet ? 3 : 2.5) }}>
      {kpis.map((k) => (
        <View key={k.id} style={{ flexBasis: isTablet ? '31%' : '46%', flexGrow: 1, minWidth: 0, flexDirection: 'row' }}>
          {k.sensitive && noCost ? <LockedCard def={k} /> : <KpiCard def={k} />}
        </View>
      ))}
    </View>
  );
}
