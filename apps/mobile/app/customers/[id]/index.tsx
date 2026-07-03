import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, RefreshControl, Linking, Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft, Edit3, Crown, Phone, Mail, MapPin, MessageCircle,
  Receipt, Wallet, Star, ShoppingBag, TrendingUp, ArrowRight,
  Calendar, FileText, ArrowUpFromLine, ArrowDownToLine, Cake,
  Trash2, Copy, Download, History, Award, Smartphone, Sparkles,
} from 'lucide-react-native';
import { customersApi } from '@/api/customers.api';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { formatPKRFull, formatPKR } from '@/lib/format';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

type Tab = 'overview' | 'mobile';

export default function CustomerDetailScreen() {
  const { id } = useParamsFallback();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { features } = useBusinessFeatures();
  const hasMobile = features?.imei === true;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const { data: customer, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: !!id,
  });

  const toggleVipMutation = useMutation({
    mutationFn: () => customersApi.toggleVip(id!),
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: data.isVip ? 'Now VIP customer' : 'VIP removed',
      });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => customersApi.remove(id!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Customer deleted' });
      router.replace('/(tabs)/customers');
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Delete fail' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!customer) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const openWhatsApp = () => {
    if (!customer.phone) {
      Toast.show({ type: 'error', text1: 'Phone nahi hai' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phone = customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
      Linking.openURL(`https://wa.me/${phone}`);
    });
  };

  const openCall = () => {
    if (!customer.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${customer.phone}`);
  };

  const openEmail = () => {
    if (!customer.email) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${customer.email}`);
  };

  const handleCopy = async () => {
    const text = [
      `Name: ${customer.name}`,
      customer.phone && `Phone: ${customer.phone}`,
      customer.email && `Email: ${customer.email}`,
      customer.city && `City: ${customer.city}${customer.area ? `, ${customer.area}` : ''}`,
      customer.balance > 0 && `Khata: ${formatPKRFull(customer.balance)}`,
    ].filter(Boolean).join('\n');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Share.share({ message: text });
    } catch {
      Toast.show({ type: 'success', text1: 'Details copied' });
    }
  };

  const exportLedgerCSV = async () => {
    if (customer.ledgers.length === 0) {
      Toast.show({ type: 'error', text1: 'No transactions to export' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Note'];
    const rows = customer.ledgers.map((l: any) => [
      new Date(l.createdAt).toLocaleString('en-PK'),
      l.type.replace(/_/g, ' '),
      l.amount.toFixed(2),
      l.balanceAfter.toFixed(2),
      l.reference || '',
      l.note || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');

    try {
      const fileName = `${customer.name.replace(/\s+/g, '-')}-ledger.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Ledger',
        });
      } else {
        Toast.show({ type: 'success', text1: `Saved to ${fileUri}` });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Export failed' });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer?',
      `${customer.name} ko permanently delete karein? Yeh action undo nahi ho sakta.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
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
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Customer Profile</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
            {customer.name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/customers/${id}/edit` as any)}
          className="h-11 w-11 rounded-2xl bg-blue-600 items-center justify-center"
        >
          <Edit3 size={18} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{
          backgroundColor: customer.isVip ? '#f59e0b' : '#1e40af',
          shadowColor: customer.isVip ? '#f59e0b' : '#1e40af',
          shadowOpacity: 0.3, shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 }, elevation: 10,
        }}>
          <View className="flex-row items-center gap-4">
            <View className="relative">
              {customer.avatarUrl ? (
                <Image
                  source={{ uri: customer.avatarUrl }}
                  className="h-24 w-24 rounded-3xl"
                  style={{ borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' }}
                />
              ) : (
                <View
                  className="h-24 w-24 rounded-3xl items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  <Text className="text-4xl font-extrabold text-white">
                    {customer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {customer.isVip && (
                <View
                  className="absolute -top-1 -right-1 h-9 w-9 rounded-full items-center justify-center border-4"
                  style={{ backgroundColor: '#fbbf24', borderColor: '#f59e0b' }}
                >
                  <Crown size={16} color="#ffffff" />
                </View>
              )}
            </View>

            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-2xl font-extrabold text-white" numberOfLines={1}>
                  {customer.name}
                </Text>
                {!customer.isActive && (
                  <View className="bg-white/20 px-2 py-0.5 rounded-md">
                    <Text className="text-[9px] font-extrabold text-white">INACTIVE</Text>
                  </View>
                )}
              </View>
              {customer.isVip && (
                <View className="self-start flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-white/20">
                  <Crown size={10} color="#ffffff" />
                  <Text className="text-[10px] font-extrabold text-white">VIP Customer</Text>
                </View>
              )}
              <View className="mt-2 gap-1">
                {customer.phone && (
                  <View className="flex-row items-center gap-1">
                    <Phone size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80 font-bold">{customer.phone}</Text>
                  </View>
                )}
                {customer.email && (
                  <View className="flex-row items-center gap-1">
                    <Mail size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80" numberOfLines={1}>{customer.email}</Text>
                  </View>
                )}
                {customer.city && (
                  <View className="flex-row items-center gap-1">
                    <MapPin size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80" numberOfLines={1}>
                      {customer.city}{customer.area && `, ${customer.area}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2 mt-4 flex-wrap">
            {customer.phone && (
              <Pressable
                onPress={openCall}
                className="flex-1 min-w-[100px] flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/20 active:bg-white/30"
              >
                <Phone size={14} color="#ffffff" />
                <Text className="text-white font-bold text-xs">Call</Text>
              </Pressable>
            )}
            {customer.phone && (
              <Pressable
                onPress={openWhatsApp}
                className="flex-1 min-w-[100px] flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-80"
                style={{ backgroundColor: '#22c55e' }}
              >
                <MessageCircle size={14} color="#ffffff" />
                <Text className="text-white font-bold text-xs">WhatsApp</Text>
              </Pressable>
            )}
            {customer.email && (
              <Pressable
                onPress={openEmail}
                className="flex-1 min-w-[100px] flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/20 active:bg-white/30"
              >
                <Mail size={14} color="#ffffff" />
                <Text className="text-white font-bold text-xs">Email</Text>
              </Pressable>
            )}
          </View>

          <View className="flex-row gap-2 mt-2">
            <Pressable
              onPress={() => toggleVipMutation.mutate()}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20"
            >
              <Crown size={13} color={customer.isVip ? '#fbbf24' : '#ffffff'} fill={customer.isVip ? '#fbbf24' : 'none'} />
              <Text className="text-white font-bold text-[11px]">
                {customer.isVip ? 'Remove VIP' : 'Make VIP'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCopy}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20"
            >
              <Copy size={13} color="#ffffff" />
              <Text className="text-white font-bold text-[11px]">Share</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }}
            >
              <Trash2 size={13} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Tabs (if mobile industry) */}
        {hasMobile && (
          <View className="px-5 mb-3 flex-row gap-2">
            {[
              { key: 'overview' as Tab, label: 'Overview', icon: FileText },
              { key: 'mobile' as Tab, label: 'Mobile History', icon: Smartphone },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(t.key);
                  }}
                  className="flex-1 h-10 rounded-xl border-2 flex-row items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: active ? '#2563eb' : '#ffffff',
                    borderColor: active ? '#2563eb' : '#e5e7eb',
                  }}
                >
                  <Icon size={14} color={active ? '#ffffff' : '#2563eb'} />
                  <Text
                    className="text-xs font-extrabold"
                    style={{ color: active ? '#ffffff' : '#374151' }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {activeTab === 'mobile' && hasMobile ? (
          <View className="px-5">
            <View className="rounded-2xl bg-white border-2 border-blue-200 p-8 items-center">
              <Smartphone size={40} color="#2563eb" />
              <Text className="mt-3 text-base font-bold text-neutral-900">Mobile History</Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                Repair tickets, EMI plans, used phone trade-ins yahan
              </Text>
              <View className="flex-row gap-2 mt-4">
                <Pressable
                  onPress={() => router.push(`/industries/mobile/repairs?customerId=${customer.id}` as any)}
                  className="h-10 px-4 rounded-xl bg-orange-100 flex-row items-center gap-1.5"
                >
                  <Text className="text-orange-700 font-bold text-xs">Repairs</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/industries/mobile/emi?customerId=${customer.id}` as any)}
                  className="h-10 px-4 rounded-xl bg-violet-100 flex-row items-center gap-1.5"
                >
                  <Text className="text-violet-700 font-bold text-xs">EMI</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Stats grid */}
            <View className="px-5 mb-4">
              <View className="flex-row flex-wrap -mx-1.5">
                <View className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl bg-white border border-neutral-200 p-4">
                    <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                      <ShoppingBag size={18} color="#16a34a" />
                    </View>
                    <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                      Total Sales
                    </Text>
                    <Text className="text-xl font-extrabold text-neutral-900 mt-0.5">
                      {customer.stats.totalSales}
                    </Text>
                  </View>
                </View>
                <View className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl bg-white border border-neutral-200 p-4">
                    <View className="h-10 w-10 rounded-xl bg-blue-100 items-center justify-center">
                      <TrendingUp size={18} color="#2563eb" />
                    </View>
                    <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                      Total Spent
                    </Text>
                    <Text className="text-xl font-extrabold text-emerald-700 mt-0.5" numberOfLines={1}>
                      {formatPKR(customer.stats.totalSpent)}
                    </Text>
                    <Text className="text-[10px] text-neutral-500 font-bold mt-0.5">
                      AOV: {formatPKR(customer.stats.averageSale)}
                    </Text>
                  </View>
                </View>
                <View className="w-1/2 px-1.5 mb-3">
                  <View
                    className="rounded-2xl border-2 p-4"
                    style={{
                      backgroundColor: customer.balance > 0 ? '#fef2f2' : '#ffffff',
                      borderColor: customer.balance > 0 ? '#fca5a5' : '#e5e7eb',
                    }}
                  >
                    <View
                      className="h-10 w-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: customer.balance > 0 ? '#fee2e2' : '#f3f4f6' }}
                    >
                      <Wallet size={18} color={customer.balance > 0 ? '#dc2626' : '#6b7280'} />
                    </View>
                    <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                      Khata
                    </Text>
                    <Text
                      className="text-xl font-extrabold mt-0.5"
                      style={{ color: customer.balance > 0 ? '#b91c1c' : '#0f172a' }}
                      numberOfLines={1}
                    >
                      {formatPKR(customer.balance)}
                    </Text>
                    {customer.creditLimit > 0 && (
                      <Text className="text-[10px] text-neutral-500 font-bold mt-0.5">
                        Limit: {formatPKR(customer.creditLimit)}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl p-4" style={{ backgroundColor: '#f59e0b' }}>
                    <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center">
                      <Star size={18} color="#ffffff" fill="#ffffff" />
                    </View>
                    <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                      Loyalty
                    </Text>
                    <Text className="text-xl font-extrabold text-white mt-0.5">
                      {customer.loyaltyPoints.toLocaleString()}
                    </Text>
                    <Text className="text-[10px] text-white/70 font-bold mt-0.5">
                      points earned
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Personal Info */}
            {(customer.cnic || customer.dateOfBirth || customer.gender) && (
              <View className="px-5 mb-4">
                <View className="rounded-2xl bg-white border border-neutral-200 p-4">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
                    Personal Info
                  </Text>
                  <View className="gap-2">
                    {customer.cnic && (
                      <View className="flex-row items-center gap-2">
                        <FileText size={13} color="#9ca3af" />
                        <Text className="text-xs text-neutral-500">CNIC:</Text>
                        <Text className="text-xs font-extrabold font-mono text-neutral-800 flex-1">
                          {customer.cnic}
                        </Text>
                      </View>
                    )}
                    {customer.dateOfBirth && (
                      <View className="flex-row items-center gap-2">
                        <Cake size={13} color="#9ca3af" />
                        <Text className="text-xs text-neutral-500">Birthday:</Text>
                        <Text className="text-xs font-extrabold text-neutral-800 flex-1">
                          {formatDate(customer.dateOfBirth)}
                        </Text>
                      </View>
                    )}
                    {customer.gender && (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-neutral-500">Gender:</Text>
                        <Text className="text-xs font-extrabold text-neutral-800 flex-1 capitalize">
                          {customer.gender.toLowerCase()}
                        </Text>
                      </View>
                    )}
                    {customer.address && (
                      <View className="flex-row items-start gap-2">
                        <MapPin size={13} color="#9ca3af" style={{ marginTop: 2 }} />
                        <Text className="text-xs text-neutral-500">Address:</Text>
                        <Text className="text-xs font-bold text-neutral-800 flex-1">
                          {customer.address}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-2">
                      <Calendar size={13} color="#9ca3af" />
                      <Text className="text-xs text-neutral-500">Since:</Text>
                      <Text className="text-xs font-bold text-neutral-800 flex-1">
                        {formatDate(customer.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Recent Sales */}
            <View className="px-5 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Receipt size={16} color="#16a34a" />
                  <Text className="text-base font-extrabold text-neutral-900">Recent Sales</Text>
                </View>
                <Text className="text-xs text-neutral-500 font-bold">
                  {customer._count.sales} total
                </Text>
              </View>
              {customer.sales.length === 0 ? (
                <View className="rounded-2xl bg-white border border-neutral-200 p-6 items-center">
                  <Receipt size={32} color="#d1d5db" />
                  <Text className="mt-2 text-sm text-neutral-500 font-bold">Abhi koi sale nahi</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {customer.sales.slice(0, 5).map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        router.push(`/sales/${s.id}` as any);
                      }}
                      className="rounded-2xl bg-white border border-neutral-200 p-3 active:opacity-70"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                          <Receipt size={16} color="#16a34a" />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="font-extrabold text-sm text-neutral-900 font-mono">
                            {s.saleNumber}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-0.5">
                            <Text className="text-[10px] text-neutral-500">
                              {formatRelative(s.soldAt)}
                            </Text>
                            <Text className="text-[10px] text-neutral-400">•</Text>
                            <Text className="text-[10px] text-neutral-500 font-bold">
                              {s.paymentMethod}
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-extrabold text-emerald-700">
                            {formatPKR(s.total)}
                          </Text>
                          {s.creditAmount > 0 && (
                            <Text className="text-[10px] text-rose-600 font-bold mt-0.5">
                              Credit: {formatPKR(s.creditAmount)}
                            </Text>
                          )}
                        </View>
                        <ArrowRight size={14} color="#9ca3af" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Khata Ledger */}
            <View className="px-5 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Wallet size={16} color="#dc2626" />
                  <Text className="text-base font-extrabold text-neutral-900">Khata Ledger</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-neutral-500 font-bold">
                    {customer._count.ledgers} entries
                  </Text>
                  {customer.ledgers.length > 0 && (
                    <Pressable onPress={exportLedgerCSV} hitSlop={6}>
                      <Download size={14} color="#2563eb" />
                    </Pressable>
                  )}
                </View>
              </View>
              {customer.ledgers.length === 0 ? (
                <View className="rounded-2xl bg-white border border-neutral-200 p-6 items-center">
                  <History size={32} color="#d1d5db" />
                  <Text className="mt-2 text-sm text-neutral-500 font-bold">No transactions</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {customer.ledgers.slice(0, 8).map((l: any) => {
                    const isCredit = l.amount > 0;
                    const Icon = isCredit ? ArrowUpFromLine : ArrowDownToLine;
                    return (
                      <View
                        key={l.id}
                        className="rounded-2xl bg-white border border-neutral-200 p-3"
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className="h-10 w-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: isCredit ? '#fee2e2' : '#dcfce7' }}
                          >
                            <Icon size={16} color={isCredit ? '#dc2626' : '#16a34a'} />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text className="text-sm font-extrabold text-neutral-900">
                              {l.type.replace(/_/g, ' ')}
                            </Text>
                            {(l.note || l.reference) && (
                              <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={1}>
                                {l.note || l.reference}
                              </Text>
                            )}
                            <Text className="text-[9px] text-neutral-400 font-bold mt-0.5">
                              {formatRelative(l.createdAt)}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              className="text-sm font-extrabold"
                              style={{ color: isCredit ? '#b91c1c' : '#15803d' }}
                            >
                              {isCredit ? '+' : ''}{formatPKR(l.amount)}
                            </Text>
                            <Text className="text-[10px] text-neutral-500 font-bold">
                              Bal: {formatPKR(l.balanceAfter)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Loyalty Transactions */}
            {customer.loyaltyTransactions && customer.loyaltyTransactions.length > 0 && (
              <View className="px-5 mb-4">
                <View className="rounded-2xl bg-amber-50 border-2 border-amber-200 overflow-hidden">
                  <View className="px-4 py-3 border-b border-amber-200 flex-row items-center gap-2">
                    <Award size={14} color="#b45309" />
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                      Loyalty Activity ({customer.loyaltyTransactions.length})
                    </Text>
                  </View>
                  {customer.loyaltyTransactions.slice(0, 5).map((t: any, idx: number) => (
                    <View
                      key={t.id}
                      className={`px-4 py-2.5 flex-row items-center justify-between ${
                        idx !== customer.loyaltyTransactions.length - 1 ? 'border-b border-amber-100' : ''
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="text-xs font-extrabold text-neutral-900">
                          {t.type.replace(/_/g, ' ')}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 mt-0.5">
                          {formatRelative(t.createdAt)}
                          {t.note && ` • ${t.note}`}
                        </Text>
                      </View>
                      <Text
                        className="text-sm font-extrabold"
                        style={{ color: t.points >= 0 ? '#15803d' : '#b91c1c' }}
                      >
                        {t.points >= 0 ? '+' : ''}{t.points} pts
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Notes */}
            {customer.notes && (
              <View className="px-5 mb-4">
                <View className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <FileText size={14} color="#b45309" />
                    <Text className="text-xs font-extrabold uppercase text-amber-800 tracking-wider">
                      Notes
                    </Text>
                  </View>
                  <Text className="text-sm text-amber-900 font-bold leading-relaxed">
                    {customer.notes}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function useParamsFallback() {
  const params = useLocalSearchParams<{ id: string }>();
  return params;
}
