/**
 * Text. Every word on screen goes through this component.
 *
 *   <Text size="lg" weight="bold">{t('Products')}</Text>
 *   <Text tone="muted" size="sm" numberOfLines={1}>{subtitle}</Text>
 *   <Text ltr>{phone}</Text>          // numbers, codes, emails stay left-to-right
 *
 * In Urdu, Urdu-script words use the Urdu font and everything else (digits,
 * English words, amounts) the Latin font, with a taller line height so Naskh
 * is not clipped.
 */

import { Children, isValidElement, cloneElement, type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type Theme } from '../theme/ThemeProvider';
import { MAX_FONT_SCALE, type FontWeight, type TypeSize } from '../tokens/typography';

export type TextTone =
  | 'default' | 'secondary' | 'muted' | 'subtle' | 'inverse' | 'onBrand'
  | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  size?: TypeSize;
  weight?: FontWeight;
  tone?: TextTone;
  color?: string;
  align?: 'start' | 'center' | 'end';
  /** Keep left-to-right in every language (amounts, phones, codes, emails). */
  ltr?: boolean;
  /** Tabular digits for columns of numbers. */
  tabular?: boolean;
  italic?: boolean;
  uppercase?: boolean;
  style?: TextStyle | (TextStyle | undefined | false)[];
  children?: ReactNode;
}

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const ARABIC_RUNS = /([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s،۔؟]*)/;

/** Left-to-right isolate (LRI … PDI) so a value keeps its order inside Urdu text. */
export const ltrIsolate = (s: string) => `⁦${s}⁩`;

export function toneColor(theme: Theme, tone: TextTone): string {
  const c = theme.colors;
  switch (tone) {
    case 'secondary': return c.textSecondary;
    case 'muted': return c.textMuted;
    case 'subtle': return c.textSubtle;
    case 'inverse': return c.textInverse;
    case 'onBrand': return c.brand.onSolid;
    case 'brand': return c.brand.text;
    case 'success': return c.success.text;
    case 'warning': return c.warning.text;
    case 'danger': return c.danger.text;
    case 'info': return c.info.text;
    default: return c.text;
  }
}

function hasArabic(node: ReactNode): boolean {
  let found = false;
  Children.forEach(node, (child) => {
    if (found) return;
    if (typeof child === 'string') found = ARABIC.test(child);
    else if (isValidElement<{ children?: ReactNode }>(child)) found = hasArabic(child.props.children);
  });
  return found;
}

function splitScripts(node: ReactNode, urduFamily: string | undefined): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === 'string') {
      if (!ARABIC.test(child)) return child;
      return child.split(ARABIC_RUNS).filter(Boolean).map((part, i) =>
        ARABIC.test(part) ? <RNText key={i} style={{ fontFamily: urduFamily }}>{part}</RNText> : part,
      );
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children !== undefined && child.type === RNText) {
      return cloneElement(child, undefined, splitScripts(child.props.children, urduFamily));
    }
    return child;
  });
}

export function Text({
  size = 'base', weight = 'regular', tone = 'default', color, align, ltr, tabular, italic, uppercase,
  style, children, ...rest
}: TextProps) {
  const theme = useTheme();
  const urdu = theme.rtl && !ltr && hasArabic(children);
  const { fontSize, lineHeight } = theme.type(size, urdu);
  // 'left'/'right' flip in right-to-left layouts, so 'left' means "start".
  // Without it iOS aligns each line by its own script (English lines in Urdu would sit left).
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : align === 'end' ? 'right' : 'left';
  const base: TextStyle = {
    fontSize,
    lineHeight,
    color: color ?? toneColor(theme, tone),
    fontFamily: theme.fontFamily(weight, 'latin'),
    fontWeight: theme.fontFamily(weight, 'latin') ? undefined : (String(({ regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800 } as const)[weight]) as TextStyle['fontWeight']),
    textAlign,
    fontStyle: italic ? 'italic' : undefined,
    textTransform: uppercase ? 'uppercase' : undefined,
    fontVariant: tabular ? ['tabular-nums'] : undefined,
    writingDirection: ltr ? 'ltr' : undefined,
  };
  let content: ReactNode = children;
  if (ltr && typeof children === 'string') content = ltrIsolate(children);
  else if (urdu) content = splitScripts(children, theme.fontFamily(weight, 'urdu'));
  return (
    <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} style={[base, ...(Array.isArray(style) ? style : [style])]}>
      {content}
    </RNText>
  );
}
