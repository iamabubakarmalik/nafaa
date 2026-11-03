/**
 * Home: the web dashboard for touch. The same widgets, headline numbers and
 * daily target, in the order and widths the user chose; the layout is shared
 * with the web (GET/PUT /preferences/dashboard). Customize from the header
 * button or by holding any widget. The eye hides every amount on this phone.
 * Industry shops get their pack dashboard as a widget; All shops shows the
 * branch comparison, as on the web. Field staff without counter access go
 * straight to their own area.
 */

import { ChevronRight, Eye, EyeOff, LayoutGrid, Sparkles } from 'lucide-react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { InteractionManager, Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { perfFlush, perfMark } from '@/core/perf';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { isAllShops } from '@/core/auth/shopScope';
import { pkHour } from '@/core/format';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { haptic } from '@/core/device/haptics';
import { Card, ErrorState, Icon, IconButton, SavedDataNote, Screen, Skeleton, Text, industryIdForBusinessType, useLayout, useTheme } from '@/design';
import { industryDashboardId } from '@/industries/dashboards';
import { AppHeader } from '@/modules/shell/components/AppHeader';
import { useDashboard, useSubscription } from '../api/dashboard';
import { AllShopsHome } from '../components/AllShopsHome';
import { CustomizeView } from '../components/CustomizeView';
import { NumbersSheet } from '../components/NumbersSheet';
import { TargetSheet } from '../components/TargetSheet';
import type { ResolvedWidget } from '../layout/layout';
import { HomeLayoutContext, useHomeLayout, type HomeLayout } from '../layout/useHomeLayout';
import { useHomePrivacy, useMasked } from '../lib/privacy';
import { DEFAULT_KPIS, KPI_DEFS } from '../widgets/Kpis';
import { homeWidgets } from '../widgets/registry';

export function HomeScreen() {
  const can = usePermission();
  const noShop = !can(P.POS_USE) && !can(P.SALES_VIEW);
  if (noShop && can(P.DISTRIBUTION_ORDERS_BOOK)) return <Redirect href="/booker" />;
  if (noShop && can(P.DISTRIBUTION_DELIVERY_REPORT)) return <Redirect href="/delivery" />;
  if (noShop && can(P.DISTRIBUTION_VANS_SELL)) return <Redirect href={'/van' as never} />;
  return <ShopHome />;
}

function greetingText(hour: number) {
  if (hour < 5) return t('Raat ki shift');
  if (hour < 12) return t('Subah bakhair');
  if (hour < 17) return t('Dopahar bakhair');
  if (hour < 20) return t('Shaam bakhair');
  return t('Raat bakhair');
}

/** Widgets drawn in the first frame; the rest follow once the screen is idle. */
const FIRST_BATCH = 4;

function ShopHome() {
  const th = useTheme();
  const qc = useQueryClient();
  const { isTablet } = useLayout();
  const businessType = useAuthStore((s) => s.tenant?.businessType);
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const packId = industryDashboardId(industryIdForBusinessType(businessType));
  const defs = useMemo(() => homeWidgets(packId), [packId]);
  const layout = useHomeLayout(defs, KPI_DEFS, DEFAULT_KPIS);
  const [customizing, setCustomizing] = useState(false);
  const [sheet, setSheet] = useState<'target' | 'numbers' | null>(null);
  const [ready, setReady] = useState(false);
  const overview = useDashboard();
  const { costHidden } = useMasked();

  useEffect(() => {
    perfMark('home-mount');
    const task = InteractionManager.runAfterInteractions(() => {
      setReady(true);
      perfMark('home-interactive');
      perfFlush();
    });
    return () => task.cancel();
  }, []);

  const startCustomize = useCallback(() => { haptic('impact'); setCustomizing(true); }, []);
  // Settings → Appearance opens Home straight in Customize mode.
  const { customize } = useLocalSearchParams<{ customize?: string }>();
  useEffect(() => {
    if (customize !== '1') return;
    setCustomizing(true);
    router.setParams({ customize: undefined });
  }, [customize]);
  const ctx: HomeLayout = useMemo(() => ({
    ...layout,
    openTarget: () => setSheet('target'),
    openNumbers: () => setSheet('numbers'),
    startCustomize,
  }), [layout, startCustomize]);

  const refreshing = overview.isRefetching;
  const refresh = useCallback(() => {
    void layout.refetch();
    void qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' });
  }, [qc, layout]);

  const visible = layout.widgets.filter((i) => i.visible && !(i.widget.sensitive && costHidden));
  const shown = ready ? visible : visible.slice(0, FIRST_BATCH);

  return (
    <HomeLayoutContext.Provider value={ctx}>
      {customizing ? (
        <Screen header={<AppHeader />} scroll={false} padding={0}>
          <CustomizeView onDone={() => setCustomizing(false)} />
        </Screen>
      ) : (
        <Screen header={<AppHeader />} onRefresh={refresh} refreshing={refreshing} tabBarSpace contentStyle={isTablet ? { gap: th.space(4) } : undefined}>
          <TrialBanner />
          <Greeting allShops={allShops} onCustomize={startCustomize} />
          {allShops ? <AllShopsHome /> : (
            <>
              <SavedDataNote query={overview} />
              {overview.isError && !overview.data ? <ErrorState error={overview.error} onRetry={() => void overview.refetch()} /> : (
                <WidgetGrid items={shown} tablet={isTablet} onHold={startCustomize} />
              )}
              {!ready && visible.length > FIRST_BATCH && <Skeleton height={180} radius={16} />}
              {visible.length === 0 && (
                <Card>
                  <Text size="sm" tone="secondary" align="center">{t('Sab hisse chhupe hue hain.')}</Text>
                  <View style={{ alignItems: 'center', marginTop: th.space(3) }}>
                    <IconButton icon={LayoutGrid} label={t('Hisse chunein')} variant="secondary" onPress={startCustomize} />
                  </View>
                </Card>
              )}
            </>
          )}
        </Screen>
      )}
      <TargetSheet open={sheet === 'target'} onClose={() => setSheet(null)} />
      <NumbersSheet open={sheet === 'numbers'} onClose={() => setSheet(null)} />
    </HomeLayoutContext.Provider>
  );
}

