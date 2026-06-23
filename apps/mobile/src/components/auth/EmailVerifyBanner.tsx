import { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Mail, X, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';

const DISMISS_KEY = '@nafaa-mobile-verify-banner-dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Shows on dashboard top if email not verified.
 * - Dismissable for 24 hours (persists via AsyncStorage)
 * - Tap → /auth/verify-email
 */
export function EmailVerifyBanner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(true); // Default true to avoid flash

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(DISMISS_KEY);
        if (!stored) {
          if (mounted) setDismissed(false);
          return;
        }
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < DISMISS_DURATION_MS) {
          if (mounted) setDismissed(true);
        } else {
          await AsyncStorage.removeItem(DISMISS_KEY);
          if (mounted) setDismissed(false);
        }
      } catch {
        if (mounted) setDismissed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!user || user.emailVerified || dismissed) return null;

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    try {
      await AsyncStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ timestamp: Date.now() }),
      );
    } catch {}
  };

  const handleVerify = () => {
    Haptics.selectionAsync();
    router.push('/auth/verify-email');
  };

  return (
    <View className="px-4 mt-2 mb-1">
      <View
        className="rounded-3xl p-4 overflow-hidden"
        style={{
          backgroundColor: '#fef3c7',
          borderWidth: 2,
          borderColor: '#f59e0b',
        }}
      >
        <View className="flex-row items-start gap-3">
          <View
            className="h-12 w-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#f59e0b' }}
          >
            <Mail size={22} color="#ffffff" />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center justify-between gap-2 mb-1">
              <View className="flex-row items-center gap-1.5">
                <AlertTriangle size={11} color="#92400e" />
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  Action Required
                </Text>
              </View>
              <Pressable
                onPress={handleDismiss}
                hitSlop={8}
                className="h-6 w-6 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(146,64,14,0.1)' }}
              >
                <X size={12} color="#92400e" />
              </Pressable>
            </View>

            <Text className="text-base font-extrabold leading-5 text-amber-900">
              Email verify karein
            </Text>
            <Text className="text-xs leading-5 mt-0.5 text-amber-800" numberOfLines={1}>
              {user.email}
            </Text>

            <Pressable
              onPress={handleVerify}
              className="mt-3 h-10 rounded-xl items-center justify-center flex-row gap-1.5 self-start px-4"
              style={{
                backgroundColor: '#d97706',
                shadowColor: '#d97706',
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text className="text-white font-extrabold text-sm">Verify Now</Text>
              <ArrowRight size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
