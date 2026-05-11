import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform,
  Image, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft, CheckCircle2, Building2, Smartphone, Wallet, Globe,
  Copy, Check, Upload as UploadIcon, AlertCircle, FileImage, Zap,
  CreditCard, Trash2, Save,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImagePickerSheet } from '@/components/uploads';
import { billingApi, type PaymentProvider } from '@/api/billing.api';
import { stripeApi } from '@/api/stripe.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const providerOptions = [
  { id: 'MANUAL_BANK' as PaymentProvider, label: 'Bank Transfer', icon: Building2, color: '#16a34a' },
  { id: 'JAZZCASH' as PaymentProvider, label: 'JazzCash', icon: Smartphone, color: '#f97316' },
  { id: 'EASYPAISA' as PaymentProvider, label: 'EasyPaisa', icon: Zap, color: '#22c55e' },
  { id: 'NAYAPAY' as PaymentProvider, label: 'NayaPay', icon: Wallet, color: '#8b5cf6' },
];

export default function PayInvoiceScreen() {
  const { t } = useTranslation();
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
      Toast.show({
        type: 'success',
        text1: 'Submit ho gayi! ✅',
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
    onSuccess: async (data) => {
      await WebBrowser.openBrowserAsync(data.url);
      // After return, refresh
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
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-500">{t('auto.id.loading_invoice')}</Text>
      </SafeAreaView>
    );
  }

  const isPaid = invoice.status === 'PAID';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">{t('auto.id.pay_invoice')}</Text>
          <Text className="text-lg font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {invoice.invoiceNumber}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero amount card */}
          <View className="px-5 mb-4">
            <View className="rounded-3xl p-6 items-center" style={{ backgroundColor: '#16a34a' }}>
              <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.id.amount_due')}</Text>
              <Text className="text-5xl font-bold text-white mt-2">
                {formatPKRFull(invoice.amountDue)}
              </Text>
              {invoice.description && (
                <Text className="text-sm text-white/90 mt-2 text-center">
                  {invoice.description}
                </Text>
              )}
              <View className="mt-3 flex-row items-center gap-2">
                <Badge
                  variant={
                    invoice.status === 'PAID' ? 'success' :
                    invoice.status === 'OVERDUE' ? 'danger' : 'warning'
                  }
                  size="md"
                >
                  {invoice.status}
                </Badge>
              </View>
            </View>
          </View>

          {isPaid ? (
            <View className="px-5">
              <Card variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 p-8 items-center">
                <CheckCircle2 size={64} color="#16a34a" />
                <Text className="mt-4 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{t('auto.id.already_paid')}</Text>
                <Text className="text-sm text-emerald-700 dark:text-emerald-300 mt-2 text-center">{t('auto.id.ye_invoice_paid_ho_chuki_hai_aap_ki_subs')}</Text>
              </Card>
            </View>
          ) : (
            <>
              {/* Stripe quick pay */}
              {stripeConfig?.enabled && (
                <View className="px-5 mb-3">
                  <View
                    className="rounded-3xl p-5"
                    style={{ backgroundColor: '#1e40af' }}
                  >
                    <View className="flex-row items-center gap-3 mb-3">
                      <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center">
                        <Globe size={22} color="#ffffff" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-white">{t('auto.id.pay_with_card')}</Text>
                        <Text className="text-xs text-white/80">{t('auto.id.visa_master_auto_activate_instantly')}</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => stripeMutation.mutate(invoice.id)}
                      disabled={stripeMutation.isPending}
                      className="bg-white py-3 rounded-2xl flex-row items-center justify-center gap-2"
                    >
                      <CreditCard size={16} color="#1e40af" />
                      <Text className="text-blue-900 font-bold text-base">
                        {stripeMutation.isPending ? 'Loading...' : `Pay ${formatPKRFull(invoice.amountDue)}`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Manual divider */}
              <View className="px-5 mb-3 flex-row items-center gap-3">
                <View className="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800" />
                <Text className="text-xs text-neutral-500 font-bold">
                  {stripeConfig?.enabled ? 'OR Manual Payment' : 'Manual Payment'}
                </Text>
                <View className="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800" />
              </View>

              {/* Method picker */}
              <View className="px-5 mb-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.new.payment_method')}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {providerOptions.map((m) => {
                    const Icon = m.icon;
                    const active = provider === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setProvider(m.id)}
                        className="rounded-2xl border-2 p-3"
                        style={{
                          width: '48%',
                          borderColor: active ? m.color : '#e5e7eb',
                          backgroundColor: active ? `${m.color}15` : '#fff',
                        }}
                      >
                        <View className="flex-row items-center gap-2">
                          <View
                            className="h-9 w-9 rounded-xl items-center justify-center"
                            style={{ backgroundColor: active ? m.color : '#f3f4f6' }}
                          >
                            <Icon size={18} color={active ? '#ffffff' : '#6b7280'} />
                          </View>
                          <Text
                            className="font-bold text-sm flex-1"
                            style={{ color: active ? m.color : '#374151' }}
                          >
                            {m.label}
                          </Text>
                          {active && <Check size={14} color={m.color} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Send to details */}
              {bank && (
                <View className="px-5 mb-4">
                  <Card
                    variant="outline"
                    className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 p-4"
                  >
                    <Text className="font-bold text-emerald-900 dark:text-emerald-200 mb-3">{t('auto.id.payment_yahan_bhejein')}</Text>

                    {provider === 'MANUAL_BANK' && (
                      <View className="gap-3">
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
                      </View>
                    )}

                    {provider === 'JAZZCASH' && (
                      <View className="gap-3">
                        <DetailRow label="Account Title" value={bank.jazzcash.title} />
                        <CopyRow
                          label="JazzCash Number"
                          value={bank.jazzcash.number}
                          copyKey="jc"
                          copiedKey={copiedKey}
                          onCopy={copyToClipboard}
                          mono
                          large
                        />
                      </View>
                    )}

                    {provider === 'EASYPAISA' && (
                      <View className="gap-3">
                        <DetailRow label="Account Title" value={bank.easypaisa.title} />
                        <CopyRow
                          label="EasyPaisa Number"
                          value={bank.easypaisa.number}
                          copyKey="ep"
                          copiedKey={copiedKey}
                          onCopy={copyToClipboard}
                          mono
                          large
                        />
                      </View>
                    )}

                    {provider === 'NAYAPAY' && (
                      <View className="gap-3">
                        <DetailRow label="Account Title" value={bank.nayapay.title} />
                        <CopyRow
                          label="NayaPay Number"
                          value={bank.nayapay.number}
                          copyKey="np"
                          copiedKey={copiedKey}
                          onCopy={copyToClipboard}
                          mono
                          large
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
                      </View>
                    )}

                    <View className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex-row items-start gap-2">
                      <AlertCircle size={14} color="#b45309" />
                      <Text className="text-xs text-amber-900 dark:text-amber-200 flex-1 leading-4">
                        <Text className="font-bold">{formatPKRFull(invoice.amountDue)}</Text> bhejein, phir niche details aur screenshot upload karein.
                      </Text>
                    </View>
                  </Card>
                </View>
              )}

              {/* Form */}
              <View className="px-5">
                <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.id.aap_ki_details')}</Text>
                <View className="gap-3 mb-4">
                  <Input
                    label="Aap ka Naam *"
                    value={payerName}
                    onChangeText={setPayerName}
                    placeholder="Ahmad Ali"
                  />
                  <Input
                    label="Aap ka Phone"
                    value={payerPhone}
                    onChangeText={setPayerPhone}
                    placeholder="+923001234567"
                    keyboardType="phone-pad"
                  />
                  <Input
                    label="Transaction / TID Number"
                    value={transactionId}
                    onChangeText={setTransactionId}
                    placeholder="TX-12345678"
                    hint="Bank/wallet ka reference"
                  />
                  {provider === 'MANUAL_BANK' && (
                    <>
                      <Input
                        label="Aap ka Bank"
                        value={bankName}
                        onChangeText={setBankName}
                        placeholder="HBL, UBL, MCB..."
                      />
                      <Input
                        label="Aap ka Account #"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        placeholder="01234567890"
                      />
                    </>
                  )}
                </View>

                {/* Upload section */}
                <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.id.payment_receipt_screenshot')}</Text>
                {uploadUrl ? (
                  <Card variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 p-4 mb-4">
                    <View className="flex-row items-center gap-3">
                      <Image
                        source={{ uri: uploadUrl }}
                        className="h-16 w-16 rounded-xl"
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <CheckCircle2 size={14} color="#16a34a" />
                          <Text className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{t('auto.id.uploaded')}</Text>
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.id.tap_to_change')}</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setUploadId(null);
                          setUploadUrl(null);
                        }}
                        className="h-9 w-9 rounded-lg bg-rose-100 dark:bg-rose-950/40 items-center justify-center"
                      >
                        <Trash2 size={16} color="#dc2626" />
                      </Pressable>
                    </View>
                  </Card>
                ) : (
                  <Pressable
                    onPress={() => setShowPicker(true)}
                    className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 dark:bg-brand-950/40 p-6 items-center mb-4 active:opacity-70"
                  >
                    <View className="h-14 w-14 rounded-2xl bg-brand-600 items-center justify-center">
                      <UploadIcon size={28} color="#ffffff" />
                    </View>
                    <Text className="mt-3 text-base font-bold text-brand-700 dark:text-brand-300">{t('auto.id.screenshot_upload_karein')}</Text>
                    <Text className="text-xs text-brand-600 dark:text-brand-400 mt-1">{t('auto.id.camera_ya_gallery_se')}</Text>
                  </Pressable>
                )}

                <Input
                  label="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional info"
                />
              </View>
            </>
          )}
        </ScrollView>

        {!isPaid && (
          <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Button
              size="lg"
              loading={submitMutation.isPending}
              onPress={handleSubmit}
            >
              <Save size={18} color="#ffffff" />
              <Text className="text-white font-bold text-base">{t('auto.id.submit_for_approval')}</Text>
            </Button>
            <Text className="text-center text-[10px] text-neutral-500 mt-2">{t('auto.id.admin_24_hours_mein_review_karega')}</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="payment-proof"
        multiple={false}
        title="Payment Receipt"
        onUploaded={(records) => {
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
        {value}
      </Text>
    </View>
  );
}

function CopyRow({
  label, value, copyKey, copiedKey, onCopy, mono, large,
}: {
  label: string; value: string; copyKey: string;
  copiedKey: string | null; onCopy: (v: string, k: string) => void;
  mono?: boolean; large?: boolean;
}) {
  const isCopied = copiedKey === copyKey;
  return (
    <View>
      <Text className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
        {label}
      </Text>
      <Pressable
        onPress={() => onCopy(value, copyKey)}
        className="flex-row items-center gap-2 mt-0.5 active:opacity-70"
      >
        <Text
          className={`font-bold text-neutral-900 dark:text-white flex-1 ${mono ? 'font-mono' : ''} ${large ? 'text-xl' : 'text-base'}`}
          selectable
        >
          {value}
        </Text>
        <View className="h-9 w-9 rounded-lg bg-emerald-200 dark:bg-emerald-900/50 items-center justify-center">
          {isCopied ? (
            <Check size={16} color="#16a34a" />
          ) : (
            <Copy size={14} color="#16a34a" />
          )}
        </View>
      </Pressable>
    </View>
  );
}
