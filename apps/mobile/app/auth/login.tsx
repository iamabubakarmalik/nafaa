import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Mail, Lock, ArrowRight, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/i18n/useTranslation';
import { authApi } from '@/api/auth.api';
import { Logo } from '@/components/brand/Logo';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: async (data) => {
      await setSession(data);
      // Save credentials for biometric login
      await SecureStore.setItemAsync('saved-email', email);
      await SecureStore.setItemAsync('saved-password', password);
      Toast.show({ type: 'success', text1: 'Welcome back!' });
      router.replace('/(tabs)');
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: e?.response?.data?.message || 'Invalid credentials',
      });
    },
  });

  const handleBiometric = async () => {
    const supported = await LocalAuthentication.hasHardwareAsync();
    if (!supported) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Alert.alert('Not Setup', 'Please setup biometric authentication in your device settings.');
      return;
    }

    const savedEmail = await SecureStore.getItemAsync('saved-email');
    const savedPassword = await SecureStore.getItemAsync('saved-password');
    if (!savedEmail || !savedPassword) {
      Alert.alert('No Saved Credentials', 'Please login with email/password first to enable biometric login.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login to Nafaa',
      fallbackLabel: 'Use Password',
    });

    if (result.success) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      // Auto-submit
      loginMutation.mutate();
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-20 pb-10">
            {/* Logo */}
            <View className="items-center mb-10">
              <Logo size={80} />

              <Text className="mt-5 text-3xl font-bold text-neutral-900 dark:text-white">
                {t('auth.loginTitle')}
              </Text>
              <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
                {t('auth.loginSubtitle')}
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              <Input
                label={t('auth.email')}
                placeholder="ahmad@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={20} color="#9ca3af" />}
              />

              <Input
                label={t('auth.password')}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon={<Lock size={20} color="#9ca3af" />}
              />

              <Pressable className="self-end">
                <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {t('auth.forgotPassword')}
                </Text>
              </Pressable>

              <Button
                size="lg"
                loading={loginMutation.isPending}
                onPress={() => {
                  if (!email || !password) {
                    Toast.show({ type: 'error', text1: 'Please fill all fields' });
                    return;
                  }
                  loginMutation.mutate();
                }}
              >
                <Text className="text-white text-base font-bold">
                  {t('auth.login')}
                </Text>
                <ArrowRight size={18} color="#ffffff" />
              </Button>

              {/* Biometric */}
              <Button
                variant="secondary"
                size="lg"
                onPress={handleBiometric}
              >
                <Fingerprint size={20} color={isDark ? '#fff' : '#16a34a'} />
                <Text className="text-neutral-900 dark:text-white font-semibold">
                  {t('auth.biometric')}
                </Text>
              </Button>
            </View>

            {/* Sign up link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-neutral-600 dark:text-neutral-400 text-sm">
                {t('auth.noAccount')}{' '}
              </Text>
              <Pressable onPress={() => router.push('/auth/register')}>
                <Text className="text-brand-600 dark:text-brand-400 text-sm font-bold">
                  {t('auth.register')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
