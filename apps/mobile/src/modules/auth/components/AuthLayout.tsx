/**
 * Frame for the sign-in and sign-up screens: a brand band with the logo and
 * the language switch, then the form on a card that rises over it. On
 * tablets the form is centered at a comfortable width.
 */

import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { LanguageSwitch } from '@/core/i18n/components/LanguagePicker';
import { IconButton, Text, Wordmark, useLayout, useTheme } from '@/design';

export function AuthLayout({ title, subtitle, back, children, footer, steps }: {
  title: string;
  subtitle?: ReactNode;
  /** Show a back button (forgot / reset password). */
  back?: boolean;
  /** Under the card (switch between sign-in and sign-up). */
  footer?: ReactNode;
  /** Small progress line above the title (sign-up parts). */
  steps?: ReactNode;
  children: ReactNode;
}) {
  const th = useTheme();
  const s = th.colors.brandScale;
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas }}>
      <StatusBar style="light" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + (isTablet ? 300 : 250) }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="auth-g" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={s[600]} />
              <Stop offset="0.6" stopColor={s[700]} />
              <Stop offset="1" stopColor={s[900]} />
            </LinearGradient>
            <Pattern id="auth-dots" width="18" height="18" patternUnits="userSpaceOnUse">
              <Circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#auth-g)" />
          <Rect width="100%" height="100%" fill="url(#auth-dots)" opacity={0.07} />
          <Circle cx="92%" cy="8%" r="120" fill="#ffffff" opacity={0.08} />
        </Svg>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + th.space(3), paddingBottom: insets.bottom + th.space(6) }}
      >
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: th.space(4) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: 44 }}>
            {back ? <IconButton icon={ArrowLeft} label={t('Wapas')} variant="inverse" flip onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} /> : <Wordmark size={34} tone="inverse" />}
            <View style={{ flex: 1 }} />
            <View style={{ width: 210 }}><LanguageSwitch onDark /></View>
          </View>

          <View style={{ marginTop: th.space(isTablet ? 10 : 6), marginBottom: th.space(5), gap: th.space(1) }}>
            {steps}
            <Text size="3xl" weight="heavy" color="#ffffff" accessibilityRole="header">{title}</Text>
            {subtitle != null && (typeof subtitle === 'string' ? <Text size="base" color="rgba(255,255,255,0.85)">{subtitle}</Text> : subtitle)}
          </View>

          <View style={{
            backgroundColor: th.colors.surface, borderRadius: th.radius('3xl'), padding: th.space(5), gap: th.space(4),
            borderWidth: th.isDark ? 1 : 0, borderColor: th.colors.border,
            shadowColor: '#0f172a', shadowOpacity: th.isDark ? 0 : 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6,
          }}>
            {children}
          </View>

          {footer && <View style={{ marginTop: th.space(5), alignItems: 'center' }}>{footer}</View>}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

export function OrDivider({ label }: { label?: string }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
      <View style={{ flex: 1, height: 1, backgroundColor: th.colors.border }} />
      <Text size="xs" tone="muted" weight="medium">{label ?? t('ya')}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: th.colors.border }} />
    </View>
  );
}
