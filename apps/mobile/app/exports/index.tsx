import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Download, Sparkles, FileSpreadsheet, FileText,
  Receipt, Package, Users, CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.17:4000/api';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  filename: string;
  icon: any;
  color: string;
  bg: string;
  format: 'XLSX' | 'PDF';
}

const exportOptions: ExportOption[] = [
  {
    id: 'sales-excel',
    label: 'Sales (Excel)',
    description: 'Tamam sales transactions',
    endpoint: '/exports/sales/excel',
    filename: 'nafaa-sales',
    icon: Receipt,
    color: '#16a34a',
    bg: '#dcfce7',
    format: 'XLSX',
  },
  {
    id: 'products-excel',
    label: 'Products (Excel)',
    description: 'Inventory list with stock',
    endpoint: '/exports/products/excel',
    filename: 'nafaa-products',
    icon: Package,
    color: '#2563eb',
    bg: '#dbeafe',
    format: 'XLSX',
  },
  {
    id: 'customers-excel',
    label: 'Customers (Excel)',
    description: 'All customers with udhaar',
    endpoint: '/exports/customers/excel',
    filename: 'nafaa-customers',
    icon: Users,
    color: '#8b5cf6',
    bg: '#ede9fe',
    format: 'XLSX',
  },
  {
    id: 'sales-pdf',
    label: 'Sales Report (PDF)',
    description: 'Print-ready sales report',
    endpoint: '/exports/sales/pdf',
    filename: 'nafaa-sales-report',
    icon: FileText,
    color: '#dc2626',
    bg: '#fee2e2',
    format: 'PDF',
  },
];

export default function ExportsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (option: ExportOption) => {
    if (!accessToken) {
      Toast.show({ type: 'error', text1: 'Please login again' });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloading(option.id);

    try {
      const ext = option.format === 'PDF' ? 'pdf' : 'xlsx';
      const filename = `${option.filename}-${Date.now()}.${ext}`;
      const fileUri = `${FileSystem.Paths.document.uri}${filename}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_URL}${option.endpoint}`,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const result = await downloadResumable.downloadAsync();

      if (!result?.uri) {
        throw new Error('Download failed');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Downloaded!',
        text2: filename,
      });

      // Share / open file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        const mimeType =
          option.format === 'PDF'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        await Sharing.shareAsync(result.uri, {
          mimeType,
          dialogTitle: option.label,
          UTI: option.format === 'PDF' ? 'com.adobe.pdf' : 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Saved', `File saved to: ${filename}`);
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Export failed',
        text2: e?.message || 'Try again',
      });
    } finally {
      setDownloading(null);
    }
  };

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.exports')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">{t('auto.index.download_your_data')}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Download size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.data_exports')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {exportOptions.length}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.excel_pdf_reports')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.index.available_exports')}</Text>
          <View className="gap-2.5">
            {exportOptions.map((opt) => {
              const Icon = opt.icon;
              const isDownloading = downloading === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => handleExport(opt)}
                  disabled={!!downloading}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex-row items-center gap-3 active:opacity-70"
                  style={{ opacity: downloading && !isDownloading ? 0.5 : 1 }}
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: opt.bg }}
                  >
                    <Icon size={22} color={opt.color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-bold text-neutral-900 dark:text-white">
                        {opt.label}
                      </Text>
                      <View
                        className="px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: opt.format === 'PDF' ? '#fee2e2' : '#dcfce7' }}
                      >
                        <Text
                          className="text-[9px] font-extrabold"
                          style={{ color: opt.format === 'PDF' ? '#b91c1c' : '#15803d' }}
                        >
                          {opt.format}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {opt.description}
                    </Text>
                  </View>
                  {isDownloading ? (
                    <Text className="text-xs font-bold text-brand-600">{t('auto.index.downloading')}</Text>
                  ) : (
                    <Download size={18} color="#9ca3af" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="px-5">
          <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex-row items-start gap-2">
            <CheckCircle2 size={18} color="#b45309" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-amber-900">{t('auto.index.tip')}</Text>
              <Text className="text-xs text-amber-800 mt-1">{t('auto.index.files_automatically_download_honge_aur_s')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
