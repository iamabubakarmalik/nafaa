import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(token!, newPassword),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(() => router.replace('/auth/login'), 3000);
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Reset fail ho gaya',
      });
    },
  });

  const strength = (() => {
    if (!newPassword) return { score: 0, label: '', color: '#d1d5db' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { score: 20, label: 'Bohat Weak', color: '#dc2626' };
    if (score === 2) return { score: 40, label: 'Weak', color: '#f97316' };
    if (score === 3) return { score: 60, label: 'Theek', color: '#f59e0b' };
    if (score === 4) return { score: 80, label: 'Strong', color: '#16a34a' };
    return { score: 100, label: 'Bohat Strong', color: '#16a34a' };
  })();

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = 'Password zaroori hai';
    else if (newPassword.length < 8) errs.newPassword = 'Kam se kam 8 characters';
    if (!confirmPassword) errs.confirmPassword = 'Confirm password';
    else if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords match nahi karte";
    setErrors(errs);
    if (Object.keys(errs).length === 0) mutation.mutate();
  };

  if (!token) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center px-5">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="h-20 w-20 rounded-3xl bg-rose-100 items-center justify-center">
          <XCircle size={40} color="#dc2626" />
        </View>
        <Text className="mt-4 text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.resetpassword.invalid_link')}</Text>
        <Text className="mt-2 text-sm text-neutral-600 text-center">{t('auto.resetpassword.ye_link_valid_nahi_hai_naya_reset_reques')}</Text>
        <Pressable
          onPress={() => router.replace('/auth/forgot-password')}
          className="mt-6 h-12 px-6 rounded-2xl items-center justify-center"
          style={{ backgroundColor: '#16a34a' }}
        >
          <Text className="text-white font-extrabold">{t('auto.resetpassword.naya_link_request_karein')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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
        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.resetpassword.naya_password')}</Text>
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
            <View className="h-16 w-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Lock size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-extrabold text-white leading-9">
              Naya Password{'\n'}Set Karein
            </Text>
            <Text className="text-sm text-emerald-100 mt-2">{t('auto.resetpassword.apna_account_secure_karein')}</Text>
          </View>

          {done ? (
            <View className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 p-6 items-center">
              <View className="h-20 w-20 rounded-3xl bg-emerald-100 items-center justify-center mb-4">
                <CheckCircle2 size={40} color="#16a34a" />
              </View>
              <Text className="text-xl font-extrabold text-neutral-900 dark:text-white text-center">{t('auto.resetpassword.password_set_ho_gaya')}</Text>
              <Text className="text-sm text-neutral-600 text-center mt-2">{t('auto.resetpassword.ab_aap_naye_password_se_login_kar_sakte_')}</Text>
              <Text className="text-xs text-neutral-500 mt-3">{t('auto.resetpassword.3_second_mein_login_par_redirect_ho_jaye')}</Text>
            </View>
          ) : (
            <View className="gap-4">
              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                  Naya Password <Text className="text-rose-600">*</Text>
                </Text>
                <View
                  className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
                  style={{ borderColor: errors.newPassword ? '#fca5a5' : '#e5e7eb' }}
                >
                  <Lock size={18} color="#9ca3af" />
                  <TextInput
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                    }}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNew}
                    className="flex-1 text-base text-neutral-900 dark:text-white"
                  />
                  <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                    {showNew ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                  </Pressable>
                </View>
                {errors.newPassword && (
                  <Text className="text-xs text-rose-600 mt-1 font-semibold">
                    {errors.newPassword}
                  </Text>
                )}

                {newPassword.length > 0 && (
                  <View className="mt-2">
                    <View className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                      />
                    </View>
                    <Text className="text-xs font-bold mt-1" style={{ color: strength.color }}>
                      Strength: {strength.label}
                    </Text>
                  </View>
                )}
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                  Confirm Password <Text className="text-rose-600">*</Text>
                </Text>
                <View
                  className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
                  style={{ borderColor: errors.confirmPassword ? '#fca5a5' : '#e5e7eb' }}
                >
                  <Lock size={18} color="#9ca3af" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    placeholder="Wahi password dobara"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirm}
                    className="flex-1 text-base text-neutral-900 dark:text-white"
                  />
                  <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                    {showConfirm ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                  </Pressable>
                </View>
                {errors.confirmPassword && (
                  <Text className="text-xs text-rose-600 mt-1 font-semibold">
                    {errors.confirmPassword}
                  </Text>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <View className="flex-row items-center gap-1 mt-1">
                    <CheckCircle2 size={12} color="#16a34a" />
                    <Text className="text-[11px] text-emerald-700 font-semibold">{t('auto.resetpassword.passwords_match')}</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={onSubmit}
                disabled={mutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-3 active:opacity-80"
                style={{
                  backgroundColor: mutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text className="text-white font-extrabold text-base">
                  {mutation.isPending ? 'Saving...' : 'Password Set Karein'}
                </Text>
                {!mutation.isPending && <ArrowRight size={18} color="#ffffff" />}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
