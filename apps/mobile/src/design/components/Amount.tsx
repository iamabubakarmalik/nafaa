/**
 * Money on screen. Always "Rs 12,500", Latin digits, left-to-right in every
 * language.
 *
 *   <Amount value={sale.total} size="xl" weight="bold" />
 *   <Amount value={diff} signed colorize />        // green +, red -
 *   <Amount value={1250000} compact />             // Rs 12.5 L
 *   <Amount value={x} hidden />                    // "Rs ••••" when figures are hidden
 */

import { formatMoney, type MoneyOptions } from '@/core/format/money';
import { Text, type TextProps } from './Text';

export interface AmountProps extends Omit<TextProps, 'children'>, MoneyOptions {
  value: unknown;
  /** Green for positive, red for negative. */
  colorize?: boolean;
  hidden?: boolean;
}

export function Amount({ value, decimals, compact, signed, bare, colorize, hidden, tone, weight = 'semibold', ...rest }: AmountProps) {
  const n = Number(value) || 0;
  const text = hidden ? 'Rs ••••' : formatMoney(value, { decimals, compact, signed, bare });
  const autoTone = colorize ? (n > 0 ? 'success' : n < 0 ? 'danger' : tone) : tone;
  return (
    <Text ltr tabular weight={weight} tone={autoTone} {...rest}>
      {text}
    </Text>
  );
}
