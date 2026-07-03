import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, User, Sparkles, Mail, Phone, Edit3, X, Save,
  Crown, Shield, Calendar, LogOut, Building2, Award,
  CheckCircle2, AlertCircle, Camera, Smartphone, Activity,
  ArrowRight, Star,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { apiClient } from '@/api/client';
import { uploadsApi } from '@/api/uploads.api';
import { isValidPakistanPhone, normalizePakistanPhone } from '@/lib/phone';
import { ActiveSessions } from '@/components/profile/ActiveSessions';
import { AccountSecurity } from '@/components/profile/AccountSecurity';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const formatDate = (v?: string) => {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
};

const roleConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  OWNER:   { color: '#b45309', bg: '#fef3c7', label: 'Owner', icon: Crown },
  MANAGER: { color: '#6d28d9', bg: '#ede9fe', label: 'Manager', icon: Shield },
  CASHIER: { color: '#1d4ed8', bg: '#dbeafe', label: 'Cashier', icon: User },
  STAFF:   { color: '#4b5563', bg: '#f3f4f6', label: 'Staff', icon: User },
  SUPER_ADMIN: { color: '#dc2626', bg: '#fee2e2', label: 'Super Admin', icon: Crown },
};

type Tab = 'overview' | 'security' | 'devices';

