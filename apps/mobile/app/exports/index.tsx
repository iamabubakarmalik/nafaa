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
  Receipt, Package, Users, Truck, Wallet, ShoppingCart,
  BookOpen, BarChart3, CheckCircle2, Database, Info,
} from 'lucide-react-native';
import { EXPORT_ENDPOINTS } from '@/api/exports.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.17:4000/api';

const CARD_STYLES: Record<string, { icon: any; iconBg: string; iconColor: string; filename: string }> = {
  sales: {
    icon: ShoppingCart,
    iconBg: '#10b981',
    iconColor: 'rgba(16, 185, 129, 0.35)',
    filename: 'nafaa-sales',
  },
  products: {
    icon: Package,
    iconBg: '#8b5cf6',
    iconColor: 'rgba(139, 92, 246, 0.35)',
    filename: 'nafaa-products',
  },
  customers: {
    icon: Users,
    iconBg: '#2563eb',
    iconColor: 'rgba(37, 99, 235, 0.35)',
    filename: 'nafaa-customers',
  },
  suppliers: {
    icon: Truck,
    iconBg: '#f97316',
    iconColor: 'rgba(249, 115, 22, 0.35)',
    filename: 'nafaa-suppliers',
  },
  expenses: {
    icon: Wallet,
    iconBg: '#f43f5e',
    iconColor: 'rgba(244, 63, 94, 0.35)',
    filename: 'nafaa-expenses',
  },
  purchases: {
    icon: ShoppingCart,
    iconBg: '#f59e0b',
    iconColor: 'rgba(245, 158, 11, 0.35)',
    filename: 'nafaa-purchases',
  },
  ledger: {
    icon: BookOpen,
    iconBg: '#0891b2',
    iconColor: 'rgba(8, 145, 178, 0.35)',
    filename: 'nafaa-khata',
  },
  'stock-movements': {
    icon: BarChart3,
    iconBg: '#4338ca',
    iconColor: 'rgba(67, 56, 202, 0.35)',
    filename: 'nafaa-stock',
  },
};

