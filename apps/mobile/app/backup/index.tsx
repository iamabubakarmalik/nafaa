import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Database, Download, Sparkles, CheckCircle2, Package,
  Users, Truck, Wallet, Receipt, Building2, ShoppingCart, BarChart3,
  Shield, ShieldCheck, AlertCircle, Calendar, Clock, Cloud,
  FolderArchive, HardDrive, CalendarClock, Info, FileText, RotateCcw,
  AlertTriangle,
} from 'lucide-react-native';
import { backupApi } from '@/api/backup.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.17:4000/api';
const LAST_BACKUP_KEY = 'nafaa.last-backup-at';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const STAT_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  shops:          { label: 'Shops',         icon: Building2,     color: '#4338ca', bg: '#e0e7ff' },
  categories:     { label: 'Categories',    icon: FolderArchive, color: '#15803d', bg: '#dcfce7' },
  products:       { label: 'Products',      icon: Package,       color: '#6d28d9', bg: '#ede9fe' },
  customers:      { label: 'Customers',     icon: Users,         color: '#1d4ed8', bg: '#dbeafe' },
  suppliers:      { label: 'Suppliers',     icon: Truck,         color: '#c2410c', bg: '#ffedd5' },
  sales:          { label: 'Sales',         icon: Receipt,       color: '#15803d', bg: '#dcfce7' },
  purchases:      { label: 'Purchases',     icon: ShoppingCart,  color: '#b45309', bg: '#fef3c7' },
  expenses:       { label: 'Expenses',      icon: Wallet,        color: '#b91c1c', bg: '#fee2e2' },
  stockMovements: { label: 'Stock Moves',   icon: BarChart3,     color: '#0891b2', bg: '#cffafe' },
  cashRegisters:  { label: 'Cash Sessions', icon: Wallet,        color: '#15803d', bg: '#dcfce7' },
  transfers:      { label: 'Transfers',     icon: Truck,         color: '#0ea5e9', bg: '#e0f2fe' },
};

