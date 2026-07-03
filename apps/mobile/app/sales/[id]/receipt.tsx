import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Printer, Share2, MessageCircle, Receipt as ReceiptIcon,
  Store, CheckCircle2, Package, BookOpen, User, Calendar, Hash,
  Phone, Mail, MapPin, FileText, Wrench, Layers, Scissors,
  Smartphone, StickyNote, Award, Sparkles, Banknote, CreditCard,
  Building2, Zap, Tag,
} from 'lucide-react-native';
import { salesApi } from '@/api/sales.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKRFull, formatQty } from '@/lib/format';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  JAZZCASH: Smartphone,
  EASYPAISA: Zap,
  BANK_TRANSFER: Building2,
};

const paymentLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa',
  BANK_TRANSFER: 'Bank Transfer',
};

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const { tenant } = useAuthStore();
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  const settings = sale?.tenant?.settings;
  const shopName = settings?.shopName || sale?.tenant?.name || tenant?.name || 'My Store';
  const shopAddress = settings?.shopAddress || sale?.shop?.address;
  const shopPhone = settings?.shopPhone || sale?.shop?.phone || sale?.tenant?.phone;
  const shopWhatsapp = settings?.shopWhatsapp;
  const receiptHeader = settings?.receiptHeader;
  const receiptFooter = settings?.receiptFooter;

  const generateHtml = () => {
    if (!sale) return '';

    const itemRows = sale.items
      .map((item) => {
        const v = item.variantLink?.variant;
        const itemName = v ? `${item.product.name} (${v.name})` : item.product.name;
        const noteHtml = item.note
          ? `<div style="font-size:9px; color:#92400e; margin-top:2px; font-style:italic;">📝 ${item.note}</div>`
          : '';
        return `<tr>
          <td style="padding: 6px 0; font-size: 11px; border-bottom: 1px dashed #e2e8f0;">
            <strong>${itemName}</strong>
            ${noteHtml}
          </td>
          <td style="text-align: center; padding: 6px 0; font-size: 11px; border-bottom: 1px dashed #e2e8f0;">${formatQty(item.quantity)} ${item.product.unit}</td>
          <td style="text-align: right; padding: 6px 0; font-size: 11px; border-bottom: 1px dashed #e2e8f0;">${formatPKRFull(item.price)}</td>
          <td style="text-align: right; padding: 6px 0; font-size: 11px; font-weight: bold; border-bottom: 1px dashed #e2e8f0;">${formatPKRFull(item.total)}</td>
        </tr>`;
      })
      .join('');

    const svcRows = (sale.serviceChargesBreakdown ?? []).map((sc: any) =>
      `<tr>
        <td colspan="3" style="padding: 3px 0; font-size: 10px; color: #b45309;">🧰 ${sc.label}</td>
        <td style="text-align: right; padding: 3px 0; font-size: 10px; color: #b45309; font-weight: bold;">+${formatPKRFull(sc.amount)}</td>
      </tr>`
    ).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; max-width: 380px; color: #0f172a; }
  .header { text-align: center; padding-bottom: 12px; border-bottom: 2px dashed #cbd5e1; }
  .shop-name { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .shop-info { font-size: 10px; color: #64748b; line-height: 1.5; }
  .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
  .info-label { color: #64748b; }
  .info-value { font-weight: bold; }
  .section { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 9px; color: #64748b; text-transform: uppercase; padding-bottom: 6px; border-bottom: 1.5px solid #94a3b8; text-align: left; letter-spacing: 0.5px; }
  .total-row { padding-top: 12px; }
  .total-row td { font-size: 15px; font-weight: 800; }
  .paid-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 8px; margin-top: 8px; }
  .credit-box { background: #fef3c7; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 8px; margin-top: 4px; }
  .svc-box { background: #fff7ed; border: 1.5px solid #fdba74; border-radius: 8px; padding: 6px 8px; margin: 6px 0; }
  .footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 2px dashed #cbd5e1; font-size: 10px; color: #64748b; line-height: 1.6; }
  .thanks { font-size: 14px; font-weight: 800; color: #16a34a; }
</style></head><body>
<div class="header">
  <div class="shop-name">${shopName}</div>
  <div class="shop-info">
    ${shopAddress ? `${shopAddress}<br/>` : ''}
    ${shopPhone ? `📞 ${shopPhone}` : ''}${shopWhatsapp && shopWhatsapp !== shopPhone ? ` &nbsp;|&nbsp; 💬 ${shopWhatsapp}` : ''}
  </div>
  ${receiptHeader ? `<div style="font-size:10px; color:#475569; font-style:italic; margin-top:6px;">${receiptHeader}</div>` : ''}
</div>

<div class="section">
  <div class="info-row"><span class="info-label">Receipt #</span><span class="info-value" style="font-family: monospace;">${sale.saleNumber}</span></div>
  <div class="info-row"><span class="info-label">Date</span><span class="info-value">${formatDate(sale.soldAt)}</span></div>
  ${sale.customer ? `<div class="info-row"><span class="info-label">Customer</span><span class="info-value">${sale.customer.name}</span></div>` : ''}
  ${sale.customer?.phone ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${sale.customer.phone}</span></div>` : ''}
  ${sale.createdBy ? `<div class="info-row"><span class="info-label">Cashier</span><span class="info-value">${sale.createdBy.fullName}</span></div>` : ''}
</div>

<div class="section">
  <table>
    <thead><tr>
      <th style="width:50%;">Item</th>
      <th style="text-align:center;">Qty</th>
      <th style="text-align:right;">Rate</th>
      <th style="text-align:right;">Total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
</div>

<div class="section">
  <table>
    <tr><td colspan="3" style="padding:3px 0; font-size:11px; color:#64748b;">Subtotal</td><td style="text-align:right; padding:3px 0; font-size:11px;">${formatPKRFull(sale.subtotal)}</td></tr>
    ${sale.discount > 0 ? `<tr><td colspan="3" style="padding:3px 0; font-size:11px; color:#f59e0b;">Discount</td><td style="text-align:right; padding:3px 0; font-size:11px; color:#f59e0b;">-${formatPKRFull(sale.discount)}</td></tr>` : ''}
    ${sale.serviceCharges && sale.serviceCharges > 0 ? `<tr><td colspan="4"><div class="svc-box"><div style="font-size:9px; text-transform:uppercase; color:#b45309; letter-spacing:0.5px; font-weight:700; margin-bottom:2px;">🧰 Service Charges</div><table style="width:100%;">${svcRows}<tr><td colspan="3" style="padding-top:4px; border-top:1px solid #fdba74; font-size:10px; font-weight:700; color:#92400e;">Total Services</td><td style="text-align:right; padding-top:4px; border-top:1px solid #fdba74; font-size:10px; font-weight:800; color:#92400e;">+${formatPKRFull(sale.serviceCharges)}</td></tr></table></div></td></tr>` : ''}
    <tr class="total-row"><td colspan="3" style="padding-top:10px; border-top:2px solid #0f172a;">GRAND TOTAL</td><td style="text-align:right; padding-top:10px; border-top:2px solid #0f172a; color:#16a34a;">${formatPKRFull(sale.total)}</td></tr>
  </table>

  <div class="paid-box">
    <div style="display:flex; justify-content:space-between; font-size:11px;">
      <span style="color:#15803d; font-weight:700;">💵 Paid (${paymentLabels[sale.paymentMethod] || sale.paymentMethod})</span>
      <span style="color:#15803d; font-weight:800;">${formatPKRFull(sale.paidAmount)}</span>
    </div>
  </div>

  ${sale.creditAmount > 0 ? `<div class="credit-box">
    <div style="display:flex; justify-content:space-between; font-size:11px;">
      <span style="color:#92400e; font-weight:700;">📖 Udhaar (Khata)</span>
      <span style="color:#92400e; font-weight:800;">${formatPKRFull(sale.creditAmount)}</span>
    </div>
  </div>` : ''}

  ${sale.changeAmount > 0 ? `<div style="display:flex; justify-content:space-between; margin-top:8px; padding:6px 8px; background:#eff6ff; border-radius:6px; font-size:11px;">
    <span style="color:#1d4ed8; font-weight:700;">Change Returned</span>
    <span style="color:#1d4ed8; font-weight:800;">${formatPKRFull(sale.changeAmount)}</span>
  </div>` : ''}
</div>

<div class="footer">
  ${receiptFooter ? `<div style="font-style:italic; color:#475569; margin-bottom:8px;">${receiptFooter}</div>` : ''}
  <div class="thanks">🙏 Shukriya! Visit Again</div>
  <div style="margin-top:6px;">Powered by Nafaa POS — Made in Pakistan 🇵🇰</div>
</div>
</body></html>`;
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
    setSharing(true);
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
        Alert.alert('Saved', 'PDF saved to device');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Share failed', text2: e?.message });
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = () => {
    if (!sale) return;
    if (!sale.customer?.phone) {
      Toast.show({ type: 'error', text1: 'Customer phone nahi hai' });
      return;
    }
    const phone = sale.customer.phone.replace(/[^0-9]/g, '');

    // Build WhatsApp message
    const lines: string[] = [];
    lines.push(`*${shopName}* 🏪`);
    if (shopAddress) lines.push(`📍 ${shopAddress}`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`🧾 *Receipt:* ${sale.saleNumber}`);
    lines.push(`📅 ${formatDate(sale.soldAt)}`);
    lines.push(`👤 Customer: *${sale.customer.name}*`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('*🛒 Items:*');
    sale.items.forEach((item, idx) => {
      const v = item.variantLink?.variant;
      const name = v ? `${item.product.name} (${v.name})` : item.product.name;
      lines.push(`${idx + 1}. ${name}`);
      lines.push(`   ${formatQty(item.quantity)} ${item.product.unit} × ${formatPKRFull(item.price)} = *${formatPKRFull(item.total)}*`);
      if (item.note) lines.push(`   📝 _${item.note}_`);
    });
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('💵 *Payment Summary:*');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Subtotal:        ${formatPKRFull(sale.subtotal)}`);
    if (sale.discount > 0) lines.push(`Discount:        -${formatPKRFull(sale.discount)} 🎉`);
    if (sale.serviceChargesBreakdown && sale.serviceChargesBreakdown.length > 0) {
      lines.push('');
      lines.push('🧰 *Service Charges:*');
      sale.serviceChargesBreakdown.forEach((sc: any) => {
        lines.push(`  • ${sc.label}: +${formatPKRFull(sc.amount)}`);
      });
      lines.push(`Services Total:  +${formatPKRFull(sale.serviceCharges ?? 0)}`);
    }
    lines.push('');
    lines.push(`💰 *GRAND TOTAL:* *${formatPKRFull(sale.total)}*`);
    lines.push(`✅ Paid (${paymentLabels[sale.paymentMethod]}): ${formatPKRFull(sale.paidAmount)}`);
    if (sale.creditAmount > 0) lines.push(`📖 Udhaar: *${formatPKRFull(sale.creditAmount)}*`);
    if (sale.changeAmount > 0) lines.push(`💸 Change: ${formatPKRFull(sale.changeAmount)}`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
    if (receiptFooter) {
      lines.push(receiptFooter);
      lines.push('');
    }
    lines.push('🙏 *Shukriya! Visit Again* 🙏');
    lines.push('');
    lines.push('_Powered by Nafaa POS_ 🇵🇰');

    const message = lines.join('\n');
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    });
  };

  if (!sale) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ReceiptIcon size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading receipt...</Text>
      </SafeAreaView>
    );
  }

  const PayIcon = paymentIcons[sale.paymentMethod] || CreditCard;

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
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Sale Receipt</Text>
          <Text className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono">
            {sale.saleNumber}
          </Text>
        </View>
        <Pressable
          onPress={handleShare}
          disabled={sharing}
          className="h-11 w-11 rounded-2xl bg-blue-100 items-center justify-center"
        >
          <Share2 size={18} color="#2563eb" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Receipt card */}
        <View className="rounded-3xl bg-white shadow-sm border border-neutral-200 overflow-hidden">
          {/* Shop header */}
          <View className="items-center py-6 px-5 border-b border-dashed border-neutral-300 bg-gradient-to-br from-emerald-50 to-teal-50">
            <View className="h-16 w-16 rounded-2xl bg-emerald-600 items-center justify-center shadow-lg" style={{ shadowColor: '#16a34a', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
              <Store size={28} color="#ffffff" />
            </View>
            <Text className="mt-3 text-2xl font-extrabold text-neutral-900" numberOfLines={1}>
              {shopName}
            </Text>
            {shopAddress && (
              <View className="flex-row items-center gap-1 mt-1">
                <MapPin size={11} color="#64748b" />
                <Text className="text-xs text-neutral-500 text-center">{shopAddress}</Text>
              </View>
            )}
            <View className="flex-row items-center gap-3 mt-1">
              {shopPhone && (
                <View className="flex-row items-center gap-1">
                  <Phone size={11} color="#64748b" />
                  <Text className="text-xs text-neutral-500 font-bold">{shopPhone}</Text>
                </View>
              )}
              {shopWhatsapp && shopWhatsapp !== shopPhone && (
                <View className="flex-row items-center gap-1">
                  <MessageCircle size={11} color="#25D366" />
                  <Text className="text-xs text-neutral-500 font-bold">{shopWhatsapp}</Text>
                </View>
              )}
            </View>
            {receiptHeader && (
              <Text className="mt-2 text-xs text-neutral-600 italic text-center">{receiptHeader}</Text>
            )}
          </View>

          {/* Meta info */}
          <View className="px-5 py-4 gap-2 border-b border-dashed border-neutral-300 bg-slate-50/50">
            <View className="flex-row justify-between">
              <View className="flex-row items-center gap-1.5">
                <Hash size={12} color="#64748b" />
                <Text className="text-xs text-neutral-500 font-bold uppercase">Receipt #</Text>
              </View>
              <Text className="text-sm font-mono font-extrabold text-neutral-900">{sale.saleNumber}</Text>
            </View>
            <View className="flex-row justify-between">
              <View className="flex-row items-center gap-1.5">
                <Calendar size={12} color="#64748b" />
                <Text className="text-xs text-neutral-500 font-bold uppercase">Date</Text>
              </View>
              <Text className="text-sm font-bold text-neutral-700">{formatDate(sale.soldAt)}</Text>
            </View>
            {sale.customer && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-1.5">
                  <User size={12} color="#8b5cf6" />
                  <Text className="text-xs text-neutral-500 font-bold uppercase">Customer</Text>
                </View>
                <Text className="text-sm font-bold text-violet-700" numberOfLines={1}>
                  {sale.customer.name}
                </Text>
              </View>
            )}
            {sale.createdBy && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-1.5">
                  <User size={12} color="#64748b" />
                  <Text className="text-xs text-neutral-500 font-bold uppercase">Cashier</Text>
                </View>
                <Text className="text-sm font-bold text-neutral-700">{sale.createdBy.fullName}</Text>
              </View>
            )}
          </View>

          {/* Items */}
          <View className="px-5 py-3 border-b border-dashed border-neutral-300">
            <Text className="text-[10px] font-extrabold uppercase text-neutral-500 mb-2 tracking-wider">
              Items ({sale.items.length})
            </Text>
            {sale.items.map((item, idx) => {
              const v = item.variantLink?.variant;
              return (
                <View
                  key={item.id}
                  className={`py-2 flex-row items-start ${
                    idx !== sale.items.length - 1 ? 'border-b border-neutral-100' : ''
                  }`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold text-neutral-900" numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    {v && (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        {v.colorHex && (
                          <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: v.colorHex, borderWidth: 1, borderColor: '#cbd5e1' }} />
                        )}
                        <Text className="text-[10px] font-bold text-violet-700">{v.name}</Text>
                      </View>
                    )}
                    {item.note && (
                      <View className="flex-row items-start gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 self-start">
                        <StickyNote size={9} color="#b45309" />
                        <Text className="text-[10px] font-bold text-amber-900 italic flex-1">{item.note}</Text>
                      </View>
                    )}
                    <Text className="text-[10px] text-neutral-500 mt-0.5">
                      {formatQty(item.quantity)} {item.product.unit} × {formatPKRFull(item.price)}
                    </Text>
                  </View>
                  <Text className="text-sm font-extrabold text-neutral-900">
                    {formatPKRFull(item.total)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Totals */}
          <View className="px-5 py-3 gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-neutral-500">Subtotal</Text>
              <Text className="text-xs font-bold text-neutral-700">{formatPKRFull(sale.subtotal)}</Text>
            </View>
            {sale.discount > 0 && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center gap-1">
                  <Tag size={10} color="#d97706" />
                  <Text className="text-xs text-amber-700 font-semibold">Discount</Text>
                </View>
                <Text className="text-xs font-bold text-amber-700">-{formatPKRFull(sale.discount)}</Text>
              </View>
            )}

            {/* Service Charges */}
            {sale.serviceCharges && sale.serviceCharges > 0 && sale.serviceChargesBreakdown && sale.serviceChargesBreakdown.length > 0 && (
              <View className="rounded-xl bg-orange-50 border border-orange-200 p-2.5 mt-1">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Wrench size={11} color="#c2410c" />
                  <Text className="text-[10px] font-extrabold uppercase text-orange-700 tracking-wider">
                    Service Charges
                  </Text>
                </View>
                {sale.serviceChargesBreakdown.map((sc: any, i: number) => (
                  <View key={i} className="flex-row justify-between py-0.5">
                    <Text className="text-xs text-orange-800">{sc.label}</Text>
                    <Text className="text-xs font-bold text-orange-800">+{formatPKRFull(sc.amount)}</Text>
                  </View>
                ))}
                <View className="flex-row justify-between pt-1.5 mt-1 border-t border-orange-200">
                  <Text className="text-xs font-extrabold text-orange-900">Total Services</Text>
                  <Text className="text-xs font-extrabold text-orange-900">+{formatPKRFull(sale.serviceCharges)}</Text>
                </View>
              </View>
            )}

            <View className="pt-2 mt-1 border-t-2 border-neutral-300 flex-row justify-between">
              <Text className="text-base font-extrabold text-neutral-900">GRAND TOTAL</Text>
              <Text className="text-lg font-extrabold text-emerald-700">{formatPKRFull(sale.total)}</Text>
            </View>
          </View>

          {/* Payment section */}
          <View className="px-5 py-3 bg-slate-50 border-t border-dashed border-neutral-300 gap-2">
            <View className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex-row items-center gap-2">
              <PayIcon size={16} color="#16a34a" />
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  Paid ({paymentLabels[sale.paymentMethod]})
                </Text>
              </View>
              <Text className="text-base font-extrabold text-emerald-700">
                {formatPKRFull(sale.paidAmount)}
              </Text>
            </View>

            {sale.creditAmount > 0 && (
              <View className="rounded-xl bg-amber-50 border border-amber-300 p-3 flex-row items-center gap-2">
                <BookOpen size={16} color="#d97706" />
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                    Udhaar (Khata)
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-amber-700">
                  {formatPKRFull(sale.creditAmount)}
                </Text>
              </View>
            )}

            {sale.changeAmount > 0 && (
              <View className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex-row items-center gap-2">
                <Sparkles size={16} color="#2563eb" />
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                    Change Returned
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-blue-700">
                  {formatPKRFull(sale.changeAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="items-center py-5 px-5 border-t-2 border-dashed border-neutral-300 bg-gradient-to-br from-emerald-50 to-green-50">
            {receiptFooter && (
              <Text className="text-xs italic text-neutral-600 text-center mb-2">{receiptFooter}</Text>
            )}
            <View className="flex-row items-center gap-2">
              <Award size={16} color="#f59e0b" />
              <Text className="text-base font-extrabold text-neutral-900">Shukriya! Visit Again</Text>
              <Award size={16} color="#f59e0b" />
            </View>
            <View className="flex-row items-center gap-1 mt-2">
              <Sparkles size={9} color="#9ca3af" />
              <Text className="text-[10px] text-neutral-400 font-bold">Powered by Nafaa POS 🇵🇰</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute left-0 right-0 bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-5 py-3">
        <View className="flex-row gap-2">
          <Pressable
            onPress={handlePrint}
            disabled={printing}
            className="flex-1 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <Printer size={18} color="#16a34a" />
            <Text className="font-bold text-neutral-900 dark:text-white">
              {printing ? '...' : 'Print'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            disabled={sharing}
            className="flex-1 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <Share2 size={18} color="#2563eb" />
            <Text className="font-bold text-blue-700 dark:text-blue-300">
              {sharing ? '...' : 'PDF'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleWhatsApp}
            disabled={!sale.customer?.phone}
            className="flex-1 h-12 rounded-xl items-center justify-center flex-row gap-2 active:opacity-70"
            style={{
              backgroundColor: sale.customer?.phone ? '#25D366' : '#9ca3af',
              opacity: sale.customer?.phone ? 1 : 0.5,
            }}
          >
            <MessageCircle size={18} color="#ffffff" />
            <Text className="font-bold text-white">WhatsApp</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
