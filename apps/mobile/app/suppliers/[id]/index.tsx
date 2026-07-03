import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, RefreshControl, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft, Edit3, Phone, Mail, MapPin, MessageCircle, CreditCard,
  FileText, ShoppingBag, TrendingUp, Wallet, Building2, Trash2,
  Copy, AlertTriangle, Package, Crown, Star, Activity, Clock,
  CheckCircle2, Eye, Calendar, Sparkles, Banknote, Info, User,
} from 'lucide-react-native';
import { suppliersApi } from '@/api/suppliers.api';
import { formatPKRFull, formatPKR } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa',
  BANK_TRANSFER: 'Bank',
};

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: supplier, refetch, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Supplier deleted' });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      router.replace('/suppliers');
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Cannot delete' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading || !supplier) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <View className="h-20 w-20 rounded-3xl bg-orange-100 items-center justify-center">
          <Truck size={36} color="#f97316" />
        </View>
        <Text className="mt-3 text-neutral-500 font-semibold">Loading supplier...</Text>
      </SafeAreaView>
    );
  }

  const stats = supplier.stats;
  const isVip = (stats?.totalAmount || 0) > 100000;
  const hasDue = (stats?.outstanding || 0) > 0;
  const paidPercent = stats?.totalAmount > 0 ? ((stats.totalPaid / stats.totalAmount) * 100) : 0;

  const openCall = () => supplier.phone && Linking.openURL(`tel:${supplier.phone}`);
  const openWhatsApp = () => {
    if (!supplier.phone) return;
    const phone = supplier.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
      Linking.openURL(`https://wa.me/${phone}`),
    );
  };
  const openEmail = () => supplier.email && Linking.openURL(`mailto:${supplier.email}`);

  const copyField = async (value: string, label: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Haptics.selectionAsync();
    Toast.show({ type: 'success', text1: `${label} copied` });
  };

  const sharePaymentReminder = () => {
    if (!supplier.phone || !hasDue) return;
    const phone = supplier.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    const lines = [
      `Assalam-o-Alaikum *${supplier.contactPerson || supplier.name}*,`,
      '',
      'Hamare records ke mutabiq aap ke account mein outstanding balance hai:',
      '',
      `*Total Purchased:* ${formatPKRFull(stats!.totalAmount)}`,
      `*Paid:* ${formatPKRFull(stats!.totalPaid)}`,
      `*Outstanding:* *${formatPKRFull(stats!.outstanding)}*`,
      '',
      'Bank Details:',
      supplier.bankName && `*Bank:* ${supplier.bankName}`,
      supplier.accountNumber && `*Account:* ${supplier.accountNumber}`,
      supplier.iban && `*IBAN:* ${supplier.iban}`,
      '',
      'Please confirm payment. Shukriya 🙏',
    ].filter(Boolean).join('\n');
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(lines)}`).catch(() =>
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(lines)}`),
    );
  };

  const handleDelete = () => {
    Alert.alert('Delete Supplier?', `Delete ${supplier.name}? Yeh action undo nahi ho sakta.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-3">
        <Pressable onPress={goBack} hitSlop={12} className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800">
          <ArrowLeft size={20} color="#f97316" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs text-neutral-500">Supplier Profile</Text>
            {isVip && (
              <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7' }}>
                <Text className="text-[9px] font-extrabold uppercase text-amber-700">VIP</Text>
              </View>
            )}
            {!supplier.isActive && (
              <View className="px-1.5 py-0.5 rounded bg-slate-200">
                <Text className="text-[9px] font-extrabold uppercase text-slate-700">Inactive</Text>
              </View>
            )}
          </View>
          <Text className="text-lg font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {supplier.name}
          </Text>
        </View>
        <Pressable onPress={handleDelete} className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 items-center justify-center">
          <Trash2 size={18} color="#dc2626" />
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/suppliers/${id}/edit`); }}
          className="h-11 px-3.5 rounded-2xl flex-row items-center gap-1.5"
          style={{ backgroundColor: '#f97316', shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Edit3 size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD */}
        <View className="mx-4 mt-2 rounded-3xl overflow-hidden" style={{
          backgroundColor: '#7c2d12',
          shadowColor: '#f97316',
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <View className="p-5">
            <View className="flex-row items-center gap-4">
              <View className="relative">
                {supplier.logoUrl ? (
                  <Image source={{ uri: supplier.logoUrl }} className="h-24 w-24 rounded-3xl" style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }} />
                ) : (
                  <View className="h-24 w-24 rounded-3xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}>
                    <Text className="text-4xl font-extrabold text-white">
                      {supplier.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isVip && (
                  <View className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-amber-500 items-center justify-center" style={{ borderWidth: 3, borderColor: '#ffffff' }}>
                    <Crown size={12} color="#ffffff" fill="#ffffff" />
                  </View>
                )}
              </View>

              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1 mb-1">
                  <Sparkles size={9} color="#fde68a" />
                  <Text className="text-[9px] uppercase tracking-wider text-white/70 font-extrabold">
                    Supply Partner
                  </Text>
                </View>
                <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
                  {supplier.name}
                </Text>
                {supplier.contactPerson && (
                  <View className="flex-row items-center gap-1 mt-1">
                    <User size={11} color="rgba(255,255,255,0.85)" />
                    <Text className="text-xs text-white/85 font-semibold" numberOfLines={1}>
                      {supplier.contactPerson}
                    </Text>
                  </View>
                )}
                {stats?.daysSinceLastPurchase !== null && stats?.daysSinceLastPurchase !== undefined && (
                  <View className="flex-row items-center gap-1 mt-1">
                    <Clock size={10} color="rgba(255,255,255,0.75)" />
                    <Text className="text-[10px] text-white/75 font-semibold">
                      Last purchase: {stats.daysSinceLastPurchase === 0 ? 'Today' : `${stats.daysSinceLastPurchase} days ago`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Contact info strip */}
            {(supplier.phone || supplier.city) && (
              <View className="flex-row flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                {supplier.phone && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    <Phone size={10} color="#ffffff" />
                    <Text className="text-[10px] font-extrabold text-white">{supplier.phone}</Text>
                  </View>
                )}
                {supplier.city && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    <MapPin size={10} color="#ffffff" />
                    <Text className="text-[10px] font-extrabold text-white">
                      {supplier.city}{supplier.area && `, ${supplier.area}`}
                    </Text>
                  </View>
                )}
                {supplier.email && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    <Mail size={10} color="#ffffff" />
                    <Text className="text-[10px] font-extrabold text-white" numberOfLines={1}>{supplier.email}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action buttons */}
            <View className="flex-row gap-2 mt-3">
              {supplier.phone && (
                <>
                  <Pressable onPress={openCall} className="flex-1 h-11 rounded-xl bg-white/20 flex-row items-center justify-center gap-1.5">
                    <Phone size={14} color="#ffffff" />
                    <Text className="text-white font-extrabold text-xs">Call</Text>
                  </Pressable>
                  <Pressable onPress={openWhatsApp} className="flex-1 h-11 rounded-xl bg-green-600 flex-row items-center justify-center gap-1.5">
                    <MessageCircle size={14} color="#ffffff" />
                    <Text className="text-white font-extrabold text-xs">WhatsApp</Text>
                  </Pressable>
                </>
              )}
              {supplier.email && (
                <Pressable onPress={openEmail} className="h-11 w-11 rounded-xl bg-white/20 items-center justify-center">
                  <Mail size={14} color="#ffffff" />
                </Pressable>
              )}
            </View>

            {hasDue && supplier.phone && (
              <Pressable
                onPress={sharePaymentReminder}
                className="mt-2 h-11 rounded-xl bg-amber-500 flex-row items-center justify-center gap-1.5"
              >
                <AlertTriangle size={14} color="#ffffff" />
                <Text className="text-white font-extrabold text-xs">Send Payment Reminder</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* STATS GRID */}
        <View className="px-4 pt-4">
          <View className="flex-row gap-2 mb-2">
            <StatCard label="Total Purchases" value={String(stats?.totalPurchases || 0)} icon={ShoppingBag} color="#f97316" bg="#fed7aa" />
            <StatCard label="Total Amount" value={formatPKR(stats?.totalAmount || 0)} icon={TrendingUp} color="#2563eb" bg="#dbeafe" isText />
          </View>
          <View className="flex-row gap-2 mb-2">
            <StatCard label="Total Paid" value={formatPKR(stats?.totalPaid || 0)} icon={Wallet} color="#16a34a" bg="#dcfce7" isText sub={`${paidPercent.toFixed(0)}% paid`} />
            <StatCard label="Outstanding" value={formatPKR(stats?.outstanding || 0)} icon={AlertTriangle} color={hasDue ? "#dc2626" : "#64748b"} bg={hasDue ? "#fee2e2" : "#f1f5f9"} isText isAlert={hasDue} />
          </View>
          <StatCard label="Avg Purchase" value={formatPKR(stats?.averagePurchase || 0)} icon={Activity} color="#7c3aed" bg="#ede9fe" isText full />
        </View>

        {/* PAYMENT PROGRESS */}
        {stats?.totalAmount > 0 && (
          <View className="px-4 mt-3">
            <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Wallet size={14} color="#16a34a" />
                  <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Payment Progress</Text>
                </View>
                <Text className="text-sm font-extrabold text-emerald-700">{paidPercent.toFixed(0)}%</Text>
              </View>
              <View className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${paidPercent}%`,
                    backgroundColor: paidPercent >= 90 ? '#16a34a' : paidPercent >= 50 ? '#f59e0b' : '#dc2626',
                  }}
                />
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-[10px] text-neutral-500 font-bold">
                  Paid: <Text className="text-emerald-700">{formatPKR(stats.totalPaid)}</Text>
                </Text>
                <Text className="text-[10px] text-neutral-500 font-bold">
                  Total: {formatPKR(stats.totalAmount)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BANKING INFO */}
        {(supplier.bankName || supplier.iban || supplier.accountNumber || supplier.paymentTerms) && (
          <View className="px-4 mt-3">
            <View className="rounded-3xl bg-white border-2 border-emerald-200 overflow-hidden">
              <View className="px-4 py-3 flex-row items-center gap-2" style={{ backgroundColor: '#f0fdf4', borderBottomWidth: 2, borderBottomColor: '#bbf7d0' }}>
                <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                  <CreditCard size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-emerald-900">Banking & Payment</Text>
                  <Text className="text-[10px] text-emerald-700 font-semibold">Bank aur payment terms</Text>
                </View>
              </View>
              <View className="p-4 gap-3">
                {supplier.bankName && (
                  <View className="rounded-xl p-3" style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' }}>
                    <Text className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Bank</Text>
                    <Text className="font-extrabold text-emerald-900 mt-0.5">{supplier.bankName}</Text>
                  </View>
                )}
                {supplier.accountNumber && (
                  <Pressable
                    onPress={() => copyField(supplier.accountNumber!, 'Account')}
                    className="rounded-xl p-3 flex-row items-center justify-between"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' }}
                  >
                    <View className="flex-1">
                      <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Account Number</Text>
                      <Text className="font-mono font-extrabold text-slate-900 mt-0.5">{supplier.accountNumber}</Text>
                    </View>
                    <Copy size={14} color="#64748b" />
                  </Pressable>
                )}
                {supplier.iban && (
                  <Pressable
                    onPress={() => copyField(supplier.iban!.replace(/\s/g, ''), 'IBAN')}
                    className="rounded-xl p-3 flex-row items-center justify-between gap-2"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' }}
                  >
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">IBAN</Text>
                      <Text className="font-mono font-extrabold text-xs text-slate-900 mt-0.5" numberOfLines={1}>
                        {supplier.iban}
                      </Text>
                    </View>
                    <Copy size={14} color="#64748b" />
                  </Pressable>
                )}
                {supplier.paymentTerms && (
                  <View className="rounded-xl p-3 flex-row items-center gap-2" style={{ backgroundColor: '#fed7aa', borderWidth: 1, borderColor: '#fdba74' }}>
                    <Wallet size={14} color="#c2410c" />
                    <Text className="flex-1 text-orange-800 font-extrabold text-sm">{supplier.paymentTerms}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* TAX INFO */}
        {(supplier.ntn || supplier.cnic) && (
          <View className="px-4 mt-3">
            <View className="rounded-3xl bg-white border-2 border-blue-200 overflow-hidden">
              <View className="px-4 py-3 flex-row items-center gap-2" style={{ backgroundColor: '#eff6ff', borderBottomWidth: 2, borderBottomColor: '#bfdbfe' }}>
                <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: '#2563eb' }}>
                  <FileText size={16} color="#ffffff" />
                </View>
                <Text className="flex-1 text-sm font-extrabold text-blue-900">Tax Information</Text>
              </View>
              <View className="p-4 gap-3">
                {supplier.ntn && (
                  <Pressable
                    onPress={() => copyField(supplier.ntn!, 'NTN')}
                    className="rounded-xl p-3 flex-row items-center justify-between"
                    style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd' }}
                  >
                    <View className="flex-1">
                      <Text className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">NTN</Text>
                      <Text className="font-mono font-extrabold text-blue-900 mt-0.5">{supplier.ntn}</Text>
                    </View>
                    <Copy size={14} color="#2563eb" />
                  </Pressable>
                )}
                {supplier.cnic && (
                  <Pressable
                    onPress={() => copyField(supplier.cnic!, 'CNIC')}
                    className="rounded-xl p-3 flex-row items-center justify-between"
                    style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd' }}
                  >
                    <View className="flex-1">
                      <Text className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">CNIC</Text>
                      <Text className="font-mono font-extrabold text-blue-900 mt-0.5">{supplier.cnic}</Text>
                    </View>
                    <Copy size={14} color="#2563eb" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* PURCHASE HISTORY */}
        <View className="px-4 mt-3">
          <View className="flex-row items-center justify-between mb-2 px-1">
            <View className="flex-row items-center gap-2">
              <ShoppingBag size={16} color="#f97316" />
              <Text className="text-sm font-extrabold uppercase tracking-wider text-neutral-700">Purchase History</Text>
              <View className="px-1.5 py-0.5 rounded-full bg-orange-100">
                <Text className="text-[10px] font-extrabold text-orange-700">{supplier._count?.purchases || 0}</Text>
              </View>
            </View>
          </View>

          {!supplier.purchases || supplier.purchases.length === 0 ? (
            <View className="rounded-2xl bg-white border-2 border-dashed border-neutral-200 p-8 items-center">
              <View className="h-16 w-16 rounded-3xl bg-orange-100 items-center justify-center">
                <ShoppingBag size={32} color="#f97316" />
              </View>
              <Text className="mt-3 font-extrabold text-slate-700">No purchases yet</Text>
              <Text className="text-xs text-slate-500 mt-1">First purchase iss supplier ke saath karein</Text>
            </View>
          ) : (
            <View className="gap-2">
              {supplier.purchases.map((p: any) => {
                const balance = Math.max(p.total - p.paidAmount, 0);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/purchases/${p.id}` as any)}
                    className="rounded-2xl bg-white p-3 active:opacity-70"
                    style={{ borderWidth: 2, borderColor: '#e5e7eb' }}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-extrabold text-neutral-900 font-mono text-sm">{p.purchaseNumber}</Text>
                          <View className="px-1.5 py-0.5 rounded" style={{
                            backgroundColor: p.status === 'RECEIVED' ? '#dcfce7' : p.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                          }}>
                            <Text className="text-[9px] font-extrabold" style={{
                              color: p.status === 'RECEIVED' ? '#15803d' : p.status === 'PENDING' ? '#b45309' : '#b91c1c',
                            }}>{p.status}</Text>
                          </View>
                          {balance > 0 && (
                            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fee2e2' }}>
                              <Text className="text-[9px] font-extrabold text-rose-700">Due {formatPKR(balance)}</Text>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center gap-1 mt-1">
                          <Calendar size={10} color="#9ca3af" />
                          <Text className="text-[11px] text-neutral-500 font-semibold">
                            {formatDateTime(p.purchasedAt)}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-neutral-500 font-semibold mt-0.5">
                          {paymentMethodLabels[p.paymentMethod] || p.paymentMethod}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-extrabold text-orange-700">{formatPKR(p.total)}</Text>
                        <Text className="text-[10px] text-emerald-700 font-extrabold mt-0.5">
                          Paid: {formatPKR(p.paidAmount)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* NOTES */}
        {supplier.notes && (
          <View className="px-4 mt-3">
            <View className="rounded-3xl bg-amber-50 border-2 border-amber-200 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Info size={16} color="#d97706" />
                <Text className="font-extrabold text-amber-900 text-sm">Internal Notes</Text>
                <View className="ml-auto px-2 py-0.5 rounded-full bg-amber-100">
                  <Text className="text-[9px] font-extrabold text-amber-700 uppercase">Private</Text>
                </View>
              </View>
              <Text className="text-sm text-amber-900 leading-relaxed">{supplier.notes}</Text>
            </View>
          </View>
        )}

        {/* ADDRESS */}
        {supplier.address && (
          <View className="px-4 mt-3">
            <View className="rounded-2xl bg-white border-2 border-neutral-200 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <MapPin size={16} color="#e11d48" />
                <Text className="font-extrabold text-slate-900 text-sm">Full Address</Text>
              </View>
              <Text className="text-sm text-slate-700 leading-relaxed">{supplier.address}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, isText, isAlert, sub, full }: any) {
  return (
    <View
      className={full ? '' : 'flex-1'}
      style={{
        borderRadius: 20,
        padding: 14,
        backgroundColor: isAlert ? '#fee2e2' : bg,
        borderWidth: 2,
        borderColor: isAlert ? '#fca5a5' : `${color}40`,
      }}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: color }}>
          <Icon size={14} color="#ffffff" />
        </View>
        <Text className="text-[9px] uppercase tracking-wider font-extrabold flex-1" style={{ color }}>
          {label}
        </Text>
      </View>
      <Text className={`font-extrabold ${isText ? 'text-base' : 'text-2xl'}`} style={{ color: '#0f172a' }} numberOfLines={1}>
        {value}
      </Text>
      {sub && (
        <Text className="text-[10px] font-bold mt-0.5" style={{ color }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// Import Truck for loading state
import { Truck } from 'lucide-react-native';
