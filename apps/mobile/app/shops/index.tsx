import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Store, Plus, Trash2, Sparkles, X, Check, Crown,
  MapPin, Phone, Building2,
} from 'lucide-react-native';
import { shopsApi } from '@/api/shops.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
export default function ShopsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isMain, setIsMain] = useState(false);

  const { data: shops = [], refetch } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      try {
        const r = await shopsApi.list();
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
      shopsApi.create({
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        isMain,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Shop created!' });
      setName('');
      setAddress('');
      setPhone('');
      setIsMain(false);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const deleteMutation = useMutation({
    mutationFn: shopsApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Shop?', `${name} ko delete karna chahte hain?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.shops_branches')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#0891b2" />
            <Text className="text-xs text-neutral-500">{shops.length} locations</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCreateOpen(true);
          }}
          className="h-11 px-4 rounded-2xl flex-row items-center gap-1.5 active:opacity-80"
          style={{ backgroundColor: '#0891b2', shadowColor: '#0891b2', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-bold text-sm">{t('auto.index.new')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#0891b2',
              shadowColor: '#0891b2',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Store size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.locations')}</Text>
                <Text className="text-3xl font-extrabold text-white">{shops.length}</Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.multi_branch_management')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5">
          {shops.length === 0 ? (
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
              <View className="h-16 w-16 rounded-3xl bg-cyan-100 items-center justify-center">
                <Store size={32} color="#0891b2" />
              </View>
              <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.index.no_shops_yet')}</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                className="mt-4 h-10 px-5 rounded-xl flex-row items-center gap-1.5"
                style={{ backgroundColor: '#0891b2' }}
              >
                <Plus size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm">{t('auto.index.add_shop')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-2.5">
              {shops.map((s) => (
                <View
                  key={s.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border-2 p-4"
                  style={{ borderColor: s.isMain ? '#0891b2' : '#e5e7eb' }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-12 w-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: s.isMain ? '#cffafe' : '#f3f4f6' }}
                    >
                      <Building2 size={20} color={s.isMain ? '#0891b2' : '#737373'} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-bold text-neutral-900 dark:text-white text-base" numberOfLines={1}>
                          {s.name}
                        </Text>
                        {s.isMain && <Crown size={14} color="#f59e0b" fill="#f59e0b" />}
                      </View>
                      {s.isMain && (
                        <View className="bg-cyan-100 px-1.5 py-0.5 rounded-md self-start mt-0.5">
                          <Text className="text-[9px] font-extrabold text-cyan-700">{t('auto.index.main_branch')}</Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleDelete(s.id, s.name)}
                      className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                    >
                      <Trash2 size={14} color="#dc2626" />
                    </Pressable>
                  </View>
                  {(s.address || s.phone) && (
                    <View className="mt-3 pt-3 border-t border-neutral-100 gap-1.5">
                      {s.address && (
                        <View className="flex-row items-center gap-1.5">
                          <MapPin size={11} color="#737373" />
                          <Text className="text-xs text-neutral-600" numberOfLines={1}>
                            {s.address}
                          </Text>
                        </View>
                      )}
                      {s.phone && (
                        <View className="flex-row items-center gap-1.5">
                          <Phone size={11} color="#737373" />
                          <Text className="text-xs text-neutral-600">{s.phone}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: '#0891b2' }}>
                  <Store size={18} color="#ffffff" />
                </View>
                <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.new_shop')}</Text>
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
                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                    Shop Name <Text className="text-rose-600">*</Text>
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g., Main Branch"
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      className="flex-1 text-base text-neutral-900"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">{t('auto.index.address')}</Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <MapPin size={18} color="#9ca3af" />
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="e.g., Saddar Road, Karachi"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 text-base text-neutral-900"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">{t('auto.section.phone')}</Text>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                    <Phone size={18} color="#9ca3af" />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+923001234567"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      className="flex-1 text-base text-neutral-900"
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => setIsMain(!isMain)}
                  className="flex-row items-center gap-3 p-4 rounded-2xl border-2"
                  style={{
                    borderColor: isMain ? '#0891b2' : '#e5e7eb',
                    backgroundColor: isMain ? '#cffafe' : '#ffffff',
                  }}
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: isMain ? '#0891b2' : '#f3f4f6' }}
                  >
                    <Crown size={20} color={isMain ? '#ffffff' : '#737373'} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900">Main Branch</Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.index.default_location_for_all_sales')}</Text>
                  </View>
                  <View
                    style={{
                      height: 28,
                      width: 48,
                      borderRadius: 14,
                      padding: 2,
                      justifyContent: 'center',
                      backgroundColor: isMain ? '#0891b2' : '#d1d5db',
                    }}
                  >
                    <View
                      style={{
                        height: 24,
                        width: 24,
                        borderRadius: 12,
                        backgroundColor: '#ffffff',
                        transform: [{ translateX: isMain ? 20 : 0 }],
                      }}
                    />
                  </View>
                </Pressable>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Pressable
                onPress={() => {
                  if (!name.trim()) {
                    Toast.show({ type: 'error', text1: 'Shop name required' });
                    return;
                  }
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
                className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
                style={{
                  backgroundColor: createMutation.isPending ? '#9ca3af' : '#0891b2',
                  shadowColor: '#0891b2',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Check size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {createMutation.isPending ? 'Saving...' : 'Save Shop'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
