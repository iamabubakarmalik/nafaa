import { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Sparkles, ArrowRight, X, AlertCircle, Eye } from 'lucide-react-native';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const DISMISS_KEY_PREFIX = '@nafaa-subscription-banner-dismissed';

/**
 * Soft Banner — replaces old hard-block modal.
 * Shows on dashboard top when trial expired / past-due.
 * User can dismiss for current session OR upgrade.
 * Dashboard access stays (read-only feel) — full block happens at API level via SubscriptionGuard.
 */
export function TrialExpiredModal() {
  const router = useRouter();
  const { needsUpgrade, subscription } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!needsUpgrade || dismissed) return null;

  const isPastDue = subscription?.status === 'PAST_DUE';
  const accentBg = isPastDue ? '#f59e0b' : '#dc2626';
  const accentLight = isPastDue ? '#fef3c7' : '#fee2e2';
  const accentDark = isPastDue ? '#92400e' : '#991b1b';

  return (
    <View className="px-4 mt-2 mb-1">
      <View
        className="rounded-3xl p-4 overflow-hidden"
        style={{
          backgroundColor: accentLight,
          borderWidth: 2,
          borderColor: accentBg,
        }}
      >
        <View className="flex-row items-start gap-3">
          <View
            className="h-12 w-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: accentBg }}
          >
            <Lock size={22} color="#ffffff" />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center justify-between gap-2 mb-1">
              <View className="flex-row items-center gap-1.5">
                <AlertCircle size={12} color={accentDark} />
                <Text
                  className="text-[10px] font-extrabold uppercase tracking-wider"
                  style={{ color: accentDark }}
                >
                  {isPastDue ? 'Payment Past Due' : 'Subscription Expired'}
                </Text>
              </View>
              <Pressable
                onPress={() => setDismissed(true)}
                hitSlop={8}
                className="h-6 w-6 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
              >
                <X size={12} color={accentDark} />
              </Pressable>
            </View>

            <Text
              className="text-base font-extrabold leading-5"
              style={{ color: accentDark }}
            >
              {isPastDue
                ? 'Aap ka payment due hai'
                : 'Aap ka trial khatam ho gaya'}
            </Text>

            <Text
              className="text-xs leading-5 mt-1"
              style={{ color: accentDark, opacity: 0.8 }}
            >
              {isPastDue
                ? '3 din grace period chal raha hai — renew karein.'
                : 'Apni dukan continue rakhne ke liye plan select karein.'}
            </Text>

            <View className="flex-row items-center gap-2 mt-3">
              <Pressable
                onPress={() => router.push('/plan')}
                className="flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1.5"
                style={{
                  backgroundColor: accentBg,
                  shadowColor: accentBg,
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Sparkles size={14} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">
                  Plan Choose Karein
                </Text>
                <ArrowRight size={14} color="#ffffff" />
              </Pressable>
            </View>

            <View className="flex-row items-center gap-1 mt-2 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <Eye size={10} color={accentDark} />
              <Text
                className="text-[10px] font-semibold"
                style={{ color: accentDark, opacity: 0.7 }}
              >
                Read-only mode — sales/products view kar sakte hain
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
