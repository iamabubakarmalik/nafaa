import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Image, Modal, ScrollView,
  TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Search, Truck, Plus, Phone, MapPin, MessageCircle, Mail,
  X, Sparkles, ArrowUpDown, CheckCircle2, XCircle, AlertTriangle,
  TrendingUp, Wallet, CreditCard, Building2, Crown, Trash2,
  ShoppingBag, Activity,
} from 'lucide-react-native';
import { suppliersApi } from '@/api/suppliers.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull, formatPKR } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

type Filter = 'all' | 'active' | 'with-debt' | 'inactive';
type SortBy = 'newest' | 'name' | 'purchased-high' | 'purchased-low' | 'due-high';

const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest First',
  name: 'Name A-Z',
  'purchased-high': 'Most Purchased',
  'purchased-low': 'Least Purchased',
  'due-high': 'Highest Due',
};

export default function SuppliersScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showSort, setShowSort] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      try {
        return await suppliersApi.list({ search, page: 1, limit: 100 });
      } catch {
        return { items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: suppliersApi.remove,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Supplier deleted' });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Cannot delete' }),
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    let list = [...items];
    if (filter === 'active') list = list.filter((s: any) => s.isActive);
    else if (filter === 'inactive') list = list.filter((s: any) => !s.isActive);
    else if (filter === 'with-debt') list = list.filter((s: any) => s.outstandingDue > 0);

    return list.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'purchased-high': return (b.totalPurchased || 0) - (a.totalPurchased || 0);
        case 'purchased-low': return (a.totalPurchased || 0) - (b.totalPurchased || 0);
        case 'due-high': return (b.outstandingDue || 0) - (a.outstandingDue || 0);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [items, filter, sortBy]);

  const stats = useMemo(() => {
    const active = items.filter((s: any) => s.isActive).length;
    const withDebt = items.filter((s: any) => s.outstandingDue > 0).length;
    const totalPurchased = items.reduce((sum: number, s: any) => sum + (s.totalPurchased || 0), 0);
    const totalDue = items.reduce((sum: number, s: any) => sum + (s.outstandingDue || 0), 0);
    const vipCount = items.filter((s: any) => (s.totalPurchased || 0) > 100000).length;
    return { active, withDebt, totalPurchased, totalDue, vipCount };
  }, [items]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ═════ HERO HEADER ═════ */}
      <View className="mx-4 mt-3 rounded-3xl overflow-hidden" style={{
        backgroundColor: '#7c2d12',
        shadowColor: '#f97316',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }}>
        <View className="p-4">
          <View className="flex-row items-center gap-3 mb-3">
            <Pressable
              onPress={goBack}
              hitSlop={12}
              className="h-11 w-11 rounded-2xl bg-white/15 items-center justify-center"
              style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <ArrowLeft size={20} color="#ffffff" />
            </Pressable>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-extrabold text-white">Suppliers</Text>
                <View className="px-1.5 py-0.5 rounded" style={{
                  backgroundColor: 'rgba(251,146,60,0.3)',
                  borderWidth: 1,
                  borderColor: 'rgba(253,186,116,0.4)',
                }}>
                  <Text className="text-[9px] font-extrabold text-white uppercase">🚚 Vendors</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 mt-1">
                <Sparkles size={9} color="#fde68a" />
                <Text className="text-[11px] text-white/80 font-semibold" numberOfLines={1}>
                  {tenant?.name || 'My Shop'} • {items.length} suppliers
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/suppliers/new');
              }}
              className="h-11 px-4 rounded-2xl bg-white flex-row items-center gap-1.5"
            >
              <Plus size={16} color="#7c2d12" />
              <Text className="font-extrabold text-orange-900 text-sm">New</Text>
            </Pressable>
          </View>

          {/* Quick stats strip */}
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <CheckCircle2 size={10} color="#6ee7b7" />
              <Text className="text-[9px] font-extrabold text-white uppercase tracking-wider">{stats.active} Active</Text>
            </View>
            {stats.withDebt > 0 && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{
                backgroundColor: 'rgba(244,63,94,0.3)',
                borderWidth: 1,
                borderColor: 'rgba(252,165,165,0.4)',
              }}>
                <AlertTriangle size={10} color="#fecaca" />
                <Text className="text-[9px] font-extrabold text-white">{stats.withDebt} With Due</Text>
              </View>
            )}
            {stats.vipCount > 0 && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{
                backgroundColor: 'rgba(245,158,11,0.3)',
                borderWidth: 1,
                borderColor: 'rgba(252,211,77,0.4)',
              }}>
                <Crown size={10} color="#fde68a" fill="#fde68a" />
                <Text className="text-[9px] font-extrabold text-white">{stats.vipCount} VIP</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View className="px-4 pt-3 pb-2 flex-row gap-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-3 h-11">
          <Search size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search name, NTN, phone, city..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm font-semibold text-neutral-900"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowSort(true)}
          className="h-11 w-11 rounded-2xl items-center justify-center bg-white"
          style={{ borderWidth: 2, borderColor: '#e5e7eb' }}
        >
          <ArrowUpDown size={18} color="#6b7280" />
        </Pressable>
      </View>

      {/* ═════ KPI STATS GRID (Web parity) ═════ */}
      {items.length > 0 && (
        <View className="px-4 pb-2">
          <View className="flex-row gap-2 mb-2">
            <KpiCard
              label="Total Suppliers"
              value={String(items.length)}
              sub={`${stats.active} active`}
              icon={Truck}
              color="#f97316"
              bg="#fed7aa"
            />
            <KpiCard
              label="Total Purchased"
              value={formatPKR(stats.totalPurchased)}
              sub="Lifetime"
              icon={TrendingUp}
              color="#2563eb"
              bg="#dbeafe"
              isText
            />
          </View>
          <View className="flex-row gap-2">
            <KpiCard
              label="With Debt"
              value={String(stats.withDebt)}
              sub={stats.withDebt === 0 ? 'All clear ✓' : 'Need payment'}
              icon={Activity}
              color={stats.withDebt > 0 ? '#dc2626' : '#16a34a'}
              bg={stats.withDebt > 0 ? '#fee2e2' : '#dcfce7'}
              isAlert={stats.withDebt > 0}
            />
            <KpiCard
              label="Outstanding Due"
              value={formatPKR(stats.totalDue)}
              sub={stats.totalDue > 0 ? 'Pay suppliers' : 'No pending'}
              icon={Wallet}
              color={stats.totalDue > 0 ? '#dc2626' : '#16a34a'}
              bg={stats.totalDue > 0 ? '#fee2e2' : '#dcfce7'}
              isText
              isAlert={stats.totalDue > 0}
            />
          </View>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 10 }}>
        {([
          { v: 'all', l: 'All', color: '#0f172a', count: items.length },
          { v: 'active', l: 'Active', color: '#16a34a', count: items.filter((s: any) => s.isActive).length },
          { v: 'with-debt', l: 'With Due', color: '#dc2626', count: items.filter((s: any) => s.outstandingDue > 0).length },
          { v: 'inactive', l: 'Inactive', color: '#64748b', count: items.filter((s: any) => !s.isActive).length },
        ] as const).map((opt) => {
          const active = filter === opt.v;
          return (
            <Pressable
              key={opt.v}
              onPress={() => { Haptics.selectionAsync(); setFilter(opt.v as Filter); }}
              className="h-8 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
              style={{
                backgroundColor: active ? opt.color : '#ffffff',
                borderColor: active ? opt.color : '#e5e7eb',
              }}
            >
              <Text className="text-[11px] font-extrabold" style={{ color: active ? '#ffffff' : '#374151' }}>
                {opt.l}
              </Text>
              <View className="px-1.5 py-0 rounded" style={{
                backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              }}>
                <Text className="text-[9px] font-extrabold" style={{ color: active ? '#ffffff' : '#64748b' }}>
                  {opt.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Suppliers list */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        ListEmptyComponent={!isLoading ? (
          <View className="items-center py-16 px-10">
            <View className="h-24 w-24 rounded-3xl bg-orange-100 items-center justify-center">
              <Truck size={42} color="#f97316" />
            </View>
            <Text className="mt-5 text-xl font-bold text-neutral-900">
              {search || filter !== 'all' ? 'No matches' : 'No suppliers yet'}
            </Text>
            <Text className="mt-1 text-sm text-neutral-500 text-center">
              {search || filter !== 'all' ? 'Try different search' : 'Add your first supplier'}
            </Text>
            {!search && filter === 'all' && (
              <Pressable
                onPress={() => router.push('/suppliers/new')}
                className="mt-6 h-12 px-5 rounded-2xl flex-row items-center gap-2"
                style={{ backgroundColor: '#f97316' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Add Supplier</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            onPress={() => { Haptics.selectionAsync(); router.push(`/suppliers/${item.id}`); }}
            onDelete={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              removeMutation.mutate(item.id);
            }}
          />
        )}
      />

      {/* Sort Modal */}
      <Modal visible={showSort} animationType="fade" transparent onRequestClose={() => setShowSort(false)}>
        <Pressable onPress={() => setShowSort(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl">
            <View className="items-center pt-3 pb-1">
              <View className="h-1 w-10 rounded-full bg-neutral-300" />
            </View>
            <View className="px-5 py-3 border-b border-neutral-200 flex-row items-center gap-2">
              <ArrowUpDown size={18} color="#f97316" />
              <Text className="text-lg font-bold text-neutral-900">Sort By</Text>
            </View>
            <View className="py-2">
              {(Object.keys(SORT_LABELS) as SortBy[]).map((s) => {
                const active = sortBy === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); setSortBy(s); setShowSort(false); }}
                    className="px-5 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-bold" style={{ color: active ? '#f97316' : '#374151' }}>
                      {SORT_LABELS[s]}
                    </Text>
                    {active && <CheckCircle2 size={18} color="#f97316" />}
                  </Pressable>
                );
              })}
            </View>
            <View className="h-4" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ═════ KPI Card ═════
function KpiCard({ label, value, sub, icon: Icon, color, bg, isText, isAlert }: any) {
  return (
    <View
      className="flex-1"
      style={{
        borderRadius: 16,
        padding: 12,
        backgroundColor: isAlert ? '#fee2e2' : bg,
        borderWidth: 2,
        borderColor: isAlert ? '#fca5a5' : `${color}40`,
      }}
    >
      <View className="flex-row items-center gap-1.5 mb-1.5">
        <View className="h-7 w-7 rounded-lg items-center justify-center" style={{ backgroundColor: color }}>
          <Icon size={12} color="#ffffff" />
        </View>
        <Text className="text-[9px] uppercase tracking-wider font-extrabold flex-1" style={{ color }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className={`font-extrabold ${isText ? 'text-sm' : 'text-xl'}`} style={{ color: '#0f172a' }} numberOfLines={1}>
        {value}
      </Text>
      {sub && (
        <Text className="text-[9px] font-bold mt-0.5" style={{ color }} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function SupplierCard({ supplier: s, onPress, onDelete }: any) {
  const isVip = (s.totalPurchased || 0) > 100000;
  const hasDue = (s.outstandingDue || 0) > 0;

  const handleWhatsApp = () => {
    if (!s.phone) return;
    const phone = s.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
      Linking.openURL(`https://wa.me/${phone}`),
    );
  };

  const handleCall = () => s.phone && Linking.openURL(`tel:${s.phone}`);

  return (
    <Pressable onPress={onPress} className="rounded-2xl bg-white overflow-hidden active:opacity-80" style={{
      borderWidth: 2,
      borderColor: hasDue ? '#fecaca' : '#e5e7eb',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    }}>
      <View className="p-3">
        <View className="flex-row items-start gap-3">
          <View className="relative">
            {s.logoUrl ? (
              <Image source={{ uri: s.logoUrl }} className="h-14 w-14 rounded-2xl" style={{ borderWidth: 2, borderColor: '#e5e7eb' }} />
            ) : (
              <View className="h-14 w-14 rounded-2xl items-center justify-center" style={{
                backgroundColor: '#7c2d12',
                borderWidth: 2,
                borderColor: '#e5e7eb',
              }}>
                <Text className="text-white text-lg font-extrabold">
                  {s.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {isVip && (
              <View className="absolute -top-1 -right-1 h-5 w-5 rounded-full items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                <Crown size={10} color="#ffffff" fill="#ffffff" />
              </View>
            )}
            {!s.isActive && (
              <View className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-slate-400 items-center justify-center border-2 border-white">
                <XCircle size={10} color="#ffffff" />
              </View>
            )}
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-extrabold text-neutral-900 flex-1" numberOfLines={1}>
                {s.name}
              </Text>
              {isVip && (
                <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7' }}>
                  <Text className="text-[9px] font-extrabold uppercase text-amber-700">VIP</Text>
                </View>
              )}
            </View>
            {s.contactPerson && (
              <Text className="text-[11px] text-neutral-500 font-semibold mt-0.5" numberOfLines={1}>
                {s.contactPerson}
              </Text>
            )}
            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              {s.phone && (
                <View className="flex-row items-center gap-0.5">
                  <Phone size={10} color="#9ca3af" />
                  <Text className="text-[10px] text-neutral-500 font-bold">{s.phone}</Text>
                </View>
              )}
              {s.city && (
                <View className="flex-row items-center gap-0.5">
                  <MapPin size={10} color="#9ca3af" />
                  <Text className="text-[10px] text-neutral-500 font-bold">{s.city}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Badges */}
        {(s.paymentTerms || s.bankName || s.ntn) && (
          <View className="flex-row flex-wrap gap-1 mt-2">
            {s.paymentTerms && (
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fed7aa', borderWidth: 1, borderColor: '#fdba74' }}>
                <Wallet size={9} color="#c2410c" />
                <Text className="text-[9px] font-extrabold text-orange-700">{s.paymentTerms}</Text>
              </View>
            )}
            {s.bankName && (
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' }}>
                <CreditCard size={9} color="#15803d" />
                <Text className="text-[9px] font-extrabold text-emerald-700">{s.bankName}</Text>
              </View>
            )}
            {s.ntn && (
              <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' }}>
                <Text className="text-[9px] font-extrabold text-blue-700">NTN</Text>
              </View>
            )}
          </View>
        )}

        {/* Stats grid */}
        <View className="flex-row gap-2 mt-2 pt-2 border-t border-neutral-100">
          <View className="flex-1 rounded-lg p-2" style={{ backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' }}>
            <Text className="text-[9px] uppercase font-extrabold text-blue-700">Purchased</Text>
            <Text className="text-sm font-extrabold text-blue-900 mt-0.5">{formatPKR(s.totalPurchased || 0)}</Text>
          </View>
          <View className="flex-1 rounded-lg p-2" style={{
            backgroundColor: hasDue ? '#fee2e2' : '#f1f5f9',
            borderWidth: 1,
            borderColor: hasDue ? '#fca5a5' : '#cbd5e1',
          }}>
            <Text className="text-[9px] uppercase font-extrabold" style={{ color: hasDue ? '#b91c1c' : '#64748b' }}>Due</Text>
            <Text className="text-sm font-extrabold mt-0.5" style={{ color: hasDue ? '#b91c1c' : '#334155' }}>
              {formatPKR(s.outstandingDue || 0)}
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        {(s.phone || s.email) && (
          <View className="flex-row gap-1 mt-2">
            {s.phone && (
              <>
                <Pressable onPress={handleCall} className="flex-1 h-8 rounded-lg bg-blue-100 items-center justify-center flex-row gap-1">
                  <Phone size={11} color="#2563eb" />
                  <Text className="text-[10px] font-extrabold text-blue-700">Call</Text>
                </Pressable>
                <Pressable onPress={handleWhatsApp} className="flex-1 h-8 rounded-lg bg-green-100 items-center justify-center flex-row gap-1">
                  <MessageCircle size={11} color="#16a34a" />
                  <Text className="text-[10px] font-extrabold text-green-700">WhatsApp</Text>
                </Pressable>
              </>
            )}
            {s.email && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${s.email}`)}
                className="h-8 w-8 rounded-lg bg-violet-100 items-center justify-center"
              >
                <Mail size={11} color="#7c3aed" />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
