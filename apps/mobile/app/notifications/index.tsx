import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Bell, CheckCheck, Info, CheckCircle2, AlertTriangle,
  XCircle, ShoppingBag, Package, CreditCard, Trash2, Sparkles,
  RotateCcw, Users, ArrowRightLeft, Wallet, Receipt, Crown, ChevronRight,
  BellOff,
} from 'lucide-react-native';
import { notificationsApi, type NotificationType } from '@/api/notifications.api';
import { formatRelative } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const typeConfig: Record<
  NotificationType,
  { icon: any; color: string; bg: string; label: string }
> = {
  INFO: { icon: Info, color: '#2563eb', bg: '#dbeafe', label: 'Info' },
  SUCCESS: { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7', label: 'Success' },
  WARNING: { icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7', label: 'Warning' },
  ERROR: { icon: XCircle, color: '#dc2626', bg: '#fee2e2', label: 'Error' },
  NEW_SALE: { icon: ShoppingBag, color: '#16a34a', bg: '#dcfce7', label: 'New Sale' },
  LOW_STOCK: { icon: Package, color: '#f59e0b', bg: '#fef3c7', label: 'Low Stock' },
  OUT_OF_STOCK: { icon: Package, color: '#dc2626', bg: '#fee2e2', label: 'Out of Stock' },
  PAYMENT_RECEIVED: { icon: CreditCard, color: '#16a34a', bg: '#dcfce7', label: 'Payment' },
  PAYMENT_APPROVED: { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7', label: 'Approved' },
  PAYMENT_REJECTED: { icon: XCircle, color: '#dc2626', bg: '#fee2e2', label: 'Rejected' },
  RETURN_PROCESSED: { icon: RotateCcw, color: '#f97316', bg: '#ffedd5', label: 'Return' },
  NEW_CUSTOMER: { icon: Users, color: '#8b5cf6', bg: '#ede9fe', label: 'Customer' },
  STOCK_TRANSFER: { icon: ArrowRightLeft, color: '#0891b2', bg: '#cffafe', label: 'Transfer' },
  EXPENSE_ADDED: { icon: Wallet, color: '#dc2626', bg: '#fee2e2', label: 'Expense' },
  INVOICE_DUE: { icon: Receipt, color: '#f59e0b', bg: '#fef3c7', label: 'Invoice' },
  SUBSCRIPTION_EXPIRING: { icon: Crown, color: '#f59e0b', bg: '#fef3c7', label: 'Plan' },
  SYSTEM: { icon: Bell, color: '#737373', bg: '#f3f4f6', label: 'System' },
};

type Filter = 'all' | 'unread';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        return await notificationsApi.list({ limit: 100 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.isRead);
    return items;
  }, [items, filter]);

  const unreadCount = items.filter((n) => !n.isRead).length;
  const readCount = items.length - unreadCount;

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ All marked as read' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePress = (item: any) => {
    Haptics.selectionAsync();
    if (!item.isRead) markReadMutation.mutate(item.id);
    if (item.link) {
      const link = String(item.link).startsWith('/') ? item.link : `/${item.link}`;
      router.push(link as any);
    }
  };

  const handleLongPress = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Notification',
      item.title,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(!item.isRead
          ? [
              {
                text: 'Mark as Read',
                onPress: () => markReadMutation.mutate(item.id),
              },
            ]
          : []),
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.notifications')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-xs text-neutral-500">
              {unreadCount} unread • {items.length} total
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              markAllMutation.mutate();
            }}
            className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <CheckCheck size={14} color="#ffffff" />
            <Text className="text-white font-bold text-xs">{t('auto.index.mark_all')}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Card */}
            <View className="px-5 mb-4">
              <View
                className="rounded-3xl p-5"
                style={{
                  backgroundColor: unreadCount > 0 ? '#f59e0b' : '#16a34a',
                  shadowColor: unreadCount > 0 ? '#f59e0b' : '#16a34a',
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 10,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                    {unreadCount > 0 ? (
                      <Bell size={28} color="#ffffff" />
                    ) : (
                      <CheckCircle2 size={28} color="#ffffff" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                      {unreadCount > 0 ? 'Pending Notifications' : 'All Caught Up'}
                    </Text>
                    <Text className="text-3xl font-extrabold text-white mt-0.5">
                      {unreadCount}
                    </Text>
                    <Text className="text-xs text-white/80 mt-0.5">
                      {unreadCount > 0
                        ? 'Tap karke padein'
                        : 'Koi unread notification nahi'}
                    </Text>
                  </View>
                </View>
                <View className="pt-3 mt-3 border-t border-white/20 flex-row items-center justify-around">
                  <View className="items-center">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.unread')}</Text>
                    <Text className="text-lg font-extrabold text-white mt-0.5">
                      {unreadCount}
                    </Text>
                  </View>
                  <View className="h-8 w-px bg-white/20" />
                  <View className="items-center">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.index.read')}</Text>
                    <Text className="text-lg font-extrabold text-white mt-0.5">
                      {readCount}
                    </Text>
                  </View>
                  <View className="h-8 w-px bg-white/20" />
                  <View className="items-center">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('auto.receipt.total')}</Text>
                    <Text className="text-lg font-extrabold text-white mt-0.5">
                      {items.length}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Filter Tabs */}
            <View className="px-5 mb-3 flex-row gap-2">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter('all');
                }}
                className="flex-1 h-10 rounded-xl items-center justify-center flex-row gap-1.5 border-2"
                style={{
                  backgroundColor: filter === 'all' ? '#16a34a' : '#ffffff',
                  borderColor: filter === 'all' ? '#16a34a' : '#e5e7eb',
                }}
              >
                <Bell size={14} color={filter === 'all' ? '#ffffff' : '#6b7280'} />
                <Text
                  className="text-sm font-bold"
                  style={{ color: filter === 'all' ? '#ffffff' : '#374151' }}
                >
                  All ({items.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter('unread');
                }}
                className="flex-1 h-10 rounded-xl items-center justify-center flex-row gap-1.5 border-2"
                style={{
                  backgroundColor: filter === 'unread' ? '#f59e0b' : '#ffffff',
                  borderColor: filter === 'unread' ? '#f59e0b' : '#e5e7eb',
                }}
              >
                <Sparkles size={14} color={filter === 'unread' ? '#ffffff' : '#6b7280'} />
                <Text
                  className="text-sm font-bold"
                  style={{ color: filter === 'unread' ? '#ffffff' : '#374151' }}
                >
                  Unread ({unreadCount})
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-20 px-5">
              <Bell size={36} color="#9ca3af" />
              <Text className="mt-3 text-neutral-500">{t('auto.section.loading')}</Text>
            </View>
          ) : (
            <View className="items-center py-20 px-5">
              <View className="h-20 w-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
                <BellOff size={36} color="#9ca3af" />
              </View>
              <Text className="mt-4 text-base font-extrabold text-neutral-700 dark:text-neutral-300">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center px-10">
                {filter === 'unread'
                  ? 'Sab notifications padh chuke hain ✅'
                  : 'Sales, alerts aur updates ka notification yahan dikhega'}
              </Text>
              {filter === 'unread' && (
                <Pressable
                  onPress={() => setFilter('all')}
                  className="mt-4 h-10 px-5 rounded-xl"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <Text className="text-white font-bold text-sm leading-10">{t('auto.index.view_all')}</Text>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item }) => {
          const cfg = typeConfig[item.type] || typeConfig.SYSTEM;
          const Icon = cfg.icon;

          return (
            <View className="px-5 mb-2">
              <Pressable
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item)}
                className="rounded-2xl border-2 active:opacity-70"
                style={{
                  backgroundColor: item.isRead ? '#ffffff' : `${cfg.color}08`,
                  borderColor: item.isRead ? '#e5e7eb' : `${cfg.color}40`,
                  shadowColor: '#000',
                  shadowOpacity: item.isRead ? 0.03 : 0.06,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: item.isRead ? 1 : 2,
                }}
              >
                <View className="p-3.5 flex-row gap-3">
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <Icon size={22} color={cfg.color} />
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <View
                            className="px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text
                              className="text-[9px] font-extrabold uppercase tracking-wider"
                              style={{ color: cfg.color }}
                            >
                              {cfg.label}
                            </Text>
                          </View>
                          {!item.isRead && (
                            <View
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cfg.color }}
                            />
                          )}
                        </View>
                        <Text
                          className="font-extrabold text-neutral-900 dark:text-white mt-1"
                          numberOfLines={1}
                          style={{
                            fontWeight: item.isRead ? '600' : '800',
                          }}
                        >
                          {item.title}
                        </Text>
                      </View>
                      {item.link && <ChevronRight size={16} color="#9ca3af" />}
                    </View>

                    <Text
                      className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 leading-5"
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>

                    <View className="flex-row items-center justify-between mt-2">
                      <Text className="text-[10px] text-neutral-500 font-semibold">
                        {formatRelative(item.createdAt)}
                      </Text>
                      {!item.isRead && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(item.id);
                          }}
                          hitSlop={8}
                          className="px-2 py-1 rounded-md"
                          style={{ backgroundColor: cfg.bg }}
                        >
                          <Text
                            className="text-[10px] font-extrabold"
                            style={{ color: cfg.color }}
                          >{t('auto.index.mark_read')}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
