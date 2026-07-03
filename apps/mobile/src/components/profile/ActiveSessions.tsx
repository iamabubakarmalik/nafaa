import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, Alert, RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Smartphone, Monitor, Tablet, Laptop, MapPin, Clock, Trash2,
  AlertTriangle, CheckCircle2, Shield, RefreshCw, LogOut, Globe,
  Sparkles, Activity, Eye, Calendar, X,
} from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
}

function getDeviceInfo(deviceName: string) {
  const lower = (deviceName || '').toLowerCase();
  if (lower.includes('iphone')) return { Icon: Smartphone, color: '#2563eb', bg: '#dbeafe', label: 'iPhone' };
  if (lower.includes('android') || lower.includes('mobile')) return { Icon: Smartphone, color: '#16a34a', bg: '#dcfce7', label: 'Mobile' };
  if (lower.includes('ipad') || lower.includes('tablet')) return { Icon: Tablet, color: '#7c3aed', bg: '#ede9fe', label: 'Tablet' };
  if (lower.includes('mac') || lower.includes('macbook')) return { Icon: Laptop, color: '#64748b', bg: '#f1f5f9', label: 'Mac' };
  if (lower.includes('windows') || lower.includes('laptop')) return { Icon: Laptop, color: '#2563eb', bg: '#dbeafe', label: 'Windows' };
  return { Icon: Monitor, color: '#64748b', bg: '#f1f5f9', label: 'Desktop' };
}

