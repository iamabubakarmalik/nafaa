/**
 * Dashboard frame for the industry packs (same layout as the bakery dashboard):
 * a hero with a few numbers, an attention list, a grid of quick actions and the
 * pack's own cards below. A pack builds the data; this draws it.
 */

import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Card, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';

export interface DashAttention { icon: LucideIcon; tone: 'danger' | 'warning' | 'info' | 'neutral'; text: string; href: string }
export interface DashAction { href: string; icon: LucideIcon; label: string; hint: string; show?: boolean }
export interface DashStat { label: string; value: string }

export function PackDashboard({ title, chip, stats, attention, actions, onRefresh, refreshing = false, children }: {
  title: string; chip?: string; stats: DashStat[]; attention: DashAttention[]; actions: DashAction[];
  onRefresh?: () => void; refreshing?: boolean; children?: ReactNode;
}) {
  const th = useTheme();
  const { isTablet } = useLayout();
  const shown = actions.filter((a) => a.show !== false);
  const cols = isTablet ? 5 : 3;
  return (
    <Screen title={title} onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ gap: th.space(3) }}>
        {stats.length > 0 && (
          <PageHero title={title} chip={chip ?? t('Aaj')} stats={stats.map((s) => ({ label: s.label, value: <HeroText size="2xl" weight="bold" ltr>{s.value}</HeroText> }))} />
        )}
        {attention.length > 0 && (
          <Card flush title={t('Abhi dhyan dein')}>
            {attention.map((a, i) => (
              <ListRow key={i} divider={i < attention.length - 1} icon={a.icon} iconTone={a.tone as StatusTone} title={a.text} chevron onPress={() => router.push(a.href as never)} />
            ))}
          </Card>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {shown.map((a) => (
            <PressableScale key={`${a.href}-${a.label}`} onPress={() => router.push(a.href as never)}
              style={{ width: `${100 / cols - 2}%` as `${number}%`, minHeight: 84, padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, gap: 4 }}>
              <a.icon size={22} color={th.colors.brand.solid} />
              <Text size="sm" weight="semibold" numberOfLines={1}>{a.label}</Text>
              <Text size="2xs" tone="muted" numberOfLines={1}>{a.hint}</Text>
            </PressableScale>
          ))}
        </View>
        {children}
      </View>
    </Screen>
  );
}
