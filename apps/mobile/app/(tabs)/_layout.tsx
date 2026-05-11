import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Home, ShoppingCart, Package, Users, Menu } from 'lucide-react-native';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/i18n/useTranslation';

export default function TabsLayout() {
  const { isDark } = useThemeStore();
  const { t } = useTranslation();

  const activeColor = '#16a34a';
  const inactiveColor = isDark ? '#737373' : '#9ca3af';
  const bgColor = isDark ? '#0a0a0a' : '#ffffff';
  const borderColor = isDark ? '#262626' : '#f3f4f6';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarItemStyle: {
          paddingTop: 4,
        },
        sceneStyle: { backgroundColor: isDark ? '#0a0a0a' : '#fafafa' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home') || 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Home
                size={focused ? 24 : 22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    height: 3,
                    width: 16,
                    borderRadius: 2,
                    backgroundColor: activeColor,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: t('tabs.pos') || 'POS',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? activeColor : '#16a34a',
                width: 56,
                height: 56,
                borderRadius: 28,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Platform.OS === 'ios' ? -16 : -12,
                shadowColor: activeColor,
                shadowOpacity: focused ? 0.5 : 0.35,
                shadowRadius: focused ? 12 : 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
                borderWidth: 4,
                borderColor: bgColor,
              }}
            >
              <ShoppingCart
                size={26}
                color="#ffffff"
                strokeWidth={focused ? 2.5 : 2.2}
              />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
            marginTop: 6,
          },
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('tabs.products') || 'Products',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package
                size={focused ? 24 : 22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    height: 3,
                    width: 16,
                    borderRadius: 2,
                    backgroundColor: activeColor,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t('tabs.customers') || 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users
                size={focused ? 24 : 22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    height: 3,
                    width: 16,
                    borderRadius: 2,
                    backgroundColor: activeColor,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more') || 'More',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Menu
                size={focused ? 24 : 22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    height: 3,
                    width: 16,
                    borderRadius: 2,
                    backgroundColor: activeColor,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