export function ActiveSessions() {
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessionsRaw, isLoading, refetch, isError } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: authApi.listSessions,
    refetchOnWindowFocus: false,
  });

  const sessions: any[] = useMemo(() => {
    if (!sessionsRaw) return [];
    if (Array.isArray(sessionsRaw)) return sessionsRaw;
    if (typeof sessionsRaw === 'object') {
      const r = sessionsRaw as any;
      if (Array.isArray(r.data)) return r.data;
      if (Array.isArray(r.sessions)) return r.sessions;
      if (Array.isArray(r.items)) return r.items;
    }
    return [];
  }, [sessionsRaw]);

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Device revoked' });
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => {
      if (!refreshToken) throw new Error('No refresh token');
      return authApi.revokeOtherSessions(refreshToken);
    },
    onSuccess: (data: any) => {
      Toast.show({ type: 'success', text1: data?.message || 'Others revoked' });
      setConfirmRevokeAll(false);
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const otherSessionsCount = sessions.length > 1 ? sessions.length - 1 : 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View className="rounded-3xl overflow-hidden mb-4" style={{ backgroundColor: '#1e40af' }}>
        <View className="p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-2xl bg-white/15 items-center justify-center">
              <Shield size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1 mb-1">
                <Sparkles size={10} color="#fde68a" />
                <Text className="text-[9px] uppercase tracking-wider text-white/80 font-extrabold">
                  Device Manager
                </Text>
              </View>
              <Text className="text-lg font-extrabold text-white">Active Devices</Text>
              <Text className="text-[11px] text-white/80 font-semibold mt-0.5">
                {sessions.length} device{sessions.length !== 1 ? 's' : ''} signed in
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 mt-3">
            <Pressable
              onPress={() => refetch()}
              className="flex-1 h-10 rounded-xl bg-white/15 flex-row items-center justify-center gap-1.5 border border-white/20"
            >
              <RefreshCw size={14} color="#ffffff" />
              <Text className="text-white text-xs font-bold">Refresh</Text>
            </Pressable>
            {otherSessionsCount > 0 && (
              <Pressable
                onPress={() => setConfirmRevokeAll(true)}
                className="flex-1 h-10 rounded-xl bg-rose-500 flex-row items-center justify-center gap-1.5"
              >
                <LogOut size={14} color="#ffffff" />
                <Text className="text-white text-xs font-extrabold">Logout {otherSessionsCount}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Stats */}
      {!isLoading && sessions.length > 0 && (
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 rounded-2xl border-2 border-emerald-200 p-3" style={{ backgroundColor: '#f0fdf4' }}>
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-xl bg-emerald-500 items-center justify-center">
                <CheckCircle2 size={16} color="#ffffff" />
              </View>
              <View>
                <Text className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700">Total</Text>
                <Text className="text-lg font-extrabold text-slate-900">{sessions.length}</Text>
              </View>
            </View>
          </View>
          <View className="flex-1 rounded-2xl border-2 border-blue-200 p-3" style={{ backgroundColor: '#eff6ff' }}>
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-xl bg-blue-500 items-center justify-center">
                <Activity size={16} color="#ffffff" />
              </View>
              <View>
                <Text className="text-[9px] uppercase tracking-wider font-extrabold text-blue-700">Current</Text>
                <Text className="text-lg font-extrabold text-slate-900">1</Text>
              </View>
            </View>
          </View>
          <View className="flex-1 rounded-2xl border-2 border-amber-200 p-3" style={{ backgroundColor: '#fffbeb' }}>
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-xl bg-amber-500 items-center justify-center">
                <Eye size={16} color="#ffffff" />
              </View>
              <View>
                <Text className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700">Others</Text>
                <Text className="text-lg font-extrabold text-slate-900">{otherSessionsCount}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Error */}
      {isError && (
        <View className="rounded-2xl border-2 border-rose-200 p-4 flex-row gap-3 mb-4" style={{ backgroundColor: '#fef2f2' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <View className="flex-1">
            <Text className="font-extrabold text-rose-900">Failed to load</Text>
            <Text className="text-xs text-rose-700 mt-1 font-semibold">Please retry</Text>
          </View>
          <Pressable
            onPress={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-rose-600"
          >
            <Text className="text-white text-xs font-extrabold">Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View className="gap-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-24 rounded-2xl bg-slate-100" />
          ))}
        </View>
      )}

      {/* Empty */}
      {!isLoading && !isError && sessions.length === 0 && (
        <View className="rounded-3xl border-2 border-dashed border-slate-200 p-12 items-center" style={{ backgroundColor: '#f8fafc' }}>
          <View className="h-16 w-16 rounded-3xl bg-slate-100 items-center justify-center">
            <Shield size={32} color="#94a3b8" />
          </View>
          <Text className="mt-4 font-extrabold text-slate-900">No active sessions</Text>
          <Text className="text-xs text-slate-500 mt-1 font-semibold">Koi active session nahi</Text>
        </View>
      )}

      {/* Sessions list */}
      {!isLoading && sessions.length > 0 && (
        <View className="gap-2.5">
          {sessions.map((session, idx) => {
            const info = getDeviceInfo(session.deviceName);
            const Icon = info.Icon;
            const isCurrent = idx === 0;

            return (
              <View
                key={session.id || idx}
                className="rounded-2xl border-2 p-4"
                style={{
                  borderColor: isCurrent ? '#86efac' : '#e2e8f0',
                  backgroundColor: isCurrent ? '#f0fdf4' : '#ffffff',
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="h-14 w-14 rounded-2xl items-center justify-center shrink-0"
                    style={{ backgroundColor: isCurrent ? '#16a34a' : info.color }}
                  >
                    <Icon size={28} color="#ffffff" />
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="font-extrabold text-slate-900" numberOfLines={1}>
                        {session.deviceName || 'Unknown'}
                      </Text>
                      {isCurrent && (
                        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600">
                          <CheckCircle2 size={10} color="#ffffff" />
                          <Text className="text-[9px] font-extrabold text-white">THIS DEVICE</Text>
                        </View>
                      )}
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: info.bg }}>
                        <Text className="text-[9px] font-extrabold uppercase" style={{ color: info.color }}>
                          {info.label}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-2 gap-1">
                      {session.location && (
                        <View className="flex-row items-center gap-1">
                          <MapPin size={11} color="#f43f5e" />
                          <Text className="text-xs text-slate-700 font-bold">{session.location}</Text>
                        </View>
                      )}
                      {session.ipAddress && (
                        <View className="flex-row items-center gap-1">
                          <Globe size={11} color="#3b82f6" />
                          <Text className="text-[10px] font-mono font-bold text-slate-700">
                            {session.ipAddress}
                          </Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-1">
                        <Clock size={11} color="#8b5cf6" />
                        <Text className="text-xs text-slate-700 font-bold">
                          {formatRelativeTime(session.lastActive)}
                        </Text>
                      </View>
                      {session.createdAt && (
                        <View className="flex-row items-center gap-1">
                          <Calendar size={10} color="#94a3b8" />
                          <Text className="text-[10px] text-slate-500 font-semibold">
                            {new Intl.DateTimeFormat('en-PK', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(session.createdAt))}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {!isCurrent && (
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          `Logout ${session.deviceName || 'device'}?`,
                          'This device will be signed out immediately.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Logout',
                              style: 'destructive',
                              onPress: () => revokeMutation.mutate(session.id),
                            },
                          ],
                        );
                      }}
                      disabled={revokeMutation.isPending}
                      className="h-10 w-10 rounded-xl border-2 border-rose-200 items-center justify-center"
                      style={{ backgroundColor: '#fef2f2' }}
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Security tip */}
      {!isLoading && sessions.length > 0 && (
        <View className="mt-4 rounded-2xl border-2 border-blue-200 p-4 flex-row gap-3" style={{ backgroundColor: '#eff6ff' }}>
          <View className="h-9 w-9 rounded-xl bg-blue-500 items-center justify-center">
            <AlertTriangle size={16} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="font-extrabold text-blue-900 text-sm mb-1">🛡️ Security Tip</Text>
            <Text className="text-xs text-blue-900 leading-relaxed font-semibold">
              Agar koi unknown device dikhe to foran revoke karein. Password bhi change karein — new device pe login karne par email alert milta hai.
            </Text>
          </View>
        </View>
      )}

      {/* Revoke all modal */}
      <Modal visible={confirmRevokeAll} transparent animationType="fade" onRequestClose={() => setConfirmRevokeAll(false)}>
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View className="w-full max-w-md bg-white rounded-3xl overflow-hidden">
            <View className="p-5" style={{ backgroundColor: '#dc2626' }}>
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center mb-3">
                <AlertTriangle size={28} color="#ffffff" />
              </View>
              <Text className="text-xl font-extrabold text-white">Logout All Others?</Text>
              <Text className="text-white/90 text-sm mt-1 font-semibold">
                {otherSessionsCount} device{otherSessionsCount !== 1 ? 's' : ''} sign out ho jayenge
              </Text>
            </View>
            <View className="p-5">
              <View className="rounded-xl border-2 border-amber-200 p-3 mb-4" style={{ backgroundColor: '#fffbeb' }}>
                <Text className="text-xs text-amber-900 font-semibold leading-relaxed">
                  ⚠️ Sirf current device active rahe ga. Baaqi sab dobara login karna hoga.
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setConfirmRevokeAll(false)}
                  disabled={revokeAllMutation.isPending}
                  className="flex-1 h-11 rounded-xl bg-slate-100 items-center justify-center"
                >
                  <Text className="font-bold text-slate-800">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => revokeAllMutation.mutate()}
                  disabled={revokeAllMutation.isPending}
                  className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1"
                  style={{ backgroundColor: revokeAllMutation.isPending ? '#9ca3af' : '#dc2626' }}
                >
                  <LogOut size={14} color="#ffffff" />
                  <Text className="text-white font-bold">
                    {revokeAllMutation.isPending ? 'Working...' : 'Yes, Logout All'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
