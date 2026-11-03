/**
 * Small building blocks the settings screens share: the save indicator, the
 * "needs internet" note, a number field that can be emptied while typing,
 * radio cards with a short description, and a titled section.
 */

import { Check, CloudOff } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { usePermissions } from '@/core/permissions';
import { Card, EmptyState, Icon, Input, PressableScale, Screen, Text, useTheme } from '@/design';

/** Header indicator: saving, saved, or a change that failed and will retry. */
export function SaveStatus({ saving, dirty, failed }: { saving: boolean; dirty: boolean; failed?: boolean }) {
  const th = useTheme();
  if (failed) return <Text size="xs" weight="semibold" tone="danger">{t('Save nahi hua')}</Text>;
  if (saving || dirty) return <Text size="xs" tone="muted">{t('Save ho raha hai…')}</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon icon={Check} size={14} color={th.colors.success.text} />
      <Text size="xs" tone="muted">{t('Save ho gaya')}</Text>
    </View>
  );
}

/** Shown on top of a settings screen while the phone is offline (values are read-only). */
export function OfflineNote() {
  return (
    <Card tone="warning">
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Icon icon={CloudOff} tone="warning" />
        <Text size="sm" style={{ flex: 1 }}>{onlineNeededText('settings')}</Text>
      </View>
    </Card>
  );
}

/** Number box that keeps its own text while typing, then reports a clamped number. */
export function NumberField({ label, hint, value, onChange, min, max, decimals, prefix, suffix, disabled }: {
  label: string; hint?: string; value: number | null | undefined; onChange: (v: number) => void;
  min?: number; max?: number; decimals?: boolean; prefix?: string; suffix?: string; disabled?: boolean;
}) {
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => { if (Number(text) !== Number(value ?? 0)) setText(String(value ?? 0)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  return (
    <Input
      label={label} hint={hint} ltr prefix={prefix} disabled={disabled}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      value={text}
      trailing={suffix ? <Text size="sm" tone="muted">{suffix}</Text> : undefined}
      onChangeText={(v) => {
        const clean = v.replace(',', '.');
        setText(clean);
        if (clean !== '' && Number.isFinite(Number(clean))) onChange(clamp(Number(clean)));
      }}
      onBlur={() => { if (text === '' || !Number.isFinite(Number(text))) { setText(String(min ?? 0)); onChange(min ?? 0); } else setText(String(clamp(Number(text)))); }}
    />
  );
}

export interface ChoiceOption<V extends string> { value: V; label: string; desc?: string }

/** Radio cards with a one-line description; the chosen one is outlined in the brand color. */
export function ChoiceCards<V extends string>({ value, onChange, options, disabled }: { value: V; onChange: (v: V) => void; options: ChoiceOption<V>[]; disabled?: boolean }) {
  const th = useTheme();
  const c = th.colors;
  return (
    <View accessibilityRole="radiogroup" style={{ gap: th.space(2) }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value} disabled={disabled} haptic="select" onPress={() => onChange(o.value)}
            accessibilityRole="radio" accessibilityState={{ selected: on, disabled }} accessibilityLabel={o.label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: on ? 1.5 : 1, borderColor: on ? c.brand.solid : c.border, backgroundColor: on ? c.brand.soft : c.surface, opacity: disabled ? 0.6 : 1 }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text size="sm" weight="semibold">{o.label}</Text>
              {!!o.desc && <Text size="xs" tone="muted">{o.desc}</Text>}
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? c.brand.solid : c.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.brand.solid }} />}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** A titled block of fields on a card. */
export function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  const th = useTheme();
  return (
    <Card title={title} description={description} action={action}>
      <View style={{ gap: th.space(3) }}>{children}</View>
    </Card>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success' | 'brand' | 'muted'; children: ReactNode }) {
  return <Card tone={tone}>{typeof children === 'string' ? <Text size="sm">{children}</Text> : children}</Card>;
}


/** Settings pages are the owner's (same rule as the web); anyone else sees a short note. */
export function ownerOnly<P extends object>(Page: (props: P) => ReactNode, title: string) {
  return function OwnerOnlyPage(props: P) {
    const { isOwner } = usePermissions();
    if (isOwner) return <>{Page(props)}</>;
    return (
      <Screen title={t(title)} narrow>
        <EmptyState title={t('Sirf malik ke liye')} message={t('Ye settings sirf dukaan ka malik badal sakta hai.')} />
      </Screen>
    );
  };
}
