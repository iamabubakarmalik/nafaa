/**
 * Settings screen template: slim header, a short note, and groups of rows
 * (links, switches, choices). Changes save as they are made (like the web
 * settings pages), with a toast on failure.
 *
 *   <SettingsTemplate title={t('Counter rules')} description={t('…')}>
 *     <SettingsGroup title={t('Discount')}>
 *       <SettingSwitch label={t('Haath se Discount')} value={s.manualDiscount} onChange={(v) => save({ manualDiscount: v })} />
 *       <SettingLink icon={Percent} label={t('Zyada se zyada Discount')} value="50%" onPress={…} />
 *     </SettingsGroup>
 *   </SettingsTemplate>
 */

import type { LucideIcon } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { ListRow } from '../components/ListRow';
import { Switch } from '../components/Toggle';
import { SkeletonRows } from '../components/Skeleton';
import { ErrorState } from '../components/States';

export interface SettingsTemplateProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function SettingsTemplate({ title, description, actions, loading, error, onRetry, footer, children }: SettingsTemplateProps) {
  return (
    <Screen title={title} actions={actions} narrow footer={footer}>
      {description && <Text size="sm" tone="muted">{description}</Text>}
      {loading ? <SkeletonRows count={6} avatar={false} /> : error ? <ErrorState error={error} onRetry={onRetry} /> : children}
    </Screen>
  );
}

/** A titled group of setting rows on one rounded surface. */
export function SettingsGroup({ title, footnote, children }: { title?: string; footnote?: string; children: ReactNode }) {
  const th = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: th.space(2) }}>
      {title && <Text size="sm" weight="semibold" tone="muted" style={{ paddingHorizontal: th.space(1) }}>{title}</Text>}
      <View style={{ backgroundColor: th.colors.surface, borderRadius: th.radius('xl'), borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 && <View style={{ height: 1, backgroundColor: th.colors.divider, marginStart: th.space(4) }} />}
          </View>
        ))}
      </View>
      {footnote && <Text size="xs" tone="muted" style={{ paddingHorizontal: th.space(1) }}>{footnote}</Text>}
    </View>
  );
}

/** On/off setting. */
export function SettingSwitch({ label, description, value, onChange, disabled }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(1.5) }}>
      <Switch label={label} description={description} value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

/** A setting that opens another screen or a sheet; shows the current value. */
export function SettingLink({ icon, label, description, value, onPress, destructive }: { icon?: LucideIcon; label: string; description?: string; value?: string; onPress: () => void; destructive?: boolean }) {
  return (
    <ListRow
      icon={icon}
      title={label}
      subtitle={description}
      destructive={destructive}
      trailing={value ? <Text size="sm" tone="muted" numberOfLines={1}>{value}</Text> : undefined}
      chevron
      onPress={onPress}
    />
  );
}
