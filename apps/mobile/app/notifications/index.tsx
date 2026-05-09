import { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  Package,
  CreditCard,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { notificationsApi } from '@/api/notifications.api';
import { formatRelative } from '@/lib/format';

const typeIcons: Record<string, any> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  NEW_SALE: ShoppingBag,
  LOW_STOCK: Package,
  PAYMENT_RECEIVED: CreditCard,
  PAYMENT_APPROVED: CheckCircle2,
  PAYMENT_REJECTED: XCircle,
};

const typeColors: Record<string, string> = {
  INFO: '#2563eb',
  SUCCESS: '#16a34a',
  WARNING: '#f59e0b',
  ERROR: '#dc2626',
  NEW_SALE: '#16a34a',
  LOW_STOCK: '#f59e0b',
  PAYMENT_RECEIVED: '#16a34a',
  PAYMENT_APPROVED: '#16a34a',
  PAYMENT_REJECTED: '#dc2626',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const unreadCount = data?.items?.filter((n) => !n.isRead).length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Notifications
          </Text>
          <Text className="text-xs text-neutral-500">{unreadCount} unread</Text>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => markAllMutation.mutate()}
            className="px-3 py-2 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex-row items-center gap-1 active:opacity-70"
          >
            <CheckCheck size={14} color="#16a34a" />
            <Text className="text-brand-700 dark:text-brand-300 text-xs font-bold">
              Mark all
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Bell size={48} color="#d1d5db" />
            <Text className="mt-4 text-base font-semibold text-neutral-700 dark:text-neutral-300">
              No notifications yet
            </Text>
            <Text className="mt-1 text-sm text-neutral-500 text-center px-10">
              You'll be notified about sales, alerts, and updates
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          const Icon = typeIcons[item.type] || Info;
          const color = typeColors[item.type] || '#6b7280';

          return (
            <Pressable
              onPress={() => {
                if (!item.isRead) markReadMutation.mutate(item.id);
                if (item.link) router.push(item.link as any);
              }}
              className="active:opacity-70"
            >
              <Card
                variant="outline"
                className={`p-3 ${!item.isRead ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
              >
                <View className="flex-row gap-3">
                  <View
                    className="h-11 w-11 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: color + '20' }}
                  >
                    <Icon size={20} color={color} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="font-bold text-neutral-900 dark:text-white flex-1" numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.isRead && <View className="h-2 w-2 rounded-full bg-brand-500 mt-1.5" />}
                    </View>
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5" numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text className="text-xs text-neutral-400 mt-1">
                      {formatRelative(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
