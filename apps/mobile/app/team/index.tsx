import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Users, Plus, Trash2, ShieldCheck, Crown, X, Check,
  ToggleLeft, ToggleRight, Sparkles, Mail, Phone, Lock, KeyRound,
  Search, Eye, EyeOff, AlertCircle, Building2, Activity, UserCheck,
  UserX, Settings2, ChevronRight, Filter,
} from 'lucide-react-native';
import { teamApi, type UserRole, type TeamMember } from '@/api/team.api';
import { shopsApi } from '@/api/shops.api';
import { useAuthStore } from '@/store/auth.store';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from '@/lib/permissions';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

const roleConfig: Record<UserRole, {
  label: string; color: string; bg: string; border: string; icon: any;
}> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: Crown },
  OWNER:       { label: 'Owner',       color: '#b45309', bg: '#fef3c7', border: '#fcd34d', icon: Crown },
  MANAGER:     { label: 'Manager',     color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd', icon: ShieldCheck },
  CASHIER:     { label: 'Cashier',     color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', icon: UserCheck },
  STAFF:       { label: 'Staff',       color: '#4b5563', bg: '#f3f4f6', border: '#d1d5db', icon: Users },
};

const roleDescriptions: Record<string, string> = {
  MANAGER: 'Broad access except billing',
  CASHIER: 'POS, sales & customers',
  STAFF: 'Limited inventory access',
};

const formatDate = (v: string | null) => {
  if (!v) return 'Never';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
};

const formatRelative = (v: string | null) => {
  if (!v) return 'Never logged in';
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

type StatusFilter = 'all' | 'active' | 'inactive';

export default function TeamScreen() {
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [editPermsMember, setEditPermsMember] = useState<TeamMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const [editShopMember, setEditShopMember] = useState<TeamMember | null>(null);
  const [editShopId, setEditShopId] = useState<string>('');

  const [form, setForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>;
    shopId: string;
    permissions: string[];
  }>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
    shopId: '',
    permissions: [...(DEFAULT_ROLE_PERMISSIONS.CASHIER as string[])],
  });

  const { data: members = [], refetch } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      try {
        return await teamApi.list();
      } catch {
        return [];
      }
    },
  });

  const { data: catalog } = useQuery({
    queryKey: ['team-permissions-catalog'],
    queryFn: teamApi.catalog,
    enabled: isOwner,
    retry: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      try {
        return await shopsApi.list();
      } catch {
        return [];
      }
    },
    enabled: isOwner,
  });

  const effectiveDefaults = useMemo<Record<string, string[]>>(() => {
    if (catalog?.defaultsByRole) return catalog.defaultsByRole;
    return DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>;
  }, [catalog]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ─── FILTERED LIST ───
  const filtered = useMemo(() => {
    let result = [...members];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter === 'active') result = result.filter((m) => m.isActive);
    else if (statusFilter === 'inactive') result = result.filter((m) => !m.isActive);
    if (roleFilter !== 'all') result = result.filter((m) => m.role === roleFilter);
    return result;
  }, [members, search, statusFilter, roleFilter]);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.isActive).length,
    inactive: members.filter((m) => !m.isActive).length,
    owners: members.filter((m) => m.role === 'OWNER' || m.role === 'SUPER_ADMIN').length,
    managers: members.filter((m) => m.role === 'MANAGER').length,
    cashiers: members.filter((m) => m.role === 'CASHIER').length,
    staff: members.filter((m) => m.role === 'STAFF').length,
    recentlyActive: members.filter((m) => {
      if (!m.lastLoginAt) return false;
      const diff = Date.now() - new Date(m.lastLoginAt).getTime();
      return diff < 24 * 60 * 60 * 1000;
    }).length,
  }), [members]);

  const hasFilters = search || statusFilter !== 'all' || roleFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
  };

  // ─── MUTATIONS ───
  const createMutation = useMutation({
    mutationFn: () =>
      teamApi.create({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        shopId: form.shopId || undefined,
        permissions: form.permissions,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Member added!', text2: 'Permissions configured' });
      setForm({
        fullName: '', email: '', phone: '', password: '',
        role: 'CASHIER', shopId: '',
        permissions: [...((effectiveDefaults.CASHIER ?? []) as string[])],
      });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ id, perms }: { id: string; perms: string[] }) =>
      teamApi.updatePermissions(id, perms),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Permissions updated' });
      setEditPermsMember(null);
      setEditPermissions([]);
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const updateShopMutation = useMutation({
    mutationFn: ({ id, shopId }: { id: string; shopId: string | null }) =>
      teamApi.updateShop(id, shopId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Shop assignment updated' });
      setEditShopMember(null);
      setEditShopId('');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const toggleMutation = useMutation({
    mutationFn: teamApi.toggle,
    onSuccess: () => {
      Haptics.selectionAsync();
      Toast.show({ type: 'success', text1: 'Status updated' });
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

  // ─── HELPERS ───
  const applyRoleDefaults = (role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: [...((effectiveDefaults[role] ?? []) as string[])],
    }));
  };

  const toggleCreatePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const toggleEditPermission = (perm: string) => {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const selectAllInGroup = (group: any, mode: 'create' | 'edit') => {
    const allPerms = group.permissions;
    if (mode === 'create') {
      const allSelected = allPerms.every((p: string) => form.permissions.includes(p));
      if (allSelected) {
        setForm((prev) => ({ ...prev, permissions: prev.permissions.filter((p) => !allPerms.includes(p)) }));
      } else {
        setForm((prev) => ({ ...prev, permissions: [...new Set([...prev.permissions, ...allPerms])] }));
      }
    } else {
      const allSelected = allPerms.every((p: string) => editPermissions.includes(p));
      if (allSelected) {
        setEditPermissions((prev) => prev.filter((p) => !allPerms.includes(p)));
      } else {
        setEditPermissions((prev) => [...new Set([...prev, ...allPerms])]);
      }
    }
  };

  const handleDelete = (m: TeamMember) => {
    Alert.alert('Remove Member?', `${m.fullName} ko remove karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(m.id) },
    ]);
  };

  const openCreate = () => {
    if (!isOwner) {
      Toast.show({ type: 'error', text1: 'Owner access required' });
      return;
    }
    setCreateOpen(true);
  };

  const openEditPerms = (m: TeamMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditPermsMember(m);
    setEditPermissions([...(m.permissions ?? [])]);
  };

  const openEditShop = (m: TeamMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditShopMember(m);
    setEditShopId(m.shopId || '');
  };

  const handleSubmit = () => {
    if (!form.fullName.trim()) return Toast.show({ type: 'error', text1: 'Name required' });
    if (!form.email.trim()) return Toast.show({ type: 'error', text1: 'Email required' });
    if (form.password.length < 8) return Toast.show({ type: 'error', text1: 'Password min 8 chars' });
    createMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">Team</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#7c3aed" />
            <Text className="text-xs text-neutral-500">
              {stats.total} members • {stats.active} active
            </Text>
          </View>
        </View>
        {isOwner && (
          <Pressable
            onPress={openCreate}
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
            <Text className="text-white font-bold text-sm">Add</Text>
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
        {/* Hero */}
        <View className="mx-5 rounded-3xl p-5 mb-4" style={{
          backgroundColor: '#7c3aed',
          shadowColor: '#7c3aed',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
              <ShieldCheck size={28} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider text-white/80 font-extrabold">
                Team Management
              </Text>
              <Text className="text-white text-3xl font-extrabold mt-0.5">
                {stats.total} {stats.total === 1 ? 'Member' : 'Members'}
              </Text>
              <Text className="text-xs text-white/80 mt-0.5">
                Granular permissions • Shop assignments
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-3">
          <View className="flex-row flex-wrap -mx-1.5">
            {[
              { label: 'Active', value: stats.active, color: '#16a34a', bg: '#dcfce7', icon: UserCheck },
              { label: 'Managers', value: stats.managers, color: '#7c3aed', bg: '#ede9fe', icon: ShieldCheck },
              { label: 'Cashiers', value: stats.cashiers, color: '#2563eb', bg: '#dbeafe', icon: UserCheck },
              { label: 'Today Active', value: stats.recentlyActive, color: '#d97706', bg: '#fef3c7', icon: Activity },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} className="w-1/2 px-1.5 mb-3">
                  <View className="rounded-2xl border-2 p-3" style={{ backgroundColor: s.bg, borderColor: s.color }}>
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Icon size={12} color={s.color} />
                      <Text className="text-[10px] uppercase font-extrabold" style={{ color: s.color }}>
                        {s.label}
                      </Text>
                    </View>
                    <Text className="text-2xl font-extrabold mt-0.5" style={{ color: s.color }}>
                      {s.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {!isOwner && (
          <View className="mx-5 rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 mb-3 flex-row items-start gap-2">
            <Lock size={16} color="#b45309" />
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-amber-900">Owner Access Required</Text>
              <Text className="text-xs text-amber-800 mt-1">
                Sirf Owner team ka access manage kar sakta hai.
              </Text>
            </View>
          </View>
        )}

        {/* Search */}
        {members.length > 0 && (
          <View className="px-5 mb-3">
            <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
              <Search size={18} color="#9ca3af" />
              <TextInput
                placeholder="Search name, email, phone..."
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
                className="flex-1 text-sm text-neutral-900"
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => setSearch('')}
                  hitSlop={12}
                  className="h-7 w-7 rounded-full bg-neutral-100 items-center justify-center"
                >
                  <X size={14} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Status filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-2"
        >
          {[
            { key: 'all' as StatusFilter, label: 'All', count: stats.total, color: '#0f172a' },
            { key: 'active' as StatusFilter, label: 'Active', count: stats.active, color: '#16a34a' },
            { key: 'inactive' as StatusFilter, label: 'Inactive', count: stats.inactive, color: '#dc2626' },
          ].map((f) => {
            const active = statusFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(f.key);
                }}
                className="h-9 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                style={{
                  backgroundColor: active ? f.color : '#ffffff',
                  borderColor: active ? f.color : '#e5e7eb',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: active ? '#ffffff' : '#374151' }}
                >
                  {f.label}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6' }}
                >
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                  >
                    {f.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Role filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="mb-3"
        >
          <Pressable
            onPress={() => setRoleFilter('all')}
            className="h-8 px-3 rounded-lg border-2 flex-row items-center gap-1"
            style={{
              backgroundColor: roleFilter === 'all' ? '#0f172a' : '#ffffff',
              borderColor: roleFilter === 'all' ? '#0f172a' : '#e5e7eb',
            }}
          >
            <Text
              className="text-[10px] font-extrabold uppercase"
              style={{ color: roleFilter === 'all' ? '#ffffff' : '#374151' }}
            >
              All Roles
            </Text>
          </Pressable>
          {(['OWNER', 'MANAGER', 'CASHIER', 'STAFF'] as UserRole[]).map((r) => {
            const cfg = roleConfig[r];
            const active = roleFilter === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRoleFilter(r)}
                className="h-8 px-3 rounded-lg border-2 flex-row items-center gap-1"
                style={{
                  backgroundColor: active ? cfg.color : '#ffffff',
                  borderColor: active ? cfg.color : '#e5e7eb',
                }}
              >
                <Text
                  className="text-[10px] font-extrabold uppercase"
                  style={{ color: active ? '#ffffff' : cfg.color }}
                >
                  {r}
                </Text>
              </Pressable>
            );
          })}
          {hasFilters && (
            <Pressable
              onPress={clearFilters}
              className="h-8 px-3 rounded-lg bg-rose-50 border-2 border-rose-300 flex-row items-center gap-1"
            >
              <X size={11} color="#dc2626" />
              <Text className="text-[10px] font-extrabold text-rose-700">Clear</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Members list */}
        <View className="px-5">
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="h-20 w-20 rounded-3xl bg-violet-100 items-center justify-center">
                <Users size={36} color="#7c3aed" />
              </View>
              <Text className="mt-4 text-base font-bold text-neutral-900">
                {hasFilters ? 'No members match' : 'No team members yet'}
              </Text>
              <Text className="text-xs text-neutral-500 mt-1 text-center">
                {hasFilters ? 'Try different filter' : 'Team build karein'}
              </Text>
              {!hasFilters && isOwner && (
                <Pressable
                  onPress={openCreate}
                  className="mt-4 h-11 px-5 rounded-xl flex-row items-center gap-2"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Add First Member</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2.5">
              {filtered.map((m) => {
                const cfg = roleConfig[m.role];
                const RoleIcon = cfg.icon;
                const isRecent = m.lastLoginAt && (Date.now() - new Date(m.lastLoginAt).getTime()) < 24 * 60 * 60 * 1000;
                const isOwnerRole = m.role === 'OWNER' || m.role === 'SUPER_ADMIN';
                return (
                  <View
                    key={m.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-3.5"
                    style={{ borderColor: !m.isActive ? '#fca5a5' : '#e5e7eb' }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="relative shrink-0">
                        <View
                          className="h-14 w-14 rounded-2xl items-center justify-center"
                          style={{ backgroundColor: cfg.bg }}
                        >
                          <Text className="text-xl font-extrabold" style={{ color: cfg.color }}>
                            {m.fullName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {isRecent && (
                          <View
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white"
                            style={{ backgroundColor: '#16a34a' }}
                          />
                        )}
                        {isOwnerRole && (
                          <View
                            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full items-center justify-center border-2 border-white"
                            style={{ backgroundColor: '#f59e0b' }}
                          >
                            <Crown size={10} color="#ffffff" fill="#ffffff" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-base font-extrabold text-neutral-900" numberOfLines={1}>
                            {m.fullName}
                          </Text>
                          <View
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Text className="text-[9px] font-extrabold uppercase" style={{ color: cfg.color }}>
                              {m.role}
                            </Text>
                          </View>
                          <View
                            className="px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: m.isActive ? '#dcfce7' : '#fee2e2' }}
                          >
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: m.isActive ? '#15803d' : '#b91c1c' }}
                            >
                              {m.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-1 mt-1">
                          <Mail size={10} color="#64748b" />
                          <Text className="text-xs text-neutral-600" numberOfLines={1}>
                            {m.email}
                          </Text>
                        </View>
                        {m.phone && (
                          <Pressable
                            onPress={() => Linking.openURL(`tel:${m.phone}`)}
                            className="flex-row items-center gap-1 mt-0.5"
                          >
                            <Phone size={10} color="#2563eb" />
                            <Text className="text-xs font-bold text-blue-700">{m.phone}</Text>
                          </Pressable>
                        )}

                        <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
                          {m.assignedShop ? (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-100">
                              <Building2 size={9} color="#4f46e5" />
                              <Text className="text-[9px] font-extrabold text-indigo-700">
                                {m.assignedShop.name}{m.assignedShop.isMain && ' ⭐'}
                              </Text>
                            </View>
                          ) : !isOwnerRole ? (
                            <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100">
                              <AlertCircle size={9} color="#b45309" />
                              <Text className="text-[9px] font-extrabold text-amber-700">No shop</Text>
                            </View>
                          ) : null}
                          <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100">
                            <KeyRound size={9} color="#7c3aed" />
                            <Text className="text-[9px] font-extrabold text-violet-700">
                              {(m.permissions ?? []).length} perms
                            </Text>
                          </View>
                          <View
                            className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: isRecent ? '#dcfce7' : '#f3f4f6' }}
                          >
                            <Activity size={9} color={isRecent ? '#16a34a' : '#64748b'} />
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: isRecent ? '#15803d' : '#64748b' }}
                            >
                              {formatRelative(m.lastLoginAt ?? null)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Actions */}
                    {isOwner && !isOwnerRole && (
                      <View className="flex-row gap-2 mt-3 pt-3 border-t border-neutral-100">
                        <Pressable
                          onPress={() => openEditPerms(m)}
                          className="flex-1 h-9 rounded-lg bg-violet-100 items-center justify-center flex-row gap-1"
                        >
                          <KeyRound size={12} color="#7c3aed" />
                          <Text className="text-[10px] font-extrabold text-violet-700">Access</Text>
                        </Pressable>
                        {shops.length > 0 && (
                          <Pressable
                            onPress={() => openEditShop(m)}
                            className="flex-1 h-9 rounded-lg bg-indigo-100 items-center justify-center flex-row gap-1"
                          >
                            <Building2 size={12} color="#4f46e5" />
                            <Text className="text-[10px] font-extrabold text-indigo-700">Shop</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => toggleMutation.mutate(m.id)}
                          className="h-9 px-3 rounded-lg bg-neutral-100 items-center justify-center flex-row gap-1"
                        >
                          {m.isActive ? (
                            <ToggleRight size={14} color="#16a34a" />
                          ) : (
                            <ToggleLeft size={14} color="#9ca3af" />
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(m)}
                          className="h-9 w-9 rounded-lg bg-rose-50 items-center justify-center"
                        >
                          <Trash2 size={13} color="#dc2626" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═════ CREATE MODAL ═════ */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView className="flex-1 bg-neutral-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#7c3aed' }}>
                  <Users size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-lg font-extrabold text-neutral-900">Add Team Member</Text>
                  <Text className="text-[10px] text-neutral-500">Custom access control</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setCreateOpen(false)}
                hitSlop={12}
                className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Full Name *
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <Users size={16} color="#9ca3af" />
                  <TextInput
                    value={form.fullName}
                    onChangeText={(t) => setForm({ ...form, fullName: t })}
                    placeholder="Bilal Ahmad"
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Email */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Email *
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <Mail size={16} color="#9ca3af" />
                  <TextInput
                    value={form.email}
                    onChangeText={(t) => setForm({ ...form, email: t.toLowerCase() })}
                    placeholder="bilal@yourshop.pk"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Phone */}
              <View className="mb-3">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Phone
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <Phone size={16} color="#9ca3af" />
                  <TextInput
                    value={form.phone}
                    onChangeText={(t) => setForm({ ...form, phone: t })}
                    placeholder="+923001234567"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-1.5">
                  Temporary Password *
                </Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 flex-row items-center gap-2">
                  <Lock size={16} color="#9ca3af" />
                  <TextInput
                    value={form.password}
                    onChangeText={(t) => setForm({ ...form, password: t })}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    className="flex-1 text-base font-bold text-neutral-900"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    {showPassword ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                  </Pressable>
                </View>
                <Text className="text-[10px] text-neutral-500 mt-1 font-semibold">
                  💡 Member first login pe password change kar sakta hai
                </Text>
              </View>

              {/* Role */}
              <View className="mb-4">
                <Text className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider mb-2">
                  Role *
                </Text>
                <View className="flex-row gap-2">
                  {(['MANAGER', 'CASHIER', 'STAFF'] as const).map((role) => {
                    const cfg = roleConfig[role];
                    const active = form.role === role;
                    const RoleIcon = cfg.icon;
                    return (
                      <Pressable
                        key={role}
                        onPress={() => {
                          Haptics.selectionAsync();
                          applyRoleDefaults(role);
                        }}
                        className="flex-1 rounded-2xl border-2 p-3 items-center"
                        style={{
                          backgroundColor: active ? cfg.bg : '#ffffff',
                          borderColor: active ? cfg.color : '#e5e7eb',
                        }}
                      >
                        <RoleIcon size={20} color={active ? cfg.color : '#9ca3af'} />
                        <Text
                          className="text-[11px] font-extrabold mt-1"
                          style={{ color: active ? cfg.color : '#374151' }}
                        >
                          {cfg.label}
                        </Text>
                        <Text className="text-[9px] text-slate-500 mt-0.5 text-center" numberOfLines={2}>
                          {roleDescriptions[role]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Shop assignment */}
              {shops.length > 0 && (
                <View className="mb-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-3">
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Building2 size={14} color="#4f46e5" />
                    <Text className="text-xs font-extrabold uppercase text-indigo-900 tracking-wider">
                      Assign to Shop / Branch
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    <Pressable
                      onPress={() => setForm({ ...form, shopId: '' })}
                      className="h-10 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                      style={{
                        backgroundColor: !form.shopId ? '#4f46e5' : '#ffffff',
                        borderColor: !form.shopId ? '#4f46e5' : '#e5e7eb',
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: !form.shopId ? '#ffffff' : '#374151' }}>
                        No specific shop
                      </Text>
                    </Pressable>
                    {shops.filter((s) => s.isActive !== false).map((s) => {
                      const active = form.shopId === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setForm({ ...form, shopId: s.id })}
                          className="h-10 px-3 rounded-xl border-2 flex-row items-center gap-1.5"
                          style={{
                            backgroundColor: active ? '#4f46e5' : '#ffffff',
                            borderColor: active ? '#4f46e5' : '#e5e7eb',
                          }}
                        >
                          <Building2 size={12} color={active ? '#ffffff' : '#4f46e5'} />
                          <Text className="text-xs font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                            {s.name}
                          </Text>
                          {s.isMain && (
                            <Crown size={9} color={active ? '#fbbf24' : '#f59e0b'} fill={active ? '#fbbf24' : '#f59e0b'} />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Text className="text-[10px] text-indigo-800 mt-2 font-bold">
                    {form.shopId ? (
                      <>🔒 User sirf is shop ka data dekh sakega</>
                    ) : (
                      <>⚠️ Cashier/Manager ko shop assign karna recommended hai</>
                    )}
                  </Text>
                </View>
              )}

              {/* Permissions */}
              <View className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View>
                    <View className="flex-row items-center gap-1.5">
                      <KeyRound size={14} color="#7c3aed" />
                      <Text className="text-xs font-extrabold uppercase text-violet-900 tracking-wider">
                        Access Permissions
                      </Text>
                    </View>
                    <Text className="text-[10px] text-violet-700 mt-0.5 font-semibold">
                      Role defaults auto-loaded
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-violet-600">
                    <Text className="text-white text-[10px] font-extrabold">
                      {form.permissions.length} perms
                    </Text>
                  </View>
                </View>

                <View className="gap-2">
                  {PERMISSION_GROUPS.map((group) => {
                    const allSelected = group.permissions.every((p) => form.permissions.includes(p));
                    const count = group.permissions.filter((p) => form.permissions.includes(p)).length;
                    return (
                      <View key={group.title} className="rounded-xl bg-white border border-neutral-200 p-2.5">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-1.5 flex-1">
                            <Settings2 size={11} color={group.color} />
                            <Text className="text-[11px] font-extrabold" style={{ color: group.color }}>
                              {group.title}
                            </Text>
                            <View className="px-1.5 py-0.5 rounded bg-slate-100">
                              <Text className="text-[9px] font-bold text-slate-600">
                                {count}/{group.permissions.length}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => selectAllInGroup(group, 'create')}
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: allSelected ? '#fee2e2' : '#dcfce7' }}
                          >
                            <Text
                              className="text-[9px] font-extrabold"
                              style={{ color: allSelected ? '#b91c1c' : '#15803d' }}
                            >
                              {allSelected ? '− All' : '+ All'}
                            </Text>
                          </Pressable>
                        </View>
                        <View className="gap-1">
                          {group.permissions.map((perm) => {
                            const active = form.permissions.includes(perm);
                            return (
                              <Pressable
                                key={perm}
                                onPress={() => toggleCreatePermission(perm)}
                                className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg"
                                style={{ backgroundColor: active ? `${group.color}15` : 'transparent' }}
                              >
                                <View
                                  className="h-5 w-5 rounded-md items-center justify-center border-2"
                                  style={{
                                    borderColor: active ? group.color : '#d1d5db',
                                    backgroundColor: active ? group.color : 'transparent',
                                  }}
                                >
                                  {active && <Check size={12} color="#ffffff" />}
                                </View>
                                <Text className="text-xs font-semibold text-neutral-700 flex-1">
                                  {PERMISSION_LABELS[perm] || perm}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 bg-white">
              <Pressable
                onPress={handleSubmit}
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
                <Plus size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Adding...' : 'Add Team Member'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ═════ EDIT PERMISSIONS MODAL ═════ */}
      <Modal
        visible={!!editPermsMember}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditPermsMember(null)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#7c3aed' }}>
                <KeyRound size={20} color="#ffffff" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-lg font-extrabold text-neutral-900" numberOfLines={1}>
                  Edit Access
                </Text>
                <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                  {editPermsMember?.fullName} • {editPermissions.length} permissions
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setEditPermsMember(null)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="gap-2">
              {PERMISSION_GROUPS.map((group) => {
                const allSelected = group.permissions.every((p) => editPermissions.includes(p));
                const count = group.permissions.filter((p) => editPermissions.includes(p)).length;
                return (
                  <View key={group.title} className="rounded-xl bg-white border border-neutral-200 p-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-1.5 flex-1">
                        <Settings2 size={12} color={group.color} />
                        <Text className="text-xs font-extrabold" style={{ color: group.color }}>
                          {group.title}
                        </Text>
                        <View className="px-1.5 py-0.5 rounded bg-slate-100">
                          <Text className="text-[9px] font-bold text-slate-600">
                            {count}/{group.permissions.length}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => selectAllInGroup(group, 'edit')}
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: allSelected ? '#fee2e2' : '#dcfce7' }}
                      >
                        <Text
                          className="text-[10px] font-extrabold"
                          style={{ color: allSelected ? '#b91c1c' : '#15803d' }}
                        >
                          {allSelected ? '− All' : '+ All'}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="gap-1.5">
                      {group.permissions.map((perm) => {
                        const active = editPermissions.includes(perm);
                        return (
                          <Pressable
                            key={perm}
                            onPress={() => toggleEditPermission(perm)}
                            className="flex-row items-center gap-2 py-2 px-2 rounded-lg"
                            style={{ backgroundColor: active ? `${group.color}15` : 'transparent' }}
                          >
                            <View
                              className="h-5 w-5 rounded-md items-center justify-center border-2"
                              style={{
                                borderColor: active ? group.color : '#d1d5db',
                                backgroundColor: active ? group.color : 'transparent',
                              }}
                            >
                              {active && <Check size={12} color="#ffffff" />}
                            </View>
                            <Text className="text-sm font-semibold text-neutral-700 flex-1">
                              {PERMISSION_LABELS[perm] || perm}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View className="px-5 py-4 border-t border-neutral-200 bg-white">
            <Pressable
              onPress={() => {
                if (editPermsMember) {
                  updatePermsMutation.mutate({
                    id: editPermsMember.id,
                    perms: editPermissions,
                  });
                }
              }}
              disabled={updatePermsMutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: updatePermsMutation.isPending ? '#9ca3af' : '#7c3aed' }}
            >
              <Check size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {updatePermsMutation.isPending ? 'Saving...' : 'Save Access'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ═════ EDIT SHOP ASSIGNMENT MODAL ═════ */}
      <Modal
        visible={!!editShopMember}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setEditShopMember(null)}
      >
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
                <Building2 size={20} color="#ffffff" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-lg font-extrabold text-neutral-900" numberOfLines={1}>
                  Assign Shop
                </Text>
                <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                  {editShopMember?.fullName}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setEditShopMember(null)}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="gap-2">
              <Pressable
                onPress={() => setEditShopId('')}
                className="rounded-2xl border-2 p-4 flex-row items-center gap-3"
                style={{
                  backgroundColor: !editShopId ? '#e0e7ff' : '#ffffff',
                  borderColor: !editShopId ? '#4f46e5' : '#e5e7eb',
                }}
              >
                <View
                  className="h-11 w-11 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: !editShopId ? '#4f46e5' : '#f3f4f6' }}
                >
                  <X size={18} color={!editShopId ? '#ffffff' : '#9ca3af'} />
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-neutral-900">No Shop</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">Access to all locations</Text>
                </View>
                {!editShopId && <Check size={20} color="#4f46e5" />}
              </Pressable>

              {shops.filter((s) => s.isActive !== false).map((s) => {
                const active = editShopId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setEditShopId(s.id)}
                    className="rounded-2xl border-2 p-4 flex-row items-center gap-3"
                    style={{
                      backgroundColor: active ? '#e0e7ff' : '#ffffff',
                      borderColor: active ? '#4f46e5' : '#e5e7eb',
                    }}
                  >
                    <View
                      className="h-11 w-11 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: active ? '#4f46e5' : '#e0e7ff' }}
                    >
                      <Building2 size={18} color={active ? '#ffffff' : '#4f46e5'} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-extrabold text-neutral-900" numberOfLines={1}>
                          {s.name}
                        </Text>
                        {s.isMain && <Crown size={12} color="#f59e0b" fill="#f59e0b" />}
                      </View>
                      {s.address && (
                        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                          {s.address}
                        </Text>
                      )}
                    </View>
                    {active && <Check size={20} color="#4f46e5" />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="px-5 py-4 border-t border-neutral-200 bg-white">
            <Pressable
              onPress={() => {
                if (editShopMember) {
                  updateShopMutation.mutate({
                    id: editShopMember.id,
                    shopId: editShopId || null,
                  });
                }
              }}
              disabled={updateShopMutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: updateShopMutation.isPending ? '#9ca3af' : '#4f46e5' }}
            >
              <Check size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {updateShopMutation.isPending ? 'Saving...' : 'Save Assignment'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
