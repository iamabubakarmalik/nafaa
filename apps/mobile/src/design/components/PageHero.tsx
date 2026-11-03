/**
 * Accent-colored page header with headline numbers (mirror of the web
 * PageHero). Its look follows Appearance → Header: style (Modern, Simple,
 * Soft, Dark, Aurora, Outline), pattern, size and stats layout.
 *
 *   <PageHero
 *     title={t('Sales')}
 *     chip={t('Today')}
 *     meta={t('Updated just now')}
 *     actions={<HeroButton icon={Plus} onPress={…}>{t('New')}</HeroButton>}
 *     stats={[
 *       { label: t('Sale'), value: <Amount value={x} /> },        // first one is large
 *       { label: t('Bills'), value: '24' },
 *     ]}
 *   />
 *
 * Content inside reads the header colors from `useHero()`; use HeroButton /
 * HeroIconButton for actions so they fit every style.
 */

import type { LucideIcon } from 'lucide-react-native';
import { ArrowLeft } from 'lucide-react-native';
import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { t } from '@/core/i18n';
import { useTheme, type Theme } from '../theme/ThemeProvider';
import { withAlpha, mixHex } from '../tokens/color';
import { PLAIN_HERO_STYLES, type HeroPattern, type HeroStatsLayout, type HeroStyle } from '../tokens/hero';
import type { HeaderSize } from '../theme/appearance';
import { PressableScale } from './Pressable';
import { Text, type TextProps } from './Text';
import { Amount, type AmountProps } from './Amount';
import { Icon } from './Icon';
import { textOf } from './Button';
import { Skeleton } from './Skeleton';
import { EmbeddedScreenContext } from './Screen';

export interface HeroColors {
  fg: string;
  soft: string;
  muted: string;
  subtle: string;
  line: string;
  tileBg: string;
  tileBorder: string;
  btnBg: string;
  btnBorder: string;
  btnFg: string;
  primaryBg: string;
  primaryFg: string;
  chipBg: string;
  chipFg: string;
  skeleton: string;
  /** True for styles drawn on a light surface. */
  light: boolean;
}

const HeroContext = createContext<HeroColors | null>(null);

/** Colors of the surrounding PageHero (or null outside one). */
export const useHero = () => useContext(HeroContext);

const white = (a: number) => withAlpha('#ffffff', a);

export function heroColors(th: Theme, style: HeroStyle): HeroColors {
  const s = th.colors.brandScale;
  const c = th.colors;
  if (style === 'soft' || style === 'outline') {
    return {
      fg: c.text, soft: c.textSecondary, muted: c.textSecondary, subtle: c.textMuted, line: c.brand.border,
      tileBg: th.isDark ? withAlpha('#ffffff', 0.04) : white(0.7), tileBorder: c.brand.border,
      btnBg: c.surface, btnBorder: c.brand.border, btnFg: c.text, primaryBg: c.brand.solid, primaryFg: c.brand.onSolid,
      chipBg: th.isDark ? c.brand.soft : white(0.75), chipFg: c.brand.text, skeleton: c.brand.border, light: true,
    };
  }
  if (style === 'dark') {
    return {
      fg: '#ffffff', soft: '#e2e8f0', muted: '#cbd5e1', subtle: '#94a3b8', line: white(0.12),
      tileBg: white(0.05), tileBorder: white(0.1), btnBg: white(0.08), btnBorder: white(0.16), btnFg: '#ffffff',
      primaryBg: s[500], primaryFg: s[950], chipBg: withAlpha(s[500], 0.18), chipFg: s[200], skeleton: white(0.12), light: false,
    };
  }
  return {
    fg: '#ffffff', soft: white(0.78), muted: white(0.72), subtle: white(0.6), line: white(0.2),
    tileBg: white(0.1), tileBorder: white(0.18), btnBg: white(0.15), btnBorder: white(0.25), btnFg: '#ffffff',
    primaryBg: '#ffffff', primaryFg: s[800], chipBg: white(0.12), chipFg: white(0.92), skeleton: white(0.16), light: false,
  };
}

