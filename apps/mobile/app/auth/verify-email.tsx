import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ClipboardX from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, Mail, CheckCircle2, RefreshCw, Clock, Sparkles,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const OTP_LENGTH = 6;

export default function EmailVerifyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Auto-send on mount if not verified
  useEffect(() => {
    if (user && !user.emailVerified) {
      sendMutation.mutate();
    } else if (user?.emailVerified) {
      Toast.show({ type: 'success', text1: 'Already verified ✅' });
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendMutation = useMutation({
    mutationFn: authApi.sendVerifyEmail,
    onSuccess: (data: any) => {
      if (data?.alreadyVerified) {
        Toast.show({ type: 'success', text1: 'Already verified ✅' });
        updateUser({ emailVerified: true });
        router.back();
        return;
      }
      Toast.show({
        type: 'success',
        text1: 'Code email pe bhej diya gaya 📧',
      });
      setResendCooldown(60);

      // Dev mode — log OTP for testing
      if (data?.devCode) {
        console.log(`🔑 Dev OTP: ${data.devCode}`);
      }
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Code send fail',
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (otp: string) => authApi.confirmVerifyEmail(otp),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: 'Email verify ho gaya! 🎉',
      });
      updateUser({ emailVerified: true, emailVerifiedAt: new Date().toISOString() });
      setTimeout(() => router.back(), 800);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Invalid OTP code',
      });
      setCode(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[index] = digit;
    setCode(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on all filled
    const full = next.join('');
    if (full.length === OTP_LENGTH && next.every((c) => c)) {
      verifyMutation.mutate(full);
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await ClipboardX.getStringAsync();
      const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (!cleaned) return;
      const next = Array(OTP_LENGTH).fill('');
      for (let i = 0; i < cleaned.length; i++) next[i] = cleaned[i];
      setCode(next);
      if (cleaned.length === OTP_LENGTH) {
        verifyMutation.mutate(cleaned);
      } else {
        inputRefs.current[cleaned.length]?.focus();
      }
    } catch {}
  };

  const handleManualSubmit = () => {
    const full = code.join('');
    if (full.length !== OTP_LENGTH) {
      Toast.show({ type: 'error', text1: 'Pura 6-digit code likhein' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    verifyMutation.mutate(full);
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <Sparkles size={40} color="#16a34a" />
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
        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
          Verify Email
        </Text>
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
              <Mail size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-extrabold text-white leading-9">
              Email Verify Karein
            </Text>
            <Text className="text-sm text-emerald-100 mt-2 leading-5">
              Hum ne 6-digit code bheja hai aap ke email pe:
            </Text>
            <Text className="text-amber-300 font-bold mt-1">
              {user.email}
            </Text>
          </View>

          {/* OTP Inputs */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-3">
              6-Digit Code
            </Text>
            <View className="flex-row justify-between gap-2">
              {code.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  value={digit}
                  onChangeText={(v) => handleChange(i, v)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!verifyMutation.isPending}
                  className="h-14 w-12 rounded-2xl border-2 text-center text-2xl font-extrabold"
                  style={{
                    borderColor: digit ? '#16a34a' : '#e5e7eb',
                    backgroundColor: digit ? '#dcfce7' : '#ffffff',
                    color: digit ? '#15803d' : '#1f2937',
                    opacity: verifyMutation.isPending ? 0.5 : 1,
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </View>
            <Pressable onPress={handlePaste} hitSlop={8} className="mt-2 self-center">
              <Text className="text-xs text-emerald-700 font-bold">
                📋 Paste from Clipboard
              </Text>
            </Pressable>
          </View>

          {/* Verify Button */}
          <Pressable
            onPress={handleManualSubmit}
            disabled={verifyMutation.isPending || code.join('').length !== OTP_LENGTH}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor:
                verifyMutation.isPending || code.join('').length !== OTP_LENGTH
                  ? '#9ca3af'
                  : '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {verifyMutation.isPending ? (
              <>
                <RefreshCw size={18} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">Verifying...</Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">Verify Karein</Text>
              </>
            )}
          </Pressable>

          {/* Info card */}
          <View className="mt-5 rounded-2xl p-4 flex-row items-start gap-3 bg-amber-50 border-2 border-amber-200">
            <Clock size={20} color="#b45309" />
            <View className="flex-1">
              <Text className="text-xs text-amber-900 leading-5 font-semibold">
                <Text className="font-extrabold">10 minutes</Text> ke andar verify karein. Code expire ho jaye to "Resend" karein. Spam folder bhi check karein.
              </Text>
            </View>
          </View>

          {/* Resend */}
          <Pressable
            onPress={() => sendMutation.mutate()}
            disabled={resendCooldown > 0 || sendMutation.isPending}
            hitSlop={8}
            className="mt-5 py-3 items-center"
          >
            <View className="flex-row items-center gap-1.5">
              <RefreshCw
                size={14}
                color="#16a34a"
                style={{ opacity: resendCooldown > 0 ? 0.4 : 1 }}
              />
              <Text
                className="text-sm font-extrabold"
                style={{
                  color: resendCooldown > 0 ? '#94a3b8' : '#16a34a',
                }}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Code dobara bhejein'}
              </Text>
            </View>
          </Pressable>

          {/* Skip option */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="mt-3 py-2 items-center"
          >
            <Text className="text-xs text-neutral-500 font-semibold">
              ← Baad mein verify karenge
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
