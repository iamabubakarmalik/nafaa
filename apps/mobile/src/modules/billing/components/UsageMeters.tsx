/** Usage against the plan limits, and (full) what the plan includes. */

import { AlertTriangle, Check, Lock } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Card, ErrorState, Icon, ProgressBar, Row, Skeleton, Text, useTheme } from '@/design';
import type { PlanUsage } from '../api/billing';
import { PLAN_FEATURES, PLAN_LIMITS, limitText, usedPercent } from '../lib/meta';

export function UsageMeters({ usage, loading, error, full, onUpgrade }: {
  usage: PlanUsage | null; loading: boolean; error?: boolean; full?: boolean; onUpgrade?: () => void;
}) {
  const th = useTheme();
  if (loading) return <View style={{ gap: th.space(3) }}>{PLAN_LIMITS.map((l) => <Skeleton key={l.key} height={92} radius={th.radius('xl')} />)}</View>;
  if (!usage) {
    return <Card><Text size="sm" tone="muted" align="center">{error ? t('Istemaal ka hisaab load nahi hua — internet check karke dobara kholein.') : t('Abhi koi plan chalu nahi.')}</Text></Card>;
  }

  const near = PLAN_LIMITS.filter((l) => (usedPercent(usage.usage[l.key].current, usage.usage[l.key].limit, l.unlimitedAt) ?? 0) >= 80);
  const on = PLAN_FEATURES.filter((f) => usage.features[f.key]);
  const off = PLAN_FEATURES.filter((f) => !usage.features[f.key]);

  return (
    <View style={{ gap: th.space(3) }}>
      {PLAN_LIMITS.map((l) => {
        const { current, limit } = usage.usage[l.key];
        const pct = usedPercent(current, limit, l.unlimitedAt);
        const tone = pct == null ? 'success' : pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'brand';
        return (
          <Card key={l.key}>
            <Row justify="between">
              <Row gap={2}><Icon icon={l.icon} size={16} tone="muted" /><Text size="sm" tone="muted">{t(l.label)}</Text></Row>
              <Text size="lg" weight="bold" ltr tabular>{current.toLocaleString('en-US')}<Text size="sm" tone="muted" ltr> / {limitText(limit, l.unlimitedAt)}</Text></Text>
            </Row>
            <View style={{ marginTop: th.space(2), gap: th.space(1) }}>
              {pct == null ? <Text size="xs" tone="success">{t('Koi had nahi')}</Text> : (
                <>
                  <ProgressBar value={Math.max(pct, 3) / 100} tone={tone} />
                  <Text size="xs" tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'muted'} weight={tone === 'brand' ? 'regular' : 'semibold'}>
                    {t('{{pct}}% istemaal · {{value}} baqi', { pct, value: Math.max(0, limit - current).toLocaleString('en-US') })}
                  </Text>
                </>
              )}
            </View>
          </Card>
        );
      })}

      {near.length > 0 && onUpgrade && (
        <Card tone="warning">
          <Row gap={2} align="start"><Icon icon={AlertTriangle} size={18} tone="warning" /><Text size="sm" style={{ flex: 1 }}>{t('{{value}} had ke qareeb — bara plan dekh lein.', { value: near.map((l) => t(l.label)).join(', ') })}</Text></Row>
          <Button size="sm" style={{ marginTop: th.space(3) }} onPress={onUpgrade}>{t('Plans dekhein')}</Button>
        </Card>
      )}

      {full && (
        <Card title={t('{{name}} me kya shaamil hai', { name: usage.plan.name })} description={t('{{count}} cheezein chalu · {{count2}} bare plan me', { count: on.length, count2: off.length })}>
          <View style={{ gap: th.space(2) }}>
            {[...on, ...off].map((f) => {
              const has = on.includes(f);
              return (
                <Row key={f.key} gap={3} justify="between">
                  <Row gap={2} style={{ flex: 1 }}>
                    <Icon icon={f.icon} size={16} tone={has ? 'brand' : 'subtle'} />
                    <Text size="sm" tone={has ? 'default' : 'muted'} style={{ flexShrink: 1 }}>{t(f.label)}</Text>
                  </Row>
                  <Icon icon={has ? Check : Lock} size={16} tone={has ? 'success' : 'subtle'} />
                </Row>
              );
            })}
          </View>
        </Card>
      )}
    </View>
  );
}
