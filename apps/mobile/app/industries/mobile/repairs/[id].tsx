import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Wrench, Smartphone, User, Phone, X, CheckCircle2,
  Wallet, Plus, Trash2, AlertTriangle, Activity, DollarSign,
  Package, Clock, MessageCircle, Sparkles, Edit3,
} from 'lucide-react-native';
import {
  repairsApi,
  REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS,
  REPAIR_PRIORITY_LABELS, REPAIR_PRIORITY_COLORS,
  VALID_STATUS_TRANSITIONS,
  type RepairStatus,
} from '@/api/repairs.api';
import { formatPKRFull } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function RepairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();

  const [showDiagnose, setShowDiagnose] = useState(false);
  const [diagnosedIssue, setDiagnosedIssue] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');

  const [showAddPart, setShowAddPart] = useState(false);
  const [partName, setPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('');
  const [partUnitCost, setPartUnitCost] = useState('');

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const [showStatus, setShowStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const { data: ticket, refetch } = useQuery({
    queryKey: ['repair-ticket', id],
    queryFn: () => repairsApi.getOne(id!),
    enabled: !!id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['repair-ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['repair-stats'] });
  };

  const diagnoseMutation = useMutation({
    mutationFn: () =>
      repairsApi.diagnose(id!, {
        diagnosedIssue: diagnosedIssue.trim(),
        diagnosisNotes: diagnosisNotes.trim() || undefined,
        estimatedCost: Number(estimatedCost) || 0,
        partsCost: Number(partsCost) || 0,
        laborCost: Number(laborCost) || 0,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Diagnosis saved' });
      setShowDiagnose(false);
      invalidate();
    },
  });

  const addPartMutation = useMutation({
    mutationFn: () =>
      repairsApi.addPart(id!, {
        partName: partName.trim(),
        quantity: Number(partQuantity) || 1,
        unitPrice: Number(partUnitPrice) || 0,
        unitCost: Number(partUnitCost) || 0,
      }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Part added' });
      setShowAddPart(false);
      setPartName('');
      setPartQuantity('1');
      setPartUnitPrice('');
      setPartUnitCost('');
      invalidate();
    },
  });

  const removePartMutation = useMutation({
    mutationFn: (partId: string) => repairsApi.removePart(id!, partId),
    onSuccess: () => invalidate(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (toStatus: RepairStatus) => repairsApi.updateStatus(id!, { toStatus, note: statusNote.trim() || undefined }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Status updated' });
      setShowStatus(false);
      setStatusNote('');
      invalidate();
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: () =>
      repairsApi.addPayment(id!, {
        amount: Number(paymentAmount),
        paymentMethod,
      }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      setShowAddPayment(false);
      setPaymentAmount('');
      invalidate();
    },
  });

  if (!ticket) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Wrench size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const statusCfg = REPAIR_STATUS_COLORS[ticket.status];
  const priorityCfg = REPAIR_PRIORITY_COLORS[ticket.priority];
  const validTransitions = VALID_STATUS_TRANSITIONS[ticket.status] || [];

  const handleWhatsApp = () => {
    const phone = ticket.customerPhone.replace(/[^0-9]/g, '');
    const msg = `As-salam-o-alaikum ${ticket.customerName} bhai,\n\n` +
      `Aap ki repair ticket ${ticket.ticketNumber} ka update:\n` +
      `Status: *${REPAIR_STATUS_LABELS[ticket.status]}*\n` +
      (ticket.diagnosedIssue ? `Issue: ${ticket.diagnosedIssue}\n` : '') +
      (ticket.totalCost > 0 ? `Total: ${formatPKRFull(ticket.totalCost)}\n` : '') +
      (ticket.balanceDue > 0 ? `Balance: ${formatPKRFull(ticket.balanceDue)}\n` : '') +
      `\nShukriya! 🙏`;
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`).catch(() =>
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.canGoBack() ? goBack() : router.replace('/industries/mobile/repairs' as any)}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#ea580c" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Repair Ticket</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {ticket.ticketNumber}
          </Text>
        </View>
        <Pressable
          onPress={handleWhatsApp}
          className="h-11 w-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle size={18} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{ backgroundColor: statusCfg.text }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <Smartphone size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-extrabold">
                {ticket.deviceBrand} {ticket.deviceModel}
              </Text>
              {ticket.deviceColor && (
                <Text className="text-white/80 text-xs mt-0.5">{ticket.deviceColor}</Text>
              )}
              <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text className="text-[10px] font-extrabold text-white">{REPAIR_STATUS_LABELS[ticket.status]}</Text>
                </View>
                {ticket.priority !== 'NORMAL' && (
                  <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Text className="text-[10px] font-extrabold text-white">
                      {REPAIR_PRIORITY_LABELS[ticket.priority]}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Customer */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
            Customer
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-orange-100 items-center justify-center">
              <User size={18} color="#ea580c" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-neutral-900">{ticket.customerName}</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Phone size={10} color="#64748b" />
                <Text className="text-xs text-neutral-500">{ticket.customerPhone}</Text>
              </View>
              {ticket.customerCnic && (
                <Text className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  CNIC: {ticket.customerCnic}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Issue */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-2">
            Reported Issue
          </Text>
          <Text className="text-sm text-neutral-800 font-bold">{ticket.reportedIssue}</Text>
          {ticket.diagnosedIssue && (
            <View className="mt-3 pt-3 border-t border-neutral-100">
              <Text className="text-[10px] uppercase font-extrabold text-blue-700 mb-1">Diagnosed Issue</Text>
              <Text className="text-sm text-neutral-800 font-bold">{ticket.diagnosedIssue}</Text>
              {ticket.diagnosisNotes && (
                <Text className="text-xs text-neutral-600 italic mt-1">{ticket.diagnosisNotes}</Text>
              )}
            </View>
          )}
        </View>

        {/* Costs */}
        <View className="mx-5 rounded-2xl bg-white border border-neutral-200 p-4 mb-3">
          <Text className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider mb-3">
            Cost Breakdown
          </Text>
          <View className="gap-1.5">
            {ticket.estimatedCost > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">Estimated</Text>
                <Text className="text-xs font-bold text-neutral-700">{formatPKRFull(ticket.estimatedCost)}</Text>
              </View>
            )}
            {ticket.partsCost > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">Parts</Text>
                <Text className="text-xs font-bold text-blue-700">{formatPKRFull(ticket.partsCost)}</Text>
              </View>
            )}
            {ticket.laborCost > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">Labor</Text>
                <Text className="text-xs font-bold text-violet-700">{formatPKRFull(ticket.laborCost)}</Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 mt-1 border-t-2 border-neutral-200">
              <Text className="text-base font-extrabold text-neutral-900">TOTAL</Text>
              <Text className="text-base font-extrabold text-neutral-900">{formatPKRFull(ticket.totalCost)}</Text>
            </View>
            {ticket.paidAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-emerald-700 font-bold">Paid</Text>
                <Text className="text-sm font-extrabold text-emerald-700">{formatPKRFull(ticket.paidAmount)}</Text>
              </View>
            )}
            {ticket.balanceDue > 0 && (
              <View className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 mt-1 flex-row justify-between">
                <Text className="text-xs font-extrabold text-amber-800 uppercase">Balance Due</Text>
                <Text className="text-base font-extrabold text-amber-700">{formatPKRFull(ticket.balanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Parts */}
        {ticket.parts && ticket.parts.length > 0 && (
          <View className="mx-5 rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-neutral-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Package size={14} color="#2563eb" />
                <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                  Parts Used ({ticket.parts.length})
                </Text>
              </View>
            </View>
            {ticket.parts.map((part, idx) => (
              <View
                key={part.id}
                className={`p-3 flex-row items-center gap-2 ${
                  idx !== ticket.parts!.length - 1 ? 'border-b border-neutral-100' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-neutral-900">{part.partName}</Text>
                  <Text className="text-[10px] text-neutral-500 mt-0.5">
                    {part.quantity} × {formatPKRFull(part.unitPrice)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-extrabold text-blue-700">
                    {formatPKRFull(part.totalPrice)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => removePartMutation.mutate(part.id)}
                  className="h-7 w-7 rounded-md bg-rose-50 items-center justify-center"
                >
                  <Trash2 size={11} color="#dc2626" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Status Log */}
        {ticket.statusLog && ticket.statusLog.length > 0 && (
          <View className="mx-5 rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-neutral-100">
              <View className="flex-row items-center gap-2">
                <Activity size={14} color="#8b5cf6" />
                <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                  Status History
                </Text>
              </View>
            </View>
            {ticket.statusLog.slice(0, 10).map((log, idx) => (
              <View
                key={log.id}
                className={`p-3 flex-row items-center gap-3 ${
                  idx !== ticket.statusLog!.length - 1 ? 'border-b border-neutral-100' : ''
                }`}
              >
                <View className="h-9 w-9 rounded-xl bg-violet-100 items-center justify-center">
                  <Activity size={16} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-neutral-800">
                    {REPAIR_STATUS_LABELS[log.toStatus]}
                  </Text>
                  <Text className="text-[10px] text-neutral-500 mt-0.5">
                    {formatDate(log.changedAt)}
                  </Text>
                  {log.note && (
                    <Text className="text-[10px] text-neutral-600 italic mt-0.5">{log.note}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payments */}
        {ticket.payments && ticket.payments.length > 0 && (
          <View className="mx-5 rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-neutral-100">
              <View className="flex-row items-center gap-2">
                <Wallet size={14} color="#16a34a" />
                <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                  Payments ({ticket.payments.length})
                </Text>
              </View>
            </View>
            {ticket.payments.map((pay, idx) => (
              <View
                key={pay.id}
                className={`p-3 flex-row items-center gap-3 ${
                  idx !== ticket.payments!.length - 1 ? 'border-b border-neutral-100' : ''
                }`}
              >
                <View className="h-9 w-9 rounded-xl bg-emerald-100 items-center justify-center">
                  <Wallet size={16} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-neutral-800">{pay.paymentMethod}</Text>
                  <Text className="text-[10px] text-neutral-500 mt-0.5">{formatDate(pay.paidAt)}</Text>
                </View>
                <Text className="text-sm font-extrabold text-emerald-700">
                  +{formatPKRFull(pay.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-neutral-200 px-5 py-3">
        <View className="flex-row gap-2 flex-wrap">
          {ticket.status === 'RECEIVED' && (
            <Pressable
              onPress={() => setShowDiagnose(true)}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#2563eb' }}
            >
              <Sparkles size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Diagnose</Text>
            </Pressable>
          )}
          {['DIAGNOSED', 'IN_PROGRESS', 'AWAITING_PARTS'].includes(ticket.status) && (
            <Pressable
              onPress={() => setShowAddPart(true)}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#8b5cf6' }}
            >
              <Package size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Add Part</Text>
            </Pressable>
          )}
          {ticket.balanceDue > 0 && (
            <Pressable
              onPress={() => {
                setPaymentAmount(String(ticket.balanceDue));
                setShowAddPayment(true);
              }}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Wallet size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Payment</Text>
            </Pressable>
          )}
          {validTransitions.length > 0 && (
            <Pressable
              onPress={() => setShowStatus(true)}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#ea580c' }}
            >
              <Activity size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Status</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Diagnose Modal */}
      <Modal visible={showDiagnose} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDiagnose(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-blue-600 items-center justify-center">
                <Sparkles size={20} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">Diagnose Issue</Text>
              <Pressable onPress={() => setShowDiagnose(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Diagnosed Issue *</Text>
              <TextInput
                value={diagnosedIssue}
                onChangeText={setDiagnosedIssue}
                multiline
                numberOfLines={2}
                placeholder="What's the actual problem?"
                placeholderTextColor="#9ca3af"
                autoFocus
                className="min-h-[70px] rounded-xl border-2 border-blue-200 bg-white p-3 text-sm font-bold text-neutral-900 mb-3"
                textAlignVertical="top"
              />
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Notes</Text>
              <TextInput
                value={diagnosisNotes}
                onChangeText={setDiagnosisNotes}
                multiline
                numberOfLines={2}
                placeholder="Extra diagnosis notes"
                placeholderTextColor="#9ca3af"
                className="min-h-[70px] rounded-xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900 mb-3"
                textAlignVertical="top"
              />
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Estimated Cost *</Text>
              <TextInput
                value={estimatedCost}
                onChangeText={setEstimatedCost}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 mb-3"
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Parts Cost</Text>
                  <TextInput
                    value={partsCost}
                    onChangeText={setPartsCost}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Labor</Text>
                  <TextInput
                    value={laborCost}
                    onChangeText={setLaborCost}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                  />
                </View>
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => {
                  if (!diagnosedIssue.trim() || !(Number(estimatedCost) > 0)) {
                    Toast.show({ type: 'error', text1: 'Issue & cost required' });
                    return;
                  }
                  diagnoseMutation.mutate();
                }}
                disabled={diagnoseMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: diagnoseMutation.isPending ? '#9ca3af' : '#2563eb' }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {diagnoseMutation.isPending ? 'Saving...' : 'Save Diagnosis'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add Part Modal */}
      <Modal visible={showAddPart} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAddPart(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-violet-600 items-center justify-center">
                <Package size={20} color="#ffffff" />
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900">Add Part</Text>
              <Pressable onPress={() => setShowAddPart(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Part Name *</Text>
              <TextInput
                value={partName}
                onChangeText={setPartName}
                autoFocus
                placeholder="Battery, Screen, Camera..."
                placeholderTextColor="#9ca3af"
                className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 mb-3"
              />
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Quantity</Text>
                  <TextInput
                    value={partQuantity}
                    onChangeText={setPartQuantity}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Unit Cost</Text>
                  <TextInput
                    value={partUnitCost}
                    onChangeText={setPartUnitCost}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Unit Price *</Text>
                  <TextInput
                    value={partUnitPrice}
                    onChangeText={setPartUnitPrice}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className="h-12 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 text-sm font-extrabold text-blue-900"
                  />
                </View>
              </View>
              {Number(partUnitPrice) > 0 && Number(partQuantity) > 0 && (
                <View className="rounded-xl bg-emerald-50 p-3 flex-row justify-between">
                  <Text className="text-sm text-emerald-700 font-bold">Total</Text>
                  <Text className="text-lg font-extrabold text-emerald-700">
                    {formatPKRFull(Number(partUnitPrice) * Number(partQuantity))}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => {
                  if (!partName.trim() || !(Number(partUnitPrice) > 0)) {
                    Toast.show({ type: 'error', text1: 'Name & price required' });
                    return;
                  }
                  addPartMutation.mutate();
                }}
                disabled={addPartMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: addPartMutation.isPending ? '#9ca3af' : '#8b5cf6' }}
              >
                <Plus size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">Add Part</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Status Update Modal */}
      <Modal visible={showStatus} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowStatus(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
            <Text className="flex-1 text-lg font-bold text-neutral-900">Update Status</Text>
            <Pressable onPress={() => setShowStatus(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2">Change to</Text>
            <View className="gap-2 mb-4">
              {validTransitions.map((s) => {
                const cfg = REPAIR_STATUS_COLORS[s];
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateStatusMutation.mutate(s);
                    }}
                    className="rounded-2xl border-2 p-3 flex-row items-center gap-2"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                  >
                    <Activity size={16} color={cfg.text} />
                    <Text className="flex-1 text-sm font-extrabold" style={{ color: cfg.text }}>
                      {REPAIR_STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-1.5">Note (optional)</Text>
            <TextInput
              value={statusNote}
              onChangeText={setStatusNote}
              multiline
              placeholder="Status change reason"
              placeholderTextColor="#9ca3af"
              className="min-h-[70px] rounded-xl border-2 border-neutral-200 bg-white p-3 text-sm font-bold text-neutral-900"
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showAddPayment} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAddPayment(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl bg-emerald-600 items-center justify-center">
                <Wallet size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-neutral-900">Record Payment</Text>
                <Text className="text-xs text-neutral-500">Balance: {formatPKRFull(ticket.balanceDue)}</Text>
              </View>
              <Pressable onPress={() => setShowAddPayment(false)} hitSlop={12} className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center">
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <TextInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                autoFocus
                className="h-16 rounded-2xl border-2 border-emerald-200 bg-white px-4 text-3xl font-extrabold text-neutral-900 mb-3"
              />
              <View className="flex-row flex-wrap -m-1">
                {(['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'] as PaymentMethod[]).map((m) => (
                  <View key={m} className="w-1/3 p-1">
                    <Pressable
                      onPress={() => setPaymentMethod(m)}
                      className="h-12 rounded-xl items-center justify-center border-2"
                      style={{
                        backgroundColor: paymentMethod === m ? '#16a34a' : '#ffffff',
                        borderColor: paymentMethod === m ? '#16a34a' : '#e5e7eb',
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: paymentMethod === m ? '#ffffff' : '#374151' }}>
                        {m}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200">
              <Pressable
                onPress={() => addPaymentMutation.mutate()}
                disabled={addPaymentMutation.isPending || !(Number(paymentAmount) > 0)}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                style={{ backgroundColor: addPaymentMutation.isPending ? '#9ca3af' : '#16a34a' }}
              >
                <CheckCircle2 size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">Record Payment</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
