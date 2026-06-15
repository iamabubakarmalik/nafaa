import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import {
  ArrowLeft, Printer, Share2, MessageCircle, Receipt, User, Calendar,
  CreditCard, X as XIcon,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { salesApi } from '@/api/sales.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull, formatDate, formatTime } from '@/lib/format';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function SaleDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tenant } = useAuthStore();

  const { data: sale } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.byId(id),
    enabled: !!id,
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => salesApi.voidSale(id, reason),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Sale void ho gayi' });
      queryClient.invalidateQueries({ queryKey: ['sale', id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Fail' }),
  });

  const generateReceiptHTML = () => {
    if (!sale) return '';
    const itemsHTML = sale.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #ddd;">${item.product.name}</td>
          <td style="padding: 6px 0; text-align: center; border-bottom: 1px dashed #ddd;">${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; border-bottom: 1px dashed #ddd;">Rs ${item.total.toLocaleString()}</td>
        </tr>`,
      )
      .join('');

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: monospace; padding: 20px; max-width: 380px; margin: 0 auto; }
            h1 { text-align: center; font-size: 22px; margin: 0; }
            .center { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            .total { font-size: 18px; font-weight: bold; padding-top: 10px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${sale.tenant?.name || tenant?.name || 'Receipt'}</h1>
          <p class="center" style="font-size: 11px; color: #666; margin: 4px 0;">
            ${formatDate(sale.soldAt)} ${formatTime(sale.soldAt)}
          </p>
          <p class="center" style="font-size: 13px; margin: 4px 0;">
            Receipt: <strong>${sale.saleNumber}</strong>
          </p>
          ${sale.customer ? `<p class="center" style="font-size: 12px;">Customer: ${sale.customer.name}</p>` : ''}
          <hr style="border: 1px dashed #999;" />
          <table>
            <thead>
              <tr>
                <th style="text-align: left; padding-bottom: 6px;">Item</th>
                <th style="text-align: center; padding-bottom: 6px;">Qty</th>
                <th style="text-align: right; padding-bottom: 6px;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <table style="margin-top: 16px;">
            <tr class="total">
              <td>TOTAL</td>
              <td style="text-align: right;">Rs ${sale.total.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding-top: 4px;">Paid (${sale.paymentMethod})</td>
              <td style="text-align: right; padding-top: 4px;">Rs ${sale.paidAmount.toLocaleString()}</td>
            </tr>
            ${sale.creditAmount > 0 ? `<tr><td>Khata</td><td style="text-align: right;">Rs ${sale.creditAmount.toLocaleString()}</td></tr>` : ''}
          </table>
          <p class="footer">
            Shukriya! 🙏<br/>
            Powered by Nafaa POS
          </p>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: generateReceiptHTML() });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Print fail', text2: e.message });
    }
  };

  const handleShare = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateReceiptHTML() });
      const ok = await Sharing.isAvailableAsync();
      if (ok) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${sale?.saleNumber}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Share fail' });
    }
  };

  const handleWhatsApp = () => {
    if (!sale?.customer?.phone) {
      Alert.alert('Phone nahi hai', 'Customer ka phone number nahi hai');
      return;
    }
    const phone = sale.customer.phone.replace(/[^0-9]/g, '');
    const items = sale.items
      .map((it) => `• ${it.product.name} × ${it.quantity} = Rs ${it.total}`)
      .join('\n');
    const message = `*${sale.tenant?.name || tenant?.name}*\n\nReceipt: ${sale.saleNumber}\nDate: ${formatDate(sale.soldAt)}\n\n${items}\n\n*Total: Rs ${sale.total}*\nPaid: Rs ${sale.paidAmount}${sale.creditAmount > 0 ? `\nKhata: Rs ${sale.creditAmount}` : ''}\n\nShukriya! 🙏`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    });
  };

  const handleVoid = () => {
    Alert.prompt(
      'Sale Void Karein',
      'Wajah likhein (optional)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: (reason?: string) => voidMutation.mutate(reason || 'No reason'),
        },
      ],
      'plain-text',
    );
  };

  if (!sale) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-500">{t('auto.section.loading')}</Text>
      </SafeAreaView>
    );
  }

  const isVoided = sale.status === 'VOIDED';

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
        <Text className="flex-1 text-xl font-bold text-neutral-900 dark:text-white">{t('auto.id.sale_detail')}</Text>
        {!isVoided && (
          <Pressable
            onPress={handleVoid}
            className="h-11 w-11 rounded-2xl bg-rose-100 dark:bg-rose-950/40 items-center justify-center"
          >
            <XIcon size={18} color="#dc2626" />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {isVoided && (
          <View className="mx-5 mb-3 p-3 rounded-xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300">
            <Text className="text-center text-rose-700 dark:text-rose-400 font-bold">{t('auto.id.this_sale_is_voided')}</Text>
          </View>
        )}

        {/* Receipt summary */}
        <View className="px-5">
          <Card variant="outline" className="p-5">
            <View className="items-center pb-4 border-b border-dashed border-neutral-300 dark:border-neutral-700">
              <View className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
                <Receipt size={28} color="#16a34a" />
              </View>
              <Text className="mt-3 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatPKRFull(sale.total)}
              </Text>
              <Text className="text-sm text-neutral-500 mt-0.5 font-mono">
                {sale.saleNumber}
              </Text>
              <Badge variant={isVoided ? 'danger' : 'success'} size="md" className="mt-2">
                {sale.status}
              </Badge>
            </View>

            <View className="pt-4 gap-3">
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#9ca3af" />
                  <Text className="text-sm text-neutral-500">{t('auto.id.date')}</Text>
                </View>
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  {formatDate(sale.soldAt)} {formatTime(sale.soldAt)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <User size={14} color="#9ca3af" />
                  <Text className="text-sm text-neutral-500">{t('auto.id.customer')}</Text>
                </View>
                <Pressable
                  onPress={() => sale.customer && router.push(`/customers/${sale.customer.id}`)}
                  disabled={!sale.customer}
                >
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                    {sale.customer?.name || 'Walk-in'}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <CreditCard size={14} color="#9ca3af" />
                  <Text className="text-sm text-neutral-500">{t('auto.id.payment')}</Text>
                </View>
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  {sale.paymentMethod}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Items */}
        <View className="px-5 mt-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Items ({sale.items.length})
          </Text>
          <Card variant="outline" className="p-0">
            {sale.items.map((item, idx) => (
              <View
                key={item.id}
                className={`flex-row items-center px-4 py-3 ${
                  idx !== sale.items.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {formatPKRFull(item.price)} × {item.quantity}
                  </Text>
                </View>
                <Text className="font-bold text-neutral-900 dark:text-white">
                  {formatPKRFull(item.total)}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Totals */}
        <View className="px-5 mt-4">
          <Card variant="outline" className="p-4">
            <View className="flex-row justify-between py-1">
              <Text className="text-sm text-neutral-500">{t('auto.receipt.subtotal')}</Text>
              <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                {formatPKRFull(sale.subtotal)}
              </Text>
            </View>
            {sale.discount > 0 && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-neutral-500">{t('auto.receipt.discount')}</Text>
                <Text className="text-sm font-bold text-rose-700">
                  -{formatPKRFull(sale.discount)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between py-1">
              <Text className="text-sm text-neutral-500">{t('auto.index.paid')}</Text>
              <Text className="text-sm font-bold text-emerald-700">
                {formatPKRFull(sale.paidAmount)}
              </Text>
            </View>
            {sale.creditAmount > 0 && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-neutral-500">{t('auto.id.khata')}</Text>
                <Text className="text-sm font-bold text-amber-700">
                  {formatPKRFull(sale.creditAmount)}
                </Text>
              </View>
            )}
            {sale.changeAmount > 0 && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-neutral-500">{t('auto.id.change')}</Text>
                <Text className="text-sm font-bold text-emerald-700">
                  {formatPKRFull(sale.changeAmount)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800">
              <Text className="text-base font-bold text-neutral-900 dark:text-white">{t('auto.receipt.total')}</Text>
              <Text className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatPKRFull(sale.total)}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute left-0 right-0 bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-5 py-3">
        <View className="flex-row gap-2">
          <Pressable
            onPress={handlePrint}
            className="flex-1 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <Printer size={18} color="#16a34a" />
            <Text className="font-bold text-neutral-900 dark:text-white">{t('auto.id.print')}</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            className="flex-1 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <Share2 size={18} color="#2563eb" />
            <Text className="font-bold text-blue-700 dark:text-blue-300">{t('auto.id.share')}</Text>
          </Pressable>
          <Pressable
            onPress={handleWhatsApp}
            disabled={!sale.customer?.phone}
            className="flex-1 h-12 rounded-xl bg-green-600 items-center justify-center flex-row gap-2 active:opacity-70 disabled:opacity-50"
          >
            <MessageCircle size={18} color="#ffffff" />
            <Text className="font-bold text-white">{t('auto.section.whatsapp')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
