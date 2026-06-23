import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, Smartphone, Monitor, Tablet, MapPin, Clock, Trash2,
  AlertTriangle, CheckCircle2, Shield, RefreshCw, LogOut, Globe,
} from 'lucide-react-native';
import { authApi, type ActiveSession } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

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

export default function DevicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessions = [], refetch, isLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: authApi.listSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Device revoke ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Revoke fail' });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => {
      if (!refreshToken) throw new Error('No token');
      return authApi.revokeOtherSessions(refreshToken);
    },
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: data?.message || 'Other devices revoked',
      });
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRevokeOne = (session: ActiveSession) => {
    Alert.alert(
      'Revoke Device?',
      `"${session.deviceName}" se logout ho jayega. Confirm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Revoke',
          style: 'destructive',
          onPress: () => revokeMutation.mutate(session.id),
        },
      ],
    );
  };

  const handleRevokeAll = () => {
    Alert.alert(
      'Logout All Other Devices?',
      'Sirf yeh current device active rahega. Baqi sab logout ho jayenge. Confirm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Logout All',
          style: 'destructive',
          onPress: () => revokeAllMutation.mutate(),
        },
      ],
    );
  };

  const otherSessionsCount = sessions.length > 1 ? sessions.length - 1 : 0;

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
            <Shield size={14} color="#16a34a" />
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              Active Devices
            </Text>
          </View>
          <Text className="text-xs text-neutral-500">
            Apne logged-in devices manage karein
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
        {/* Stats banner */}
        <View
          className="rounded-2xl p-4 mb-4 flex-row items-center gap-3"
          style={{
            backgroundColor: '#dcfce7',
            borderWidth: 2,
            borderColor: '#86efac',
          }}
        >
          <View
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#16a34a' }}
          >
            <CheckCircle2 size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-emerald-900">
              {sessions.length} active device{sessions.length !== 1 ? 's' : ''}
            </Text>
            <Text className="text-xs text-emerald-700 mt-0.5">
              Unknown device dikhe to foran revoke karein
            </Text>
          </View>
        </View>

        {/* Logout all button */}
        {otherSessionsCount > 0 && (
          <Pressable
            onPress={handleRevokeAll}
            disabled={revokeAllMutation.isPending}
            className="mb-4 h-12 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
            style={{
              backgroundColor: '#dc2626',
              opacity: revokeAllMutation.isPending ? 0.5 : 1,
              shadowColor: '#dc2626',
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <LogOut size={16} color="#ffffff" />
            <Text className="text-white font-extrabold text-sm">
              {revokeAllMutation.isPending
                ? 'Revoking...'
                : `Logout All Others (${otherSessionsCount})`}
            </Text>
          </Pressable>
        )}

        {/* Loading */}
        {isLoading && (
          <View className="gap-2">
            {[1, 2].map((i) => (
              <View
                key={i}
                className="h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </View>
        )}

        {/* Empty */}
        {!isLoading && sessions.length === 0 && (
          <View
            className="rounded-2xl items-center py-12 px-6"
            style={{
              backgroundColor: '#f1f5f9',
              borderWidth: 2,
              borderColor: '#cbd5e1',
              borderStyle: 'dashed',
            }}
          >
            <Shield size={40} color="#cbd5e1" />
            <Text className="font-bold text-neutral-700 mt-2">
              No active sessions
            </Text>
            <Text className="text-xs text-neutral-500 mt-1">
              Aap ke account mein koi active session nahi
            </Text>
          </View>
        )}

        {/* Sessions list */}
        <View className="gap-2">
          {sessions.map((session, idx) => {
            const Icon = getDeviceIcon(session.deviceName);
            const isCurrent = idx === 0;

            return (
              <View
                key={session.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: isCurrent ? '#dcfce7' : '#ffffff',
                  borderWidth: 2,
                  borderColor: isCurrent ? '#86efac' : '#e5e7eb',
                  shadowColor: '#000',
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: isCurrent ? '#16a34a' : '#f1f5f9',
                    }}
                  >
                    <Icon size={22} color={isCurrent ? '#ffffff' : '#64748b'} />
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text
                        className="font-extrabold text-neutral-900 dark:text-white text-sm"
                        numberOfLines={1}
                      >
                        {session.deviceName || 'Unknown Device'}
                      </Text>
                      {isCurrent && (
                        <View
                          className="px-2 py-0.5 rounded-full flex-row items-center gap-0.5"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          <CheckCircle2 size={9} color="#ffffff" />
                          <Text className="text-[9px] font-extrabold text-white">
                            CURRENT
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="mt-1.5 gap-1">
                      <View className="flex-row items-center gap-1">
                        <MapPin size={11} color="#64748b" />
                        <Text className="text-xs text-neutral-600 font-semibold">
                          {session.location || 'Unknown'}
                        </Text>
                      </View>

                      {session.ipAddress && (
                        <View className="flex-row items-center gap-1">
                          <Globe size={11} color="#64748b" />
                          <Text className="text-xs font-mono text-neutral-600">
                            {session.ipAddress}
                          </Text>
                        </View>
                      )}

                      <View className="flex-row items-center gap-1">
                        <Clock size={11} color="#64748b" />
                        <Text className="text-xs text-neutral-600 font-semibold">
                          Last active: {formatRelative(session.lastActive)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-[10px] text-neutral-400 mt-1.5 font-semibold">
                      Logged in: {formatFullTime(session.createdAt)}
                    </Text>
                  </View>

                  {!isCurrent && (
                    <Pressable
                      onPress={() => handleRevokeOne(session)}
                      disabled={revokeMutation.isPending}
                      hitSlop={8}
                      className="h-10 w-10 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: '#fee2e2',
                        borderWidth: 1,
                        borderColor: '#fecaca',
                        opacity: revokeMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Security tip */}
        <View
          className="mt-5 rounded-2xl p-4 flex-row items-start gap-3"
          style={{
            backgroundColor: '#dbeafe',
            borderWidth: 1,
            borderColor: '#bfdbfe',
          }}
        >
          <AlertTriangle size={20} color="#1d4ed8" />
          <View className="flex-1">
            <Text className="text-xs font-extrabold text-blue-900 mb-1">
              Security Tip
            </Text>
            <Text className="text-xs text-blue-800 leading-5">
              Agar koi unknown device dikhe to foran "Revoke" karein. Saath hi apna password change karein. New device pe login karne par email alert milta hai.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
