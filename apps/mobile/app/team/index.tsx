import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Users, Plus, Trash2, ShieldCheck, Crown, X, Check,
  ToggleLeft, ToggleRight, Sparkles, Mail, Phone, Lock,
} from 'lucide-react-native';
import { teamApi, type UserRole } from '@/api/team.api';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
  OWNER: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  MANAGER: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  CASHIER: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  STAFF: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
};

const roleDescriptions: Record<UserRole, string> = {
  OWNER: 'Full system access',
  MANAGER: 'Sab kuch ka access except billing',
  CASHIER: 'POS aur sales handle karein',
  STAFF: 'Limited access',
};

const formatDate = (v: string | null) => {
  if (!v) return 'Never';
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));
};

function ThemedInput({ label, required, hint, leftIcon, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
        {leftIcon}
        <TextInput
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-neutral-900 dark:text-white"
          {...props}
        />
      </View>
      {hint && <Text className="mt-1 text-xs text-neutral-500">{hint}</Text>}
    </View>
  );
}

export default function TeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'OWNER';

  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER' as UserRole,
  });

  const { data: members = [], refetch } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      try {
        const r = await teamApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      teamApi.create({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Member added!' });
      setForm({ fullName: '', email: '', phone: '', password: '', role: 'CASHIER' });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const toggleMutation = useMutation({
    mutationFn: teamApi.toggle,
    onSuccess: () => {
      Haptics.selectionAsync();
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teamApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Member removed' });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Member?', `${name} ko remove karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.team')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#8b5cf6" />
            <Text className="text-xs text-neutral-500">
              {members.length} members
            </Text>
          </View>
        </View>
        {isOwner && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCreateOpen(true);
            }}
            className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white font-bold text-sm">{t('auto.index.add')}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <ShieldCheck size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.team_management')}</Text>
                <Text className="text-3xl font-extrabold text-white">
                  {members.length} {members.length === 1 ? 'Member' : 'Members'}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5">
                  {members.filter((m) => m.isActive).length} active
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!isOwner && (
          <View className="px-5 mb-4">
            <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex-row items-start gap-2">
              <ShieldCheck size={20} color="#b45309" />
              <View className="flex-1">
                <Text className="text-sm font-extrabold text-amber-900">{t('auto.index.owner_access_required')}</Text>
                <Text className="text-xs text-amber-800 mt-1">{t('auto.index.sirf_owner_team_members_add_aur_manage_k')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Members List */}
        <View className="px-5">
          {members.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                <Users size={32} color="#7c3aed" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_team_members_yet')}</Text>
              {isOwner && (
                <Pressable
                  onPress={() => setCreateOpen(true)}
                  className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">{t('auto.index.add_member')}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2.5">
              {members.map((m) => {
                const colors = roleColors[m.role];
                return (
                  <View
                    key={m.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-12 w-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <Text
                          className="text-lg font-extrabold"
                          style={{ color: colors.text }}
                        >
                          {m.fullName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                            {m.fullName}
                          </Text>
                          {m.role === 'OWNER' && (
                            <Crown size={13} color="#f59e0b" fill="#f59e0b" />
                          )}
                        </View>
                        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                          {m.email}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <View
                            className="px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                            }}
                          >
                            <Text className="text-[9px] font-extrabold" style={{ color: colors.text }}>
                              {m.role}
                            </Text>
                          </View>
                          <View
                            className="px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: m.isActive ? '#dcfce7' : '#fee2e2',
                            }}
                          >
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: m.isActive ? '#15803d' : '#b91c1c' }}
                            >
                              {m.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {isOwner && m.role !== 'OWNER' && (
                        <View className="flex-row gap-1">
                          <Pressable
                            onPress={() => toggleMutation.mutate(m.id)}
                            className="h-9 w-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                          >
                            {m.isActive ? (
                              <ToggleRight size={16} color="#16a34a" />
                            ) : (
                              <ToggleLeft size={16} color="#9ca3af" />
                            )}
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(m.id, m.fullName)}
                            className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                          >
                            <Trash2 size={14} color="#dc2626" />
                          </Pressable>
                        </View>
                      )}
                    </View>
                    <View className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                      <Text className="text-[10px] text-neutral-500">
                        Last login: <Text className="font-bold">{formatDate(m.lastLoginAt ?? null)}</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <Users size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.add_team_member')}</Text>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <ThemedInput
                  label="Full Name"
                  required
                  value={form.fullName}
                  onChangeText={(t: string) => setForm({ ...form, fullName: t })}
                  placeholder="Bilal Ahmad"
                />
                <ThemedInput
                  label="Email"
                  required
                  leftIcon={<Mail size={18} color="#9ca3af" />}
                  value={form.email}
                  onChangeText={(t: string) => setForm({ ...form, email: t.toLowerCase() })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="bilal@nafaa.pk"
                />
                <ThemedInput
                  label="Phone"
                  leftIcon={<Phone size={18} color="#9ca3af" />}
                  value={form.phone}
                  onChangeText={(t: string) => setForm({ ...form, phone: t })}
                  keyboardType="phone-pad"
                  placeholder="+923001234567"
                />
                <ThemedInput
                  label="Temporary Password"
                  required
                  leftIcon={<Lock size={18} color="#9ca3af" />}
                  value={form.password}
                  onChangeText={(t: string) => setForm({ ...form, password: t })}
                  secureTextEntry
                  placeholder="Min 8 characters"
                  hint="Member ko bata dein, baad mein change kar sakta hai"
                />

                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{t('auto.index.role')}</Text>
                  <View className="gap-2">
                    {(['MANAGER', 'CASHIER', 'STAFF'] as UserRole[]).map((role) => {
                      const colors = roleColors[role];
                      const active = form.role === role;
                      return (
                        <Pressable
                          key={role}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setForm({ ...form, role });
                          }}
                          className="rounded-2xl border-2 p-3 flex-row items-center gap-3"
                          style={{
                            borderColor: active ? colors.text : '#e5e7eb',
                            backgroundColor: active ? colors.bg : '#ffffff',
                          }}
                        >
                          <View
                            className="h-10 w-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: active ? colors.text : colors.bg }}
                          >
                            <ShieldCheck
                              size={18}
                              color={active ? '#ffffff' : colors.text}
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-extrabold"
                              style={{ color: active ? colors.text : '#374151' }}
                            >
                              {role}
                            </Text>
                            <Text className="text-[11px] text-neutral-500 mt-0.5">
                              {roleDescriptions[role]}
                            </Text>
                          </View>
                          {active && (
                            <View
                              className="h-6 w-6 rounded-full items-center justify-center"
                              style={{ backgroundColor: colors.text }}
                            >
                              <Check size={14} color="#ffffff" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>
            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!form.fullName.trim()) {
                    Toast.show({ type: 'error', text1: 'Name required' });
                    return;
                  }
                  if (!form.email.trim()) {
                    Toast.show({ type: 'error', text1: 'Email required' });
                    return;
                  }
                  if (form.password.length < 8) {
                    Toast.show({ type: 'error', text1: 'Password 8+ chars' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#7c3aed',
                  shadowColor: '#7c3aed',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Adding...' : 'Add Member'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
