/**
 * Screen frame and header.
 *
 * Headers are small and clean by default and follow Appearance → Mobile app →
 * Header size:
 *   compact   one slim bar with the title (default)
 *   standard  a large title under the bar that collapses into it on scroll
 *   large     a bigger title and subtitle, also collapsing
 * The bar gets a hairline once content scrolls under it.
 *
 *   <Screen title={t('Products')} actions={<IconButton icon={Plus} label={t('New')} onPress={…} />}>…</Screen>
 *   <Screen header={<AppHeader />} …>      custom top (Home)
 *   <Screen title={t('Edit product')} footer={<Button fullWidth>{t('Save')}</Button>} keyboard narrow>…</Screen>
 *
 * For list, detail, form and settings screens use the templates in
 * design/templates (they are built on this).
 */

import { ArrowLeft } from 'lucide-react-native';
import { router, useNavigation } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue,
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { TABLET_MIN_WIDTH } from '../tokens/layout';
import { Text } from './Text';
import { IconButton } from './Button';
import { PullToRefresh } from './List';
import { ErrorBoundary } from './ErrorBoundary';

export const TAB_BAR_SPACE = 96;

/** Bottom space tab screens need so content clears the floating tab bar. */
export function useTabBarSpace(): number {
  const th = useTheme();
  const { width } = useWindowDimensions();
  if (width >= TABLET_MIN_WIDTH) return 0;
  return th.appearance.mobile.tabBar === 'floating' ? TAB_BAR_SPACE : 0;
}

/** Height the large title takes before it collapses into the bar. */
function largeTitleHeight(size: 'compact' | 'standard' | 'large', hasSubtitle: boolean) {
  if (size === 'compact') return 0;
  return (size === 'large' ? 52 : 44) + (hasSubtitle ? 20 : 0);
}

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Back action; default goes back when possible. Pass null to hide. */
  onBack?: (() => void) | null;
  actions?: ReactNode;
  /** Scroll offset of the screen body (drives collapse and the hairline). */
  scrollY?: SharedValue<number>;
  /** Force the slim bar (no large title). */
  compact?: boolean;
}

/** The bar: back button, title (fades in when the large title scrolls away), actions. */
export function ScreenHeader({ title, subtitle, onBack, actions, scrollY, compact }: ScreenHeaderProps) {
  const th = useTheme();
  const navigation = useNavigation();
  const size = compact ? 'compact' : th.appearance.mobile.header;
  const big = largeTitleHeight(size, !!subtitle);
  const back = onBack === null ? null : onBack ?? (navigation.canGoBack() ? () => router.back() : null);
  const fallback = useSharedValue(0);
  const y = scrollY ?? fallback;

  const titleStyle = useAnimatedStyle(() => {
    if (big === 0) return { opacity: 1 };
    return { opacity: interpolate(y.value, [big - 16, big], [0, 1], Extrapolation.CLAMP) };
  }, [big]);
  const lineStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 8], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={{ backgroundColor: th.colors.canvas, zIndex: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1), height: 52, paddingHorizontal: th.space(back ? 2 : 4) }}>
        {back && <IconButton icon={ArrowLeft} label={t('Wapas')} onPress={back} flip />}
        <Animated.View style={[{ flex: 1, minWidth: 0 }, titleStyle]}>
          {!!title && <Text size="md" weight="bold" numberOfLines={1} accessibilityRole="header">{title}</Text>}
          {!!subtitle && big === 0 && <Text size="xs" tone="muted" numberOfLines={1}>{subtitle}</Text>}
        </Animated.View>
        {actions && <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1) }}>{actions}</View>}
      </View>
      <Animated.View style={[{ height: 1, backgroundColor: th.colors.border }, lineStyle]} />
    </View>
  );
}

/** The large title shown at the top of the content (standard and large sizes). */
export function LargeTitle({ title, subtitle }: { title?: string; subtitle?: string }) {
  const th = useTheme();
  const size = th.appearance.mobile.header;
  if (size === 'compact' || !title) return null;
  return (
    <View style={{ paddingBottom: th.space(2), minHeight: largeTitleHeight(size, !!subtitle) - 4 }}>
      <Text size={size === 'large' ? '3xl' : '2xl'} weight="heavy" numberOfLines={2}>{title}</Text>
      {!!subtitle && <Text size="sm" tone="muted" numberOfLines={1}>{subtitle}</Text>}
    </View>
  );
}

