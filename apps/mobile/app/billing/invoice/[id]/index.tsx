import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform,
  Image, Alert, Linking, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, CheckCircle2, Building2, Smartphone, Wallet, Globe,
  Copy, Check, Upload as UploadIcon, AlertCircle, Zap,
  CreditCard, Trash2, Save, Receipt, Clock, ShieldCheck, Sparkles,
  ExternalLink, X,
} from 'lucide-react-native';
import { ImagePickerSheet } from '@/components/uploads';
import { billingApi, type PaymentProvider } from '@/api/billing.api';
import { stripeApi } from '@/api/stripe.api';
import { formatPKRFull } from '@/lib/format';
import { formatDate, paymentProviderConfig } from '@/features/billing/components/helpers';

const providerOptions: PaymentProvider[] = ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY'];

export default function PayInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<PaymentProvider>('MANUAL_BANK');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: invoice } = useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => billingApi.invoice(id),
    enabled: !!id,
  });

  const { data: bank } = useQuery({
    queryKey: ['billing-bank-info'],
    queryFn: billingApi.bankInfo,
  });

  const { data: stripeConfig } = useQuery({
    queryKey: ['stripe-config'],
    queryFn: stripeApi.config,
  });

  const submitMutation = useMutation({
    mutationFn: billingApi.submitPayment,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Submit ho gayi!',
        text2: 'Admin 24 hours mein review karega',
      });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      router.replace('/billing');
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Fail' }),
  });

  const stripeMutation = useMutation({
    mutationFn: (invoiceId: string) => stripeApi.checkout(invoiceId),
    onSuccess: async (data: any) => {
      await WebBrowser.openBrowserAsync(data.url);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['billing-invoice', id] });
        queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      }, 2000);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Stripe fail' }),
  });

  const copyToClipboard = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    Toast.show({ type: 'success', text1: 'Copy ho gaya!' });
  };

  const handleSubmit = () => {
    if (!invoice) return;
    if (!uploadId) {
      Toast.show({ type: 'error', text1: 'Screenshot upload karein' });
      return;
    }
    if (!payerName.trim()) {
      Toast.show({ type: 'error', text1: 'Aap ka naam zaroori hai' });
      return;
    }
    submitMutation.mutate({
      invoiceId: invoice.id,
      amount: invoice.amountDue,
      provider,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      transactionId: transactionId.trim() || undefined,
      payerName: payerName.trim(),
      payerPhone: payerPhone.trim() || undefined,
      uploadId,
      notes: notes.trim() || undefined,
    });
  };

  if (!invoice) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Receipt size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading invoice...</Text>
      </SafeAreaView>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';
  const currentProvider = paymentProviderConfig[provider];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Pay Invoice</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono" numberOfLines={1}>
            {invoice.invoiceNumber}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero amount */}
          <View className="px-5 mb-4">
            <View
              className="rounded-3xl p-6 items-center"
              style={{
                backgroundColor: '#0f172a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
                <Receipt size={11} color="#fde68a" />
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/90">
                  Pay Invoice
                </Text>
              </View>
              <Text className="text-white/70 text-sm font-bold">Amount Due</Text>
              <Text className="text-5xl font-extrabold text-white mt-1">
                {formatPKRFull(invoice.amountDue)}
              </Text>
              {invoice.description && (
                <Text className="text-sm text-white/80 mt-2 text-center font-semibold">
                  {invoice.description}
                </Text>
              )}
              <View className="mt-3 flex-row items-center gap-1">
                <Clock size={11} color="rgba(255,255,255,0.7)" />
                <Text className="text-xs text-white/70 font-semibold">
                  Due: {formatDate(invoice.dueDate)}
                </Text>
              </View>
            </View>
          </View>

          {isPaid ? (
            <View className="px-5">
              <View className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-8 items-center">
                <View className="h-20 w-20 rounded-3xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                  <CheckCircle2 size={40} color="#ffffff" />
                </View>
                <Text className="mt-4 text-2xl font-extrabold text-emerald-900">Already Paid! 🎉</Text>
                <Text className="text-sm text-emerald-700 mt-1 text-center font-semibold">
                  Ye invoice paid ho chuki hai
                </Text>
                <Text className="text-xs text-emerald-600 mt-2 font-bold">
                  Paid on: {formatDate(invoice.paidAt)}
                </Text>
              </View>
            </View>
          ) : isCancelled ? (
            <View className="px-5">
              <View className="rounded-3xl bg-slate-100 border-2 border-slate-300 p-8 items-center">
                <X size={48} color="#94a3b8" />
                <Text className="mt-3 text-xl font-extrabold text-slate-900">Invoice Cancelled</Text>
                <Text className="text-sm text-slate-600 mt-1 font-semibold">
                  Ye invoice cancel kar di gayi hai
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Stripe instant pay */}
              {stripeConfig?.enabled && (
                <View className="px-5 mb-3">
                  <View
                    className="rounded-3xl p-5"
                    style={{
                      backgroundColor: '#2563eb',
                      shadowColor: '#2563eb',
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      elevation: 6,
                    }}
                  >
                    <View className="flex-row items-center gap-3 mb-3">
                      <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
                        <Globe size={22} color="#ffffff" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-base font-extrabold text-white">
                            Pay with Card
                          </Text>
                          <View className="px-1.5 py-0.5 rounded-md bg-amber-400">
                            <Text className="text-[9px] font-extrabold text-amber-900 uppercase tracking-wider">
                              ⚡ Instant
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-white/80 mt-0.5 font-semibold">
                          Visa/Master • Auto-activate
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 mb-3">
                      <ShieldCheck size={10} color="#ffffff" />
                      <Text className="text-[10px] text-white/80 font-bold">
                        Secure • 256-bit SSL • Stripe
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => stripeMutation.mutate(invoice.id)}
                      disabled={stripeMutation.isPending}
                      className="h-12 rounded-xl bg-white items-center justify-center flex-row gap-2"
                    >
                      <CreditCard size={16} color="#2563eb" />
                      <Text className="text-blue-700 font-extrabold text-base">
                        {stripeMutation.isPending ? 'Loading...' : `Pay ${formatPKRFull(invoice.amountDue)}`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Divider */}
              <View className="px-5 mb-3 flex-row items-center gap-3">
                <View className="flex-1 h-px bg-neutral-200" />
                <Text className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                  {stripeConfig?.enabled ? 'Or Manual' : 'Manual Payment'}
                </Text>
                <View className="flex-1 h-px bg-neutral-200" />
              </View>

              {/* Method picker */}
              <View className="px-5 mb-3">
                <Text className="text-xs uppercase font-extrabold tracking-wider text-neutral-500 mb-2">
                  Payment Method
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {providerOptions.map((id) => {
                    const m = paymentProviderConfig[id];
                    const Icon = m.icon;
                    const active = provider === id;
                    return (
                      <View key={id} style={{ width: '50%', padding: 4 }}>
                        <Pressable
                          onPress={() => { Haptics.selectionAsync(); setProvider(id); }}
                          className="rounded-2xl border-2 p-3 flex-row items-center gap-2"
                          style={{
                            borderColor: active ? m.color : '#e5e7eb',
                            backgroundColor: active ? `${m.color}15` : '#ffffff',
                          }}
                        >
                          <View
                            className="h-10 w-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: active ? m.color : '#f3f4f6' }}
                          >
                            <Icon size={18} color={active ? '#ffffff' : '#6b7280'} />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text
                              className="font-extrabold text-sm"
                              style={{ color: active ? m.color : '#374151' }}
                              numberOfLines={1}
                            >
                              {m.label}
                            </Text>
                          </View>
                          {active && <Check size={14} color={m.color} />}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Send to details */}
              {bank && (
                <View className="px-5 mb-3">
                  <View
                    className="rounded-3xl overflow-hidden"
                    style={{ backgroundColor: currentProvider.color }}
                  >
                    <View className="p-5">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <currentProvider.icon size={14} color="#ffffff" />
                        <Text className="text-[10px] uppercase tracking-wider font-extrabold text-white/90">
                          Payment Yahan Bhejein
                        </Text>
                      </View>
                      <Text className="text-xl font-extrabold text-white mb-4">
                        {currentProvider.label}
                      </Text>

                      <View className="rounded-2xl bg-white p-4 gap-3">
                        {provider === 'MANUAL_BANK' && (
                          <>
                            <DetailRow label="Bank" value={bank.bank.name} />
                            <DetailRow label="Account Title" value={bank.bank.accountTitle} />
                            <CopyRow
                              label="Account Number"
                              value={bank.bank.accountNumber}
                              copyKey="acc"
                              copiedKey={copiedKey}
                              onCopy={copyToClipboard}
                              mono
                            />
                            <CopyRow
                              label="IBAN"
                              value={bank.bank.iban}
                              copyKey="iban"
                              copiedKey={copiedKey}
                              onCopy={copyToClipboard}
                              mono
                            />
                          </>
                        )}
                        {provider === 'JAZZCASH' && (
                          <>
                            <DetailRow label="Account Title" value={bank.jazzcash.title} />
                            <CopyRow
                              label="JazzCash Number"
                              value={bank.jazzcash.number}
                              copyKey="jc"
                              copiedKey={copiedKey}
                              onCopy={copyToClipboard}
                              mono large
                            />
                          </>
                        )}
                        {provider === 'EASYPAISA' && (
                          <>
                            <DetailRow label="Account Title" value={bank.easypaisa.title} />
                            <CopyRow
                              label="EasyPaisa Number"
                              value={bank.easypaisa.number}
                              copyKey="ep"
                              copiedKey={copiedKey}
                              onCopy={copyToClipboard}
                              mono large
                            />
                          </>
                        )}
                        {provider === 'NAYAPAY' && (
                          <>
                            <DetailRow label="Account Title" value={bank.nayapay.title} />
                            <CopyRow
                              label="NayaPay Number"
                              value={bank.nayapay.number}
                              copyKey="np"
                              copiedKey={copiedKey}
                              onCopy={copyToClipboard}
                              mono large
                            />
                            {bank.nayapay.handle && (
                              <CopyRow
                                label="NayaPay Handle"
                                value={`@${bank.nayapay.handle}`}
                                copyKey="nph"
                                copiedKey={copiedKey}
                                onCopy={copyToClipboard}
                              />
                            )}
                          </>
                        )}
                      </View>

                      <View className="mt-4 rounded-xl bg-amber-400/20 border-2 border-amber-300/40 p-3 flex-row items-start gap-2">
                        <AlertCircle size={14} color="#fde68a" />
                        <Text className="text-xs text-white flex-1 font-semibold">
                          <Text className="font-extrabold text-amber-200">
                            {formatPKRFull(invoice.amountDue)}
                          </Text>{' '}
                          bhejein, phir niche details aur screenshot upload karein.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Form */}
              <View className="px-5 gap-3 mb-3">
                <Text className="text-xs uppercase font-extrabold tracking-wider text-neutral-500 mb-1">
                  Transaction Details
                </Text>

                <FormInput label="Aap ka Naam *" value={payerName} onChangeText={setPayerName} placeholder="Ahmad Ali" />
                <FormInput label="Phone Number" value={payerPhone} onChangeText={setPayerPhone} placeholder="+923001234567" keyboardType="phone-pad" />
                <FormInput
                  label="Transaction / TID Number"
                  value={transactionId}
                  onChangeText={setTransactionId}
                  placeholder="TX-12345678"
                  hint="Bank/wallet ka reference"
                />
                {provider === 'MANUAL_BANK' && (
                  <>
                    <FormInput label="Aap ka Bank" value={bankName} onChangeText={setBankName} placeholder="HBL, UBL, MCB..." />
                    <FormInput label="Aap ka Account #" value={accountNumber} onChangeText={setAccountNumber} placeholder="01234567890" />
                  </>
                )}
              </View>

              {/* Upload */}
              <View className="px-5 mb-3">
                <Text className="text-xs uppercase font-extrabold tracking-wider text-neutral-500 mb-2">
                  Payment Receipt Screenshot *
                </Text>
                {uploadUrl ? (
                  <View className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4">
                    <View className="flex-row items-center gap-3">
                      <Image source={{ uri: uploadUrl }} className="h-16 w-16 rounded-xl" resizeMode="cover" />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <CheckCircle2 size={14} color="#15803d" />
                          <Text className="font-extrabold text-emerald-700">Uploaded</Text>
                        </View>
                        <Pressable
                          onPress={() => Linking.openURL(uploadUrl)}
                          className="flex-row items-center gap-1 mt-1"
                        >
                          <ExternalLink size={11} color="#2563eb" />
                          <Text className="text-xs text-blue-700 font-bold">View</Text>
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={() => {
                          setUploadId(null);
                          setUploadUrl(null);
                        }}
                        className="h-9 w-9 rounded-lg bg-rose-100 items-center justify-center"
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowPicker(true)}
                    className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 items-center active:opacity-70"
                  >
                    <View className="h-14 w-14 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                      <UploadIcon size={28} color="#ffffff" />
                    </View>
                    <Text className="mt-3 text-base font-extrabold text-emerald-700">
                      Screenshot upload karein
                    </Text>
                    <Text className="text-xs text-emerald-600 mt-1 font-semibold">
                      Camera ya Gallery se
                    </Text>
                  </Pressable>
                )}
              </View>

              <View className="px-5 mb-3">
                <FormInput label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Additional info" />
              </View>

              {/* Submit */}
              <View className="px-5 mb-3">
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                  style={{
                    backgroundColor: submitMutation.isPending ? '#9ca3af' : '#16a34a',
                    shadowColor: '#16a34a',
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <Save size={20} color="#ffffff" />
                  <Text className="text-white font-extrabold text-base">
                    {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </Text>
                </Pressable>
                <View className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-3 flex-row items-start gap-2">
                  <ShieldCheck size={14} color="#1d4ed8" />
                  <Text className="text-[11px] text-blue-900 font-semibold flex-1">
                    Admin <Text className="font-extrabold">24 hours</Text> mein review karega. Receipt safely store hoti hai.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="payment-proof"
        multiple={false}
        title="Payment Receipt"
        onUploaded={(records: any[]) => {
          if (records[0]) {
            setUploadId(records[0].id);
            setUploadUrl(records[0].url);
          }
          setShowPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

function FormInput({ label, hint, ...props }: any) {
  return (
    <View>
      <Text className="text-xs font-bold text-neutral-700 mb-1.5">{label}</Text>
      <View className="rounded-xl border-2 border-neutral-200 bg-white px-3 h-12 justify-center">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="text-base text-neutral-900"
          {...props}
        />
      </View>
      {hint && <Text className="text-[10px] text-neutral-500 mt-1 font-semibold">{hint}</Text>}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-base font-extrabold text-neutral-900 mt-0.5">{value}</Text>
    </View>
  );
}

function CopyRow({ label, value, copyKey, copiedKey, onCopy, mono, large }: any) {
  const isCopied = copiedKey === copyKey;
  return (
    <View>
      <Text className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
        {label}
      </Text>
      <Pressable
        onPress={() => onCopy(value, copyKey)}
        className="flex-row items-center gap-2 mt-0.5 active:opacity-70"
      >
        <Text
          className={`font-extrabold text-neutral-900 flex-1 ${mono ? 'font-mono' : ''}`}
          style={{ fontSize: large ? 20 : 16 }}
          selectable
        >
          {value}
        </Text>
        <View
          className="h-9 w-9 rounded-lg items-center justify-center"
          style={{ backgroundColor: isCopied ? '#16a34a' : '#dcfce7' }}
        >
          {isCopied ? <Check size={16} color="#ffffff" /> : <Copy size={14} color="#16a34a" />}
        </View>
      </Pressable>
    </View>
  );
}
