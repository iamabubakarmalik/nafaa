import { View, Text, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Gift, Users, TrendingUp, Wallet, Copy, Share2,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function ReferralsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tenant } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/referrals/me');
        return res.data ?? { stats: { totalReferrals: 0, convertedCount: 0, totalEarned: 0 } };
      } catch {
        return { stats: { totalReferrals: 0, convertedCount: 0, totalEarned: 0 } };
      }
    },
  });

  const code = (tenant as any)?.referralCode || `NAFAA-${tenant?.slug?.toUpperCase().slice(0, 6) || 'XXXX'}`;
  const shareUrl = `https://nafaa.pk/register?ref=${code}`;

  const stats = data?.stats || { totalReferrals: 0, convertedCount: 0, totalEarned: 0 };

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: 'Code copied!' });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mein Nafaa POS use kar raha hoon — Pakistan ka best shop management software! Mere code "${code}" se signup karein:\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
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
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.referrals')}</Text>
          <Text className="text-xs text-neutral-500">{t('auto.index.earn_while_you_share')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View className="rounded-3xl overflow-hidden p-6" style={{ backgroundColor: '#16a34a' }}>
            <Gift size={36} color="#ffffff" />
            <Text className="mt-3 text-2xl font-bold text-white">{t('auto.index.earn_rs_500')}</Text>
            <Text className="text-white/90 text-sm mt-1">{t('auto.index.for_every_successful_referral_get_reward')}</Text>
          </View>
        </View>

        <View className="px-5 mt-3">
          <View className="flex-row gap-2">
            <Card variant="outline" className="flex-1 p-3">
              <Users size={18} color="#2563eb" />
              <Text className="mt-2 text-xs text-neutral-500 font-semibold">{t('auto.index.referred')}</Text>
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                {stats.totalReferrals}
              </Text>
            </Card>
            <Card variant="outline" className="flex-1 p-3">
              <TrendingUp size={18} color="#16a34a" />
              <Text className="mt-2 text-xs text-neutral-500 font-semibold">{t('auto.index.converted')}</Text>
              <Text className="text-xl font-bold text-emerald-700">
                {stats.convertedCount}
              </Text>
            </Card>
            <Card variant="outline" className="flex-1 p-3">
              <Wallet size={18} color="#f59e0b" />
              <Text className="mt-2 text-xs text-neutral-500 font-semibold">{t('auto.index.earned')}</Text>
              <Text className="text-xl font-bold text-amber-700">
                {formatPKRFull(stats.totalEarned)}
              </Text>
            </Card>
          </View>
        </View>

        <View className="px-5 mt-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">{t('auto.index.your_referral_code')}</Text>
          <Card variant="outline" className="bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900/50 p-5">
            <View className="items-center">
              <Text className="text-3xl font-bold tracking-widest text-pink-700 dark:text-pink-300 font-mono">
                {code}
              </Text>
              <Pressable
                onPress={copyCode}
                className="mt-3 px-5 py-2 rounded-xl bg-pink-600 flex-row items-center gap-2 active:opacity-80"
              >
                <Copy size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.copy_code')}</Text>
              </Pressable>
            </View>
          </Card>
        </View>

        <View className="px-5 mt-5">
          <Pressable
            onPress={handleShare}
            className="h-14 rounded-2xl bg-brand-600 items-center justify-center flex-row gap-2 active:opacity-80"
          >
            <Share2 size={20} color="#ffffff" />
            <Text className="text-white font-bold text-base">{t('auto.index.share_with_friends')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
