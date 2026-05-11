import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Store, ArrowRight, Sparkles, CheckCircle2,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function GoogleCompleteSignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { tempToken, email, fullName, avatarUrl } = useLocalSearchParams<{
    tempToken: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }>();

  const [shopName, setShopName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.completeGoogleSignup(tempToken!, shopName.trim()),
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession(data);
      Toast.show({
        type: 'success',
        text1: `Mubarak ho ${data.user.fullName.split(' ')[0]}! 🎉`,
      });
      router.replace('/onboarding');
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Account banane mein masla',
      });
    },
  });

  const onSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (shopName.trim().length < 2) {
      setError('Shop ka naam likhein (min 2 chars)');
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
        <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.googlecomplete.account_banayein')}</Text>
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
              <Store size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-extrabold text-white leading-9">{t('auto.googlecomplete.aakhri_step')}</Text>
            <Text className="text-sm text-emerald-100 mt-2">{t('auto.googlecomplete.apni_dukan_ka_naam_batayein')}</Text>
          </View>

          {/* Google account confirmation */}
          <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex-row items-center gap-3 mb-5">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-12 w-12 rounded-full" />
            ) : (
              <View className="h-12 w-12 rounded-full bg-emerald-500 items-center justify-center">
                <Text className="text-white font-extrabold text-lg">
                  {fullName?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-extrabold text-emerald-900" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-xs text-emerald-700" numberOfLines={1}>
                {email}
              </Text>
            </View>
            <CheckCircle2 size={20} color="#16a34a" />
          </View>

          <Text className="text-sm text-neutral-600 dark:text-neutral-400 leading-6 mb-5">
            Google se sign in ho gaya hai ✅{'\n'}
            Bas apni dukan/business ka naam batayein:
          </Text>

          {/* Shop name input */}
          <View>
            <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
              Shop / Business Name <Text className="text-rose-600">*</Text>
            </Text>
            <View
              className="flex-row items-center gap-2 rounded-2xl border-2 bg-white dark:bg-neutral-900 px-4 h-12"
              style={{ borderColor: error ? '#fca5a5' : '#e5e7eb' }}
            >
              <Store size={18} color="#9ca3af" />
              <TextInput
                value={shopName}
                onChangeText={(t) => {
                  setShopName(t);
                  if (error) setError(null);
                }}
                placeholder="e.g. Ahmad Bakery"
                placeholderTextColor="#9ca3af"
                autoFocus
                className="flex-1 text-base text-neutral-900 dark:text-white"
              />
            </View>
            {error && (
              <Text className="text-xs text-rose-600 mt-1 font-semibold">{error}</Text>
            )}
          </View>

          {/* Submit */}
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
              {mutation.isPending ? 'Account banaya jaa raha hai...' : 'Account Banayein'}
            </Text>
            {!mutation.isPending && <ArrowRight size={18} color="#ffffff" />}
          </Pressable>

          <Text className="text-xs text-neutral-500 text-center mt-3 leading-5">{t('auto.register.continue_karke_aap_terms_aur_privacy_pol')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