export default function ExportsScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (path: string, filename: string, mimeType: string, format: string) => {
    if (!accessToken) {
      Toast.show({ type: 'error', text1: 'Please login again' });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDownloading(path);

    try {
      Toast.show({ type: 'info', text1: 'Download starting...' });
      const fileUri = `${FileSystem.Paths.document.uri}${filename}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_URL}${path}`,
        fileUri,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Downloaded!',
        text2: filename.length > 30 ? filename.slice(0, 30) + '...' : filename,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType,
          dialogTitle: `Save ${format}`,
          UTI: format === 'PDF' ? 'com.adobe.pdf' : 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Saved', `File: ${filename}`);
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

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Exports
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">Data Downloads (Excel & PDF)</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#047857',
              shadowColor: '#047857',
              shadowOpacity: 0.3, shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 }, elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="rounded-full bg-white/10 px-2.5 py-1 flex-row items-center gap-1.5">
                <Download size={11} color="#fcd34d" />
                <Text className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                  Data Exports
                </Text>
              </View>
            </View>
            <Text className="text-white text-2xl font-extrabold mb-1">Export Reports</Text>
            <Text className="text-white/80 text-sm">
              Apna data Excel ya PDF mein download karein — accountant, audit, safekeeping ke liye.
            </Text>
            <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-extrabold uppercase text-white/70 tracking-wider">
                  Available Exports
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-0.5">
                  {EXPORT_ENDPOINTS.length}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] font-extrabold uppercase text-white/70 tracking-wider">
                  Formats
                </Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <View className="px-2 py-0.5 rounded bg-white/20">
                    <Text className="text-[10px] font-extrabold text-white">Excel</Text>
                  </View>
                  <View className="px-2 py-0.5 rounded bg-white/20">
                    <Text className="text-[10px] font-extrabold text-white">PDF</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Info banner */}
        <View className="px-5 mb-4">
          <View
            className="rounded-2xl p-4 flex-row items-start gap-3 border-2"
            style={{ backgroundColor: '#fefce8', borderColor: '#fde68a' }}
          >
            <View
              className="h-9 w-9 rounded-xl items-center justify-center shrink-0"
              style={{ backgroundColor: '#fef3c7' }}
            >
              <Sparkles size={16} color="#b45309" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-amber-900">Tip</Text>
              <Text className="text-xs text-neutral-700 mt-0.5">
                Excel files Microsoft Excel, Google Sheets, LibreOffice mein open hoti hain. PDF print-ready hai.
              </Text>
            </View>
          </View>
        </View>

        {/* Export Cards */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
            Available Exports
          </Text>
          <View className="gap-2.5">
            {EXPORT_ENDPOINTS.map((card) => {
              const styles = CARD_STYLES[card.key];
              const Icon = styles?.icon || Database;

              return (
                <View
                  key={card.key}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <View className="flex-row items-start gap-3 mb-3">
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{
                        backgroundColor: styles?.iconBg || '#374151',
                        shadowColor: styles?.iconBg || '#374151',
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                    >
                      <Icon size={22} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="font-extrabold text-neutral-900 dark:text-white">
                          {card.title}
                        </Text>
                        {card.formats.map((f) => (
                          <View
                            key={f.label}
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: f.label === 'PDF' ? '#fee2e2' : '#dcfce7',
                            }}
                          >
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{
                                color: f.label === 'PDF' ? '#b91c1c' : '#15803d',
                              }}
                            >
                              {f.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <Text className="text-xs text-neutral-500 mt-1" numberOfLines={2}>
                        {card.description}
                      </Text>
                    </View>
                  </View>

                  {/* Format buttons */}
                  <View className="flex-row gap-2">
                    {card.formats.map((f) => {
                      const FormatIcon = f.label === 'PDF' ? FileText : FileSpreadsheet;
                      const isLoading = downloading === f.path;
                      return (
                        <Pressable
                          key={f.label}
                          onPress={() =>
                            handleExport(
                              f.path,
                              `${styles?.filename || card.key}-${Date.now()}.${f.ext}`,
                              f.mimeType,
                              f.label,
                            )
                          }
                          disabled={!!downloading}
                          className="flex-1 h-11 rounded-xl items-center justify-center flex-row gap-1.5 active:opacity-70"
                          style={{
                            backgroundColor: isLoading
                              ? '#9ca3af'
                              : f.label === 'PDF'
                              ? '#dc2626'
                              : '#16a34a',
                            opacity: downloading && !isLoading ? 0.4 : 1,
                          }}
                        >
                          {isLoading ? (
                            <Text className="text-white font-extrabold text-xs">Downloading...</Text>
                          ) : (
                            <>
                              <FormatIcon size={14} color="#ffffff" />
                              <Text className="text-white font-extrabold text-xs">
                                {f.label}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Export Tips */}
        <View className="px-5">
          <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5">
            <View className="flex-row items-center gap-3 mb-4">
              <View
                className="h-11 w-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: '#0f172a' }}
              >
                <Database size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  Export Tips
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Better data management
                </Text>
              </View>
            </View>

            <View className="gap-2">
              {[
                {
                  color: '#16a34a',
                  title: 'Monthly Routine',
                  text: 'Har mahine ke akhir mein sab exports ek baar download karein',
                },
                {
                  color: '#2563eb',
                  title: 'Tax Time Ready',
                  text: 'Sales, Purchases, Expenses accountant ko de sakte hain',
                },
                {
                  color: '#8b5cf6',
                  title: 'Cloud Backup',
                  text: 'Google Drive ya Dropbox pe save karein — multiple copies',
                },
                {
                  color: '#dc2626',
                  title: 'Sensitive Data',
                  text: 'Customer/supplier data confidential — password protected folder',
                },
              ].map((t, idx) => (
                <View
                  key={idx}
                  className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 flex-row items-start gap-2"
                >
                  <CheckCircle2 size={16} color={t.color} />
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">
                      {t.title}
                    </Text>
                    <Text className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {t.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
