/**
 * Language switchers (same model as the web LanguagePicker):
 *  - <LanguageCards/>  big cards with a sample line: Settings, onboarding
 *  - <LanguageSwitch/> compact three-way switch: login, profile menu
 * Both save the choice (to the account when signed in) and reload the app.
 */

import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Icon, PressableScale, Text, useTheme } from '@/design';
import { LOCALES, currentLocale, type Locale } from '@/core/i18n';
import { changeLanguage } from '../sync';

function useSwitch() {
  const [busy, setBusy] = useState<Locale | null>(null);
  const pick = (id: Locale) => {
    if (id === currentLocale() || busy) return;
    setBusy(id);
    changeLanguage(id).catch(() => setBusy(null));
  };
  return { busy, pick };
}

/** Shown the same in every language so anyone can find it. */
export const LANGUAGE_HEADING = 'Language / Zaban / زبان';

export function LanguageCards() {
  const th = useTheme();
  const c = th.colors;
  const { busy, pick } = useSwitch();
  const active = currentLocale();
  return (
    <View style={{ gap: th.space(2) }} accessibilityRole="radiogroup">
      {LOCALES.map((l) => {
        const on = l.id === active;
        return (
          <PressableScale
            key={l.id}
            onPress={() => pick(l.id)}
            haptic="select"
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.native}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(4), borderRadius: th.radius('xl'),
              backgroundColor: on ? c.brand.soft : c.surface, borderWidth: on ? 1.5 : 1, borderColor: on ? c.brand.solid : c.border,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text size="md" weight="bold" style={l.dir === 'rtl' ? { writingDirection: 'rtl' } : undefined}>{l.native}</Text>
              <Text size="sm" tone="muted" style={l.dir === 'rtl' ? { writingDirection: 'rtl' } : undefined}>{l.sample}</Text>
            </View>
            {busy === l.id ? <ActivityIndicator color={c.brand.solid} /> : on ? (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={Check} size={16} color={c.brand.onSolid} strokeWidth={3} />
              </View>
            ) : <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: c.borderStrong }} />}
          </PressableScale>
        );
      })}
    </View>
  );
}

export function LanguageSwitch({ onDark }: { onDark?: boolean }) {
  const th = useTheme();
  const c = th.colors;
  const { busy, pick } = useSwitch();
  const active = currentLocale();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', direction: 'ltr', padding: 3, gap: 3, borderRadius: th.radius('lg'), backgroundColor: onDark ? 'rgba(255,255,255,0.14)' : c.surfaceMuted }}>
      {LOCALES.map((l) => {
        const on = l.id === active;
        return (
          <PressableScale
            key={l.id}
            onPress={() => pick(l.id)}
            haptic="select"
            scaleTo={0.96}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.name}
            style={{ flex: 1, height: 36, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: on ? (onDark ? '#ffffff' : c.surface) : 'transparent' }}
          >
            {busy === l.id ? <ActivityIndicator size="small" color={c.brand.solid} /> : (
              <Text size="sm" weight={on ? 'bold' : 'medium'} color={on ? (onDark ? c.brandScale[800] : c.text) : onDark ? 'rgba(255,255,255,0.85)' : c.textMuted}>
                {l.id === 'roman' ? 'Roman' : l.native}
              </Text>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}
