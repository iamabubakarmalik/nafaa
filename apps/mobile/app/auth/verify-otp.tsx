import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ShieldCheck, RefreshCw, Mail, ArrowRight, CheckCircle2,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { email, purpose = 'VERIFY_EMAIL' } = useLocalSearchParams<{
    email: string;
    purpose?: 'VERIFY_EMAIL' | 'PASSWORD_RESET' | 'LOGIN';
  }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const verifyMutation = useMutation({
    mutationFn: () =>
      authApi.verifyOtp(
        email!,
        digits.join(''),
        (purpose as any) || 'VERIFY_EMAIL',
      ),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ OTP verified!' });
      if (purpose === 'PASSWORD_RESET') {
        router.replace({
          pathname: '/auth/reset-password' as any,
          params: { token: digits.join('') },
        });
      } else {
        router.replace('/(tabs)');
      }
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'OTP galat hai',
      });
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.sendOtp(email!, (purpose as any) || 'VERIFY_EMAIL'),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '📬 Naya OTP bhej diya' });
      setTimer(60);
    },
  });

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (clean && index === OTP_LENGTH - 1 && next.every((d) => d)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      verifyMutation.mutate();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (digits.some((d) => !d)) {
      Toast.show({ type: 'error', text1: 'Saare 6 digits bharein' });
      return;
    }
    verifyMutation.mutate();
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
        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.verifyotp.otp_verification')}</Text>
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
          {/* Hero */}
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
              className="h-16 w-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ShieldCheck size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-extrabold text-white leading-9">{t('auto.verifyotp.verification_code')}</Text>
            <View className="flex-row items-center gap-1.5 mt-3">
              <Mail size={14} color="#fde047" />
              <Text className="text-sm text-emerald-100">
                Code bhej diya hai{' '}
                <Text className="font-extrabold text-white">{email}</Text>
              </Text>
            </View>
          </View>

          <Text className="text-sm text-neutral-600 dark:text-neutral-400 leading-6 mb-5">{t('auto.verifyotp.apna_inbox_check_karein_aur_6_digit_ka_c')}</Text>

          {/* OTP boxes */}
          <View className="flex-row justify-between mb-5">
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                value={d}
                onChangeText={(v) => handleChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                className="text-center text-2xl font-extrabold"
                style={{
                  width: 48,
                  height: 56,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: d ? '#16a34a' : '#e5e7eb',
                  backgroundColor: d ? '#dcfce7' : '#ffffff',
                  color: '#15803d',
                }}
              />
            ))}
          </View>

          {/* Verify button */}
          <Pressable
            onPress={onSubmit}
            disabled={verifyMutation.isPending || digits.some((d) => !d)}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor:
                verifyMutation.isPending || digits.some((d) => !d) ? '#9ca3af' : '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <CheckCircle2 size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Code'}
            </Text>
          </Pressable>

          {/* Resend */}
          <View className="items-center mt-5">
            {timer > 0 ? (
              <Text className="text-sm text-neutral-500">
                Dobara bhejne ke liye{' '}
                <Text className="font-extrabold text-neutral-700">
                  {timer}s
                </Text>{' '}
                wait karein
              </Text>
            ) : (
              <Pressable
                onPress={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="flex-row items-center gap-1.5"
                hitSlop={8}
              >
                <RefreshCw size={14} color="#16a34a" />
                <Text className="text-sm font-extrabold text-emerald-700">
                  {resendMutation.isPending ? 'Sending...' : 'Code dobara bhejein'}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