/** Scroll offset + handler for screens that drive the collapsing header themselves (lists). */
export function useScreenScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  return { scrollY, onScroll };
}

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** false hides the header; a node replaces it (Home's top bar). */
  header?: boolean | ReactNode;
  onBack?: (() => void) | null;
  actions?: ReactNode;
  scroll?: boolean;
  /** Keep inputs above the keyboard (forms). The header stays slim. */
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  /** Horizontal padding in grid units (default 4). */
  padding?: number;
  /** Form width on tablets. */
  narrow?: boolean;
  background?: string;
  /** Pad the bottom for the floating tab bar (tab screens). */
  tabBarSpace?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Set by a parent that shows a whole screen inside its own scroll view (Home
 * shows an industry dashboard as one widget). An embedded Screen draws only
 * its content: no safe area, header, scroll view or footer.
 */
export const EmbeddedScreenContext = createContext(false);

export function Screen(props: ScreenProps) {
  const embedded = useContext(EmbeddedScreenContext);
  const th = useTheme();
  if (embedded) return <View style={[{ gap: th.space(3) }, props.contentStyle]}><ErrorBoundary name={props.title}>{props.children}</ErrorBoundary></View>;
  return <FullScreen {...props} />;
}

function FullScreen({
  title, subtitle, header = true, onBack, actions, scroll = true, keyboard, refreshing = false, onRefresh, footer,
  padding = 4, narrow, background, tabBarSpace, contentStyle, children,
}: ScreenProps) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const { scrollY, onScroll } = useScreenScroll();
  const bottom = tabBarSpace ? th.space(4) + barSpace : footer ? th.space(4) : Math.max(insets.bottom, th.space(4));
  const standardHeader = header === true;
  const inner: StyleProp<ViewStyle> = [
    { paddingHorizontal: th.space(padding), paddingBottom: bottom, gap: th.space(4) },
    narrow && { width: '100%', maxWidth: 720, alignSelf: 'center' },
    contentStyle,
  ];
  const head = header === false ? null : standardHeader
    ? <ScreenHeader title={title} subtitle={subtitle} onBack={onBack} actions={actions} scrollY={scrollY} compact={keyboard} />
    : header;
  const body = (
    <View style={inner}>
      {standardHeader && !keyboard && <LargeTitle title={title} subtitle={subtitle} />}
      <ErrorBoundary name={title}>{children}</ErrorBoundary>
    </View>
  );
  const refresh = onRefresh ? <PullToRefresh refreshing={refreshing} onRefresh={onRefresh} /> : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: background ?? th.colors.canvas, paddingTop: insets.top }}>
      {head}
      {!scroll ? (
        <View style={[{ flex: 1 }, narrow && { width: '100%', maxWidth: 720, alignSelf: 'center' }, contentStyle]}><ErrorBoundary name={title}>{children}</ErrorBoundary></View>
      ) : keyboard ? (
        <KeyboardAwareScrollView bottomOffset={footer ? 90 : 24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: th.space(2) }} refreshControl={refresh} showsVerticalScrollIndicator={false}>
          {body}
        </KeyboardAwareScrollView>
      ) : (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, paddingTop: th.space(head ? 1 : 2) }} refreshControl={refresh} showsVerticalScrollIndicator={false}>
          {body}
        </Animated.ScrollView>
      )}
      {footer && (
        <View style={{ paddingHorizontal: th.space(4), paddingTop: th.space(3), paddingBottom: Math.max(insets.bottom, th.space(3)), backgroundColor: th.colors.surface, borderTopWidth: 1, borderTopColor: th.colors.divider }}>
          <View style={narrow ? { width: '100%', maxWidth: 720, alignSelf: 'center' } : undefined}>{footer}</View>
        </View>
      )}
    </View>
  );
}
