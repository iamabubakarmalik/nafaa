import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Shield, Mail, Lock, Plus, Unlink, CheckCircle2, AlertCircle,
  Eye, EyeOff, X, Smartphone, ChevronRight, Clock,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';

export default function AccountSecurityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showSetPwd, setShowSetPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
  });

  const u = me?.user as any;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;
  const emailVerified = !!u?.emailVerified;

  const disconnectGoogle = useMutation({
    mutationFn: authApi.disconnectGoogle,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Google disconnect ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Disconnect fail' }),
  });

  // Security score
  const checks = [
    { label: 'Email verified', done: emailVerified, weight: 35 },
    { label: 'Password set', done: hasPassword, weight: 35 },
    { label: 'Google connected', done: hasGoogle, weight: 30 },
  ];
  const score = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const scoreColor = score >= 70 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626';
  const scoreLight = score >= 70 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';

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
        <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
          {t('auto.security.account_security')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Hero */}
        <View
          className="rounded-3xl p-5 mb-5"
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
            className="h-14 w-14 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Shield size={28} color="#ffffff" />
          </View>
          <Text className="text-2xl font-extrabold text-white">
            {t('auto.security.login_methods')}
          </Text>
          <Text className="text-xs text-emerald-100 mt-1">
            {t('auto.security.apne_login_methods_aur_security_manage_k')}
          </Text>
        </View>

        {/* Security Score Card */}
        <View
          className="rounded-3xl p-4 mb-4"
          style={{
            backgroundColor: scoreLight,
            borderWidth: 2,
            borderColor: scoreColor,
          }}
        >
          <View className="flex-row items-center gap-3 mb-3">
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: scoreColor }}
            >
              <Shield size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: scoreColor }}>
                Security Score
              </Text>
              <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                {score}%
              </Text>
            </View>
          </View>
          <View className="h-2 bg-white/60 rounded-full overflow-hidden mb-3">
            <View
              className="h-full rounded-full"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </View>
          <View className="gap-1.5">
            {checks.map((c) => (
              <View key={c.label} className="flex-row items-center gap-2">
                {c.done ? (
                  <CheckCircle2 size={13} color="#16a34a" />
                ) : (
                  <AlertCircle size={13} color="#94a3b8" />
                )}
                <Text className={`text-xs flex-1 ${c.done ? 'text-neutral-800 font-semibold' : 'text-neutral-500'}`}>
                  {c.label}
                </Text>
                <Text className={`text-[10px] font-extrabold ${c.done ? 'text-emerald-700' : 'text-neutral-400'}`}>
                  +{c.weight}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Email verification */}
        <View
          className="rounded-2xl border-2 p-4 mb-3 flex-row items-center gap-3"
          style={{
            backgroundColor: emailVerified ? '#dcfce7' : '#fef3c7',
            borderColor: emailVerified ? '#86efac' : '#fcd34d',
          }}
        >
          <View
            className="h-12 w-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: emailVerified ? '#16a34a' : '#f59e0b' }}
          >
            {emailVerified ? (
              <CheckCircle2 size={22} color="#ffffff" />
            ) : (
              <Mail size={22} color="#ffffff" />
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text
              className="font-extrabold text-sm"
              style={{ color: emailVerified ? '#14532d' : '#78350f' }}
            >
              {emailVerified ? 'Email Verified ✓' : 'Verify Karein'}
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{ color: emailVerified ? '#15803d' : '#92400e' }}
              numberOfLines={1}
            >
              {u?.email}
            </Text>
          </View>
          {!emailVerified && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowVerifyEmail(true);
              }}
              className="h-9 px-3 rounded-xl bg-amber-600 items-center justify-center"
            >
              <Text className="text-white font-bold text-xs">{t('auto.security.verify_now')}</Text>
            </Pressable>
          )}
        </View>

        {/* Email/Password */}
        <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 mb-3 flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-2xl bg-blue-100 items-center justify-center">
            <Mail size={22} color="#2563eb" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-extrabold text-neutral-900 dark:text-white">
                {t('auto.security.email_password')}
              </Text>
              {hasPassword && (
                <View className="px-1.5 py-0.5 rounded-full bg-emerald-100">
                  <Text className="text-[9px] font-extrabold text-emerald-700">ACTIVE</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {hasPassword
                ? 'Email/password se login enabled'
                : 'Set nahi hai — sirf Google se login ho sakta hai'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              if (hasPassword) setShowChangePwd(true);
              else setShowSetPwd(true);
            }}
            className="h-9 px-3 rounded-xl bg-emerald-600 items-center justify-center"
          >
            <Text className="text-white font-bold text-xs">
              {hasPassword ? 'Change' : 'Set'}
            </Text>
          </Pressable>
        </View>

        {/* Google */}
        <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 mb-3 flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-2xl bg-rose-50 items-center justify-center">
            <Text style={{ fontSize: 22 }}>🌐</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-extrabold text-neutral-900 dark:text-white">
                {t('auto.security.google')}
              </Text>
              {hasGoogle && (
                <View className="px-1.5 py-0.5 rounded-full bg-emerald-100">
                  <Text className="text-[9px] font-extrabold text-emerald-700">CONNECTED</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {hasGoogle ? 'One-tap login enabled' : 'Quick login ke liye connect karein'}
            </Text>
          </View>
          {hasGoogle ? (
            <Pressable
              onPress={() => {
                if (!hasPassword) {
                  Alert.alert(
                    'Pehle Password Set Karein',
                    'Google disconnect karne se pehle password set karna zaroori hai, warna aap login nahi kar paayenge.',
                  );
                  return;
                }
                Alert.alert(
                  'Disconnect Google?',
                  'Aap email/password se login kar sakenge.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Disconnect',
                      style: 'destructive',
                      onPress: () => disconnectGoogle.mutate(),
                    },
                  ],
                );
              }}
              className="h-9 px-3 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center"
            >
              <Text className="text-rose-700 font-bold text-xs">
                {t('auto.security.disconnect')}
              </Text>
            </Pressable>
          ) : (
            <View className="h-9 px-3 rounded-xl bg-neutral-100 items-center justify-center">
              <Text className="text-neutral-500 font-bold text-xs">
                {t('auto.security.connect_via_app')}
              </Text>
            </View>
          )}
        </View>

        {/* Active Devices Link */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/account/devices' as any);
          }}
          className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 mb-3 flex-row items-center gap-3 active:opacity-70"
        >
          <View className="h-12 w-12 rounded-2xl bg-violet-100 items-center justify-center">
            <Smartphone size={22} color="#7c3aed" />
          </View>
          <View className="flex-1">
            <Text className="font-extrabold text-neutral-900 dark:text-white">
              Active Devices
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              Apne logged-in devices manage karein
            </Text>
          </View>
          <ChevronRight size={18} color="#9ca3af" />
        </Pressable>

        {/* Security tip */}
        <View className="rounded-2xl bg-blue-50 border border-blue-200 p-3 mt-2 flex-row items-start gap-2">
          <Shield size={16} color="#2563eb" />
          <Text className="flex-1 text-xs text-blue-900 leading-5">
            {t('auto.security.aap_ke_account_mein_at_least_ek_login_me')}
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      {showSetPwd && <SetPasswordModal onClose={() => setShowSetPwd(false)} />}
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
      {showVerifyEmail && <VerifyEmailModal onClose={() => setShowVerifyEmail(false)} />}
    </SafeAreaView>
  );
}

function SetPasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.setPassword(pwd),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Password set ho gaya! 🎉' });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      onClose();
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Set fail' }),
  });

  return (
    <Modal visible animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
              {t('auto.security.password_set_karein')}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 rounded-xl bg-neutral-100 items-center justify-center">
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          <Text className="text-sm text-neutral-500 mb-4">
            {t('auto.security.ab_aap_email_password_se_bhi_login_kar_s')}
          </Text>

          <View>
            <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
              {t('auto.resetpassword.naya_password')}
            </Text>
            <View className="flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white dark:bg-neutral-900 px-4 h-12">
              <Lock size={18} color="#9ca3af" />
              <TextInput
                value={pwd}
                onChangeText={setPwd}
                placeholder="Min 8 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!show}
                className="flex-1 text-base"
                autoFocus
              />
              <Pressable onPress={() => setShow(!show)}>
                {show ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => mutation.mutate()}
            disabled={pwd.length < 8 || mutation.isPending}
            className="h-14 rounded-2xl items-center justify-center mt-5"
            style={{ backgroundColor: pwd.length < 8 ? '#9ca3af' : '#16a34a' }}
          >
            <Text className="text-white font-extrabold text-base">
              {mutation.isPending ? 'Saving...' : 'Set Password'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Password change ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      onClose();
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Change fail' }),
  });

  const canSubmit = current.length >= 6 && next.length >= 8 && next === confirm && next !== current;

  return (
    <Modal visible animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
              {t('auto.index.change_password')}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 rounded-xl bg-neutral-100 items-center justify-center">
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          <View className="gap-3">
            <View>
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                {t('auto.index.current_password')}
              </Text>
              <TextInput
                value={current}
                onChangeText={setCurrent}
                secureTextEntry
                placeholderTextColor="#9ca3af"
                className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 text-base"
              />
            </View>
            <View>
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                {t('auto.resetpassword.naya_password')}
              </Text>
              <TextInput
                value={next}
                onChangeText={setNext}
                placeholder="Min 8 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 text-base"
              />
            </View>
            <View>
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                Confirm New Password
              </Text>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Same password again"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 text-base"
              />
              {confirm && next !== confirm && (
                <Text className="text-xs text-rose-600 mt-1 font-semibold">
                  Passwords match nahi karte
                </Text>
              )}
              {next && next === current && (
                <Text className="text-xs text-amber-600 mt-1 font-semibold">
                  Naya password current se alag hona chahiye
                </Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="h-14 rounded-2xl items-center justify-center mt-5"
            style={{ backgroundColor: !canSubmit ? '#9ca3af' : '#16a34a' }}
          >
            <Text className="text-white font-extrabold text-base">
              {mutation.isPending ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VerifyEmailModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();

  // Redirect to dedicated full-screen verify page
  useState(() => {
    onClose();
    router.push('/auth/verify-email' as any);
  });

  return null;
}
