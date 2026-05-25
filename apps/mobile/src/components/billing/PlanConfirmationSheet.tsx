import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  X, Check, Sparkles, AlertCircle, ArrowRight, Calendar, Shield,
} from 'lucide-react-native';
import { subscriptionsApi, type BillingInterval } from '@/api/subscriptions.api';
import type { Plan } from '@/api/plans.api';

const formatPKR = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  interval: BillingInterval;
  currentPlanName?: string;
}

export function PlanConfirmationSheet({ visible, onClose, plan, interval, currentPlanName }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: () => subscriptionsApi.start(plan!.id, interval),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      Toast.show({
        type: 'success',
        text1: data.reused ? 'Existing invoice opened' : 'Invoice ready',
        text2: 'Ab payment karein',
      });
      onClose();
      router.push(`/billing/invoice/${data.invoice.id}`);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Kuch ghalat ho gaya',
      });
    },
  });

  if (!plan) return null;

  const amount =
    interval === 'MONTHLY' ? plan.priceMonthly :
    interval === 'QUARTERLY' ? plan.priceQuarterly : plan.priceYearly;

  const intervalLabel = {
    MONTHLY: 'monthly',
    QUARTERLY: '3 months',
    YEARLY: 'yearly',
  }[interval];

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startMutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white dark:bg-neutral-900 rounded-t-3xl"
          style={{ shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 }}
        >
          <SafeAreaView edges={['bottom']}>
            {/* Handle bar */}
            <View className="items-center pt-3 pb-2">
              <View className="h-1 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </View>

            {/* Header */}
            <View className="px-5 pb-3 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                Plan Confirm Karein
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={18} color="#737373" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[70%]" showsVerticalScrollIndicator={false}>
              <View className="px-5 pb-2">
                {/* Plan card */}
                <View
                  className="rounded-2xl p-5 mb-4"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
                      <Sparkles size={24} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                        Selected Plan
                      </Text>
                      <Text className="text-2xl font-extrabold text-white">{plan.name}</Text>
                    </View>
                  </View>
                  <View className="bg-white/15 rounded-xl p-3">
                    <View className="flex-row items-baseline gap-2">
                      <Text className="text-3xl font-extrabold text-white">
                        {formatPKR(amount)}
                      </Text>
                      <Text className="text-sm text-white/80">/ {intervalLabel}</Text>
                    </View>
                  </View>
                </View>

                {/* Important notice */}
                <View className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 p-4 mb-4">
                  <View className="flex-row items-start gap-2">
                    <AlertCircle size={18} color="#b45309" />
                    <View className="flex-1">
                      <Text className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                        Payment ke baad activate hoga
                      </Text>
                      <Text className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-5">
                        Aap ka current{' '}
                        <Text className="font-bold">{currentPlanName || 'plan'}</Text>{' '}
                        chalta rahega jab tak aap payment confirm nahi karte. Invoice
                        ban jayegi, phir aap Stripe ya manual transfer se pay kar sakte hain.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* What you get */}
                <View className="mb-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Aap ko Yeh Milega
                  </Text>
                  <View className="gap-2">
                    <BenefitRow text={`${plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts} Products`} />
                    <BenefitRow text={`${plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Team Members`} />
                    <BenefitRow text={`${plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop${plan.maxShops > 1 ? 's' : ''}`} />
                    {plan.featureMultiShop && <BenefitRow text="Multi-Shop Management" />}
                    {plan.featureLoyalty && <BenefitRow text="Loyalty Points" />}
                    {plan.featureProfitReport && <BenefitRow text="Profit Reports" />}
                    {plan.featureSupport24x7 && <BenefitRow text="24/7 Priority Support" />}
                  </View>
                </View>

                {/* Trust badges */}
                <View className="flex-row gap-2 mb-4">
                  <View className="flex-1 flex-row items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-2.5">
                    <Shield size={14} color="#16a34a" />
                    <Text className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex-1">
                      Secure SSL
                    </Text>
                  </View>
                  <View className="flex-1 flex-row items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-2.5">
                    <Calendar size={14} color="#16a34a" />
                    <Text className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex-1">
                      Cancel Anytime
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View className="px-5 pt-3 pb-2 border-t border-neutral-100 dark:border-neutral-800 gap-2">
              <Pressable
                onPress={handleConfirm}
                disabled={startMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: startMutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Text className="text-white font-extrabold text-base">
                  {startMutation.isPending ? 'Banaya jaa raha...' : `Continue — ${formatPKR(amount)}`}
                </Text>
                {!startMutation.isPending && <ArrowRight size={18} color="#ffffff" />}
              </Pressable>
              <Pressable
                onPress={onClose}
                className="h-12 rounded-2xl items-center justify-center bg-neutral-100 dark:bg-neutral-800 active:opacity-70"
              >
                <Text className="font-bold text-neutral-700 dark:text-neutral-300">Cancel</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
        <Check size={12} color="#16a34a" />
      </View>
      <Text className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">{text}</Text>
    </View>
  );
}
