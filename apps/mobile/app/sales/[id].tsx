import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Printer,
  Share2,
  MessageCircle,
  Receipt,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { salesApi } from '@/api/sales.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull, formatDate, formatTime } from '@/lib/format';
import Toast from 'react-native-toast-message';

export default function SaleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tenant } = useAuthStore();

  const { data: sale } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.byId(id),
    enabled: !!id,
  });

  const generateReceiptHTML = () => {
    if (!sale) return '';
    const itemsHTML = sale.items
      ?.map(
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
          <h1>${tenant?.name || 'Nafaa'}</h1>
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
            ${sale.creditAmount > 0 ? `<tr><td>Credit/Khata</td><td style="text-align: right;">Rs ${sale.creditAmount.toLocaleString()}</td></tr>` : ''}
          </table>
          <p class="footer">
            Thank you for shopping! 🙏<br/>
            Powered by Nafaa - nafaa.pk
          </p>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: generateReceiptHTML() });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Print failed', text2: e.message });
    }
  };

  const handleShareReceipt = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateReceiptHTML() });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${sale?.saleNumber}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Share failed' });
    }
  };

  const handleWhatsApp = async () => {
    if (!sale?.customer) {
      Alert.alert('No Customer', 'This sale has no customer linked.');
      return;
    }
    handleShareReceipt();
  };

  if (!sale) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-500">Loading...</Text>
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
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-neutral-900 dark:text-white">
          Sale Details
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
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
              <Badge variant="success" size="md" className="mt-2">
                {sale.status}
              </Badge>
            </View>

            <View className="pt-4 gap-3">
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#9ca3af" />
                  <Text className="text-sm text-neutral-500">Date</Text>
                </View>
                <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {formatDate(sale.soldAt)} {formatTime(sale.soldAt)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <User size={14} color="#9ca3af" />
                  <Text className="text-sm text-neutral-500">Customer</Text>
                </View>
                <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {sale.customer?.name || 'Walk-in'}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <CreditCard size={14} color="#9ca3af" />
                  <Text className="text-sm text-neutral-500">Payment</Text>
                </View>
                <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {sale.paymentMethod}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Items */}
        <View className="px-5 mt-4">
          <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
            Items ({sale.items?.length ?? 0})
          </Text>
          <Card variant="outline" className="p-0">
            {sale.items?.map((item, idx) => (
              <View
                key={item.id}
                className={`flex-row items-center px-4 py-3 ${
                  idx !== sale.items!.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="font-semibold text-neutral-900 dark:text-white" numberOfLines={1}>
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
              <Text className="text-sm text-neutral-500">Paid Amount</Text>
              <Text className="text-sm font-bold text-emerald-700">
                {formatPKRFull(sale.paidAmount)}
              </Text>
            </View>
            {sale.creditAmount > 0 && (
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-neutral-500">Credit (Khata)</Text>
                <Text className="text-sm font-bold text-amber-700">
                  {formatPKRFull(sale.creditAmount)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800">
              <Text className="text-base font-bold text-neutral-900 dark:text-white">Total</Text>
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
            <Text className="font-bold text-neutral-900 dark:text-white">Print</Text>
          </Pressable>
          <Pressable
            onPress={handleShareReceipt}
            className="flex-1 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <Share2 size={18} color="#2563eb" />
            <Text className="font-bold text-blue-700 dark:text-blue-300">Share</Text>
          </Pressable>
          <Pressable
            onPress={handleWhatsApp}
            className="flex-1 h-12 rounded-xl bg-green-600 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <MessageCircle size={18} color="#ffffff" />
            <Text className="font-bold text-white">WhatsApp</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
