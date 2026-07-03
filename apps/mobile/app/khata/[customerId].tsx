import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft, BookOpen, Sparkles, Plus, X, Check, Phone, User as UserIcon,
  ArrowDownCircle, ArrowUpCircle, CalendarClock, Wallet, History,
  TrendingDown, Receipt, MessageCircle, Printer, Download, Star,
  AlertTriangle, CheckCircle2, Clock, AlertCircle, Sparkles as SparkIcon,
} from 'lucide-react-native';
import { customerLedgerApi, type LedgerType } from '@/api/customer-ledger.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

const daysSince = (v: string) =>
  Math.floor((Date.now() - new Date(v).getTime()) / (1000 * 60 * 60 * 24));

const typeConfig: Record<LedgerType, {
  label: string;
  bg: string;
  text: string;
  icon: any;
  isCredit: boolean;
  sign: string;
}> = {
  SALE_CREDIT: {
    label: 'Udhaar (Credit)',
    bg: '#fee2e2', text: '#b91c1c',
    icon: ArrowUpCircle, isCredit: true, sign: '+',
  },
  PAYMENT_RECEIVED: {
    label: 'Payment Received',
    bg: '#dcfce7', text: '#15803d',
    icon: ArrowDownCircle, isCredit: false, sign: '-',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    bg: '#f1f5f9', text: '#334155',
    icon: AlertCircle, isCredit: false, sign: '',
  },
  OPENING_BALANCE: {
    label: 'Opening Balance',
    bg: '#dbeafe', text: '#1d4ed8',
    icon: BookOpen, isCredit: true, sign: '+',
  },
};

