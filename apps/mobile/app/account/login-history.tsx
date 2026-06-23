import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Clock, MapPin, Globe, CheckCircle2, XCircle, Smartphone,
  Monitor, Tablet, AlertTriangle, RefreshCw, Shield,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';

function formatRelative(date: string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay} din pehle`;
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
}

function formatFullTime(date: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  }).format(new Date(date));
}

function getDeviceIcon(name?: string | null) {
  if (!name) return Monitor;
  const lower = name.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
    return Smartphone;
  }
  if (lower.includes('ipad') || lower.includes('tablet')) return Tablet;
  return Monitor;
}

export default function LoginHistoryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: history = [], refetch, isLoading } = useQuery({
    queryKey: ['login-history'],
    queryFn: authApi.loginHistory,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const successCount = history.filter((h) => h.success).length;
  const failCount = history.filter((h) => !h.success).length;
  const newDeviceCount = history.filter((h) => h.isNewDevice && h.success).length;

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
          <View className="flex-row items-center gap-1.5">
            <Clock size={14} color="#2563eb" />
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              Login History
            </Text>
          </View>
          <Text className="text-xs text-neutral-500">
            Last 30 login attempts — kahan se aur kab login hua
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats — 3 cards */}
        <View className="flex-row gap-2 mb-4">
          {/* Successful */}
          <View
            className="flex-1 rounded-2xl p-3 border-2"
            style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
          >
            <View className="flex-row items-center gap-1.5 mb-1">
              <CheckCircle2 size={12} color="#16a34a" />
              <Text className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700">
                Success
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-emerald-900">
              {successCount}
            </Text>
          </View>

          {/* Failed */}
          <View
            className="flex-1 rounded-2xl p-3 border-2"
            style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }}
          >
            <View className="flex-row items-center gap-1.5 mb-1">
              <XCircle size={12} color="#dc2626" />
              <Text className="text-[9px] uppercase tracking-wider font-extrabold text-rose-700">
                Failed
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-rose-900">
              {failCount}
            </Text>
          </View>

          {/* New Devices */}
          <View
            className="flex-1 rounded-2xl p-3 border-2"
            style={{ backgroundColor: '#fef3c7', borderColor: '#fcd34d' }}
          >
            <View className="flex-row items-center gap-1.5 mb-1">
              <Shield size={12} color="#d97706" />
              <Text className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700">
                New
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-amber-900">
              {newDeviceCount}
            </Text>
          </View>
        </View>

        {/* Failed login warning */}
        {failCount >= 3 && (
          <View
            className="rounded-2xl p-4 mb-4 flex-row items-start gap-3"
            style={{
              backgroundColor: '#fee2e2',
              borderWidth: 2,
              borderColor: '#fca5a5',
            }}
          >
            <AlertTriangle size={20} color="#b91c1c" />
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-rose-900">
                ⚠️ {failCount} failed login attempts
              </Text>
              <Text className="text-xs text-rose-700 mt-1 leading-5">
                Agar ye aap nahi thay to apna password foran change karein aur "Active Devices" se sare devices logout karein.
              </Text>
            </View>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View className="gap-2">
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                className="h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </View>
        )}

        {/* Empty */}
        {!isLoading && history.length === 0 && (
          <View
            className="rounded-2xl items-center py-12 px-6"
            style={{
              backgroundColor: '#f1f5f9',
              borderWidth: 2,
              borderColor: '#cbd5e1',
              borderStyle: 'dashed',
            }}
          >
            <Clock size={40} color="#cbd5e1" />
            <Text className="font-bold text-neutral-700 mt-2">
              No login history yet
            </Text>
            <Text className="text-xs text-neutral-500 mt-1">
              Aap ke logins yahan track honge
            </Text>
          </View>
        )}

        {/* History entries */}
        <View className="gap-2">
          {history.map((entry) => {
            const Icon = getDeviceIcon(entry.deviceName);
            const isSuccess = entry.success;

            const borderColor = !isSuccess
              ? '#fecaca'
              : entry.isNewDevice
                ? '#fcd34d'
                : '#e5e7eb';

            const bgColor = !isSuccess
              ? '#fef2f2'
              : entry.isNewDevice
                ? '#fffbeb'
                : '#ffffff';

            const iconBg = !isSuccess
              ? '#dc2626'
              : entry.isNewDevice
                ? '#f59e0b'
                : '#16a34a';

            return (
              <View
                key={entry.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: bgColor,
                  borderWidth: 2,
                  borderColor: borderColor,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="h-11 w-11 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: iconBg }}
                  >
                    {isSuccess ? (
                      <Icon size={20} color="#ffffff" />
                    ) : (
                      <XCircle size={20} color="#ffffff" />
                    )}
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text
                        className="font-extrabold text-neutral-900 dark:text-white text-sm"
                        numberOfLines={1}
                      >
                        {entry.deviceName || 'Unknown Device'}
                      </Text>
                      {isSuccess ? (
                        <View
                          className="px-1.5 py-0.5 rounded-full flex-row items-center gap-0.5"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          <CheckCircle2 size={9} color="#ffffff" />
                          <Text className="text-[9px] font-extrabold text-white">
                            SUCCESS
                          </Text>
                        </View>
                      ) : (
                        <View
                          className="px-1.5 py-0.5 rounded-full flex-row items-center gap-0.5"
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          <XCircle size={9} color="#ffffff" />
                          <Text className="text-[9px] font-extrabold text-white">
                            FAILED
                          </Text>
                        </View>
                      )}
                      {entry.isNewDevice && isSuccess && (
                        <View
                          className="px-1.5 py-0.5 rounded-full flex-row items-center gap-0.5"
                          style={{ backgroundColor: '#f59e0b' }}
                        >
                          <Shield size={9} color="#ffffff" />
                          <Text className="text-[9px] font-extrabold text-white">
                            NEW DEVICE
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="mt-1.5 gap-1">
                      <View className="flex-row items-center gap-1">
                        <MapPin size={11} color="#64748b" />
                        <Text className="text-xs text-neutral-600 font-semibold">
                          {entry.location || 'Unknown'}
                        </Text>
                      </View>

                      {entry.ipAddress && (
                        <View className="flex-row items-center gap-1">
                          <Globe size={11} color="#64748b" />
                          <Text className="text-xs font-mono text-neutral-600">
                            {entry.ipAddress}
                          </Text>
                        </View>
                      )}

                      <View className="flex-row items-center gap-1">
                        <Clock size={11} color="#64748b" />
                        <Text className="text-xs text-neutral-600 font-semibold">
                          {formatRelative(entry.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Failure reason */}
                    {!isSuccess && entry.failureReason && (
                      <View
                        className="mt-2 rounded-lg px-2 py-1 self-start"
                        style={{ backgroundColor: '#fecaca' }}
                      >
                        <Text className="text-[11px] text-rose-800 font-semibold">
                          Reason: {entry.failureReason}
                        </Text>
                      </View>
                    )}

                    <Text className="text-[10px] text-neutral-400 mt-1.5 font-semibold">
                      {formatFullTime(entry.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Security tip */}
        {history.length > 0 && (
          <View
            className="mt-4 rounded-2xl p-4 flex-row items-start gap-3"
            style={{
              backgroundColor: '#dbeafe',
              borderWidth: 1,
              borderColor: '#bfdbfe',
            }}
          >
            <Shield size={20} color="#1d4ed8" />
            <View className="flex-1">
              <Text className="text-xs font-extrabold text-blue-900 mb-1">
                Security Tip
              </Text>
              <Text className="text-xs text-blue-800 leading-5">
                Failed logins suspicious activity hai. Agar dikhe to password change karein aur sab devices se logout karein.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
