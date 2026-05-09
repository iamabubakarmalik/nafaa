import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User, LogOut, ChevronRight, Sparkles, Building2, CreditCard,
  Gift, Settings, Receipt, BarChart3, Bell, HelpCircle, FileText,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/i18n/useTranslation';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

export default function MoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const { isDark } = useThemeStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (refreshToken) await authApi.logout(refreshToken);
          } catch {}
          await logout();
          Toast.show({ type: 'success', text1: 'Logged out' });
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const sections = [
    {
      title: 'Business',
      items: [
        { icon: Receipt, label: 'Sales History', path: '/sales' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: Bell, label: 'Notifications', path: '/notifications' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: CreditCard, label: 'Plan & Billing', path: '/plan' },
        { icon: Gift, label: 'Referrals', path: '/referrals' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings' },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-6">
          <Card variant="outline" className="p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-brand-600 items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {user?.fullName?.charAt(0).toUpperCase() || 'N'}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-bold text-base text-neutral-900 dark:text-white">
                  {user?.fullName}
                </Text>
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  {user?.email}
                </Text>
                <View className="flex-row gap-1.5 mt-1">
                  <Badge variant="brand" size="sm">{user?.role}</Badge>
                  <Badge variant="info" size="sm">{tenant?.name}</Badge>
                </View>
              </View>
            </View>
          </Card>
        </View>

        <View className="px-5 mb-6">
          <Pressable onPress={() => router.push('/plan')} className="active:opacity-80">
            <View className="rounded-2xl overflow-hidden p-4 flex-row items-center gap-3" style={{ backgroundColor: '#16a34a' }}>
              <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
                <Sparkles size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold">Upgrade to Pro</Text>
                <Text className="text-white/80 text-xs mt-0.5">
                  Unlock multi-shop, loyalty & more
                </Text>
              </View>
              <ChevronRight size={20} color="#ffffff" />
            </View>
          </Pressable>
        </View>

        {sections.map((section) => (
          <View key={section.title} className="px-5 mb-5">
            <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
              {section.title}
            </Text>
            <Card variant="outline" className="p-0">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                const isLast = idx === section.items.length - 1;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => router.push(item.path as any)}
                    className={`flex-row items-center px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800 ${
                      !isLast ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                    }`}
                  >
                    <View className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                      <Icon size={18} color={isDark ? '#d4d4d8' : '#525252'} />
                    </View>
                    <Text className="flex-1 ml-3 text-sm font-semibold text-neutral-900 dark:text-white">
                      {item.label}
                    </Text>
                    <ChevronRight size={18} color="#9ca3af" />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))}

        <View className="px-5">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 active:opacity-70"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-red-600 dark:text-red-400 font-bold">Logout</Text>
          </Pressable>
        </View>

        <Text className="text-center text-xs text-neutral-400 mt-8">
          Nafaa v1.0.0 • Made in Pakistan 🇵🇰
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
