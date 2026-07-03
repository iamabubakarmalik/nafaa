import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Store, Globe, Calculator, Receipt, ShoppingCart,
  Package, Users, Bell, Shield, Palette, ChevronRight,
  Settings as SettingsIcon, Sparkles,
} from 'lucide-react-native';
import { settingsApi } from '@/api/settings.api';
import { OnboardingSyncBanner } from '@/components/settings/OnboardingSyncBanner';
import { useTranslation } from '@/i18n/useTranslation';
import { useSmartBack } from '@/hooks/useSmartBack';

const sections = [
  { id: 'business',       label: 'Business Profile',        desc: 'Shop name, logo, contact',       icon: Store,        color: '#16a34a', bg: '#dcfce7' },
  { id: 'business-config',label: 'Business Type & Features',desc: 'Industry-specific features',     icon: Sparkles,     color: '#7c3aed', bg: '#ede9fe', badge: 'SMART' },
  { id: 'localization',   label: 'Localization',            desc: 'Language, currency, timezone',   icon: Globe,        color: '#2563eb', bg: '#dbeafe' },
  { id: 'tax',            label: 'Tax & Pricing',           desc: 'GST, tax rate, rounding',        icon: Calculator,   color: '#f59e0b', bg: '#fef3c7' },
  { id: 'receipt',        label: 'Receipt',                 desc: 'Invoice format, header/footer',  icon: Receipt,      color: '#7c3aed', bg: '#ede9fe' },
  { id: 'pos',            label: 'POS Settings',            desc: 'Sale flow, payments',            icon: ShoppingCart, color: '#ec4899', bg: '#fce7f3' },
  { id: 'inventory',      label: 'Inventory',               desc: 'Stock alerts, expiry',           icon: Package,      color: '#0891b2', bg: '#cffafe' },
  { id: 'customer',       label: 'Customers & Udhaar',      desc: 'Credit, loyalty',                icon: Users,        color: '#6366f1', bg: '#e0e7ff' },
  { id: 'notifications',  label: 'Notifications',           desc: 'Email, SMS, push',               icon: Bell,         color: '#ea580c', bg: '#ffedd5' },
  { id: 'security',       label: 'Security',                desc: 'PIN, 2FA, sessions',             icon: Shield,       color: '#dc2626', bg: '#fee2e2' },
  { id: 'appearance',     label: 'Appearance',              desc: 'Theme, colors',                  icon: Palette,      color: '#14b8a6', bg: '#ccfbf1' },
];

export default function SettingsHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useSmartBack();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Settings
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
            {data?.tenant?.name || 'Shop configuration'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="mx-5 mb-4">
          <View
            className="rounded-3xl p-5 overflow-hidden"
            style={{
              backgroundColor: '#0f172a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View
              className="absolute -top-12 -right-12 h-40 w-40 rounded-full"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
            />
            <View className="relative">
              <View className="flex-row items-center gap-2 mb-2">
                <SettingsIcon size={14} color="rgba(255,255,255,0.85)" />
                <Text className="text-[10px] uppercase tracking-wider text-white/85 font-extrabold">
                  Shop Configuration
                </Text>
              </View>
              <Text className="text-3xl font-extrabold text-white">Settings</Text>
              <Text className="text-xs text-white/70 mt-1">
                Apni dukan ki har cheez customize karein
              </Text>
            </View>
          </View>
        </View>

        {/* Onboarding sync banner */}
        <OnboardingSyncBanner />

        {/* Sections list */}
        <View className="px-5 gap-2.5">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/settings/${s.id}` as any);
                }}
                className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex-row items-center gap-3 active:opacity-70"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.03,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <View
                  className="h-12 w-12 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: s.bg }}
                >
                  <Icon size={22} color={s.color} />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-extrabold text-neutral-900 dark:text-white flex-1" numberOfLines={1}>
                      {s.label}
                    </Text>
                    {s.badge && (
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: s.color }}>
                        <Text className="text-[9px] font-extrabold text-white">{s.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                    {s.desc}
                  </Text>
                </View>
                <ChevronRight size={18} color="#9ca3af" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
