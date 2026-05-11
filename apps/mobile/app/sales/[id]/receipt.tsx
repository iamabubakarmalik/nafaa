import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Printer, Share2, Receipt, Store, CalendarClock,
  User, Phone, CheckCircle2, Sparkles,
} from 'lucide-react-native';
import { salesApi } from '@/api/sales.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function ReceiptScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tenant } = useAuthStore();
  const [printing, setPrinting] = useState(false);

  const { data: sale } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: async () => {
      try {
        return await salesApi.byId(id);
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });

  const generateHtml = () => {
    if (!sale) return '';

    const itemRows = sale.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 4px 0; font-size: 11px;">${item.product.name}</td>
          <td style="text-align: center; padding: 4px 0; font-size: 11px;">${item.quantity}</td>
          <td style="text-align: right; padding: 4px 0; font-size: 11px;">Rs ${item.price.toFixed(0)}</td>
          <td style="text-align: right; padding: 4px 0; font-size: 11px; font-weight: bold;">Rs ${item.total.toFixed(0)}</td>
        </tr>`,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${sale.saleNumber}</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 16px; max-width: 280px; color: #0f172a; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #94a3b8; margin: 8px 0; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .subtle { font-size: 10px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; color: #475569; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; text-align: left; }
    .total-row { font-size: 14px; font-weight: bold; }
    .summary-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${tenant?.name || 'Nafaa'}</div>
    <div class="subtle">Pakistan-first retail POS</div>
  </div>
  <div class="divider"></div>
  <div class="summary-row"><span>Receipt:</span><span class="bold">${sale.saleNumber}</span></div>
  <div class="summary-row"><span>Date:</span><span>${formatDate(sale.soldAt)}</span></div>
  ${sale.customer ? `<div class="summary-row"><span>Customer:</span><span>${sale.customer.name}</span></div>` : ''}
  ${sale.createdBy ? `<div class="summary-row"><span>Cashier:</span><span>${sale.createdBy.fullName}</span></div>` : ''}
  <div class="divider"></div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="divider"></div>
  <div class="summary-row"><span>Subtotal:</span><span>Rs ${sale.subtotal.toFixed(0)}</span></div>
  ${sale.discount > 0 ? `<div class="summary-row"><span>Discount:</span><span>-Rs ${sale.discount.toFixed(0)}</span></div>` : ''}
  <div class="summary-row total-row"><span>TOTAL:</span><span>Rs ${sale.total.toFixed(0)}</span></div>
  <div class="divider"></div>
  <div class="summary-row"><span>Paid (${sale.paymentMethod}):</span><span class="bold">Rs ${sale.paidAmount.toFixed(0)}</span></div>
  ${sale.creditAmount > 0 ? `<div class="summary-row"><span>Credit / Udhaar:</span><span class="bold">Rs ${sale.creditAmount.toFixed(0)}</span></div>` : ''}
  ${sale.changeAmount > 0 ? `<div class="summary-row"><span>Change:</span><span>Rs ${sale.changeAmount.toFixed(0)}</span></div>` : ''}
  <div class="divider"></div>
  <div class="center subtle" style="margin-top: 12px;">
    Shukriya! 🌙<br/>
    Made with ❤️ in Pakistan
  </div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    if (!sale) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrinting(true);
    try {
      await Print.printAsync({ html: generateHtml() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e?.message && !e.message.includes('cancelled')) {
        Toast.show({ type: 'error', text1: 'Print failed', text2: e.message });
      }
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!sale) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { uri } = await Print.printToFileAsync({ html: generateHtml() });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${sale.saleNumber}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved`);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Share failed', text2: e?.message });
    }
  };

  if (!sale) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Receipt size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">{t('auto.receipt.loading_receipt')}</Text>
      </SafeAreaView>
    );
  }

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
          <Text className="text-xs text-neutral-500">{t('auto.index.receipt')}</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
            {sale.saleNumber}
          </Text>
        </View>
        <Pressable
          onPress={handleShare}
          className="h-11 w-11 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center"
        >
          <Share2 size={18} color="#374151" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Receipt Card */}
        <View className="rounded-3xl bg-white shadow-sm border border-neutral-200 overflow-hidden">
          {/* Store Header */}
          <View className="items-center py-6 px-5 border-b border-dashed border-neutral-300">
            <View className="h-14 w-14 rounded-2xl bg-emerald-100 items-center justify-center mb-2">
              <Store size={24} color="#16a34a" />
            </View>
            <Text className="text-xl font-extrabold text-neutral-900">
              {tenant?.name || 'Nafaa'}
            </Text>
            <Text className="text-[10px] text-neutral-500 mt-0.5">{t('auto.receipt.pakistan_first_retail_pos')}</Text>
          </View>

          {/* Meta */}
          <View className="px-5 py-4 gap-1.5 border-b border-dashed border-neutral-300">
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Receipt #</Text>
              <Text className="text-xs font-mono font-extrabold text-neutral-900">
                {sale.saleNumber}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">{t('auto.id.date')}</Text>
              <Text className="text-xs font-bold text-neutral-700">
                {formatDate(sale.soldAt)}
              </Text>
            </View>
            {sale.customer && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">{t('auto.id.customer')}</Text>
                <Text className="text-xs font-bold text-neutral-700" numberOfLines={1}>
                  {sale.customer.name}
                </Text>
              </View>
            )}
            {sale.createdBy && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-neutral-500">{t('auto.receipt.cashier')}</Text>
                <Text className="text-xs font-bold text-neutral-700">
                  {sale.createdBy.fullName}
                </Text>
              </View>
            )}
          </View>

          {/* Items Header */}
          <View className="px-5 py-2 border-b border-neutral-200 flex-row">
            <Text className="flex-1 text-[10px] font-extrabold uppercase text-neutral-500">{t('auto.receipt.item')}</Text>
            <Text className="w-10 text-center text-[10px] font-extrabold uppercase text-neutral-500">{t('auto.receipt.qty')}</Text>
            <Text className="w-16 text-right text-[10px] font-extrabold uppercase text-neutral-500">{t('auto.receipt.price')}</Text>
            <Text className="w-20 text-right text-[10px] font-extrabold uppercase text-neutral-500">{t('auto.receipt.total')}</Text>
          </View>

          {/* Items */}
          <View className="px-5 py-2 border-b border-dashed border-neutral-300">
            {sale.items.map((item) => (
              <View key={item.id} className="flex-row py-1.5">
                <Text className="flex-1 text-xs text-neutral-900" numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text className="w-10 text-center text-xs text-neutral-700">
                  {item.quantity}
                </Text>
                <Text className="w-16 text-right text-xs text-neutral-700">
                  {formatPKRFull(item.price)}
                </Text>
                <Text className="w-20 text-right text-xs font-bold text-neutral-900">
                  {formatPKRFull(item.total)}
                </Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View className="px-5 py-3 gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">{t('auto.receipt.subtotal')}</Text>
              <Text className="text-xs font-bold text-neutral-700">
                {formatPKRFull(sale.subtotal)}
              </Text>
            </View>
            {sale.discount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-emerald-700">{t('auto.receipt.discount')}</Text>
                <Text className="text-xs font-bold text-emerald-700">
                  -{formatPKRFull(sale.discount)}
                </Text>
              </View>
            )}
            <View className="pt-2 mt-1 border-t border-neutral-200 flex-row justify-between">
              <Text className="text-base font-extrabold text-neutral-900">TOTAL</Text>
              <Text className="text-base font-extrabold text-neutral-900">
                {formatPKRFull(sale.total)}
              </Text>
            </View>
          </View>

          {/* Payment */}
          <View className="px-5 py-3 bg-neutral-50 border-t border-dashed border-neutral-300 gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-700 font-semibold">
                Paid ({sale.paymentMethod})
              </Text>
              <Text className="text-sm font-extrabold text-emerald-700">
                {formatPKRFull(sale.paidAmount)}
              </Text>
            </View>
            {sale.creditAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-amber-700 font-semibold">{t('auto.receipt.udhaar_credit')}</Text>
                <Text className="text-sm font-extrabold text-amber-700">
                  {formatPKRFull(sale.creditAmount)}
                </Text>
              </View>
            )}
            {sale.changeAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-blue-700 font-semibold">{t('auto.receipt.change_returned')}</Text>
                <Text className="text-sm font-extrabold text-blue-700">
                  {formatPKRFull(sale.changeAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="items-center py-5 px-5">
            <View className="flex-row items-center gap-1.5">
              <CheckCircle2 size={14} color="#16a34a" />
              <Text className="text-xs font-bold text-emerald-700">{t('auto.receipt.sale_complete')}</Text>
            </View>
            <Text className="text-[10px] text-neutral-500 mt-2 text-center">{t('auto.receipt.shukriya')}</Text>
            <Text className="text-[10px] text-neutral-400 mt-0.5">{t('auto.receipt.made_with_in_pakistan')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Print Button */}
      <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <Pressable
          onPress={handlePrint}
          disabled={printing}
          className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
          style={{
            backgroundColor: printing ? '#9ca3af' : '#16a34a',
            shadowColor: '#16a34a',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Printer size={20} color="#ffffff" />
          <Text className="text-white font-extrabold text-base">
            {printing ? 'Printing...' : 'Print Receipt'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
