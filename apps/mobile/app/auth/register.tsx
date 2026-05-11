import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Store, User, Mail, Lock, Phone, Gift, Eye, EyeOff, ArrowRight,
  ArrowLeft, Sparkles, Shield, Zap, TrendingUp, CheckCircle2,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const benefits = [
  { icon: Zap, label: 'Quick setup', desc: '2 minutes mein ready' },
  { icon: Shield, label: 'Bank-grade security', desc: '256-bit encryption' },
  { icon: TrendingUp, label: '7 days free trial', desc: 'No credit card' },
];

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const { promptAsync, isReady } = useGoogleAuth();

  const [form, setForm] = useState({
    shopName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    referralCode: params.ref || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.ref) setForm((f) => ({ ...f, referralCode: params.ref! }));
  }, [params.ref]);

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        shopName: form.shopName.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        referralCode: form.referralCode.trim() || undefined,
      }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession(data);
      Toast.show({
        type: 'success',
        text1: 'Mubarak ho! 🎉',
        text2: 'Aap ka account ban gaya',
      });
      setTimeout(() => router.replace('/onboarding'), 500);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Account banane mein masla aa gaya',
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
        text1: data.isNewUser ? 'Mubarak ho! 🎉' : 'Welcome back!',
      });
      router.replace(data.isNewUser ? '/onboarding' : '/(tabs)');
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Google signup fail ho gaya',
      });
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.shopName.trim() || form.shopName.trim().length < 2)
      errs.shopName = 'Shop ka naam likhein';
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      errs.fullName = 'Apna naam likhein';
    if (!form.email.trim()) errs.email = 'Email zaroori hai';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Sahi email likhein';
    if (form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone)) errs.phone = 'Sahi mobile number';
    if (!form.password) errs.password = 'Password zaroori hai';
    else if (form.password.length < 8) errs.password = 'Kam se kam 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;
    registerMutation.mutate();
  };

  const onGoogleSignUp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await promptAsync();
      if (result?.type === 'success' && result.params?.id_token) {
        googleMutation.mutate(result.params.id_token);
      }
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
            >
              <ArrowLeft size={20} color="#16a34a" />
            </Pressable>
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.register.naya_account')}</Text>
          </View>

          {/* Hero */}
          <View className="px-5 mb-5">
            <View
              className="rounded-3xl p-5 overflow-hidden"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <View className="absolute -top-12 -right-12 h-40 w-40 rounded-full" style={{ backgroundColor: 'rgba(251,191,36,0.2)' }} />
              <View className="self-start px-3 py-1 rounded-full bg-white/15 flex-row items-center gap-1.5 mb-3">
                <Store size={11} color="#ffffff" />
                <Text className="text-[11px] font-bold text-white">{t('auto.register.free_trial_shuru_karein')}</Text>
              </View>
              <Text className="text-2xl font-extrabold text-white leading-8">{t('auto.register.pakistan_ka_sab_se')}</Text>
              <Text className="text-2xl font-extrabold text-amber-300 leading-8">{t('auto.register.aasaan_pos_system')}</Text>
              <Text className="text-xs text-emerald-100 mt-2 leading-5">{t('auto.register.7_din_free_no_credit_card_cancel_anytime')}</Text>

              <View className="gap-2 mt-4">
                {benefits.map((b) => {
                  const Icon = b.icon;
                  return (
                    <View
                      key={b.label}
                      className="flex-row items-center gap-3 rounded-2xl p-2.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                    >
                      <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(251,191,36,0.3)' }}>
                        <Icon size={16} color="#fde047" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-extrabold text-white">{b.label}</Text>
                        <Text className="text-[10px] text-emerald-100">{b.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {form.referralCode && (
            <View className="px-5 mb-4">
              <View className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-xl bg-amber-500 items-center justify-center">
                  <Gift size={18} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-amber-900 text-sm">{t('auto.register.referral_code_applied')}</Text>
                  <Text className="text-[11px] text-amber-700 mt-0.5">{t('auto.register.aap_ke_friend_ko_reward_milega')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Google signup */}
          <View className="px-5 mb-4">
            <Pressable
              onPress={onGoogleSignUp}
              disabled={!isReady || googleMutation.isPending}
              className="h-14 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-row items-center justify-center gap-3 active:opacity-70"
            >
              <Text style={{ fontSize: 18 }}>🌐</Text>
              <Text className="text-base font-bold text-neutral-700 dark:text-neutral-200">
                {googleMutation.isPending ? 'Signing up...' : 'Google se Signup'}
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-3 my-4">
              <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              <Text className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{t('auto.register.ya_email_se')}</Text>
              <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </View>
          </View>

          {/* Form */}
          <View className="px-5 gap-4">
            <FormField
              label="Shop / Business Name"
              required
              icon={Store}
              placeholder="Ahmad Bakery"
              value={form.shopName}
              onChangeText={(t: string) => {
                setForm({ ...form, shopName: t });
                if (errors.shopName) setErrors({ ...errors, shopName: '' });
              }}
              error={errors.shopName}
            />

            <FormField
              label="Aap ka naam"
              required
              icon={User}
              placeholder="Ahmad Ali"
              value={form.fullName}
              onChangeText={(t: string) => {
                setForm({ ...form, fullName: t });
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              error={errors.fullName}
            />

            <FormField
              label="Email"
              required
              icon={Mail}
              placeholder="ahmad@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(t: string) => {
                setForm({ ...form, email: t });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
            />

            <FormField
              label="Mobile (optional)"
              icon={Phone}
              placeholder="+923001234567"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(t: string) => {
                setForm({ ...form, phone: t });
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              error={errors.phone}
            />

            <View>
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                Password <Text className="text-rose-600">*</Text>
              </Text>
              <View
                className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
                style={{ borderColor: errors.password ? '#fca5a5' : '#e5e7eb' }}
              >
                <Lock size={18} color="#9ca3af" />
                <TextInput
                  value={form.password}
                  onChangeText={(t) => {
                    setForm({ ...form, password: t });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="Strong password (8+ characters)"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-base text-neutral-900 dark:text-white"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </Pressable>
              </View>
              {errors.password && (
                <Text className="text-xs text-rose-600 mt-1 font-semibold">{errors.password}</Text>
              )}
              {form.password && form.password.length >= 8 && (
                <View className="flex-row items-center gap-1 mt-1">
                  <CheckCircle2 size={12} color="#16a34a" />
                  <Text className="text-[11px] text-emerald-700 font-semibold">{t('auto.register.strong_password')}</Text>
                </View>
              )}
            </View>

            <FormField
              label="Referral Code (optional)"
              icon={Gift}
              placeholder="NAFAA-XXXX"
              value={form.referralCode}
              onChangeText={(t: string) => setForm({ ...form, referralCode: t.toUpperCase() })}
              autoCapitalize="characters"
              hint="Agar friend ne code diya hai to yahan likhein"
            />

            <Pressable
              onPress={onSubmit}
              disabled={registerMutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-3 active:opacity-80"
              style={{
                backgroundColor: registerMutation.isPending ? '#9ca3af' : '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text className="text-white font-extrabold text-base">
                {registerMutation.isPending ? 'Banaya jaa raha hai...' : 'Account Banayein'}
              </Text>
              {!registerMutation.isPending && <ArrowRight size={18} color="#ffffff" />}
            </Pressable>

            <Text className="text-[11px] text-neutral-500 text-center leading-5 mt-1">{t('auto.register.continue_karke_aap_terms_aur_privacy_pol')}</Text>

            <View className="flex-row items-center justify-center gap-1.5 pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">{t('auto.register.pehle_se_account_hai')}</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.replace('/auth/login');
                }}
                hitSlop={8}
              >
                <Text className="text-sm font-extrabold text-emerald-700">{t('auto.register.login_karein')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({
  label, icon: Icon, error, hint, required, ...props
}: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View
        className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
        style={{ borderColor: error ? '#fca5a5' : '#e5e7eb' }}
      >
        <Icon size={18} color="#9ca3af" />
        <TextInput
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-neutral-900 dark:text-white"
          autoCorrect={false}
          {...props}
        />
      </View>
      {error && <Text className="text-xs text-rose-600 mt-1 font-semibold">{error}</Text>}
      {hint && !error && <Text className="text-[11px] text-neutral-500 mt-1">{hint}</Text>}
    </View>
  );
}
