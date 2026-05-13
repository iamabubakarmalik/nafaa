import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ShoppingCart, Package, Users, Menu } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/i18n/useTranslation';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} t={t} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="pos" options={{ title: 'POS' }} />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="customers" options={{ title: 'Khata' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPACT CUSTOM TAB BAR — Optimized height, premium feel
// ═══════════════════════════════════════════════════════════════════
function CustomTabBar({
  state,
  navigation,
  t,
}: BottomTabBarProps & { t: (k: string) => string }) {
  const { isDark } = useThemeStore();
  const insets = useSafeAreaInsets();

  // Theme
  const bgColor = isDark ? '#0a0a0a' : '#ffffff';
  const borderColor = isDark ? '#1f1f1f' : '#f1f5f9';
  const activeColor = isDark ? '#22c55e' : '#16a34a';
  const inactiveColor = isDark ? '#737373' : '#94a3b8';
  const labelActive = isDark ? '#22c55e' : '#15803d';
  const labelInactive = isDark ? '#a3a3a3' : '#64748b';

  // ─── Compact sizing — reduces overall footprint ────────────────
  // Bar visual area: 52pt (was 64) — saves 12pt of screen real estate
  // Bottom inset: respects iPhone home indicator + min 6pt on Android
  const BAR_HEIGHT = 52;
  const bottomInset = insets.bottom > 0 ? insets.bottom : 6;

  const tabConfig: Record<string, { Icon: LucideIcon; label: string }> = {
    index:     { Icon: Home,         label: t('tabs.home')      || 'Home' },
    pos:       { Icon: ShoppingCart, label: t('tabs.pos')       || 'POS' },
    products:  { Icon: Package,      label: t('tabs.products')  || 'Products' },
    customers: { Icon: Users,        label: t('tabs.customers') || 'Khata' },
    more:      { Icon: Menu,         label: t('tabs.more')      || 'More' },
  };

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: borderColor,
        paddingBottom: bottomInset,
        paddingTop: 4,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.4 : 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -3 },
        elevation: 12,
      }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {state.routes.map((route, index) => {
          const config = tabConfig[route.name];
          if (!config) return null;

          const isFocused = state.index === index;
          const isPOS = route.name === 'pos';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              android_ripple={{ color: 'transparent' }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                height: BAR_HEIGHT,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {isPOS ? (
                <PosTab
                  Icon={config.Icon}
                  label={config.label}
                  focused={isFocused}
                  bgColor={bgColor}
                  labelActive={labelActive}
                  labelInactive={labelInactive}
                  isDark={isDark}
                />
              ) : (
                <RegularTab
                  Icon={config.Icon}
                  label={config.label}
                  focused={isFocused}
                  activeColor={activeColor}
                  inactiveColor={inactiveColor}
                  labelActive={labelActive}
                  labelInactive={labelInactive}
                  isDark={isDark}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Compact Regular Tab ───────────────────────────────────────────
function RegularTab({
  Icon, label, focused,
  activeColor, inactiveColor, labelActive, labelInactive, isDark,
}: {
  Icon: LucideIcon; label: string; focused: boolean;
  activeColor: string; inactiveColor: string;
  labelActive: string; labelInactive: string; isDark: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Icon with subtle pill bg on active — compact */}
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused
            ? isDark ? 'rgba(34,197,94,0.16)' : 'rgba(22,163,74,0.10)'
            : 'transparent',
        }}
      >
        <Icon
          size={focused ? 20 : 19}
          color={focused ? activeColor : inactiveColor}
          strokeWidth={focused ? 2.6 : 2}
        />
      </View>

      {/* Tight label */}
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={{
          fontSize: 10,
          fontWeight: focused ? '800' : '600',
          color: focused ? labelActive : labelInactive,
          marginTop: 2,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Compact Premium POS Tab ───────────────────────────────────────
function PosTab({
  Icon, label, focused, bgColor,
  labelActive, labelInactive, isDark,
}: {
  Icon: LucideIcon; label: string; focused: boolean; bgColor: string;
  labelActive: string; labelInactive: string; isDark: boolean;
}) {
  const SIZE = 42; // Compact but still prominent

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Soft glow halo */}
        {focused && (
          <View
            style={{
              position: 'absolute',
              width: SIZE + 12,
              height: SIZE + 12,
              borderRadius: (SIZE + 12) / 2,
              backgroundColor: '#16a34a',
              opacity: isDark ? 0.25 : 0.15,
            }}
          />
        )}

        {/* Gradient button */}
        <LinearGradient
          colors={
            focused
              ? ['#34d399', '#22c55e', '#15803d']
              : ['#22c55e', '#16a34a', '#15803d']
          }
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#16a34a',
            shadowOpacity: focused ? 0.5 : 0.35,
            shadowRadius: focused ? 12 : 8,
            shadowOffset: { width: 0, height: 5 },
            elevation: 10,
            borderWidth: 2.5,
            borderColor: bgColor,
            transform: [{ scale: focused ? 1.06 : 1 }],
          }}
        >
          {/* Top shine */}
          <View
            style={{
              position: 'absolute',
              top: 4,
              width: SIZE - 18,
              height: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.25)',
            }}
          />
          <Icon size={19} color="#ffffff" strokeWidth={2.5} />
        </LinearGradient>
      </View>

      {/* POS label — aligned with other tab labels */}
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={{
          fontSize: 10,
          fontWeight: '800',
          color: focused ? labelActive : labelInactive,
          marginTop: 2,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
