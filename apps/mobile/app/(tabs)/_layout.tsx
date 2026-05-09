import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, ShoppingCart, Package, Users, Menu } from 'lucide-react-native';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/i18n/useTranslation';

export default function TabsLayout() {
  const { isDark } = useThemeStore();
  const { t } = useTranslation();

  const activeColor = '#16a34a';
  const inactiveColor = isDark ? '#737373' : '#9ca3af';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderTopColor: isDark ? '#262626' : '#e5e7eb',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        sceneStyle: { backgroundColor: isDark ? '#0a0a0a' : '#fafafa' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: t('tabs.pos'),
          tabBarIcon: ({ color, size }) => (
            <View
              style={{
                backgroundColor: color === activeColor ? activeColor : 'transparent',
                width: 48, height: 48, borderRadius: 24,
                justifyContent: 'center', alignItems: 'center', marginBottom: -8,
              }}
            >
              <ShoppingCart
                size={24}
                color={color === activeColor ? '#ffffff' : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('tabs.products'),
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t('tabs.customers'),
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