export default function BackupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [downloading, setDownloading] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  // Load last backup time
  useEffect(() => {
    AsyncStorage.getItem(LAST_BACKUP_KEY).then((v) => {
      if (v) setLastBackupAt(v);
    });
  }, []);

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

  const stats = summary?.counts || {};
  const totalRecords = Object.values(stats).reduce((s: number, n: any) => s + (n || 0), 0);

  const daysSinceLastBackup = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const backupStatus = !lastBackupAt
    ? { label: 'Never backed up', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: AlertTriangle, statusText: '⚠️ Abhi tak koi backup nahi liya — abhi download karein!' }
    : daysSinceLastBackup === 0
    ? { label: 'Backed up today', color: '#15803d', bg: '#dcfce7', border: '#86efac', icon: CheckCircle2, statusText: '✅ Aap ka data safe hai' }
    : daysSinceLastBackup! < 7
    ? { label: `${daysSinceLastBackup} days ago`, color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', icon: Clock, statusText: '✅ Aap ka data safe hai' }
    : daysSinceLastBackup! < 30
    ? { label: `${daysSinceLastBackup} days ago`, color: '#b45309', bg: '#fef3c7', border: '#fcd34d', icon: AlertTriangle, statusText: '⚠️ Naya backup leyne ka time hai' }
    : { label: `${daysSinceLastBackup} days ago`, color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: AlertTriangle, statusText: '🚨 Bohot purana backup — abhi backup leyein!' };

  const StatusIcon = backupStatus.icon;

  const handleBackup = async () => {
    if (!accessToken) {
      Toast.show({ type: 'error', text1: 'Please login again' });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);

    try {
      Toast.show({ type: 'info', text1: 'Backup taiyar ho rahi hai...', text2: 'Yeh kuch seconds lega' });
      const filename = `nafaa-backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;
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

      // Get file size for confirmation
      const info = await FileSystem.getInfoAsync(result.uri);
      const sizeMB = info.exists && info.size ? (info.size / 1024 / 1024).toFixed(2) : '?';

      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackupAt(now);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '✅ Backup downloaded!',
        text2: `${sizeMB} MB • ${filename.slice(0, 30)}...`,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Nafaa Backup',
        });
      } else {
        Alert.alert('Saved', `Backup saved: ${filename}`);
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
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">Backup</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">Data Safety & Restore</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#6d28d9',
              shadowColor: '#6d28d9',
              shadowOpacity: 0.3, shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 }, elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="rounded-full bg-white/10 px-2.5 py-1 flex-row items-center gap-1.5">
                <ShieldCheck size={11} color="#fcd34d" />
                <Text className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                  Data Safety
                </Text>
              </View>
            </View>
            <Text className="text-white text-2xl font-extrabold mb-1">Backup & Restore</Text>
            <Text className="text-white/80 text-sm">
              Apna business data ek file mein safe karein — products, sales, customers, sab kuch.
            </Text>

            <View className="mt-4 pt-4 border-t border-white/20 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-extrabold uppercase text-white/70 tracking-wider">
                  Total Records
                </Text>
                <Text className="text-3xl font-extrabold text-white mt-0.5">
                  {totalRecords.toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={handleBackup}
                disabled={downloading}
                className="h-12 px-5 rounded-2xl bg-white items-center justify-center flex-row gap-2 active:opacity-80"
                style={{ opacity: downloading ? 0.6 : 1 }}
              >
                <Download size={18} color="#6d28d9" />
                <Text className="text-purple-700 font-extrabold text-sm">
                  {downloading ? 'Preparing...' : 'Download'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Status Banner */}
        <View className="px-5 mb-4">
          <View
            className="rounded-2xl border-2 p-4 flex-row items-center gap-3"
            style={{ backgroundColor: backupStatus.bg, borderColor: backupStatus.border }}
          >
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: backupStatus.color }}
            >
              <StatusIcon size={22} color="#ffffff" />
            </View>
            <View className="flex-1 min-w-0">
              <Text
                className="font-extrabold text-base"
                style={{ color: backupStatus.color }}
              >
                Last Backup: {backupStatus.label}
              </Text>
              <Text className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5" numberOfLines={2}>
                {backupStatus.statusText}
              </Text>
              {lastBackupAt && (
                <Text className="text-[10px] text-neutral-500 mt-0.5">
                  {formatDate(lastBackupAt)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Data Snapshot */}
        {summary && (
          <View className="px-5 mb-4">
            <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5">
              <View className="flex-row items-center gap-3 mb-4">
                <View
                  className="h-11 w-11 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#6d28d9' }}
                >
                  <Database size={20} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
                    Aap ke Data ka Snapshot
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={2}>
                    {summary.meta.tenantName} • v{summary.meta.version} • <Text className="font-extrabold">{totalRecords.toLocaleString()}</Text> entries
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap -mx-1.5">
                {Object.entries(stats).map(([key, value]) => {
                  const cfg = STAT_CONFIG[key] || {
                    label: key,
                    icon: Database,
                    color: '#374151',
                    bg: '#f3f4f6',
                  };
                  const Icon = cfg.icon;
                  return (
                    <View key={key} className="w-1/2 px-1.5 mb-3">
                      <View
                        className="rounded-2xl border-2 p-3"
                        style={{
                          backgroundColor: cfg.bg,
                          borderColor: cfg.color + '40',
                        }}
                      >
                        <View
                          className="h-8 w-8 rounded-xl items-center justify-center"
                          style={{ backgroundColor: cfg.color }}
                        >
                          <Icon size={16} color="#ffffff" />
                        </View>
                        <Text
                          className="text-[10px] uppercase font-extrabold mt-2 tracking-wider"
                          style={{ color: cfg.color }}
                        >
                          {cfg.label}
                        </Text>
                        <Text
                          className="text-xl font-extrabold mt-0.5"
                          style={{ color: cfg.color }}
                        >
                          {(value || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Best Practices */}
        <View className="px-5 mb-4">
          <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#15803d' }}>
                <Sparkles size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  Best Practices
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Data safe rakhne ka tareeqa
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {[
                { icon: Calendar,      color: '#16a34a', text: 'Har hafte ek backup zaroor download karein' },
                { icon: Cloud,         color: '#2563eb', text: 'Google Drive ya Dropbox pe safe rakhein' },
                { icon: CalendarClock, color: '#8b5cf6', text: 'Mahine ke akhir mein full backup zaroori' },
                { icon: ShieldCheck,   color: '#d97706', text: 'Backup mein saara data hota hai — ehtiyat se rakhein' },
                { icon: HardDrive,     color: '#dc2626', text: 'Multiple copies banayein — local + cloud' },
              ].map((tip, idx) => {
                const Icon = tip.icon;
                return (
                  <View key={idx} className="flex-row items-start gap-2">
                    <Icon size={16} color={tip.color} />
                    <Text className="flex-1 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                      {tip.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl border-2 p-5"
            style={{ backgroundColor: '#fefce8', borderColor: '#fde68a' }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View
                className="h-11 w-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: '#d97706' }}
              >
                <Info size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-lg font-extrabold text-neutral-900">Important Notes</Text>
                <Text className="text-xs text-neutral-600">Format, restore & security</Text>
              </View>
            </View>

            <View className="gap-2">
              <View className="rounded-xl bg-white border border-amber-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <FileText size={12} color="#b45309" />
                  <Text className="text-xs font-extrabold text-amber-900">Format</Text>
                </View>
                <Text className="text-[11px] text-neutral-700">
                  JSON file format — Microsoft Excel mein open nahi hoti. Programming tools se read kar sakte hain.
                </Text>
              </View>

              <View className="rounded-xl bg-white border border-amber-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <RotateCcw size={12} color="#b45309" />
                  <Text className="text-xs font-extrabold text-amber-900">Restore Feature</Text>
                </View>
                <Text className="text-[11px] text-neutral-700">
                  <Text className="font-extrabold">Coming soon.</Text> Filhal aap data download kar ke safe rakh sakte hain.
                </Text>
              </View>

              <View className="rounded-xl bg-white border border-rose-200 p-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} color="#b91c1c" />
                  <Text className="text-xs font-extrabold text-rose-900">Security</Text>
                </View>
                <Text className="text-[11px] text-neutral-700">
                  Backup mein <Text className="font-extrabold">customer numbers, balances, prices</Text> sab hota hai — kisi ko share na karein!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Coming soon: Cloud backup */}
        <View className="px-5">
          <View
            className="rounded-3xl p-5"
            style={{ backgroundColor: '#0f172a' }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 rounded-2xl bg-white/10 items-center justify-center">
                <Cloud size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-extrabold text-base">Auto Cloud Backup</Text>
                <Text className="text-xs text-white/70 mt-0.5">
                  Coming soon — automatic daily backup
                </Text>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-amber-500/20 flex-row items-center gap-1">
                <Sparkles size={9} color="#fcd34d" />
                <Text className="text-[10px] font-extrabold text-amber-300 uppercase">Roadmap</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
