import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, Linking,
  KeyboardAvoidingView, Platform, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, User, Phone, Calendar, Clock, Package,
  DollarSign, Wallet, BookmarkPlus, X, CheckCircle2,
  XCircle, RefreshCw, Plus, AlertTriangle, Sparkles,
  Hourglass, Zap, MessageSquare, EyeOff, TrendingUp,
  ArrowRight, CreditCard, Building2, Smartphone, Banknote,
  Trash2, Receipt as ReceiptIcon, ShoppingCart, Layers, Scissors,
  MessageCircle,
} from 'lucide-react-native';
import { bookingsApi, type BookingStatus } from '@/api/bookings.api';
import { formatPKRFull } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:           { label: 'Pending',      color: '#64748b', bg: '#f1f5f9', icon: Hourglass },
  ADVANCE_PAID:      { label: 'Advance Paid', color: '#f59e0b', bg: '#fef3c7', icon: Wallet },
  READY_FOR_PICKUP:  { label: 'Ready',        color: '#3b82f6', bg: '#dbeafe', icon: Zap },
  CONVERTED:         { label: 'Converted',    color: '#10b981', bg: '#dcfce7', icon: CheckCircle2 },
  CANCELLED:         { label: 'Cancelled',    color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  EXPIRED:           { label: 'Expired',      color: '#dc2626', bg: '#fecaca', icon: AlertTriangle },
};

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

