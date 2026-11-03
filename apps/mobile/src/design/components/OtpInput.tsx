/**
 * One-time code boxes (email verification). Accepts paste and SMS/email
 * autofill of the whole code; calls onComplete when every box is filled.
 *
 *   <OtpInput length={6} value={code} onChange={setCode} onComplete={verify} error={!!err} />
 */

import { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { t } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({ length = 6, value, onChange, onComplete, error, disabled, autoFocus = true }: OtpInputProps) {
  const th = useTheme();
  const c = th.colors;
  const ref = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (error && th.motion) {
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 }));
    }
  }, [error, th.motion, shake]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={t('{{count}} number ka code', { count: length })} disabled={disabled}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, length);
          onChange(digits);
          if (digits.length === length) onComplete?.(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={!disabled}
        maxLength={length}
        caretHidden
        style={{ position: 'absolute', opacity: 0.01, width: 1, height: 1 }}
      />
      <Animated.View style={[{ flexDirection: 'row', direction: 'ltr', justifyContent: 'space-between', gap: th.space(2) }, anim]}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i] ?? '';
          const active = i === Math.min(value.length, length - 1) && !disabled;
          return (
            <View key={i} style={{
              flex: 1, maxWidth: 56, height: 60, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.surface, borderWidth: active ? 2 : 1,
              borderColor: error ? c.danger.solid : active ? c.brand.solid : ch ? c.brand.border : c.borderStrong,
            }}>
              <Text size="2xl" weight="bold" ltr tabular>{ch}</Text>
            </View>
          );
        })}
      </Animated.View>
    </Pressable>
  );
}
