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
  ArrowLeft, Mail, KeyRound, CheckCircle2, Sparkles, ArrowRight, Clock,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim().toLowerCase()),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(email);
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Email bhejne mein masla',
      });
    },
  });

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!email.trim()) {
      setError('Email zaroori hai');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Sahi email likhein');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.forgotpassword.password_reset')}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View
            className="rounded-3xl p-6 mb-6 overflow-hidden"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View
              className="absolute -top-12 -right-12 h-40 w-40 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            />
            <View
              className="h-16 w-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <KeyRound size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-extrabold text-white leading-9">
              Password{'\n'}Bhool Gaye?
            </Text>
            <Text className="text-sm text-emerald-100 mt-2 leading-5">
              Koi baat nahi! Apna email batayein,{'\n'}reset link bhej dete hain.
            </Text>
          </View>

          {sent ? (
            <View>
              {/* Success state */}
              <View className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 p-6 items-center">
                <View className="h-20 w-20 rounded-3xl bg-emerald-100 items-center justify-center mb-4">
                  <CheckCircle2 size={40} color="#16a34a" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white text-center">{t('auto.forgotpassword.email_bhej_diya')}</Text>
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 text-center mt-2 leading-6">
                  Hum ne <Text className="font-extrabold text-neutral-900 dark:text-white">{sent}</Text>{' '}
                  par reset link bhej diya hai. Apna inbox check karein.
                </Text>

                <View className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mt-5 w-full flex-row items-start gap-3">
                  <Clock size={18} color="#b45309" />
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-amber-900">{t('auto.index.important')}</Text>
                    <Text className="text-xs text-amber-800 mt-0.5 leading-5">
                      Link sirf <Text className="font-extrabold">{t('auto.forgotpassword.1_ghante')}</Text> ke liye valid hai. Agar email nahi mila to spam folder check karein.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setSent(null);
                    setEmail('');
                  }}
                  className="mt-5 self-stretch h-12 rounded-2xl border-2 border-neutral-200 items-center justify-center"
                >
                  <Text className="text-sm font-extrabold text-neutral-700">{t('auto.forgotpassword.doosra_email_try_karein')}</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.replace('/auth/login')}
                  className="mt-3"
                  hitSlop={8}
                >
                  <Text className="text-sm font-bold text-emerald-700">{t('auto.forgotpassword.login_par_wapas_jayein')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-6">{t('auto.forgotpassword.apna_registered_email_enter_karein_hum_a')}</Text>

              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">{t('auto.forgotpassword.email_address')}</Text>
                <View
                  className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
                  style={{ borderColor: error ? '#fca5a5' : '#e5e7eb' }}
                >
                  <Mail size={18} color="#9ca3af" />
                  <TextInput
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (error) setError(null);
                    }}
                    placeholder="ahmad@example.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    className="flex-1 text-base text-neutral-900 dark:text-white"
                  />
                </View>
                {error && (
                  <Text className="text-xs text-rose-600 mt-1 font-semibold">{error}</Text>
                )}
              </View>

              <Pressable
                onPress={onSubmit}
                disabled={mutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-5 active:opacity-80"
                style={{
                  backgroundColor: mutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text className="text-white font-extrabold text-base">
                  {mutation.isPending ? 'Bheja jaa raha hai...' : 'Reset Link Bhejein'}
                </Text>
                {!mutation.isPending && <ArrowRight size={18} color="#ffffff" />}
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                className="mt-5 self-center flex-row items-center gap-1.5"
                hitSlop={8}
              >
                <ArrowLeft size={14} color="#737373" />
                <Text className="text-sm font-bold text-neutral-600">Login par wapas jayein</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
