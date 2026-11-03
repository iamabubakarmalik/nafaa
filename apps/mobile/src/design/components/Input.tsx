/**
 * Form fields.
 *
 *   <Input label={t('Email')} value={email} onChangeText={setEmail} keyboardType="email-address" icon={Mail} error={errors.email} />
 *   <PasswordInput label={t('Password')} value={pw} onChangeText={setPw} />
 *   <MoneyInput label={t('Price')} value={price} onChangeValue={setPrice} />     // number | null, LTR, "Rs" prefix
 *   <TextArea label={t('Note')} … />
 *   <Field label=… hint=… error=…>{customControl}</Field>
 *
 * Fields are 16pt or larger
 * (no iOS zoom) and phone/email/number fields type left-to-right in Urdu.
 */

import type { LucideIcon } from 'lucide-react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { t } from '@/core/i18n';
import { formatNumber } from '@/core/format/number';
import { useTheme } from '../theme/ThemeProvider';
import { MAX_FONT_SCALE } from '../tokens/typography';
import type { ControlSize } from '../tokens/layout';
import { Text } from './Text';
import { Icon } from './Icon';
import { PressableScale } from './Pressable';

export interface FieldProps {
  label?: ReactNode;
  /** Shown next to the label, e.g. "(optional)". */
  labelHint?: string;
  hint?: ReactNode;
  error?: string | null | false;
  /** Right side of the label row (a link like "Forgot password?"). */
  labelAction?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Field({ label, labelHint, hint, error, labelAction, children, style }: FieldProps) {
  const th = useTheme();
  return (
    <View style={[{ gap: th.space(1.5) }, style]}>
      {(label || labelAction) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: th.space(2) }}>
          {label ? (
            <Text size="sm" weight="medium" tone="secondary" style={{ flexShrink: 1 }}>
              {label}{labelHint ? <Text size="sm" tone="muted">{`  ${labelHint}`}</Text> : null}
            </Text>
          ) : <View />}
          {labelAction}
        </View>
      )}
      {children}
      {error ? (
        <Text size="xs" weight="medium" tone="danger" accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        typeof hint === 'string' ? <Text size="xs" tone="muted">{hint}</Text> : hint
      ) : null}
    </View>
  );
}

export interface InputProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label?: ReactNode;
  labelHint?: string;
  hint?: ReactNode;
  error?: string | null | false;
  labelAction?: ReactNode;
  icon?: LucideIcon;
  /** Element at the end of the box (a unit, a button). */
  trailing?: ReactNode;
  /** Text before the value inside the box ("Rs", "+92"). */
  prefix?: string;
  size?: ControlSize;
  disabled?: boolean;
  /** Type left-to-right in every language (phone, email, numbers, codes). */
  ltr?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

const LTR_KEYBOARDS = new Set(['email-address', 'phone-pad', 'number-pad', 'decimal-pad', 'numeric', 'url']);

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, labelHint, hint, error, labelAction, icon, trailing, prefix, size = 'lg', disabled, ltr, containerStyle, onFocus, onBlur, multiline, keyboardType, secureTextEntry, ...rest },
  ref,
) {
  const th = useTheme();
  const c = th.colors;
  const [focused, setFocused] = useState(false);
  const Comp = TextInput;
  const isLtr = ltr || secureTextEntry || LTR_KEYBOARDS.has(String(keyboardType));
  const { fontSize } = th.type('md', false);

  return (
    <Field label={label} labelHint={labelHint} hint={hint} error={error} labelAction={labelAction} style={containerStyle}>
      <View
        style={{
          flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: th.space(2),
          minHeight: multiline ? 96 : th.control(size), paddingHorizontal: th.space(3.5),
          paddingVertical: multiline ? th.space(3) : 0,
          backgroundColor: disabled ? c.surfaceMuted : c.surface,
          borderRadius: th.radius('lg'), borderWidth: focused ? 1.5 : 1,
          borderColor: error ? c.danger.solid : focused ? c.brand.solid : c.borderStrong,
        }}
      >
        {icon && <Icon icon={icon} size={18} tone={focused ? 'brand' : 'subtle'} />}
        {prefix && <Text size="md" tone="muted" ltr>{prefix}</Text>}
        <Comp
          ref={ref}
          editable={!disabled}
          multiline={multiline}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={c.textSubtle}
          selectionColor={c.brand.solid}
          cursorColor={c.brand.solid}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={{
            flex: 1, fontSize: Math.max(16, fontSize), color: c.text, paddingVertical: multiline ? 0 : 10,
            fontFamily: th.fontFamily('regular', th.rtl && !isLtr ? 'urdu' : 'latin'),
            textAlign: th.rtl ? 'right' : 'left',
            writingDirection: isLtr ? 'ltr' : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
            minHeight: multiline ? 72 : undefined,
          }}
          accessibilityLabel={typeof label === 'string' ? label : rest.accessibilityLabel}
          {...rest}
        />
        {trailing}
      </View>
    </Field>
  );
});

export const TextArea = forwardRef<TextInput, InputProps>(function TextArea(props, ref) {
  return <Input ref={ref} multiline numberOfLines={4} {...props} />;
});

export const PasswordInput = forwardRef<TextInput, InputProps>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={(
        <PressableScale onPress={() => setShow((v) => !v)} haptic="tap" hitSlop={10} accessibilityLabel={show ? t('Password chhupayein') : t('Password dikhayein')}>
          <Icon icon={show ? EyeOff : Eye} size={20} tone="muted" />
        </PressableScale>
      )}
      {...props}
    />
  );
});

export interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  /** Allow paisa (2 decimals). Default true. */
  decimals?: boolean;
}

/** Amount field: digits only, thousands separators while typing, "Rs" prefix. */
export const MoneyInput = forwardRef<TextInput, MoneyInputProps>(function MoneyInput({ value, onChangeValue, decimals = true, ...props }, ref) {
  const [text, setText] = useState(value == null ? '' : formatNumber(value));
  // Follow outside changes (form reset, calculated values) but not our own typing.
  useEffect(() => {
    const typed = text === '' ? null : Number(text.replace(/,/g, ''));
    if (value !== typed) setText(value == null ? '' : formatNumber(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      ref={ref}
      prefix="Rs"
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={text}
      onChangeText={(raw) => {
        let clean = raw.replace(/[^0-9.]/g, '');
        if (!decimals) clean = clean.replace(/\./g, '');
        const [i, ...d] = clean.split('.');
        const dec = d.join('').slice(0, 2);
        const intPart = i.replace(/^0+(?=\d)/, '');
        const display = (intPart ? formatNumber(Number(intPart), { decimals: 0 }) : clean.startsWith('.') ? '0' : '') + (clean.includes('.') ? `.${dec}` : '');
        setText(display);
        const n = Number(`${intPart || '0'}.${dec || '0'}`);
        onChangeValue(clean === '' ? null : Number.isFinite(n) ? n : null);
      }}
      {...props}
      ltr
    />
  );
});
