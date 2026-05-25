import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CreditCard, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { subscriptionsApi } from '@/api/subscriptions.api';

const formatPKR = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;

export function PendingUpgradeBanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pendingUpgrade, refetch } = useSubscriptionStatus();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.cancelPending(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Upgrade cancel ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      refetch();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Cancel fail' }),
  });

  if (!pendingUpgrade) return null;
  const { subscription, invoice } = pendingUpgrade;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/billing/invoice/${invoice.id}`);
      }}
      className="mx-4 my-2 rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 active:opacity-90"
    >
      <View className="p-3">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 rounded-xl bg-amber-200 dark:bg-amber-900/50 items-center justify-center">
            <Clock size={20} color="#b45309" />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Upgrade Pending
              </Text>
              <View className="h-1 w-1 rounded-full bg-amber-400" />
              <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {invoice.invoiceNumber}
              </Text>
            </View>
            <Text className="text-sm font-bold text-amber-900 dark:text-amber-100 mt-0.5">
              {subscription.plan.name} — {formatPKR(invoice.amountDue)}
            </Text>
            <Text className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              Pay karne ke baad plan activate hoga
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.selectionAsync();
              cancelMutation.mutate(subscription.id);
            }}
            hitSlop={8}
            className="h-7 w-7 rounded-full bg-amber-200 dark:bg-amber-900/50 items-center justify-center"
          >
            <X size={14} color="#b45309" />
          </Pressable>
        </View>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/billing/invoice/${invoice.id}`);
            }}
            className="flex-1 h-10 rounded-xl bg-amber-600 flex-row items-center justify-center gap-2 active:opacity-80"
          >
            <CreditCard size={14} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Pay Now</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
