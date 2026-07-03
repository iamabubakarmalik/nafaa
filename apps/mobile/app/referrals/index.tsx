import { View, Text, ScrollView, Pressable, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Gift, Users, TrendingUp, Wallet, Copy, Share2,
  Sparkles, Award, Star, Zap, MessageCircle, Send,
  CheckCircle2, ArrowRight, Trophy, Crown, DollarSign,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';
import { useSmartBack } from '@/hooks/useSmartBack';

export default function ReferralsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = useSmartBack();
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
  const conversionRate =
    stats.totalReferrals > 0 ? (stats.convertedCount / stats.totalReferrals) * 100 : 0;

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: '✅ Code copied!', text2: code });
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: '🔗 Link copied!' });
  };

  const handleShare = async (channel?: 'whatsapp' | 'sms' | 'other') => {
    const message = `🎁 *Nafaa POS* try karein — Pakistan ka best shop management software!\n\nMera code use karein aur 7 din free trial paayein:\n\n📱 Code: *${code}*\n🔗 Link: ${shareUrl}\n\n_Mein bhi use kar raha hoon aur bohat khush hoon!_`;

    try {
      await Share.share({
        title: 'Nafaa POS Referral',
        message,
        url: shareUrl,
      });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#ec4899" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Referrals
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#ec4899" />
            <Text className="text-xs text-neutral-500">Earn while you share</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ═══ HERO CARD ═══ */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl overflow-hidden p-6"
            style={{
              backgroundColor: '#ec4899',
              shadowColor: '#ec4899',
              shadowOpacity: 0.4,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 12,
            }}
          >
            {/* Decorative circles */}
            <View
              style={{
                position: 'absolute',
                top: -40, right: -40,
                width: 160, height: 160,
                borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -30, left: -30,
                width: 120, height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            />

            <View className="flex-row items-center gap-2 mb-1">
              <Gift size={16} color="rgba(255,255,255,0.9)" />
              <Text className="text-[10px] uppercase tracking-wider text-white/90 font-extrabold">
                Reward Program
              </Text>
            </View>
            <Text className="text-white text-3xl font-extrabold mt-2">
              Earn Rs 500 💰
            </Text>
            <Text className="text-white/90 text-sm mt-1 font-semibold">
              Har successful referral pe reward
            </Text>

            <View className="mt-4 pt-4 border-t border-white/25 flex-row items-center gap-2">
              <View className="h-10 w-10 rounded-2xl bg-white/20 items-center justify-center">
                <Trophy size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-extrabold text-white/80">
                  Total Earned
                </Text>
                <Text className="text-white text-2xl font-extrabold">
                  {formatPKRFull(stats.totalEarned)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ STATS GRID ═══ */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            {/* Total Referrals */}
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-blue-200 p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="h-10 w-10 rounded-xl bg-blue-100 items-center justify-center">
                    <Users size={18} color="#2563eb" />
                  </View>
                  <View className="px-1.5 py-0.5 rounded bg-blue-100">
                    <Text className="text-[9px] font-extrabold text-blue-700">TOTAL</Text>
                  </View>
                </View>
                <Text className="text-3xl font-extrabold text-blue-700">
                  {stats.totalReferrals}
                </Text>
                <Text className="text-[10px] text-blue-600 font-bold mt-0.5">
                  Referrals sent
                </Text>
              </View>
            </View>

            {/* Converted */}
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                    <CheckCircle2 size={18} color="#16a34a" />
                  </View>
                  <View className="px-1.5 py-0.5 rounded bg-emerald-100">
                    <Text className="text-[9px] font-extrabold text-emerald-700">SUCCESS</Text>
                  </View>
                </View>
                <Text className="text-3xl font-extrabold text-emerald-700">
                  {stats.convertedCount}
                </Text>
                <Text className="text-[10px] text-emerald-600 font-bold mt-0.5">
                  Converted
                </Text>
              </View>
            </View>

            {/* Conversion Rate */}
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-violet-200 p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="h-10 w-10 rounded-xl bg-violet-100 items-center justify-center">
                    <TrendingUp size={18} color="#7c3aed" />
                  </View>
                  <View className="px-1.5 py-0.5 rounded bg-violet-100">
                    <Text className="text-[9px] font-extrabold text-violet-700">RATE</Text>
                  </View>
                </View>
                <Text className="text-3xl font-extrabold text-violet-700">
                  {conversionRate.toFixed(0)}%
                </Text>
                <Text className="text-[10px] text-violet-600 font-bold mt-0.5">
                  Conversion
                </Text>
              </View>
            </View>

            {/* Earned */}
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="h-10 w-10 rounded-xl bg-amber-500 items-center justify-center shadow-md">
                    <Wallet size={18} color="#ffffff" />
                  </View>
                  <View className="px-1.5 py-0.5 rounded bg-amber-200">
                    <Text className="text-[9px] font-extrabold text-amber-800">EARNED</Text>
                  </View>
                </View>
                <Text className="text-xl font-extrabold text-amber-800" numberOfLines={1}>
                  {formatPKRFull(stats.totalEarned)}
                </Text>
                <Text className="text-[10px] text-amber-700 font-bold mt-0.5">
                  Total reward
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ REFERRAL CODE CARD ═══ */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Award size={14} color="#ec4899" />
            <Text className="text-xs uppercase tracking-wider font-extrabold text-pink-700">
              Your Referral Code
            </Text>
          </View>
          <View
            className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-900/50 p-5"
            style={{
              shadowColor: '#ec4899',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {/* Code display */}
            <View className="items-center py-4">
              <View className="flex-row items-center gap-1 mb-2">
                {[0, 1, 2].map((i) => (
                  <Star key={i} size={10} color="#ec4899" fill="#ec4899" />
                ))}
              </View>
              <Text
                className="text-4xl font-extrabold tracking-widest text-pink-700 dark:text-pink-300 font-mono"
                style={{ letterSpacing: 3 }}
              >
                {code}
              </Text>
              <View className="flex-row items-center gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <Star key={i} size={10} color="#ec4899" fill="#ec4899" />
                ))}
              </View>
            </View>

            {/* Copy button */}
            <Pressable
              onPress={copyCode}
              className="h-12 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
              style={{
                backgroundColor: '#ec4899',
                shadowColor: '#ec4899',
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Copy size={16} color="#ffffff" />
              <Text className="text-white font-extrabold text-sm">Copy Code</Text>
            </Pressable>

            <Pressable
              onPress={copyLink}
              className="mt-2 h-11 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-70 border-2 border-pink-200"
            >
              <Send size={14} color="#ec4899" />
              <Text className="text-pink-700 font-extrabold text-xs">Copy Full Link</Text>
            </Pressable>
          </View>
        </View>

        {/* ═══ HOW IT WORKS ═══ */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Zap size={14} color="#f59e0b" />
            <Text className="text-xs uppercase tracking-wider font-extrabold text-amber-700">
              How It Works
            </Text>
          </View>
          <View className="gap-2">
            {[
              {
                step: 1,
                title: 'Share Your Code',
                desc: 'Friends aur shopkeepers ko apna code bhejein',
                icon: Share2,
                color: '#2563eb',
              },
              {
                step: 2,
                title: 'They Sign Up',
                desc: 'Wo aap ke code se register karein — 7 din free trial',
                icon: Users,
                color: '#7c3aed',
              },
              {
                step: 3,
                title: 'You Earn Rs 500',
                desc: 'Jab wo paid plan lein, aap ko reward mile ga',
                icon: DollarSign,
                color: '#16a34a',
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <View
                  key={s.step}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3 flex-row items-center gap-3"
                >
                  <View
                    className="h-10 w-10 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: `${s.color}20` }}
                  >
                    <Icon size={18} color={s.color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="h-5 w-5 rounded-full items-center justify-center"
                        style={{ backgroundColor: s.color }}
                      >
                        <Text className="text-white font-extrabold text-[10px]">{s.step}</Text>
                      </View>
                      <Text className="font-extrabold text-neutral-900 dark:text-white">
                        {s.title}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                      {s.desc}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══ SHARE BUTTONS ═══ */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Share2 size={14} color="#16a34a" />
            <Text className="text-xs uppercase tracking-wider font-extrabold text-emerald-700">
              Share Now
            </Text>
          </View>
          <View className="gap-2">
            <Pressable
              onPress={() => handleShare()}
              className="h-14 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
              style={{
                backgroundColor: '#ec4899',
                shadowColor: '#ec4899',
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Share2 size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">Share With Friends</Text>
            </Pressable>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => handleShare('whatsapp')}
                className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle size={16} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">WhatsApp</Text>
              </Pressable>
              <Pressable
                onPress={() => handleShare('sms')}
                className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-80 border-2 border-blue-500"
                style={{ backgroundColor: '#ffffff' }}
              >
                <Send size={16} color="#2563eb" />
                <Text className="text-blue-700 font-extrabold text-sm">SMS</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ═══ TIP CARD ═══ */}
        <View className="px-5">
          <View className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-4 flex-row items-start gap-3">
            <View className="h-10 w-10 rounded-2xl bg-amber-500 items-center justify-center shrink-0">
              <Crown size={20} color="#ffffff" fill="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-amber-900">Pro Tip 💡</Text>
              <Text className="text-[11px] text-amber-800 font-semibold mt-1 leading-relaxed">
                WhatsApp groups mein share karein — dukandaar communities mein aap ka code jaldi phelega
                aur aap ki earning barhegi!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
