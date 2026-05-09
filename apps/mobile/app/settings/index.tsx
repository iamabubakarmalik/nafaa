import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  Monitor,
  Globe,
  Bell,
  Fingerprint,
  Vibrate,
  Volume2,
  Trash2,
  HelpCircle,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useThemeStore, type ThemeMode } from '@/store/theme.store';
import { useLocaleStore } from '@/store/locale.store';
import { useTranslation } from '@/i18n/useTranslation';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { mode, isDark, setMode } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  const themeOptions: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'Auto', icon: Monitor },
  ];

  const clearCache = () => {
    Alert.alert('Clear Cache', 'This will remove cached data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => Toast.show({ type: 'success', text1: 'Cache cleared' }),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <Text className="flex-1 text-2xl font-bold text-neutral-900 dark:text-white">
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Theme */}
        <View className="px-5 mt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
            Appearance
          </Text>
          <Card variant="outline" className="p-3">
            <View className="flex-row gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = mode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    onPress={() => setMode(opt.mode)}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isActive
                        ? 'bg-brand-600'
                        : 'bg-neutral-100 dark:bg-neutral-800'
                    }`}
                  >
                    <Icon size={20} color={isActive ? '#fff' : isDark ? '#d4d4d8' : '#525252'} />
                    <Text
                      className={`mt-1 text-xs font-bold ${
                        isActive ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Language */}
        <View className="px-5 mt-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
            Language
          </Text>
          <Card variant="outline" className="p-3">
            <View className="flex-row gap-2">
              {(['en', 'ur'] as const).map((lang) => {
                const isActive = locale === lang;
                return (
                  <Pressable
                    key={lang}
                    onPress={() => setLocale(lang)}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isActive ? 'bg-brand-600' : 'bg-neutral-100 dark:bg-neutral-800'
                    }`}
                  >
                    <Globe size={18} color={isActive ? '#fff' : isDark ? '#d4d4d8' : '#525252'} />
                    <Text
                      className={`mt-1 text-sm font-bold ${
                        isActive ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {lang === 'en' ? 'English' : 'اردو'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Notifications */}
        <View className="px-5 mt-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
            Notifications & Feedback
          </Text>
          <Card variant="outline" className="p-0">
            <ToggleRow
              icon={Bell}
              label="Push Notifications"
              value={pushEnabled}
              onChange={setPushEnabled}
              isDark={isDark}
            />
            <ToggleRow
              icon={Vibrate}
              label="Haptic Feedback"
              value={hapticEnabled}
              onChange={setHapticEnabled}
              isDark={isDark}
            />
            <ToggleRow
              icon={Volume2}
              label="Sound Effects"
              value={soundsEnabled}
              onChange={setSoundsEnabled}
              isDark={isDark}
              isLast
            />
          </Card>
        </View>

        {/* Security */}
        <View className="px-5 mt-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
            Security
          </Text>
          <Card variant="outline" className="p-0">
            <ToggleRow
              icon={Fingerprint}
              label="Biometric Login"
              value={biometricEnabled}
              onChange={setBiometricEnabled}
              isDark={isDark}
              isLast
            />
          </Card>
        </View>

        {/* Storage */}
        <View className="px-5 mt-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
            Storage
          </Text>
          <Card variant="outline" className="p-0">
            <Pressable
              onPress={clearCache}
              className="flex-row items-center px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800"
            >
              <View className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/40 items-center justify-center">
                <Trash2 size={18} color="#dc2626" />
              </View>
              <Text className="flex-1 ml-3 text-sm font-semibold text-red-600 dark:text-red-400">
                Clear Cache
              </Text>
              <Text className="text-xs text-neutral-500">~ 4.2 MB</Text>
            </Pressable>
          </Card>
        </View>

        {/* Help */}
        <View className="px-5 mt-5">
          <Card variant="outline" className="p-0">
            <Pressable className="flex-row items-center px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800">
              <View className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center">
                <HelpCircle size={18} color="#2563eb" />
              </View>
              <Text className="flex-1 ml-3 text-sm font-semibold text-neutral-900 dark:text-white">
                Help & Support
              </Text>
            </Pressable>
          </Card>
        </View>

        <Text className="text-center text-xs text-neutral-400 mt-8">
          Nafaa v1.0.0 • Build 2026.05.08
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  value,
  onChange,
  isDark,
  isLast,
}: {
  icon: any;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
      }`}
    >
      <View className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
        <Icon size={18} color={isDark ? '#d4d4d8' : '#525252'} />
      </View>
      <Text className="flex-1 ml-3 text-sm font-semibold text-neutral-900 dark:text-white">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#d1d5db', true: '#16a34a' }}
        thumbColor="#fff"
      />
    </View>
  );
}
