import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, User, Sparkles, Mail, Phone, Lock, Edit3, X, Check,
  Crown, Shield, Calendar, LogOut, ChevronRight, Building2,
  Eye, EyeOff, Save, Briefcase,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { apiClient } from '@/api/client';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v?: string) => {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
};

const roleConfig: Record<string, { color: string; bg: string; label: string }> = {
  OWNER: { color: '#b45309', bg: '#fef3c7', label: 'Owner' },
  MANAGER: { color: '#6d28d9', bg: '#ede9fe', label: 'Manager' },
  CASHIER: { color: '#1d4ed8', bg: '#dbeafe', label: 'Cashier' },
  STAFF: { color: '#4b5563', bg: '#f3f4f6', label: 'Staff' },
};

function ThemedInput({ label, required, hint, leftIcon, rightIcon, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
          {label}
        </Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
        {leftIcon}
        <TextInput
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-neutral-900 dark:text-white"
          {...props}
        />
        {rightIcon}
      </View>
      {hint && <Text className="mt-1 text-xs text-neutral-500">{hint}</Text>}
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  // @ts-expect-error - setUser added at runtime via partial update
  const { user, tenant, refreshToken, logout, setUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data: me, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/auth/me');
        return res.data?.data ?? res.data;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (me?.user) {
      setFullName(me.user.fullName || '');
      setEmail(me.user.email || '');
      setPhone(me.user.phone || '');
    }
  }, [me]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/auth/me', {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Profile updated!' });
      if (data && setUser) setUser(data);
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Update failed',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Password changed!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Wrong current password',
      });
    },
  });

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (refreshToken) await authApi.logout(refreshToken);
          } catch {}
          await logout();
          Toast.show({ type: 'success', text1: 'Logged out' });
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const role = user?.role || 'STAFF';
  const rc = roleConfig[role] || roleConfig.STAFF;

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.my_profile')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">{t('auto.index.manage_account_settings')}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{
            backgroundColor: '#16a34a',
            shadowColor: '#16a34a',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Edit3 size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.index.edit')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Profile Card */}
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
            <View className="flex-row items-center gap-4 mb-3">
              <View className="h-20 w-20 rounded-3xl bg-white/20 items-center justify-center">
                <Text className="text-white text-3xl font-extrabold">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-extrabold text-xl" numberOfLines={1}>
                  {user?.fullName || 'User'}
                </Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Mail size={11} color="rgba(255,255,255,0.8)" />
                  <Text className="text-xs text-white/80" numberOfLines={1}>
                    {user?.email}
                  </Text>
                </View>
                {user?.phone && (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Phone size={11} color="rgba(255,255,255,0.8)" />
                    <Text className="text-xs text-white/80">{user.phone}</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="pt-3 border-t border-white/20 flex-row items-center gap-2 flex-wrap">
              <View
                className="px-2.5 py-1 rounded-md flex-row items-center gap-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                {role === 'OWNER' && <Crown size={10} color="#fde68a" fill="#fde68a" />}
                <Text className="text-[10px] font-extrabold text-white">{rc.label}</Text>
              </View>
              {tenant?.name && (
                <View
                  className="px-2.5 py-1 rounded-md flex-row items-center gap-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Building2 size={10} color="#ffffff" />
                  <Text className="text-[10px] font-bold text-white" numberOfLines={1}>
                    {tenant.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Account Info */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.index.account_information')}</Text>
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <View className="px-4 py-3 flex-row items-center gap-3 border-b border-neutral-100 dark:border-neutral-800">
              <View className="h-9 w-9 rounded-xl bg-blue-100 items-center justify-center">
                <Mail size={16} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.section.email')}</Text>
                <Text className="text-sm font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 flex-row items-center gap-3 border-b border-neutral-100 dark:border-neutral-800">
              <View className="h-9 w-9 rounded-xl bg-emerald-100 items-center justify-center">
                <Phone size={16} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.section.phone')}</Text>
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  {user?.phone || 'Not set'}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 flex-row items-center gap-3 border-b border-neutral-100 dark:border-neutral-800">
              <View
                className="h-9 w-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: rc.bg }}
              >
                <Shield size={16} color={rc.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.role')}</Text>
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  {rc.label}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 flex-row items-center gap-3">
              <View className="h-9 w-9 rounded-xl bg-violet-100 items-center justify-center">
                <Calendar size={16} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.member_since')}</Text>
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  {formatDate((user as any)?.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Info */}
        {tenant && (
          <View className="px-5 mb-4">
            <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.index.business')}</Text>
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex-row items-center gap-3">
              <View className="h-12 w-12 rounded-2xl bg-amber-100 items-center justify-center">
                <Briefcase size={20} color="#b45309" />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-neutral-900 dark:text-white">
                  {tenant.name}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Tenant ID: {tenant.id?.slice(0, 8)}...
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Security */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.index.security')}</Text>
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setPasswordOpen(true);
              }}
              className="px-4 py-3 flex-row items-center gap-3 active:bg-neutral-50"
            >
              <View className="h-10 w-10 rounded-xl bg-rose-100 items-center justify-center">
                <Lock size={18} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">{t('auto.index.change_password')}</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.index.update_your_account_password')}</Text>
              </View>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        {/* Logout */}
        <View className="px-5">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2 active:opacity-70"
            style={{
              borderColor: '#fecaca',
              backgroundColor: '#fee2e2',
            }}
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-rose-700 font-extrabold text-base">{t('auto.index.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                  <Edit3 size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.edit_profile')}</Text>
              </View>
              <Pressable
                onPress={() => setEditOpen(false)}
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
                  leftIcon={<User size={18} color="#9ca3af" />}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your name"
                />
                <ThemedInput
                  label="Email"
                  leftIcon={<Mail size={18} color="#9ca3af" />}
                  value={email}
                  editable={false}
                  hint="Email change karne ke liye support contact karein"
                />
                <ThemedInput
                  label="Phone"
                  leftIcon={<Phone size={18} color="#9ca3af" />}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+923001234567"
                />
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!fullName.trim()) {
                    Toast.show({ type: 'error', text1: 'Name required' });
                    return;
                  }
                  updateProfileMutation.mutate();
                }}
                disabled={updateProfileMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: updateProfileMutation.isPending ? '#9ca3af' : '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Save size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={passwordOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                  <Lock size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.change_password')}</Text>
              </View>
              <Pressable
                onPress={() => setPasswordOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <ThemedInput
                  label="Current Password"
                  required
                  leftIcon={<Lock size={18} color="#9ca3af" />}
                  rightIcon={
                    <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
                      {showCurrent ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                    </Pressable>
                  }
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrent}
                  placeholder="Enter current password"
                />
                <ThemedInput
                  label="New Password"
                  required
                  leftIcon={<Lock size={18} color="#9ca3af" />}
                  rightIcon={
                    <Pressable onPress={() => setShowNew(!showNew)} hitSlop={8}>
                      {showNew ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                    </Pressable>
                  }
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  placeholder="Min 8 characters"
                  hint="Strong password use karein"
                />
                <ThemedInput
                  label="Confirm New Password"
                  required
                  leftIcon={<Lock size={18} color="#9ca3af" />}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showNew}
                  placeholder="Re-enter new password"
                />

                {newPassword.length > 0 && confirmPassword.length > 0 && (
                  <View
                    className="rounded-2xl p-3 flex-row items-center gap-2"
                    style={{
                      backgroundColor: newPassword === confirmPassword ? '#dcfce7' : '#fee2e2',
                    }}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <Check size={16} color="#16a34a" />
                        <Text className="text-xs font-bold text-emerald-700">{t('auto.index.passwords_match')}</Text>
                      </>
                    ) : (
                      <>
                        <X size={16} color="#dc2626" />
                        <Text className="text-xs font-bold text-rose-700">{t('auto.index.passwords_don_t_match')}</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!currentPassword) {
                    Toast.show({ type: 'error', text1: 'Current password required' });
                    return;
                  }
                  if (newPassword.length < 8) {
                    Toast.show({ type: 'error', text1: 'Password min 8 characters' });
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    Toast.show({ type: 'error', text1: 'Passwords don\'t match' });
                    return;
                  }
                  changePasswordMutation.mutate();
                }}
                disabled={changePasswordMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: changePasswordMutation.isPending ? '#9ca3af' : '#dc2626',
                  shadowColor: '#dc2626',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Lock size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {changePasswordMutation.isPending ? 'Updating...' : 'Change Password'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
