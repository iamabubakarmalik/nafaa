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
  ArrowLeft, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, ArrowRight,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Password change ho gaya!',
        text2: 'Apna naya password yaad rakhein',
      });
      setTimeout(() => router.back(), 1200);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Password change fail',
      });
    },
  });

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.current = 'Current password zaroori hai';
    if (!newPassword) errs.new = 'Naya password zaroori hai';
    else if (newPassword.length < 8) errs.new = 'Kam se kam 8 characters';
    else if (newPassword === currentPassword) errs.new = 'Naya password purane se alag hona chahiye';
    if (!confirmPassword) errs.confirm = 'Confirm password';
    else if (newPassword !== confirmPassword) errs.confirm = "Passwords match nahi karte";
    setErrors(errs);
    if (Object.keys(errs).length === 0) mutation.mutate();
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
        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.change_password')}</Text>
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
            className="rounded-3xl p-6 mb-6"
            style={{
              backgroundColor: '#dc2626',
              shadowColor: '#dc2626',
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
            <Text className="text-2xl font-extrabold text-white leading-8">{t('auto.changepassword.password_update')}</Text>
            <Text className="text-sm text-rose-100 mt-2">{t('auto.changepassword.apne_account_ko_secure_rakhne_ke_liye_st')}</Text>
          </View>

          <View className="gap-4">
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={(t: string) => {
                setCurrentPassword(t);
                if (errors.current) setErrors({ ...errors, current: '' });
              }}
              show={show.current}
              onToggle={() => setShow({ ...show, current: !show.current })}
              error={errors.current}
              placeholder="Apna current password"
              required
            />

            <PasswordInput
              label="Naya Password"
              value={newPassword}
              onChangeText={(t: string) => {
                setNewPassword(t);
                if (errors.new) setErrors({ ...errors, new: '' });
              }}
              show={show.new}
              onToggle={() => setShow({ ...show, new: !show.new })}
              error={errors.new}
              placeholder="Min 8 characters"
              required
            />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(t: string) => {
                setConfirmPassword(t);
                if (errors.confirm) setErrors({ ...errors, confirm: '' });
              }}
              show={show.confirm}
              onToggle={() => setShow({ ...show, confirm: !show.confirm })}
              error={errors.confirm}
              placeholder="Wahi naya password dobara"
              required
            />

            {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
              <View className="flex-row items-center gap-1.5">
                <CheckCircle2 size={14} color="#16a34a" />
                <Text className="text-xs text-emerald-700 font-bold">{t('auto.resetpassword.passwords_match')}</Text>
              </View>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={mutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mt-3 active:opacity-80"
              style={{
                backgroundColor: mutation.isPending ? '#9ca3af' : '#dc2626',
                shadowColor: '#dc2626',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text className="text-white font-extrabold text-base">
                {mutation.isPending ? 'Updating...' : 'Update Password'}
              </Text>
              {!mutation.isPending && <ArrowRight size={18} color="#ffffff" />}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordInput({
  label, value, onChangeText, show, onToggle, error, placeholder, required,
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
        <Lock size={18} color="#9ca3af" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={!show}
          className="flex-1 text-base text-neutral-900 dark:text-white"
        />
        <Pressable onPress={onToggle} hitSlop={8}>
          {show ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
        </Pressable>
      </View>
      {error && <Text className="text-xs text-rose-600 mt-1 font-semibold">{error}</Text>}
    </View>
  );
}
