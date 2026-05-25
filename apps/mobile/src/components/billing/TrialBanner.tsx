import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Sparkles, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export function TrialBanner() {
  const router = useRouter();
  const { isTrial, trialDaysLeft, trialHoursLeft, subscription } = useSubscriptionStatus();

  if (!isTrial || trialDaysLeft === null) return null;

  const isUrgent = trialDaysLeft <= 1;
  const isWarning = trialDaysLeft <= 3 && !isUrgent;
  const bgColor = isUrgent ? '#dc2626' : isWarning ? '#f59e0b' : '#16a34a';

  const timeLeftText =
    trialDaysLeft > 1
      ? `${trialDaysLeft} din baqi`
      : trialHoursLeft && trialHoursLeft > 0
      ? `${trialHoursLeft} ghante baqi`
      : 'Aaj khatam';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/plan');
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mx-4 my-2 rounded-2xl overflow-hidden active:opacity-90"
      style={{
        backgroundColor: bgColor,
        shadowColor: bgColor,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <View className="px-4 py-3 flex-row items-center gap-3">
        <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center">
          {isUrgent ? <Clock size={20} color="#ffffff" /> : <Sparkles size={20} color="#ffffff" />}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">Free Trial</Text>
            <View className="h-1 w-1 rounded-full bg-white/60" />
            <Text className="text-xs font-bold text-white">{timeLeftText}</Text>
          </View>
          <Text className="text-sm font-bold text-white mt-0.5" numberOfLines={1}>
            {isUrgent
              ? '⚠️ Service rok jayegi — Abhi upgrade karein!'
              : isWarning
              ? `Trial ${trialDaysLeft} din mein khatam — Upgrade karein`
              : `${subscription?.plan?.name || 'Trial'} — full access`}
          </Text>
        </View>
        <View className="h-9 w-9 rounded-xl bg-white items-center justify-center">
          <ArrowRight size={18} color={bgColor} />
        </View>
      </View>
    </Pressable>
  );
}
