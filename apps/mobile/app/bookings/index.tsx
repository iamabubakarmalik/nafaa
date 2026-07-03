import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, BookmarkPlus, Search, X, Plus, Calendar, Clock,
  User, Phone, Package, DollarSign, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Wallet, Hourglass, Zap,
  ChevronRight, Sparkles,
} from 'lucide-react-native';
import { bookingsApi, type BookingStatus } from '@/api/bookings.api';
import { formatPKRFull } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatShortDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

const statusConfig: Record<BookingStatus, {
  label: string; color: string; bg: string; icon: any;
}> = {
  PENDING:          { label: 'Pending',      color: '#64748b', bg: '#f1f5f9', icon: Hourglass },
  ADVANCE_PAID:     { label: 'Advance',      color: '#f59e0b', bg: '#fef3c7', icon: Wallet },
  READY_FOR_PICKUP: { label: 'Ready',        color: '#3b82f6', bg: '#dbeafe', icon: Zap },
  CONVERTED:        { label: 'Converted',    color: '#10b981', bg: '#dcfce7', icon: CheckCircle2 },
  CANCELLED:        { label: 'Cancelled',    color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  EXPIRED:          { label: 'Expired',      color: '#dc2626', bg: '#fecaca', icon: AlertTriangle },
};

type StatusFilter = 'all' | BookingStatus;

export default function BookingsListScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['bookings-summary'],
    queryFn: () => bookingsApi.summary(),
  });

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ['bookings-list', statusFilter],
    queryFn: () =>
      bookingsApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase().trim();
    return bookings.filter(
      (b) =>
        b.bookingNumber.toLowerCase().includes(q) ||
        b.customer?.name.toLowerCase().includes(q) ||
        b.customer?.phone?.toLowerCase().includes(q),
    );
  }, [bookings, search]);

  const activeCount =
    (summary?.counts.pending ?? 0) +
    (summary?.counts.advancePaid ?? 0) +
    (summary?.counts.ready ?? 0);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Bookings
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {activeCount} active • {summary?.counts.converted ?? 0} converted
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/bookings/new')}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#2563eb',
            shadowColor: '#2563eb',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">New</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: '#1e40af' }}>
          <View className="flex-row items-center gap-2 mb-2">
            <Sparkles size={14} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs uppercase tracking-wider text-white/80 font-extrabold">
              Advance & Booking System
            </Text>
          </View>
          <Text className="text-white text-2xl font-extrabold">
            Customer Advances
          </Text>
          <Text className="text-white/80 text-xs mt-1">
            Items reserve karo, delivery pe complete
          </Text>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3.5">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                  <BookmarkPlus size={22} color="#2563eb" />
                </View>
                <Text className="mt-3 text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                  Active
                </Text>
                <Text className="mt-0.5 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {activeCount}
                </Text>
                <Text className="text-[10px] text-neutral-500 mt-0.5">
                  {summary?.counts.pending ?? 0} pending
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View
                className="rounded-2xl border-2 p-3.5"
                style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
              >
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                  <Wallet size={22} color="#ffffff" />
                </View>
                <Text className="mt-3 text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">
                  Advance Held
                </Text>
                <Text className="mt-0.5 text-lg font-extrabold text-emerald-900" numberOfLines={1}>
                  {formatPKRFull(summary?.totalAdvanceHeld ?? 0)}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white border border-amber-200 p-3.5">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
                  <DollarSign size={22} color="#d97706" />
                </View>
                <Text className="mt-3 text-[10px] text-amber-700 font-extrabold uppercase tracking-wider">
                  Balance Due
                </Text>
                <Text className="mt-0.5 text-lg font-extrabold text-amber-900" numberOfLines={1}>
                  {formatPKRFull(summary?.totalBalanceDue ?? 0)}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="rounded-2xl bg-white border border-rose-200 p-3.5">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
                  <AlertTriangle size={22} color="#dc2626" />
                </View>
                <Text className="mt-3 text-[10px] text-rose-700 font-extrabold uppercase tracking-wider">
                  Expiring Soon
                </Text>
                <Text className="mt-0.5 text-2xl font-extrabold text-rose-900">
                  {summary?.expiringSoon ?? 0}
                </Text>
                <Text className="text-[10px] text-rose-600 mt-0.5">Next 3 days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-3"
        >
          {[
            { key: 'all' as StatusFilter, label: 'All', count: bookings.length, color: '#0f172a' },
            { key: 'PENDING' as StatusFilter, label: 'Pending', count: summary?.counts.pending ?? 0, color: '#64748b' },
            { key: 'ADVANCE_PAID' as StatusFilter, label: 'Advance', count: summary?.counts.advancePaid ?? 0, color: '#f59e0b' },
            { key: 'READY_FOR_PICKUP' as StatusFilter, label: 'Ready', count: summary?.counts.ready ?? 0, color: '#3b82f6' },
            { key: 'CONVERTED' as StatusFilter, label: 'Converted', count: summary?.counts.converted ?? 0, color: '#10b981' },
            { key: 'CANCELLED' as StatusFilter, label: 'Cancelled', count: summary?.counts.cancelled ?? 0, color: '#ef4444' },
          ].map((f) => {
            const active = statusFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(f.key);
                }}
                className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                style={{
                  backgroundColor: active ? f.color : '#ffffff',
                  borderColor: active ? f.color : '#e5e7eb',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {f.label}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {f.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search booking #, customer..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-sm text-neutral-900"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={12}
                className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
              >
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {/* List */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-blue-100 items-center justify-center">
                <BookmarkPlus size={36} color="#2563eb" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {search || statusFilter !== 'all' ? 'No bookings match' : 'Abhi koi booking nahi'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                {search || statusFilter !== 'all' ? 'Try different filter' : 'Customer se advance le kar booking banao'}
              </Text>
              <Pressable
                onPress={() => router.push('/bookings/new')}
                className="mt-4 h-11 px-5 rounded-xl flex-row items-center gap-2"
                style={{ backgroundColor: '#2563eb' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">New Booking</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((booking) => {
                const cfg = statusConfig[booking.status];
                const StatusIcon = cfg.icon;
                const daysUntilPickup = booking.expectedPickupAt
                  ? Math.ceil(
                      (new Date(booking.expectedPickupAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;

                return (
                  <Pressable
                    key={booking.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/bookings/${booking.id}`);
                    }}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-3 active:opacity-70"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center shrink-0"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <StatusIcon size={22} color={cfg.color} />
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold text-neutral-900 dark:text-white font-mono text-sm">
                            {booking.bookingNumber}
                          </Text>
                          <View
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text
                              className="text-[9px] font-extrabold uppercase"
                              style={{ color: cfg.color }}
                            >
                              {cfg.label}
                            </Text>
                          </View>
                          {daysUntilPickup !== null &&
                            daysUntilPickup <= 3 &&
                            daysUntilPickup >= 0 &&
                            booking.status !== 'CONVERTED' &&
                            booking.status !== 'CANCELLED' && (
                              <View className="px-1.5 py-0.5 rounded flex-row items-center gap-0.5 bg-amber-100 border border-amber-300">
                                <Clock size={9} color="#b45309" />
                                <Text className="text-[9px] font-extrabold text-amber-800">
                                  {daysUntilPickup === 0 ? 'Today' : `${daysUntilPickup}d`}
                                </Text>
                              </View>
                            )}
                        </View>

                        <View className="flex-row items-center gap-1 mt-1">
                          <User size={11} color="#8b5cf6" />
                          <Text className="text-xs font-bold text-neutral-800" numberOfLines={1}>
                            {booking.customer?.name}
                          </Text>
                          {booking.customer?.phone && (
                            <>
                              <Text className="text-xs text-neutral-400">•</Text>
                              <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                                {booking.customer.phone}
                              </Text>
                            </>
                          )}
                        </View>

                        <View className="flex-row items-center gap-3 mt-1 flex-wrap">
                          <View className="flex-row items-center gap-1">
                            <Calendar size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {formatShortDate(booking.createdAt)}
                            </Text>
                          </View>
                          {booking.expectedPickupAt && (
                            <View className="flex-row items-center gap-1">
                              <Clock size={10} color="#9ca3af" />
                              <Text className="text-[10px] text-neutral-500">
                                Pickup {formatShortDate(booking.expectedPickupAt)}
                              </Text>
                            </View>
                          )}
                          <View className="flex-row items-center gap-1">
                            <Package size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {booking._count?.items ?? booking.items?.length ?? 0} items
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="items-end shrink-0">
                        <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
                          {formatPKRFull(booking.total)}
                        </Text>
                        {booking.totalPaid > 0 && (
                          <Text className="text-[10px] text-emerald-700 font-extrabold">
                            Paid: {formatPKRFull(booking.totalPaid)}
                          </Text>
                        )}
                        {booking.balanceDue > 0 && (
                          <Text className="text-[10px] text-amber-700 font-extrabold">
                            Due: {formatPKRFull(booking.balanceDue)}
                          </Text>
                        )}
                        {booking.totalRefunded > 0 && (
                          <Text className="text-[10px] text-rose-700 font-extrabold">
                            Refunded: {formatPKRFull(booking.totalRefunded)}
                          </Text>
                        )}
                        <ChevronRight size={16} color="#9ca3af" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
