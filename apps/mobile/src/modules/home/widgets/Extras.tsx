/**
 * Staff commission (web CommissionCard), Nafaa AI's morning summary and the
 * industry pack's own dashboard shown as one widget.
 */

import { useQuery } from '@tanstack/react-query';
import { HandCoins, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import { Suspense, type ComponentType } from 'react';
import { View } from 'react-native';
import { businessDayKey, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, EmbeddedScreenContext, Icon, Text, useTheme, withAlpha } from '@/design';
import { MorningSummary } from '@/modules/ai-assistant';
import { commissionApi } from '@/modules/hr/commission/api/commission';
import { COMMISSION_KEY, periodLabel } from '@/modules/hr/commission/lib/meta';
import { EmptyLine, WidgetCard, WidgetSkeleton } from '../components/parts';
import { MASK, useMasked } from '../lib/privacy';

export function CommissionWidget() {
  const th = useTheme();
  const can = usePermission();
  const allowed = can(P.COMMISSION_OWN) || can(P.COMMISSION_VIEW) || can(P.COMMISSION_MANAGE);
  const period = businessDayKey(new Date()).slice(0, 7);
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'summary', period], queryFn: () => commissionApi.summary(period), retry: false, enabled: allowed });
  const { costHidden } = useMasked();
  const s = q.data;
  const show = (n: number) => (costHidden ? `Rs ${MASK}` : formatMoney(n));
  if (!allowed) return null;
  const live = (s?.rows ?? []).filter((r) => r.enrolled).slice(0, 4);
  return (
    <WidgetCard title={t('Staff commission')} description={periodLabel(period)} href="/staff/commission" linkLabel={t('Poora')} flush>
      {q.isError ? <EmptyLine text={t('Commission load nahi hui')} /> : !s ? <View style={{ paddingHorizontal: 16 }}><WidgetSkeleton /></View>
        : !s.ruleCount && s.scope === 'all' ? <EmptyLine text={t('Bandon ko sale par hissa dete hain? Ek rule bana dein — phir har mahine ka hisab khud banega.')} />
        : !s.enabledCount ? <EmptyLine text={t('Har bande ko alag se chaalu karna parta hai — tabhi us ki commission banti hai.')} />
        : (
          <View>
            <View style={{ flexDirection: 'row', gap: th.space(2), paddingHorizontal: th.space(4), paddingBottom: th.space(3) }}>
              {[{ l: t('Banti hai'), v: show(s.total) }, { l: t('Ada hui'), v: show(s.paidTotal) }, { l: t('Dena baqi'), v: show(s.pendingTotal) }].map((x) => (
                <View key={x.l} style={{ flex: 1, minWidth: 0, padding: th.space(2), borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted }}>
                  <Text size="2xs" tone="muted" numberOfLines={1}>{x.l}</Text>
                  <Text size="sm" weight="bold" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{x.v}</Text>
                </View>
              ))}
            </View>
            {live.map((r, i) => (
              <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), paddingHorizontal: th.space(4), paddingVertical: th.space(2), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 && r.earned > 0 ? withAlpha(th.colors.warning.solid, 0.18) : th.colors.surfaceMuted }}>
                  {i === 0 && r.earned > 0 ? <Icon icon={Trophy} size={13} color={th.colors.warning.text} /> : <Text size="2xs" weight="bold" tone="muted">{i + 1}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" weight="medium" numberOfLines={1}>{r.name}</Text>
                  <Text size="2xs" tone="muted" numberOfLines={1}>{t('{{bills}} bill · {{value}}', { bills: r.bills, value: show(r.sale) })}</Text>
                </View>
                <Text size="sm" weight="semibold" ltr tabular>{show(r.earned)}</Text>
              </View>
            ))}
          </View>
        )}
    </WidgetCard>
  );
}

export function AiMorning() {
  return <MorningSummary />;
}

/** Shows an industry pack's dashboard screen inside Home (its Screen draws only its content). */
export function IndustryWidget({ title, href, Component }: { title: string; href: string; Component: ComponentType }) {
  const th = useTheme();
  return (
    <Card title={title} action={<Button variant="link" size="sm" onPress={() => router.push(href as never)}>{t('Kholein')}</Button>}>
      <View style={{ marginHorizontal: -th.space(1) }}>
        <EmbeddedScreenContext.Provider value>
          <Suspense fallback={<WidgetSkeleton />}>
            <Component />
          </Suspense>
        </EmbeddedScreenContext.Provider>
      </View>
    </Card>
  );
}

export const COMMISSION_ICON = HandCoins;
