import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Phone,
  Store,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { useTranslation } from '@/i18n/useTranslation';
import { authApi } from '@/api/auth.api';
import { Logo } from '@/components/brand/Logo';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);

  const [shopName, setShopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      authApi.register({
        shopName,
        fullName,
        email,
        phone: phone || undefined,
        password,
      }),
    onSuccess: async (data) => {
      await setSession(data);
      Toast.show({ type: 'success', text1: 'Mubarak ho! Account created' });
      router.replace('/(tabs)');
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: e?.response?.data?.message || 'Try again',
      });
    },
  });

  const handleSubmit = () => {
    if (!shopName || !fullName || !email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill all required fields' });
      return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be 8+ characters' });
      return;
    }
    mutation.mutate();
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
          <View className="flex-1 px-6 pt-16 pb-10">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="self-start mb-6"
            >
              <ArrowLeft
                size={24}
                color="#16a34a"
              />
            </Pressable>

            <View className="items-center mb-8">
              <Logo size={80} />

              <Text className="mt-4 text-3xl font-bold text-neutral-900 dark:text-white">
                {t('auth.registerTitle')}
              </Text>
              <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                {t('auth.registerSubtitle')}
              </Text>
            </View>

            <View className="gap-3">
              <Input
                label={t('auth.shopName')}
                placeholder="Ahmad Bakery"
                value={shopName}
                onChangeText={setShopName}
                leftIcon={<Store size={20} color="#9ca3af" />}
              />

              <Input
                label={t('auth.fullName')}
                placeholder="Ahmad Ali"
                value={fullName}
                onChangeText={setFullName}
                leftIcon={<User size={20} color="#9ca3af" />}
              />

              <Input
                label={t('auth.email')}
                placeholder="ahmad@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={20} color="#9ca3af" />}
              />

              <Input
                label={`${t('auth.phone')} (optional)`}
                placeholder="+923001234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                leftIcon={<Phone size={20} color="#9ca3af" />}
              />

              <Input
                label={t('auth.password')}
                placeholder="Minimum 8 characters"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon={<Lock size={20} color="#9ca3af" />}
              />

              <Button
                size="lg"
                loading={mutation.isPending}
                onPress={handleSubmit}
                className="mt-3"
              >
                <Text className="text-white text-base font-bold">
                  Start Free Trial
                </Text>
                <ArrowRight size={18} color="#ffffff" />
              </Button>
            </View>

            <View className="flex-row justify-center mt-6">
              <Text className="text-neutral-600 dark:text-neutral-400 text-sm">
                {t('auth.haveAccount')}{' '}
              </Text>
              <Pressable onPress={() => router.replace('/auth/login')}>
                <Text className="text-brand-600 dark:text-brand-400 text-sm font-bold">
                  {t('auth.login')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
