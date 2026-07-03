import { useState } from 'react';
import { View, Text, Pressable, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Sparkles, CheckCircle2, RotateCcw, ArrowRight, X, AlertTriangle,
} from 'lucide-react-native';
import { onboardingApi } from '@/api/onboarding.api';
import Toast from 'react-native-toast-message';

const DISMISS_KEY = 'nafaa-onboarding-sync-banner-dismissed';

export function OnboardingSyncBanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check dismissal on mount
  useState(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISMISS_KEY);
        if (raw) {
          const { timestamp } = JSON.parse(raw);
          if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
            setDismissed(true);
          }
        }
      } catch {}
    })();
  });

  const { data: progress } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    staleTime: 60000,
  });

  const resetMutation = useMutation({
    mutationFn: onboardingApi.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      Toast.show({ type: 'success', text1: 'Onboarding reset — chaliye dobara' });
      setConfirmReset(false);
      setTimeout(() => router.push('/onboarding' as any), 500);
    },
    onError: (e: any) =>
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Reset fail',
      }),
  });

  if (dismissed || !progress?.isCompleted) return null;

  const handleDismiss = async () => {
    Haptics.selectionAsync();
    setDismissed(true);
    try {
      await AsyncStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ timestamp: Date.now() }),
      );
    } catch {}
  };

  return (
    <>
      <View
        className="mx-5 mb-4 rounded-3xl border-2 border-emerald-200 p-4 relative overflow-hidden"
        style={{ backgroundColor: '#f0fdf4' }}
      >
        <View
          className="absolute -top-8 -right-8 h-24 w-24 rounded-full"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
        />
        <View className="flex-row items-start gap-3">
          <View
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#16a34a' }}
          >
            <CheckCircle2 size={20} color="#ffffff" />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Sparkles size={10} color="#f59e0b" />
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                Setup Complete
              </Text>
            </View>
            <Text className="text-sm font-extrabold text-slate-900" numberOfLines={2}>
              Onboarding ka data yahan synced hai
            </Text>
            <Text className="text-[11px] text-slate-600 mt-0.5">
              Business type, shop details, working hours — sab yahan edit
            </Text>
            <View className="flex-row gap-2 mt-3">
              <Pressable
                onPress={() => setConfirmReset(true)}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300"
              >
                <RotateCcw size={11} color="#16a34a" />
                <Text className="text-xs text-emerald-700 font-bold">Re-run Setup</Text>
              </Pressable>
              <Pressable
                onPress={handleDismiss}
                className="h-8 w-8 rounded-lg bg-white/60 items-center justify-center"
              >
                <X size={14} color="#64748b" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Confirm modal */}
      <Modal
        visible={confirmReset}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmReset(false)}
      >
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="w-full max-w-md bg-white rounded-3xl overflow-hidden">
            <View className="p-5" style={{ backgroundColor: '#f59e0b' }}>
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center mb-3">
                <AlertTriangle size={26} color="#ffffff" />
              </View>
              <Text className="text-xl font-extrabold text-white">
                Onboarding Dobara Shuru?
              </Text>
              <Text className="text-white/90 text-xs mt-1 leading-relaxed">
                Aap ka data <Text className="font-extrabold">safe rahega</Text> (products, sales, customers) — sirf wizard chalega
              </Text>
            </View>
            <View className="p-5">
              <View className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-4">
                <Text className="text-[11px] text-blue-900 leading-relaxed">
                  ✅ Products, customers, sales preserved{'\n'}
                  ✅ Settings yahan edit kar sakte hain{'\n'}
                  ⚠️ Business type change ya wizard dobara dekhna ho tab use karein
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setConfirmReset(false)}
                  disabled={resetMutation.isPending}
                  className="flex-1 h-11 rounded-xl bg-neutral-100 items-center justify-center"
                >
                  <Text className="font-bold text-neutral-800">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1"
                  style={{ backgroundColor: resetMutation.isPending ? '#9ca3af' : '#f59e0b' }}
                >
                  <ArrowRight size={14} color="#ffffff" />
                  <Text className="text-white font-bold">
                    {resetMutation.isPending ? 'Resetting...' : 'Yes, Reset'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
