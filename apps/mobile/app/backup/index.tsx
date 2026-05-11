import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Database, Download, Sparkles, CheckCircle2, Package,
  Users, Truck, Wallet, Receipt, Building2, ArrowRightLeft,
  Shield, ShieldCheck, AlertCircle, Calendar,
} from 'lucide-react-native';
import { backupApi } from '@/api/backup.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.17:4000/api';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const countItems = [
  { key: 'shops', label: 'Shops', icon: Building2, color: '#0891b2', bg: '#cffafe' },
  { key: 'products', label: 'Products', icon: Package, color: '#16a34a', bg: '#dcfce7' },
  { key: 'customers', label: 'Customers', icon: Users, color: '#8b5cf6', bg: '#ede9fe' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, color: '#f97316', bg: '#ffedd5' },
  { key: 'sales', label: 'Sales', icon: Receipt, color: '#16a34a', bg: '#dcfce7' },
  { key: 'purchases', label: 'Purchases', icon: Package, color: '#7c3aed', bg: '#ede9fe' },
  { key: 'expenses', label: 'Expenses', icon: Wallet, color: '#dc2626', bg: '#fee2e2' },
  { key: 'transfers', label: 'Transfers', icon: ArrowRightLeft, color: '#0891b2', bg: '#cffafe' },
];

export default function BackupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [downloading, setDownloading] = useState(false);

  const { data: summary, refetch, isLoading } = useQuery({
    queryKey: ['backup-summary'],
    queryFn: async () => {
      try {
        return await backupApi.summary();
      } catch {
        return null;
      }
    },
  });

  const handleBackup = async () => {
    if (!accessToken) {
      Toast.show({ type: 'error', text1: 'Please login again' });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);

    try {
      const filename = `nafaa-backup-${Date.now()}.json`;
      const fileUri = `${FileSystem.Paths.document.uri}${filename}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_URL}/backup/download`,
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
        text1: '✅ Backup downloaded!',
        text2: filename,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Nafaa Backup',
        });
      } else {
        Alert.alert('Saved', `Backup saved to: ${filename}`);
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Backup failed',
        text2: e?.message || 'Try again',
      });
    } finally {
      setDownloading(false);
    }
  };

  const totalRecords = summary
    ? Object.values(summary.counts).reduce((s, n) => s + n, 0)
    : 0;

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.backup')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#2563eb" />
            <Text className="text-xs text-neutral-500">{t('auto.index.full_data_backup')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#2563eb" />}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#2563eb',
              shadowColor: '#2563eb',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <ShieldCheck size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.total_records')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {totalRecords.toLocaleString()}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.ready_to_backup')}</Text>
              </View>
            </View>
            {summary?.meta?.exportedAt && (
              <View className="pt-3 border-t border-white/20 flex-row items-center gap-1">
                <Calendar size={11} color="rgba(255,255,255,0.8)" />
                <Text className="text-[11px] text-white/80">
                  Generated: {formatDate(summary.meta.exportedAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{t('auto.index.data_breakdown')}</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {countItems.map((item) => {
              const Icon = item.icon;
              const count = (summary?.counts as any)?.[item.key] ?? 0;
              return (
                <View key={item.key} className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
                    <View
                      className="h-10 w-10 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon size={18} color={item.color} />
                    </View>
                    <Text className="mt-2 text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                      {item.label}
                    </Text>
                    <Text className="mt-0.5 text-xl font-extrabold text-neutral-900 dark:text-white">
                      {count.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View className="px-5 mb-4">
          <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex-row items-start gap-2">
            <AlertCircle size={18} color="#b45309" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-amber-900">{t('auto.index.important')}</Text>
              <Text className="text-xs text-amber-800 mt-1 leading-5">{t('auto.index.backup_file_mein_aap_ka_tamam_data_hota_')}</Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          <Pressable
            onPress={handleBackup}
            disabled={downloading || !summary}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
            style={{
              backgroundColor: downloading ? '#9ca3af' : '#2563eb',
              shadowColor: '#2563eb',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Download size={20} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {downloading ? 'Downloading Backup...' : 'Download Full Backup'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