/** The decorative layer: gradient, glows and pattern for a hero style. */
export function HeroBackdrop({ style, pattern, radius, width, height }: { style: HeroStyle; pattern: HeroPattern; radius: number; width?: number; height?: number }) {
  const th = useTheme();
  const s = th.colors.brandScale;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const usePattern = PLAIN_HERO_STYLES.includes(style) || style === 'outline' ? 'none' : pattern;
  const patternColor = style === 'soft' ? s[600] : '#ffffff';
  const patternOpacity = style === 'soft' ? 0.09 : style === 'dark' ? 0.05 : 0.07;
  const softFrom = th.isDark ? mixHex(s[500], '#11192b', 0.16) : s[50];
  const softTo = th.isDark ? mixHex(s[500], '#11192b', 0.24) : s[100];
  const STOPS: Record<HeroStyle, Array<[string, string]>> = {
    modern: [['0', s[600]], ['0.55', s[700]], ['1', s[900]]],
    simple: [['0', s[600]], ['1', s[600]]],
    soft: [['0', softFrom], ['1', softTo]],
    dark: [['0', '#1e293b'], ['0.45', '#0f172a'], ['1', '#020617']],
    aurora: [['0', s[800]], ['1', s[600]]],
    outline: [['0', th.colors.surface], ['1', th.colors.surface]],
  };
  const stops = STOPS[style];

  return (
    <Svg style={{ position: 'absolute', top: 0, start: 0 }} width={width ?? '100%'} height={height ?? '100%'} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          {stops.map(([offset, color], i) => <Stop key={i} offset={offset} stopColor={color} />)}
        </LinearGradient>
        <RadialGradient id={`glow${id}`} cx="95%" cy="0%" rx="55%" ry="90%">
          <Stop offset="0" stopColor={style === 'dark' ? s[600] : style === 'soft' ? s[400] : '#ffffff'} stopOpacity={style === 'dark' ? 0.42 : style === 'soft' ? 0.2 : 0.16} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`a1${id}`} cx="88%" cy="0%" rx="45%" ry="110%"><Stop offset="0" stopColor={s[300]} stopOpacity={0.9} /><Stop offset="1" stopColor={s[300]} stopOpacity={0} /></RadialGradient>
        <RadialGradient id={`a2${id}`} cx="62%" cy="110%" rx="40%" ry="90%"><Stop offset="0" stopColor={s[400]} stopOpacity={0.75} /><Stop offset="1" stopColor={s[400]} stopOpacity={0} /></RadialGradient>
        <RadialGradient id={`a3${id}`} cx="0%" cy="100%" rx="55%" ry="140%"><Stop offset="0" stopColor={s[950]} stopOpacity={0.9} /><Stop offset="1" stopColor={s[950]} stopOpacity={0} /></RadialGradient>
        {usePattern === 'dots' && <Pattern id={`p${id}`} width="18" height="18" patternUnits="userSpaceOnUse"><Circle cx="1.5" cy="1.5" r="1.5" fill={patternColor} /></Pattern>}
        {usePattern === 'grid' && <Pattern id={`p${id}`} width="22" height="22" patternUnits="userSpaceOnUse"><Path d="M22 0H0V22" fill="none" stroke={patternColor} strokeWidth="1" /></Pattern>}
        {usePattern === 'lines' && <Pattern id={`p${id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><Line x1="0" y1="0" x2="0" y2="10" stroke={patternColor} strokeWidth="1.5" /></Pattern>}
      </Defs>
      <Rect width="100%" height="100%" rx={radius} fill={`url(#g${id})`} />
      {style === 'aurora' && (
        <>
          <Rect width="100%" height="100%" rx={radius} fill={`url(#a1${id})`} />
          <Rect width="100%" height="100%" rx={radius} fill={`url(#a2${id})`} />
          <Rect width="100%" height="100%" rx={radius} fill={`url(#a3${id})`} />
        </>
      )}
      {style !== 'simple' && style !== 'outline' && style !== 'aurora' && <Rect width="100%" height="100%" rx={radius} fill={`url(#glow${id})`} />}
      {usePattern !== 'none' && <Rect width="100%" height="100%" rx={radius} fill={`url(#p${id})`} opacity={patternOpacity} />}
    </Svg>
  );
}

export interface HeroStat {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onPress?: () => void;
}

export interface PageHeroProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Back button before the title. */
  onBack?: () => void;
  chip?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  stats?: HeroStat[];
  loading?: boolean;
  /** Extra content under the stats (a chart, a progress bar). */
  children?: ReactNode;
  /** Overrides Appearance (used by the live preview). */
  look?: Partial<{ style: HeroStyle; pattern: HeroPattern; size: HeaderSize; stats: HeroStatsLayout }>;
  style?: StyleProp<ViewStyle>;
}

export function PageHero({ title, subtitle, onBack, chip, meta, actions, stats, loading, children, look, style }: PageHeroProps) {
  const th = useTheme();
  const a = th.appearance;
  // Inside an embedded screen (a Home widget) the hero is a quiet panel, not a second banner.
  const embedded = useContext(EmbeddedScreenContext);
  const heroStyle = look?.style ?? (embedded ? 'soft' : a.heroStyle);
  const pattern = look?.pattern ?? a.heroPattern;
  // Mobile uses its own header size (Appearance → Mobile app → Header size).
  const headerSize: HeaderSize = look?.size ?? (embedded ? 'compact' : a.mobile.header);
  const compact = headerSize === 'compact';
  const large = headerSize === 'large';
  const cards = (look?.stats ?? a.heroStats) === 'cards';
  const colors = heroColors(th, heroStyle);
  const radius = th.radius(compact ? '2xl' : '3xl');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const width = size.width;
  const pad = th.space(compact ? 3.5 : large ? 5 : 4);
  const hasTop = title != null || chip != null || subtitle != null || meta != null || !!actions || !!onBack;

  return (
    <HeroContext.Provider value={colors}>
      <View
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        style={[{
          borderRadius: radius, padding: pad, overflow: 'hidden',
          borderWidth: heroStyle === 'outline' ? 1.5 : heroStyle === 'soft' ? 1 : 0, borderColor: th.colors.brand.border,
          shadowColor: th.colors.brandScale[900], shadowOpacity: heroStyle === 'outline' || th.isDark ? 0 : 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: heroStyle === 'outline' ? 0 : 4,
        }, style]}
      >
        {size.width > 0 && <HeroBackdrop style={heroStyle} pattern={pattern} radius={radius} width={size.width} height={size.height} />}
        {heroStyle === 'soft' && <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, width: 4, backgroundColor: th.colors.brandScale[500] }} />}

        {hasTop && <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
          {onBack && <HeroIconButton icon={ArrowLeft} label={t('Wapas')} onPress={onBack} flip />}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            {(title || chip) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: th.space(2) }}>
                {title != null && (typeof title === 'string'
                  ? <Text size={compact ? 'md' : large ? 'xl' : 'lg'} weight="bold" color={colors.fg} numberOfLines={1} accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</Text>
                  : title)}
                {chip != null && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.line }}>
                    {typeof chip === 'string' ? <Text size="xs" weight="medium" color={colors.chipFg}>{chip}</Text> : chip}
                  </View>
                )}
              </View>
            )}
            {subtitle != null && (typeof subtitle === 'string' ? <Text size="sm" color={colors.soft} numberOfLines={2}>{subtitle}</Text> : subtitle)}
            {meta != null && (typeof meta === 'string' ? <Text size="xs" color={colors.subtle} numberOfLines={1}>{meta}</Text> : meta)}
          </View>
          {actions && <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>{actions}</View>}
        </View>}

        {stats && stats.length > 0 && (
          <View style={{ marginTop: hasTop ? th.space(compact ? 2.5 : large ? 4 : 3) : 0, flexDirection: 'row', flexWrap: 'wrap', gap: cards ? th.space(2) : th.space(compact ? 3 : 4) }}>
            {stats.map((st, i) => {
              const big = i === 0;
              const tileWidth = cards && width ? (big ? width - pad * 2 : (width - pad * 2 - th.space(2)) / 2 - 0.5) : undefined;
              const body = (
                <>
                  <Text size="xs" weight="medium" color={colors.muted} numberOfLines={1}>{st.label}</Text>
                  {loading ? (
                    <Skeleton width={big ? 150 : 80} height={big ? (compact ? 26 : 34) : 20} style={{ marginTop: 4, backgroundColor: colors.skeleton }} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      {typeof st.value === 'string' || typeof st.value === 'number'
                        ? <Text size={big ? (compact ? '2xl' : large ? '4xl' : '3xl') : compact ? 'md' : large ? 'xl' : 'lg'} weight="bold" color={colors.fg} ltr tabular numberOfLines={1}>{String(st.value)}</Text>
                        : st.value}
                      {st.hint != null && (typeof st.hint === 'string' ? <Text size="2xs" weight="medium" color={colors.subtle}>{st.hint}</Text> : st.hint)}
                    </View>
                  )}
                </>
              );
              const frame: StyleProp<ViewStyle> = cards
                ? { width: tileWidth, paddingHorizontal: th.space(3), paddingVertical: th.space(2), borderRadius: th.radius('xl'), backgroundColor: colors.tileBg, borderWidth: 1, borderColor: colors.tileBorder }
                : [{ minWidth: big ? '100%' : undefined }, !big && i > 1 && { borderStartWidth: 1, borderStartColor: colors.line, paddingStart: th.space(compact ? 3 : 4) }];
              return st.onPress
                ? <PressableScale key={i} onPress={st.onPress} haptic="tap" accessibilityLabel={st.label} style={frame}>{body}</PressableScale>
                : <View key={i} style={frame}>{body}</View>;
            })}
          </View>
        )}
        {children && <View style={{ marginTop: hasTop || (stats && stats.length > 0) ? th.space(3) : 0 }}>{children}</View>}
      </View>
    </HeroContext.Provider>
  );
}