const paymentMethods: Array<{ key: PaymentMethod; label: string; icon: any; color: string }> = [
  { key: 'CASH', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'CARD', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { key: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { key: 'BANK_TRANSFER', label: 'Bank', icon: Building2, color: '#8b5cf6' },
];

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundAdvance, setRefundAdvance] = useState(true);

  const [showConvert, setShowConvert] = useState(false);
  const [additionalPayment, setAdditionalPayment] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const { data: booking, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getOne(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
    queryClient.invalidateQueries({ queryKey: ['bookings-summary'] });
  };

  const addPaymentMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.addPayment(id!, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      setShowAddPayment(false);
      setPaymentAmount('');
      setPaymentNotes('');
      invalidate();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.cancel(id!, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Booking cancelled' });
      setShowCancel(false);
      invalidate();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const convertMutation = useMutation({
    mutationFn: (payload: any) => bookingsApi.convert(id!, payload),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: `Sale ${data.sale.saleNumber} created!`,
      });
      setShowConvert(false);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      router.replace(`/sales/${data.sale.id}/receipt`);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const removeMutation = useMutation({
    mutationFn: () => bookingsApi.remove(id!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Booking deleted' });
      router.replace('/bookings');
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <BookmarkPlus size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading booking...</Text>
      </SafeAreaView>
    );
  }

  const cfg = statusConfig[booking.status];
  const StatusIcon = cfg.icon;
  const canPay = ['PENDING', 'ADVANCE_PAID'].includes(booking.status);
  const canConvert = ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'].includes(booking.status);
  const canCancel = !['CONVERTED', 'CANCELLED', 'EXPIRED'].includes(booking.status);
  const canDelete = ['CANCELLED', 'EXPIRED'].includes(booking.status);

  const handleWhatsAppReminder = () => {
    if (!booking.customer?.phone) {
      Toast.show({ type: 'error', text1: 'Customer phone nahi hai' });
      return;
    }
    const phone = booking.customer.phone.replace(/[^0-9]/g, '');
    const msg = `As-salam-o-alaikum ${booking.customer.name} bhai,\n\n` +
      `Aap ki booking *${booking.bookingNumber}* ready hai / pickup ke liye tayaar hai.\n\n` +
      `Total: *${formatPKRFull(booking.total)}*\n` +
      (booking.balanceDue > 0 ? `Balance due: *${formatPKRFull(booking.balanceDue)}*\n` : '') +
      `\nJab waqt ho, please tashreef laayein.\n\nShukriya! 🙏`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`),
    );
  };

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
          <Text className="text-xs text-neutral-500">Booking Detail</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {booking.bookingNumber}
          </Text>
        </View>
        {booking.customer?.phone && (
          <Pressable
            onPress={handleWhatsAppReminder}
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle size={18} color="#ffffff" />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero status card */}
        <View
          className="mx-5 rounded-3xl p-5 mb-4"
          style={{ backgroundColor: cfg.color }}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <StatusIcon size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Status
              </Text>
              <Text className="text-2xl font-extrabold text-white mt-0.5">
                {cfg.label}
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                Created {formatDate(booking.createdAt)}
              </Text>
            </View>
          </View>

          {booking.status === 'CONVERTED' && booking.sale && (
            <Pressable
              onPress={() => router.push(`/sales/${booking.sale!.id}/receipt`)}
              className="mt-3 flex-row items-center gap-2 px-3 py-2 rounded-xl bg-white/20 active:opacity-70"
            >
              <ReceiptIcon size={14} color="#ffffff" />
              <Text className="text-white font-bold text-xs">
                View Sale: {booking.sale.saleNumber}
              </Text>
              <ArrowRight size={12} color="#ffffff" />
            </Pressable>
          )}

          {booking.cancelReason && (
            <View className="mt-3 p-3 rounded-xl bg-white/15">
              <Text className="text-[10px] uppercase font-extrabold text-white/70 mb-1">
                Cancel Reason
              </Text>
              <Text className="text-sm text-white italic">"{booking.cancelReason}"</Text>
            </View>
          )}
        </View>

        {/* Financial Summary */}
        <View className="mx-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
            Financial Summary
          </Text>
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500">Subtotal</Text>
              <Text className="text-sm font-bold text-neutral-800">{formatPKRFull(booking.subtotal)}</Text>
            </View>
            {booking.discount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-amber-700">Discount</Text>
                <Text className="text-sm font-bold text-amber-700">-{formatPKRFull(booking.discount)}</Text>
              </View>
            )}
            {booking.serviceCharges > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-orange-700">Service Charges</Text>
                <Text className="text-sm font-bold text-orange-700">+{formatPKRFull(booking.serviceCharges)}</Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 mt-1 border-t-2 border-neutral-200">
              <Text className="text-lg font-extrabold text-neutral-900">TOTAL</Text>
              <Text className="text-lg font-extrabold text-neutral-900">{formatPKRFull(booking.total)}</Text>
            </View>
            <View className="mt-2 pt-2 border-t border-neutral-100 gap-1">
              <View className="flex-row justify-between">
                <Text className="text-xs text-emerald-700 font-bold">Paid</Text>
                <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(booking.totalPaid)}</Text>
              </View>
              {booking.totalRefunded > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-rose-700 font-bold">Refunded</Text>
                  <Text className="text-sm font-extrabold text-rose-700">-{formatPKRFull(booking.totalRefunded)}</Text>
                </View>
              )}
              {booking.balanceDue > 0 && (
                <View className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 mt-1 flex-row justify-between items-center">
                  <View className="flex-row items-center gap-1.5">
                    <Wallet size={13} color="#d97706" />
                    <Text className="text-xs font-extrabold text-amber-800 uppercase">Balance Due</Text>
                  </View>
                  <Text className="text-base font-extrabold text-amber-700">
                    {formatPKRFull(booking.balanceDue)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Customer */}
        <View className="mx-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4 mb-3">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-2xl bg-violet-100 items-center justify-center">
              <User size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">
                Customer
              </Text>
              <Text className="text-base font-extrabold text-neutral-900 mt-0.5">
                {booking.customer?.name}
              </Text>
              {booking.customer?.phone && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Phone size={10} color="#64748b" />
                  <Text className="text-xs text-neutral-500">{booking.customer.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Timeline */}
        {(booking.expectedPickupAt || booking.expiresAt || booking.convertedAt || booking.cancelledAt) && (
          <View className="mx-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-4 mb-3">
            <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
              Timeline
            </Text>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Calendar size={12} color="#64748b" />
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">Created</Text>
                  <Text className="text-xs font-bold text-neutral-800">{formatDate(booking.createdAt)}</Text>
                </View>
              </View>
              {booking.expectedPickupAt && (
                <View className="flex-row items-center gap-2">
                  <Clock size={12} color="#2563eb" />
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-blue-600">Expected Pickup</Text>
                    <Text className="text-xs font-bold text-neutral-800">{formatDate(booking.expectedPickupAt)}</Text>
                  </View>
                </View>
              )}
              {booking.expiresAt && (
                <View className="flex-row items-center gap-2">
                  <AlertTriangle size={12} color="#d97706" />
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-amber-600">Expires</Text>
                    <Text className="text-xs font-bold text-neutral-800">{formatDate(booking.expiresAt)}</Text>
                  </View>
                </View>
              )}
              {booking.convertedAt && (
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={12} color="#16a34a" />
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-emerald-600">Converted</Text>
                    <Text className="text-xs font-bold text-neutral-800">{formatDate(booking.convertedAt)}</Text>
                  </View>
                </View>
              )}
              {booking.cancelledAt && (
                <View className="flex-row items-center gap-2">
                  <XCircle size={12} color="#dc2626" />
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase font-extrabold text-rose-600">Cancelled</Text>
                    <Text className="text-xs font-bold text-neutral-800">{formatDate(booking.cancelledAt)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Items */}
        <View className="mx-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 overflow-hidden mb-3">
          <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center gap-2">
            <Package size={14} color="#16a34a" />
            <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Reserved Items ({booking.items?.length ?? 0})
            </Text>
          </View>
          {booking.items?.map((item, idx) => (
            <View
              key={item.id}
              className={`p-3 flex-row items-start gap-2 ${
                idx !== (booking.items!.length - 1) ? 'border-b border-neutral-100' : ''
              }`}
            >
              <Text className="text-[10px] font-mono font-extrabold text-neutral-400 w-5">#{idx + 1}</Text>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-extrabold text-neutral-900" numberOfLines={2}>
                  {item.product?.name}
                </Text>
                {item.variant?.name && (
                  <Text className="text-[10px] font-bold text-violet-700 mt-0.5">
                    {item.variant.name}
                  </Text>
                )}
                <View className="flex-row flex-wrap gap-1 mt-1">
                  {item.imei && (
                    <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100">
                      <Smartphone size={8} color="#2563eb" />
                      <Text className="text-[9px] font-extrabold text-blue-700 font-mono">{item.imei.imei1}</Text>
                    </View>
                  )}
                  {item.roll && (
                    <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100">
                      <Layers size={8} color="#16a34a" />
                      <Text className="text-[9px] font-extrabold text-emerald-700">{item.roll.rollNumber}</Text>
                    </View>
                  )}
                  {item.cutPiece && (
                    <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100">
                      <Scissors size={8} color="#8b5cf6" />
                      <Text className="text-[9px] font-extrabold text-violet-700">{item.cutPiece.pieceCode}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-[11px] text-neutral-500 mt-1">
                  {formatPKRFull(item.price)} × {item.quantity} {item.product?.unit}
                </Text>
                {item.note && (
                  <View className="flex-row items-start gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 self-start">
                    <MessageSquare size={9} color="#b45309" />
                    <Text className="text-[10px] font-bold text-amber-900">{item.note}</Text>
                  </View>
                )}
                {item.internalNote && (
                  <View className="flex-row items-start gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 self-start">
                    <EyeOff size={9} color="#475569" />
                    <Text className="text-[10px] font-bold text-slate-700 italic">{item.internalNote}</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Payment history */}
        {booking.payments && booking.payments.length > 0 && (
          <View className="mx-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center gap-2">
              <Wallet size={14} color="#16a34a" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Payment History ({booking.payments.length})
              </Text>
            </View>
            {booking.payments.map((pay, idx) => {
              const PayIcon = paymentIcons[pay.paymentMethod] || CreditCard;
              const isRefund = pay.type === 'REFUND';
              return (
                <View
                  key={pay.id}
                  className={`p-3 flex-row items-center gap-3 ${
                    idx !== booking.payments!.length - 1 ? 'border-b border-neutral-100' : ''
                  }`}
                  style={{ backgroundColor: isRefund ? '#fef2f2' : undefined }}
                >
                  <View
                    className="h-10 w-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: isRefund ? '#fee2e2' : '#dcfce7' }}
                  >
                    <PayIcon size={18} color={isRefund ? '#dc2626' : '#16a34a'} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className="px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: pay.type === 'ADVANCE' ? '#dbeafe' : pay.type === 'REFUND' ? '#fee2e2' : '#dcfce7' }}
                      >
                        <Text
                          className="text-[9px] font-extrabold uppercase"
                          style={{ color: pay.type === 'ADVANCE' ? '#1d4ed8' : pay.type === 'REFUND' ? '#b91c1c' : '#15803d' }}
                        >
                          {pay.type}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-neutral-700">{pay.paymentMethod}</Text>
                    </View>
                    <Text className="text-[10px] text-neutral-500 mt-0.5">{formatDate(pay.paidAt)}</Text>
                    {pay.notes && <Text className="text-[10px] text-neutral-600 italic mt-0.5">{pay.notes}</Text>}
                  </View>
                  <Text
                    className="text-base font-extrabold"
                    style={{ color: isRefund ? '#dc2626' : '#16a34a' }}
                  >
                    {isRefund ? '-' : '+'}{formatPKRFull(pay.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes */}
        {(booking.notes || booking.internalNotes) && (
          <View className="mx-5 gap-2 mb-3">
            {booking.notes && (
              <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <MessageSquare size={11} color="#b45309" />
                  <Text className="text-[10px] font-extrabold uppercase text-amber-800">
                    Customer Note
                  </Text>
                </View>
                <Text className="text-sm font-bold text-amber-900">{booking.notes}</Text>
              </View>
            )}
            {booking.internalNotes && (
              <View className="rounded-2xl bg-slate-100 border-2 border-slate-300 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <EyeOff size={11} color="#475569" />
                  <Text className="text-[10px] font-extrabold uppercase text-slate-700">
                    Internal Note
                  </Text>
                </View>
                <Text className="text-sm font-bold text-slate-800 italic">{booking.internalNotes}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      {(canPay || canConvert || canCancel || canDelete) && (
        <View className="absolute left-0 right-0 bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 px-5 py-3">
          <View className="flex-row gap-2">
            {canPay && booking.balanceDue > 0 && (
              <Pressable
                onPress={() => setShowAddPayment(true)}
                className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                style={{ backgroundColor: '#16a34a' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Payment</Text>
              </Pressable>
            )}
            {canConvert && (
              <Pressable
                onPress={() => setShowConvert(true)}
                className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
                style={{ backgroundColor: '#2563eb' }}
              >
                <ShoppingCart size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Convert</Text>
              </Pressable>
            )}
            {canCancel && (
              <Pressable
                onPress={() => setShowCancel(true)}
                className="h-12 px-4 rounded-xl items-center justify-center flex-row gap-1.5 border-2 border-rose-300 active:opacity-70"
              >
                <XCircle size={16} color="#dc2626" />
                <Text className="text-rose-700 font-bold text-sm">Cancel</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                onPress={() => {
                  Alert.alert('Delete Booking?', 'Sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
                  ]);
                }}
                className="h-12 px-4 rounded-xl items-center justify-center bg-rose-50 border-2 border-rose-300"
              >
                <Trash2 size={16} color="#dc2626" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Add Payment Modal */}
      <Modal
        visible={showAddPayment}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowAddPayment(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center">
                <Wallet size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-neutral-900">Add Payment</Text>
                <Text className="text-xs text-neutral-500">Balance: {formatPKRFull(booking.balanceDue)}</Text>
              </View>
              <Pressable
                onPress={() => setShowAddPayment(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Amount (PKR)</Text>
              <TextInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                autoFocus
                className="h-16 rounded-2xl border-2 border-emerald-200 bg-white px-4 text-3xl font-extrabold text-neutral-900 mb-2"
              />
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => setPaymentAmount(String(booking.balanceDue))}
                  className="flex-1 h-9 rounded-lg bg-emerald-100 items-center justify-center"
                >
                  <Text className="text-emerald-700 font-extrabold text-xs">
                    Full: {formatPKRFull(booking.balanceDue)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPaymentAmount(String(Math.floor(booking.balanceDue / 2)))}
                  className="flex-1 h-9 rounded-lg bg-slate-100 items-center justify-center"
                >
                  <Text className="text-slate-700 font-extrabold text-xs">Half</Text>
                </Pressable>
              </View>

              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Method</Text>
              <View className="flex-row flex-wrap -m-1 mb-4">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.key;
                  return (
                    <View key={m.key} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => setPaymentMethod(m.key)}
                        className="h-16 rounded-xl items-center justify-center gap-1 border-2"
                        style={{
                          backgroundColor: active ? m.color : '#ffffff',
                          borderColor: active ? m.color : '#e5e7eb',
                        }}
                      >
                        <Icon size={16} color={active ? '#ffffff' : m.color} />
                        <Text
                          className="text-[10px] font-bold"
                          style={{ color: active ? '#ffffff' : '#374151' }}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Note (optional)</Text>
              <TextInput
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Transaction ID, etc."
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900"
              />
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => {
                  const amt = Number(paymentAmount);
                  if (!(amt > 0)) return Toast.show({ type: 'error', text1: 'Amount required' });
                  if (amt > booking.balanceDue) return Toast.show({ type: 'error', text1: 'Exceeds balance' });
                  addPaymentMutation.mutate({
                    amount: amt,
                    paymentMethod,
                    notes: paymentNotes.trim() || undefined,
                  });
                }}
                disabled={addPaymentMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: addPaymentMutation.isPending ? '#9ca3af' : '#16a34a' }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {addPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        visible={showCancel}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowCancel(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-rose-600 items-center justify-center">
              <XCircle size={20} color="#ffffff" />
            </View>
            <Text className="flex-1 text-lg font-bold text-neutral-900">Cancel Booking</Text>
            <Pressable
              onPress={() => setShowCancel(false)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 mb-4 flex-row items-start gap-2">
              <AlertTriangle size={16} color="#b45309" />
              <Text className="flex-1 text-xs font-bold text-amber-900">
                Reserved items (rolls, IMEIs, cut pieces) will be released back to inventory.
              </Text>
            </View>

            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Reason</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              placeholder='"Customer mind change, refund"'
              placeholderTextColor="#9ca3af"
              className="min-h-[80px] rounded-2xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900 mb-4"
              textAlignVertical="top"
            />

            {booking.totalPaid > 0 && (
              <Pressable
                onPress={() => setRefundAdvance((v) => !v)}
                className="flex-row items-center gap-3 p-3 rounded-xl border-2"
                style={{
                  borderColor: refundAdvance ? '#16a34a' : '#e5e7eb',
                  backgroundColor: refundAdvance ? '#dcfce7' : '#ffffff',
                }}
              >
                <View
                  style={{
                    height: 22, width: 22, borderRadius: 6, borderWidth: 2,
                    borderColor: refundAdvance ? '#16a34a' : '#cbd5e1',
                    backgroundColor: refundAdvance ? '#16a34a' : '#ffffff',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {refundAdvance && <CheckCircle2 size={14} color="#ffffff" />}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-emerald-900">
                    Refund advance ({formatPKRFull(booking.totalPaid)})
                  </Text>
                  <Text className="text-[10px] text-emerald-700 font-bold">
                    Customer ka paisa wapis
                  </Text>
                </View>
              </Pressable>
            )}
          </ScrollView>
          <View className="px-5 py-4 border-t border-neutral-200">
            <Pressable
              onPress={() => cancelMutation.mutate({
                reason: cancelReason.trim() || undefined,
                refundAdvance,
                refundMethod: booking.paymentMethod,
              })}
              disabled={cancelMutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: cancelMutation.isPending ? '#9ca3af' : '#dc2626' }}
            >
              <XCircle size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Convert Modal */}
      <Modal
        visible={showConvert}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowConvert(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-blue-600 items-center justify-center">
                <ShoppingCart size={20} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">Convert to Sale</Text>
              <Pressable
                onPress={() => setShowConvert(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-3 mb-4">
                <Text className="text-xs font-bold text-emerald-900">
                  ✅ Sale banate hi items customer ke ho jayenge. Stock adjust ho ga.
                </Text>
              </View>

              <View className="flex-row gap-2 mb-4">
                <View className="flex-1 rounded-xl border-2 border-neutral-200 p-3 items-center">
                  <Text className="text-[9px] uppercase font-extrabold text-neutral-500">Total</Text>
                  <Text className="text-sm font-extrabold text-neutral-900 mt-0.5">
                    {formatPKRFull(booking.total)}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 items-center">
                  <Text className="text-[9px] uppercase font-extrabold text-emerald-700">Paid</Text>
                  <Text className="text-sm font-extrabold text-emerald-700 mt-0.5">
                    {formatPKRFull(booking.totalPaid)}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 items-center">
                  <Text className="text-[9px] uppercase font-extrabold text-amber-700">Balance</Text>
                  <Text className="text-sm font-extrabold text-amber-700 mt-0.5">
                    {formatPKRFull(booking.balanceDue)}
                  </Text>
                </View>
              </View>

              {booking.balanceDue > 0 && (
                <>
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">
                    Additional Payment (Optional)
                  </Text>
                  <TextInput
                    value={additionalPayment}
                    onChangeText={setAdditionalPayment}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="h-14 rounded-2xl border-2 border-neutral-200 bg-white px-4 text-2xl font-extrabold text-neutral-900 mb-2"
                  />
                  <View className="flex-row gap-2 mb-4">
                    <Pressable
                      onPress={() => setAdditionalPayment(String(booking.balanceDue))}
                      className="flex-1 h-9 rounded-lg bg-emerald-100 items-center justify-center"
                    >
                      <Text className="text-emerald-700 font-extrabold text-xs">
                        Pay Full: {formatPKRFull(booking.balanceDue)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAdditionalPayment('')}
                      className="flex-1 h-9 rounded-lg bg-amber-100 items-center justify-center"
                    >
                      <Text className="text-amber-700 font-extrabold text-xs">
                        Skip (add to khata)
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => convertMutation.mutate({
                  additionalPayment: Number(additionalPayment) || 0,
                  paymentMethod: booking.paymentMethod,
                })}
                disabled={convertMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: convertMutation.isPending ? '#9ca3af' : '#2563eb' }}
              >
                <ShoppingCart size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {convertMutation.isPending ? 'Converting...' : 'Complete Sale'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