export default function KhataCustomerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => customerLedgerApi.customerLedger(customerId!),
    enabled: !!customerId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const paymentMutation = useMutation({
    mutationFn: () =>
      customerLedgerApi.recordPayment(customerId!, {
        amount: Number(amount),
        note: note.trim() || undefined,
        reference: reference.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Payment recorded!',
        text2: `${formatPKRFull(Number(amount))} received`,
      });
      setAmount('');
      setNote('');
      setReference('');
      setPaymentOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-khata'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const customer = data?.customer;
  const entries = data?.entries ?? [];
  const balance = customer?.balance ?? 0;

  // Quick payment amounts
  const quickAmounts = useMemo(() => {
    if (!customer || balance <= 0) return [];
    const amts = new Set<number>();
    if (balance >= 500) amts.add(500);
    if (balance >= 1000) amts.add(1000);
    if (balance >= 2000) amts.add(2000);
    const half = Math.floor(balance / 2);
    if (half >= 100) amts.add(half);
    amts.add(balance);
    return Array.from(amts).sort((a, b) => a - b);
  }, [customer, balance]);

  // Ledger stats
  const stats = useMemo(() => {
    let totalCredits = 0;
    let totalPayments = 0;
    entries.forEach((e) => {
      if (e.type === 'SALE_CREDIT' || e.type === 'OPENING_BALANCE') {
        totalCredits += Math.abs(e.amount);
      } else if (e.type === 'PAYMENT_RECEIVED') {
        totalPayments += Math.abs(e.amount);
      }
    });
    return { totalCredits, totalPayments };
  }, [entries]);

  // WhatsApp reminder
  const sendWhatsAppReminder = () => {
    if (!customer?.phone) {
      Toast.show({ type: 'error', text1: 'Customer phone nahi hai' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phone = customer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92')
      ? phone
      : phone.startsWith('0')
      ? '92' + phone.slice(1)
      : '92' + phone;

    const msg = [
      `Assalam o Alaikum *${customer.name}*,`,
      '',
      `Aap ke account mein *${formatPKRFull(balance)}* ka udhaar baqi hai.`,
      'Bharai karne ki guzarish hai.',
      '',
      'Shukriya 🙏',
    ].join('\n');

    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
    });
  };

  const callCustomer = () => {
    if (!customer?.phone) return;
    Linking.openURL(`tel:${customer.phone}`);
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!customer || entries.length === 0) {
      Toast.show({ type: 'error', text1: 'Koi transactions nahi hain' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const rowsHtml = entries.map((e) => {
      const cfg = typeConfig[e.type];
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${formatDate(e.createdAt)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;"><strong>${cfg.label}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:${cfg.text};text-align:right;font-weight:bold;">${cfg.sign}${formatPKR(Math.abs(e.amount))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;">${formatPKR(e.balanceAfter)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:10px;color:#64748b;">${e.reference || ''} ${e.note || ''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:-apple-system,sans-serif;padding:24px;color:#0f172a}
      h1{font-size:20px;margin:0}
      .header{padding:16px;border-bottom:2px solid #dc2626;margin-bottom:16px}
      .balance-box{background:#fee2e2;padding:16px;border-radius:8px;margin:16px 0}
      table{width:100%;border-collapse:collapse}
      th{background:#f1f5f9;padding:10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b}
    </style></head><body>
    <div class="header">
      <h1>Khata Ledger</h1>
      <p style="color:#64748b;margin:4px 0 0;">${customer.name}${customer.phone ? ` • ${customer.phone}` : ''}</p>
    </div>
    <div class="balance-box">
      <div style="font-size:10px;text-transform:uppercase;color:#b91c1c;font-weight:bold;">Outstanding Balance</div>
      <div style="font-size:28px;font-weight:800;color:#7f1d1d;">${formatPKRFull(balance)}</div>
    </div>
    <table>
      <thead><tr>
        <th>Date</th><th>Type</th>
        <th style="text-align:right;">Amount</th>
        <th style="text-align:right;">Balance</th>
        <th>Note</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div style="margin-top:24px;padding-top:12px;border-top:1px dashed #cbd5e1;text-align:center;font-size:10px;color:#64748b;">
      Generated on ${new Date().toLocaleString('en-PK')}
    </div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Khata - ${customer.name}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'PDF failed', text2: e?.message });
    }
  };

  const printPDF = async () => {
    if (!customer || entries.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const rowsHtml = entries.map((e) => {
      const cfg = typeConfig[e.type];
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${formatDate(e.createdAt)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;"><strong>${cfg.label}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:${cfg.text};text-align:right;font-weight:bold;">${cfg.sign}${formatPKR(Math.abs(e.amount))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;">${formatPKR(e.balanceAfter)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:-apple-system,sans-serif;padding:20px}
      h1{font-size:18px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#f1f5f9;padding:8px;text-align:left;font-size:10px}
    </style></head><body>
      <h1>Khata - ${customer.name}</h1>
      <p>Balance: <strong>${formatPKRFull(balance)}</strong></p>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Balance</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`;

    try {
      await Print.printAsync({ html });
    } catch {}
  };

  if (!data || !customer) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <BookOpen size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading khata...</Text>
      </SafeAreaView>
    );
  }

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
          <ArrowLeft size={20} color="#dc2626" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Customer Khata</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
            {customer.name}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPaymentOpen(true);
          }}
          disabled={balance <= 0}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: balance > 0 ? '#16a34a' : '#9ca3af',
            shadowColor: '#16a34a',
            shadowOpacity: balance > 0 ? 0.3 : 0,
            shadowRadius: 8,
            elevation: balance > 0 ? 4 : 0,
          }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">Payment</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — Current Balance */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: balance > 0 ? '#dc2626' : '#16a34a',
              shadowColor: balance > 0 ? '#dc2626' : '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <BookOpen size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                    {balance > 0 ? 'Outstanding Udhaar' : 'Account Clear'}
                  </Text>
                  {customer.isVip && (
                    <View className="bg-amber-400/30 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
                      <Star size={8} color="#fef3c7" fill="#fef3c7" />
                      <Text className="text-[9px] font-extrabold text-amber-100">VIP</Text>
                    </View>
                  )}
                </View>
                <Text className="text-4xl font-extrabold text-white mt-1">
                  {formatPKRFull(balance)}
                </Text>
                {balance === 0 && (
                  <View className="mt-1 flex-row items-center gap-1">
                    <CheckCircle2 size={12} color="#dcfce7" />
                    <Text className="text-xs text-white/90 font-bold">Fully cleared</Text>
                  </View>
                )}
              </View>
            </View>

            {customer.phone && (
              <View className="pt-3 border-t border-white/20 flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center gap-1.5">
                  <Phone size={11} color="rgba(255,255,255,0.8)" />
                  <Text className="text-xs text-white/90 font-semibold">{customer.phone}</Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={callCustomer}
                    className="h-9 w-9 rounded-xl bg-white/20 items-center justify-center active:opacity-70"
                  >
                    <Phone size={14} color="#ffffff" />
                  </Pressable>
                  <Pressable
                    onPress={sendWhatsAppReminder}
                    disabled={balance === 0}
                    className="h-9 px-3 rounded-xl bg-green-600 items-center justify-center flex-row gap-1 active:opacity-70"
                    style={{ opacity: balance > 0 ? 1 : 0.5 }}
                  >
                    <MessageCircle size={14} color="#ffffff" />
                    <Text className="text-white text-[11px] font-extrabold">Remind</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View className="px-5 mb-4">
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/3 px-1.5">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
                <View className="flex-row items-center gap-1">
                  <ArrowUpCircle size={11} color="#dc2626" />
                  <Text className="text-[10px] uppercase font-extrabold text-rose-700">Total Credit</Text>
                </View>
                <Text className="mt-1 text-sm font-extrabold text-rose-700" numberOfLines={1}>
                  {formatPKR(stats.totalCredits)}
                </Text>
              </View>
            </View>
            <View className="w-1/3 px-1.5">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
                <View className="flex-row items-center gap-1">
                  <ArrowDownCircle size={11} color="#16a34a" />
                  <Text className="text-[10px] uppercase font-extrabold text-emerald-700">Received</Text>
                </View>
                <Text className="mt-1 text-sm font-extrabold text-emerald-700" numberOfLines={1}>
                  {formatPKR(stats.totalPayments)}
                </Text>
              </View>
            </View>
            <View className="w-1/3 px-1.5">
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 p-3">
                <View className="flex-row items-center gap-1">
                  <History size={11} color="#7c3aed" />
                  <Text className="text-[10px] uppercase font-extrabold text-violet-700">Entries</Text>
                </View>
                <Text className="mt-1 text-sm font-extrabold text-violet-700">
                  {entries.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View className="px-5 mb-4 flex-row gap-2">
          <Pressable
            onPress={printPDF}
            disabled={entries.length === 0}
            className="flex-1 h-11 rounded-xl bg-neutral-900 items-center justify-center flex-row gap-1.5 active:opacity-70"
            style={{ opacity: entries.length > 0 ? 1 : 0.5 }}
          >
            <Printer size={14} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Print</Text>
          </Pressable>
          <Pressable
            onPress={generatePDF}
            disabled={entries.length === 0}
            className="flex-1 h-11 rounded-xl bg-blue-600 items-center justify-center flex-row gap-1.5 active:opacity-70"
            style={{ opacity: entries.length > 0 ? 1 : 0.5 }}
          >
            <Download size={14} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Export PDF</Text>
          </Pressable>
        </View>

        {/* Timeline */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <History size={16} color="#dc2626" />
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                Transaction History
              </Text>
            </View>
            <Text className="text-xs text-neutral-500 font-bold">
              {entries.length} entries
            </Text>
          </View>

          {entries.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-200 items-center py-12">
              <Clock size={40} color="#d1d5db" />
              <Text className="mt-3 text-base font-bold text-neutral-700">No transactions yet</Text>
              <Text className="mt-1 text-xs text-neutral-500 text-center">
                Sales aur payments yahan dikhenge
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {entries.map((entry) => {
                const cfg = typeConfig[entry.type];
                const Icon = cfg.icon;
                const isOverdue = cfg.isCredit && daysSince(entry.createdAt) > 30;
                return (
                  <View
                    key={entry.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-3.5"
                    style={{ borderColor: isOverdue ? '#fca5a5' : '#e5e7eb' }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-11 w-11 rounded-xl items-center justify-center shrink-0"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <Icon size={20} color={cfg.text} />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <View
                            className="px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text
                              className="text-[9px] font-extrabold uppercase"
                              style={{ color: cfg.text }}
                            >
                              {cfg.label}
                            </Text>
                          </View>
                          {isOverdue && (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100">
                              <AlertTriangle size={8} color="#b91c1c" />
                              <Text className="text-[9px] font-extrabold text-rose-700">OVERDUE</Text>
                            </View>
                          )}
                        </View>
                        {entry.reference && (
                          <Text className="font-mono text-[11px] font-extrabold text-violet-700 mt-1">
                            {entry.reference}
                          </Text>
                        )}
                        {entry.note && (
                          <Text className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                            {entry.note}
                          </Text>
                        )}
                        <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                          <View className="flex-row items-center gap-1">
                            <CalendarClock size={9} color="#9ca3af" />
                            <Text className="text-[10px] text-neutral-500">
                              {formatDate(entry.createdAt)}
                            </Text>
                          </View>
                          <Text className="text-[10px] text-neutral-400">•</Text>
                          <Text className="text-[10px] text-neutral-500 font-bold">
                            {formatRelative(entry.createdAt)}
                          </Text>
                          {entry.createdBy && (
                            <>
                              <Text className="text-[10px] text-neutral-400">•</Text>
                              <View className="flex-row items-center gap-0.5">
                                <UserIcon size={9} color="#9ca3af" />
                                <Text className="text-[10px] text-neutral-500">
                                  {entry.createdBy.fullName}
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                      <View className="items-end shrink-0">
                        <Text
                          className="text-lg font-extrabold"
                          style={{ color: cfg.text }}
                        >
                          {cfg.sign}{formatPKR(Math.abs(entry.amount))}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 font-bold">
                          Bal: {formatPKR(entry.balanceAfter)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={paymentOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPaymentOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Modal header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <ArrowDownCircle size={18} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    Record Payment
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    From {customer.name}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setPaymentOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Current balance */}
              <View className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 p-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Current Outstanding
                </Text>
                <Text className="text-3xl font-extrabold text-rose-900 dark:text-rose-100 mt-1">
                  {formatPKRFull(balance)}
                </Text>
              </View>

              {/* Amount input */}
              <View className="mt-4">
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                  Payment Amount <Text className="text-rose-600">*</Text>
                </Text>
                <View className="flex-row items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-4 h-16">
                  <Text className="text-lg font-bold text-emerald-700">Rs</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor="#86efac"
                    keyboardType="numeric"
                    autoFocus
                    className="flex-1 text-3xl font-extrabold text-emerald-900 dark:text-emerald-100"
                  />
                </View>

                {/* Quick amounts */}
                {quickAmounts.length > 0 && (
                  <View className="mt-3">
                    <View className="flex-row items-center gap-1 mb-1.5">
                      <SparkIcon size={11} color="#f59e0b" />
                      <Text className="text-[10px] uppercase tracking-wider text-neutral-500 font-extrabold">
                        Quick amounts
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {quickAmounts.map((amt, i) => {
                        const isClearAll = amt === balance;
                        return (
                          <Pressable
                            key={i}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setAmount(String(amt));
                            }}
                            className="px-3 h-10 rounded-xl items-center justify-center flex-row gap-1"
                            style={{
                              backgroundColor: isClearAll ? '#dc2626' : '#dcfce7',
                              borderWidth: 2,
                              borderColor: isClearAll ? '#dc2626' : '#86efac',
                            }}
                          >
                            {isClearAll && (
                              <CheckCircle2 size={11} color="#ffffff" />
                            )}
                            <Text
                              className="text-xs font-extrabold"
                              style={{ color: isClearAll ? '#ffffff' : '#15803d' }}
                            >
                              {isClearAll ? 'Clear All • ' : ''}
                              {formatPKR(amt)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Reference (optional) */}
              <View className="mt-4">
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                  Reference (optional)
                </Text>
                <View className="rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 px-4 h-12 justify-center">
                  <TextInput
                    value={reference}
                    onChangeText={setReference}
                    placeholder="e.g., JazzCash ID, Bank ref..."
                    placeholderTextColor="#9ca3af"
                    className="text-base text-neutral-900 dark:text-white"
                  />
                </View>
              </View>

              {/* Note */}
              <View className="mt-4">
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">Note</Text>
                <View className="rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 px-4 py-3">
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g., Cash received in shop..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    className="text-base text-neutral-900 dark:text-white min-h-[60px]"
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* After payment preview */}
              {Number(amount) > 0 && (
                <View className="mt-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 p-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Baqi Udhaar (after payment)
                  </Text>
                  <Text className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 mt-1">
                    {formatPKRFull(Math.max(0, balance - Number(amount)))}
                  </Text>
                  <Text className="text-[11px] text-blue-700 mt-1">
                    Customer ka udhaar payment ke baad
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Submit button */}
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  const amt = Number(amount);
                  if (!amt || amt <= 0) {
                    Toast.show({ type: 'error', text1: 'Valid amount required' });
                    return;
                  }
                  if (amt > balance) {
                    Alert.alert(
                      'Amount exceeds balance',
                      `Amount (${formatPKR(amt)}) balance (${formatPKR(balance)}) se zyada hai. Continue?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm', onPress: () => paymentMutation.mutate() },
                      ],
                    );
                    return;
                  }
                  paymentMutation.mutate();
                }}
                disabled={paymentMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: paymentMutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