/** Button that fits the surrounding PageHero style. */
export function HeroButton({ icon, children, onPress, primary, accessibilityLabel }: { icon?: LucideIcon; children?: ReactNode; onPress?: () => void; primary?: boolean; accessibilityLabel?: string }) {
  const th = useTheme();
  const h = useHero() ?? heroColors(th, 'modern');
  const fg = primary ? h.primaryFg : h.btnFg;
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      accessibilityLabel={accessibilityLabel ?? textOf(children)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: th.space(3), borderRadius: th.radius('lg'),
        backgroundColor: primary ? h.primaryBg : h.btnBg, borderWidth: primary ? 0 : 1, borderColor: h.btnBorder,
      }}
    >
      {icon && <Icon icon={icon} size={17} color={fg} />}
      {children != null && <Text size="sm" weight={primary ? 'bold' : 'semibold'} color={fg}>{children}</Text>}
    </PressableScale>
  );
}

export function HeroIconButton({ icon, label, onPress, flip, badge }: { icon: LucideIcon; label: string; onPress?: () => void; flip?: boolean; badge?: boolean }) {
  const th = useTheme();
  const h = useHero() ?? heroColors(th, 'modern');
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      accessibilityLabel={label}
      style={{ width: 38, height: 38, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: h.btnBg, borderWidth: 1, borderColor: h.btnBorder }}
    >
      <Icon icon={icon} size={19} color={h.btnFg} flip={flip} />
      {badge && <View style={{ position: 'absolute', top: 7, end: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e' }} />}
    </PressableScale>
  );
}

/** Money inside a PageHero, in the header's text color. */
export function HeroAmount(props: AmountProps) {
  const h = useHero();
  return <Amount weight="bold" color={h?.fg} {...props} />;
}

/** Text inside a PageHero: 'fg' (default), 'soft', 'muted' or 'subtle' header colors. */
export function HeroText({ tone = 'fg', ...props }: Omit<TextProps, 'tone' | 'color'> & { tone?: 'fg' | 'soft' | 'muted' | 'subtle' }) {
  const h = useHero();
  return <Text {...props} color={h ? h[tone] : undefined} />;
}