export default function ProfileScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  // @ts-expect-error setUser added at runtime
  const { user, tenant, refreshToken, logout, setUser } = useAuthStore();

  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>((user as any)?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: me, refetch } = useQuery({
    queryKey: ['auth-me'],
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
      setPhone(me.user.phone || '');
      setAvatarUrl(me.user.avatarUrl || null);
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
        avatarUrl: avatarUrl || undefined,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Profile updated!' });
      if (data && setUser && tenant) setUser(data, tenant);
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Update failed' });
    },
  });

  const pickAndUploadAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: 'error', text1: 'Gallery permission required' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;

      setUploadingAvatar(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const asset = result.assets[0];
      const uploaded = await (uploadsApi as any).upload({
        uri: asset.uri,
        fileName: asset.fileName || `avatar-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        purpose: 'avatar',
      });

      const url = uploaded?.url || uploaded?.data?.url;
      if (url) {
        setAvatarUrl(url);
        Toast.show({ type: 'success', text1: 'Avatar uploaded' });
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || 'Upload failed' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Are you sure?', [
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

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Name required' });
      return;
    }
    if (phone && !isValidPakistanPhone(phone)) {
      Toast.show({
        type: 'error',
        text1: 'Pakistan ka sahi number likhein',
        text2: 'Example: 03001234567',
      });
      return;
    }
    if (phone) setPhone(normalizePakistanPhone(phone));
    updateProfileMutation.mutate();
  };

  const u: any = me?.user || user;
  const role = u?.role || 'STAFF';
  const rc = roleConfig[role] || roleConfig.STAFF;
  const RoleIcon = rc.icon;
  const emailVerified = !!u?.emailVerified;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;
  const securityScore = [emailVerified, hasPassword, hasGoogle].filter(Boolean).length;
  const securityPercent = Math.round((securityScore / 3) * 100);
  const securityColor = securityScore >= 3 ? '#16a34a' : securityScore >= 2 ? '#f59e0b' : '#dc2626';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">Profile</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">Manage your account</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setEditOpen(true)}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{ backgroundColor: '#16a34a' }}
        >
          <Edit3 size={14} color="#ffffff" />
          <Text className="text-white font-bold text-sm">Edit</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        className="mb-2"
      >
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: User, color: '#16a34a' },
          { id: 'security' as Tab, label: 'Security', icon: Shield, color: '#2563eb' },
          { id: 'devices' as Tab, label: 'Devices', icon: Smartphone, color: '#7c3aed' },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t.id);
              }}
              className="h-10 px-4 rounded-2xl flex-row items-center gap-1.5 border-2"
              style={{
                backgroundColor: active ? t.color : '#ffffff',
                borderColor: active ? t.color : '#e2e8f0',
              }}
            >
              <Icon size={14} color={active ? '#ffffff' : t.color} />
              <Text
                className="text-sm font-extrabold"
                style={{ color: active ? '#ffffff' : '#374151' }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ═════ TAB CONTENT ═════ */}
      {tab === 'overview' && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View className="px-5 mb-4">
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#065f46' }}>
              <View className="p-5">
                <View className="flex-row items-center gap-4 mb-3">
                  <View className="relative">
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 24,
                          borderWidth: 3,
                          borderColor: 'rgba(255,255,255,0.3)',
                        }}
                      />
                    ) : (
                      <View
                        className="h-[84px] w-[84px] rounded-3xl bg-white/15 items-center justify-center"
                        style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
                      >
                        <Text className="text-white text-4xl font-extrabold">
                          {(u?.fullName || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={pickAndUploadAvatar}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 h-9 w-9 rounded-2xl bg-white items-center justify-center"
                      style={{
                        borderWidth: 3,
                        borderColor: '#065f46',
                        opacity: uploadingAvatar ? 0.5 : 1,
                      }}
                    >
                      <Camera size={14} color="#065f46" />
                    </Pressable>
                    {emailVerified && (
                      <View
                        className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 items-center justify-center"
                        style={{ borderWidth: 3, borderColor: '#065f46' }}
                      >
                        <CheckCircle2 size={12} color="#ffffff" />
                      </View>
                    )}
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1 mb-1">
                      <Sparkles size={10} color="#fde68a" />
                      <Text className="text-[9px] uppercase tracking-wider text-white/80 font-extrabold">
                        My Profile
                      </Text>
                    </View>
                    <Text className="text-2xl font-extrabold text-white" numberOfLines={1}>
                      {u?.fullName || 'Loading...'}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Mail size={11} color="rgba(255,255,255,0.85)" />
                      <Text className="text-xs text-white/85 font-semibold" numberOfLines={1}>
                        {u?.email}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-1.5 pt-3 border-t border-white/20">
                  <View
                    className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ backgroundColor: `${rc.color}40`, borderWidth: 1, borderColor: `${rc.color}60` }}
                  >
                    <RoleIcon size={10} color="#ffffff" />
                    <Text className="text-[10px] font-extrabold text-white uppercase">{rc.label}</Text>
                  </View>
                  {tenant?.name && (
                    <View
                      className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white/15"
                      style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <Building2 size={10} color="#ffffff" />
                      <Text className="text-[10px] font-extrabold text-white" numberOfLines={1}>
                        {tenant.name}
                      </Text>
                    </View>
                  )}
                  {u?.createdAt && (
                    <View
                      className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white/15"
                      style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <Calendar size={10} color="#ffffff" />
                      <Text className="text-[10px] font-extrabold text-white">
                        Since {formatDate(u.createdAt)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Security score card */}
          <View className="px-5 mb-4">
            <View
              className="rounded-3xl border-2 p-4"
              style={{
                backgroundColor: securityColor === '#16a34a' ? '#f0fdf4' : securityColor === '#f59e0b' ? '#fffbeb' : '#fef2f2',
                borderColor: securityColor === '#16a34a' ? '#86efac' : securityColor === '#f59e0b' ? '#fcd34d' : '#fca5a5',
              }}
            >
              <View className="flex-row items-center gap-3 mb-3">
                <View
                  className="h-14 w-14 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: securityColor }}
                >
                  <Award size={26} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: securityColor }}>
                    Security Score
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-3xl font-extrabold text-slate-900">{securityPercent}</Text>
                    <Text className="text-lg font-extrabold text-slate-900">%</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setTab('security')}
                  className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-white"
                  style={{ borderWidth: 1, borderColor: '#e2e8f0' }}
                >
                  <Text className="text-xs font-extrabold text-slate-700">Manage</Text>
                  <ArrowRight size={12} color="#334155" />
                </Pressable>
              </View>
              <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <View
                  className="h-full rounded-full"
                  style={{ width: `${securityPercent}%`, backgroundColor: securityColor }}
                />
              </View>
            </View>
          </View>

          {/* Account Info */}
          <View className="px-5 mb-4">
            <Text className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
              Account Information
            </Text>
            <View className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <InfoRow icon={Mail} iconBg="#2563eb" label="Email" value={u?.email} verified={emailVerified} />
              <InfoRow icon={Phone} iconBg="#16a34a" label="Phone" value={u?.phone || 'Not set'} />
              <InfoRow icon={RoleIcon} iconBg={rc.color} label="Role" value={rc.label} />
              <InfoRow icon={Calendar} iconBg="#7c3aed" label="Member Since" value={formatDate(u?.createdAt)} last />
            </View>
          </View>

          {/* Business */}
          {tenant && (
            <View className="px-5 mb-4">
              <Text className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
                Business
              </Text>
              <View className="rounded-2xl bg-white border border-slate-200 p-4 flex-row items-center gap-3">
                <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                  <Building2 size={22} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-slate-900" numberOfLines={1}>
                    {tenant.name}
                  </Text>
                  <Text className="text-xs text-slate-500 font-semibold mt-0.5">
                    {(tenant as any).businessType || 'General'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/settings' as any)}
                  hitSlop={8}
                  className="h-9 w-9 rounded-xl bg-amber-100 items-center justify-center"
                >
                  <ArrowRight size={14} color="#b45309" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Logout */}
          <View className="px-5">
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2"
              style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
            >
              <LogOut size={16} color="#dc2626" />
              <Text className="text-rose-700 font-extrabold">Logout</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {tab === 'security' && <AccountSecurity />}
      {tab === 'devices' && <ActiveSessions />}

      {/* Edit Profile Modal */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-slate-200 flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                <Edit3 size={18} color="#ffffff" />
              </View>
              <Text className="flex-1 text-xl font-extrabold text-slate-900">Edit Profile</Text>
              <Pressable
                onPress={() => setEditOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-slate-100 items-center justify-center"
              >
                <X size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Avatar */}
              <View className="items-center mb-6">
                <Pressable onPress={pickAndUploadAvatar} disabled={uploadingAvatar}>
                  <View className="relative">
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: 100, height: 100, borderRadius: 28 }}
                      />
                    ) : (
                      <View
                        className="h-[100px] w-[100px] rounded-[28px] items-center justify-center"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        <Text className="text-white text-4xl font-extrabold">
                          {(fullName || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View
                      className="absolute -bottom-1 -right-1 h-10 w-10 rounded-2xl bg-slate-900 items-center justify-center"
                      style={{ borderWidth: 3, borderColor: '#f8fafc' }}
                    >
                      <Camera size={16} color="#ffffff" />
                    </View>
                  </View>
                </Pressable>
                <Text className="text-xs text-slate-500 font-semibold mt-3">
                  {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
                </Text>
              </View>

              {/* Full Name */}
              <Text className="text-sm font-bold text-slate-700 mb-1.5">Full Name *</Text>
              <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12 mb-4">
                <User size={16} color="#94a3b8" />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your name"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm font-bold text-slate-900"
                />
              </View>

              {/* Email (read-only) */}
              <Text className="text-sm font-bold text-slate-700 mb-1.5">Email</Text>
              <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-100 px-3 h-12 mb-1">
                <Mail size={16} color="#94a3b8" />
                <Text className="flex-1 text-sm font-bold text-slate-500">{u?.email}</Text>
              </View>
              <Text className="text-xs text-slate-500 font-semibold mb-4">
                Email change ke liye support contact karein
              </Text>

              {/* Phone */}
              <Text className="text-sm font-bold text-slate-700 mb-1.5">Phone</Text>
              <View className="flex-row items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 h-12">
                <Phone size={16} color="#94a3b8" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="03001234567"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  className="flex-1 text-sm font-bold text-slate-900"
                />
              </View>
            </ScrollView>

            <View className="p-4 border-t-2 border-slate-100 flex-row gap-2 bg-white">
              <Pressable
                onPress={() => setEditOpen(false)}
                className="flex-1 h-12 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Text className="font-bold text-slate-800">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
                style={{
                  backgroundColor: updateProfileMutation.isPending ? '#94a3b8' : '#16a34a',
                }}
              >
                <Save size={14} color="#ffffff" />
                <Text className="text-white font-extrabold">
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon: Icon, iconBg, label, value, verified, last }: any) {
  return (
    <View className={`px-4 py-3 flex-row items-center gap-3 ${last ? '' : 'border-b border-slate-100'}`}>
      <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        <Icon size={18} color="#ffffff" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
          {label}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
            {value}
          </Text>
          {verified && (
            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100">
              <CheckCircle2 size={9} color="#16a34a" />
              <Text className="text-[9px] font-extrabold text-emerald-700">VERIFIED</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
