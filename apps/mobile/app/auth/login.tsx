import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Store, ShoppingBag,
  BarChart3, Users, CheckCircle2,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const features = [
  { icon: ShoppingBag, label: 'POS + Inventory' },
  { icon: Users, label: 'Customer Khata' },
  { icon: BarChart3, label: 'Reports' },
  { icon: Store, label: 'Multi-shop' },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { promptAsync, isReady } = useGoogleAuth();

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email: email.trim().toLowerCase(), password }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession(data);
      Toast.show({
        type: 'success',
        text1: `Khush amdeed, ${data.user.fullName.split(' ')[0]}! 🎉`,
      });
      router.replace('/(tabs)');
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Login fail ho gaya',
      });
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authApi.googleMobile(idToken),
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (data.needsShopName) {
        router.push({
          pathname: '/auth/google-complete' as any,
          params: {
            tempToken: data.tempToken,
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl || '',
          },
        });
        return;
      }
      setSession(data);
      Toast.show({
        type: 'success',
        text1: data.isNewUser
          ? `Mubarak ho ${data.user.fullName}! 🎉`
          : `Welcome back, ${data.user.fullName.split(' ')[0]}! 👋`,
      });
      router.replace(data.isNewUser ? '/onboarding' : '/(tabs)');
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Google login fail ho gaya',
      });
    },
  });

  const validate = () => {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email zaroori hai';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Sahi email likhein';
    if (!password) errs.password = 'Password zaroori hai';
    else if (password.length < 8) errs.password = 'Kam se kam 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;
    loginMutation.mutate();
  };

  const onGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await promptAsync();
      if (result?.type === 'success' && result.params?.id_token) {
        googleMutation.mutate(result.params.id_token);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Google sign-in cancelled' });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero header */}
          <View
            className="px-6 pt-8 pb-10 rounded-b-[40px] overflow-hidden"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="absolute -top-20 -right-16 h-48 w-48 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full" style={{ backgroundColor: 'rgba(251,191,36,0.2)' }} />

            <View className="flex-row items-center gap-3 mb-6">
              <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Sparkles size={24} color="#ffffff" />
              </View>
              <View>
                <Text className="text-2xl font-extrabold text-white">{t('auto.login.nafaa')}</Text>
                <Text className="text-xs text-emerald-100">{t('auto.login.pakistan_first_retail_os')}</Text>
              </View>
            </View>

            <View className="self-start px-3 py-1 rounded-full bg-white/15 flex-row items-center gap-1.5 mb-3">
              <Sparkles size={11} color="#fde047" />
              <Text className="text-[11px] font-bold text-white">{t('auto.login.wapas_khush_amdeed')}</Text>
            </View>

            <Text className="text-3xl font-extrabold text-white leading-9">{t('auto.login.login_karein_aur_apni_dukan_ka')}</Text>
            <Text className="text-3xl font-extrabold text-amber-300 leading-9">{t('auto.login.control_hasil_karein')}</Text>

            <View className="flex-row flex-wrap gap-2 mt-5">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <View
                    key={f.label}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <Icon size={12} color="#ffffff" />
                    <Text className="text-[11px] font-bold text-white">{f.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Form */}
          <View className="px-6 pt-6 pb-8 flex-1">
            <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.login.welcome_back')}</Text>
            <Text className="text-sm text-neutral-500 mt-1 mb-6">{t('auto.login.apne_account_mein_login_karein')}</Text>

            {/* Google Sign-In */}
            <Pressable
              onPress={onGoogleSignIn}
              disabled={!isReady || googleMutation.isPending}
              className="h-14 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-row items-center justify-center gap-3 active:opacity-70"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 18 }}>🌐</Text>
              <Text className="text-base font-bold text-neutral-700 dark:text-neutral-200">
                {googleMutation.isPending ? 'Signing in...' : 'Google se Login'}
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-5">
              <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              <Text className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{t('auto.register.ya_email_se')}</Text>
              <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">{t('auto.section.email')}</Text>
              <View
                className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
                style={{ borderColor: errors.email ? '#fca5a5' : '#e5e7eb' }}
              >
                <Mail size={18} color="#9ca3af" />
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="ahmad@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-base text-neutral-900 dark:text-white"
                />
              </View>
              {errors.email && (
                <Text className="text-xs text-rose-600 mt-1 font-semibold">{errors.email}</Text>
              )}
            </View>

            {/* Password */}
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{t('auto.login.password')}</Text>
                <Pressable
                  onPress={() => router.push('/auth/forgot-password')}
                  hitSlop={8}
                >
                  <Text className="text-xs font-bold text-emerald-700">{t('auto.login.bhool_gaye')}</Text>
                </Pressable>
              </View>
              <View
                className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
                style={{ borderColor: errors.password ? '#fca5a5' : '#e5e7eb' }}
              >
                <Lock size={18} color="#9ca3af" />
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-base text-neutral-900 dark:text-white"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={18} color="#9ca3af" />
                  ) : (
                    <Eye size={18} color="#9ca3af" />
                  )}
                </Pressable>
              </View>
              {errors.password && (
                <Text className="text-xs text-rose-600 mt-1 font-semibold">{errors.password}</Text>
              )}
            </View>

            <Pressable
              onPress={onSubmit}
              disabled={loginMutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-3 active:opacity-80"
              style={{
                backgroundColor: loginMutation.isPending ? '#9ca3af' : '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text className="text-white font-extrabold text-base">
                {loginMutation.isPending ? 'Logging in...' : 'Login'}
              </Text>
              {!loginMutation.isPending && <ArrowRight size={18} color="#ffffff" />}
            </Pressable>

            <View className="flex-row items-center justify-center gap-1.5 mt-5">
              <CheckCircle2 size={12} color="#16a34a" />
              <Text className="text-xs text-neutral-500 font-semibold">{t('auto.login.secure_login_ssl_encrypted')}</Text>
            </View>

            <View className="flex-row items-center justify-center gap-1.5 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">{t('auto.login.naya_user')}</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/auth/register');
                }}
                hitSlop={8}
              >
                <Text className="text-sm font-extrabold text-emerald-700">{t('auto.login.free_account_banayein')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