function Greeting({ allShops, onCustomize }: { allShops: boolean; onCustomize: () => void }) {
  const th = useTheme();
  const firstName = useAuthStore((s) => s.user?.fullName?.split(' ')[0]);
  const hidden = useHomePrivacy((s) => s.hidden);
  const toggle = useHomePrivacy((s) => s.toggle);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), marginBottom: -th.space(1) }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="lg" weight="bold" numberOfLines={1}>{`${greetingText(pkHour())}${firstName ? `, ${firstName}` : ''}`}</Text>
      </View>
      <IconButton icon={hidden ? EyeOff : Eye} label={hidden ? t('Amount dikhayein') : t('Amount chhupayein')} variant="secondary" size="sm"
        onPress={() => { haptic('select'); toggle(); }} />
      {!allShops && <IconButton icon={LayoutGrid} label={t('Customize')} variant="secondary" size="sm" onPress={onCustomize} />}
    </View>
  );
}

/** One column on phones; two on tablets, where S and M widgets share a row. */
function WidgetGrid({ items, tablet, onHold }: { items: ResolvedWidget[]; tablet: boolean; onHold: () => void }) {
  const th = useTheme();
  const cell = (i: ResolvedWidget) => (
    <Pressable key={i.widget.id} onLongPress={onHold} delayLongPress={500} accessible={false} style={tablet ? { flex: 1, minWidth: 0 } : undefined}>
      <WidgetBoundary title={i.widget.title}>
        <i.widget.Component />
      </WidgetBoundary>
    </Pressable>
  );
  if (!tablet) return <>{items.map(cell)}</>;
  const rows: ResolvedWidget[][] = [];
  let pair: ResolvedWidget[] = [];
  for (const i of items) {
    const half = i.size === 'half' || i.size === 'third';
    if (!half) {
      if (pair.length) rows.push(pair);
      pair = [];
      rows.push([i]);
    } else {
      pair.push(i);
      if (pair.length === 2) { rows.push(pair); pair = []; }
    }
  }
  if (pair.length) rows.push(pair);
  return <>{rows.map((r) => <View key={r.map((i) => i.widget.id).join('+')} style={{ flexDirection: 'row', gap: th.space(4), alignItems: 'flex-start' }}>{r.map(cell)}</View>)}</>;
}

class WidgetBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Card title={this.props.title}>
        <Text size="sm" tone="muted">{t('Ye hissa abhi nahi khul saka.')}</Text>
      </Card>
    );
  }
}

function TrialBanner() {
  const th = useTheme();
  const { data } = useSubscription();
  const owner = useAuthStore((s) => s.user?.role === 'OWNER');
  if (!owner || data?.status !== 'TRIAL' || !data.trialEndsAt) return null;
  const days = Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / 86_400_000));
  if (days > 3) return null;
  return (
    <Card tone="warning" onPress={() => router.push('/plan')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <Icon icon={Sparkles} size={22} color={th.colors.warning.text} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" tone="warning">{days === 0 ? t('Free trial aaj khatam ho raha hai') : t('Free trial ke {{count}} din baqi', { count: days })}</Text>
          <Text size="sm" tone="warning">{t('Plan le kar bina ruke kaam jaari rakhein.')}</Text>
        </View>
        <Icon icon={ChevronRight} size={18} color={th.colors.warning.text} flip />
      </View>
    </Card>
  );
}
