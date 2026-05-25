import { View, Text, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lock, Sparkles, ArrowRight, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth.store';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

/**
 * Full-screen blocker shown when subscription expired.
 * Single CTA: Upgrade. Logout option as escape hatch.
 */
export function TrialExpiredModal() {
  const router = useRouter();
  const { needsUpgrade, subscription } = useSubscriptionStatus();
  const logout = useAuthStore((s) => s.logout);

  if (!needsUpgrade) return null;

  const isPastDue = subscription?.status === 'PAST_DUE';

  return (
    <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black/90 items-center justify-center">
        <SafeAreaView className="flex-1 w-full items-center justify-center px-6">
          <View className="w-full max-w-sm">
            {/* Icon */}
            <View className="items-center mb-6">
              <View
                className="h-24 w-24 rounded-3xl items-center justify-center mb-4"
                style={{
                  backgroundColor: isPastDue ? '#f59e0b' : '#dc2626',
                  shadowColor: isPastDue ? '#f59e0b' : '#dc2626',
                  shadowOpacity: 0.6,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Lock size={48} color="#ffffff" />
              </View>
            </View>

            {/* Title */}
            <Text className="text-3xl font-extrabold text-white text-center mb-3">
              {isPastDue ? 'Subscription Expired' : 'Trial Khatam Ho Gaya'}
            </Text>
            <Text className="text-base text-neutral-300 text-center leading-6 mb-8">
              {isPastDue
                ? 'Aap ki subscription expire ho chuki hai. Service jaari rakhne ke liye renew karein.'
                : 'Aap ka 7-day free trial khatam ho gaya. Apni dukan ka data safe hai — abhi plan choose karein.'}
            </Text>

            {/* Trust line */}
            <View className="bg-white/10 rounded-2xl p-3 mb-6">
              <Text className="text-xs text-emerald-300 text-center">
                ✓ Aap ka data, customers, products — sab safe hain
              </Text>
              <Text className="text-xs text-emerald-300 text-center mt-1">
                ✓ Plan choose karte hi turant access wapas
              </Text>
            </View>

            {/* CTA */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/plan');
              }}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 mb-3 active:opacity-80"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <Sparkles size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">Plan Choose Karein</Text>
              <ArrowRight size={18} color="#ffffff" />
            </Pressable>

            {/* Logout escape */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                logout();
                router.replace('/auth/login');
              }}
              className="h-12 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-70"
            >
              <LogOut size={14} color="#94a3b8" />
              <Text className="text-sm text-neutral-400 font-bold">Logout</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
