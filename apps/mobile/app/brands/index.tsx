import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Search, Building2, Edit3, Trash2, X, Save, Globe,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { brandsApi, type Brand, type UpsertBrandPayload } from '@/api/brands.api';
import { ImagePickerSheet } from '@/components/uploads';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const empty: UpsertBrandPayload = {
  name: '',
  description: '',
  logoUrl: '',
  website: '',
  isActive: true,
};

export default function BrandsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<UpsertBrandPayload>(empty);
  const [showPicker, setShowPicker] = useState(false);

  const { data: brands = [], refetch } = useQuery({
    queryKey: ['brands', search],
    queryFn: () => brandsApi.list(search || undefined),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? brandsApi.update(editing.id, form) : brandsApi.create(form),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing ? 'Brand updated' : 'Brand created' });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      closeForm();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const removeMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description ?? '',
      logoUrl: b.logoUrl ?? '',
      website: b.website ?? '',
      isActive: b.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
  };

  const confirmDelete = (brand: Brand) => {
    Alert.alert(
      'Delete Brand?',
      `Are you sure you want to delete "${brand.name}"? Ye action undo nahi ho sakta.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeMutation.mutate(brand.id),
        },
      ],
    );
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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.brands')}</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {brands.length} brand{brands.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={openCreate}
          className="h-11 w-11 rounded-2xl bg-violet-600 items-center justify-center"
        >
          <Plus size={22} color="#ffffff" />
        </Pressable>
      </View>

      <View className="px-5 pb-3">
        <Input
          placeholder="Search brands..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={20} color="#9ca3af" />}
        />
      </View>

      <FlatList
        data={brands}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Building2 size={48} color="#d1d5db" />
            <Text className="mt-4 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_brands_yet')}</Text>
            <Text className="mt-1 text-sm text-neutral-500">{t('auto.index.add_your_first_brand_to_get_started')}</Text>
            <Button size="md" className="mt-6" onPress={openCreate}>
              <Plus size={18} color="#fff" />
              <Text className="text-white font-bold">{t('auto.index.add_brand')}</Text>
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => (
          <Card variant="outline" className="p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-950/40 overflow-hidden items-center justify-center">
                {item.logoUrl ? (
                  <Image source={{ uri: item.logoUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Text className="text-violet-700 dark:text-violet-300 text-xl font-bold">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View className="flex-1 min-w-0">
                <Text
                  className="font-bold text-neutral-900 dark:text-white"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-xs text-neutral-500 font-mono mt-0.5">
                  /{item.slug}
                </Text>
                {item.description && (
                  <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                <View className="flex-row items-center gap-2 mt-1.5">
                  <Badge variant="info" size="sm">
                    {item._count?.products ?? 0} products
                  </Badge>
                  {!item.isActive && <Badge variant="neutral" size="sm">Inactive</Badge>}
                </View>
              </View>

              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => openEdit(item)}
                  className="h-9 w-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
                >
                  <Edit3 size={16} color="#525252" />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 items-center justify-center"
                >
                  <Trash2 size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          </Card>
        )}
      />

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                {editing ? 'Edit Brand' : 'New Brand'}
              </Text>
              <Pressable
                onPress={closeForm}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-4">
                {/* Logo */}
                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{t('auto.index.logo')}</Text>
                  <Pressable
                    onPress={() => setShowPicker(true)}
                    className="h-32 w-32 rounded-3xl bg-violet-100 dark:bg-violet-950/40 overflow-hidden items-center justify-center border-2 border-dashed border-violet-300 dark:border-violet-800"
                  >
                    {form.logoUrl ? (
                      <Image source={{ uri: form.logoUrl }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="items-center">
                        <Plus size={28} color="#8b5cf6" />
                        <Text className="text-xs text-violet-700 dark:text-violet-300 mt-1 font-bold">{t('auto.index.add_logo')}</Text>
                      </View>
                    )}
                  </Pressable>
                  {form.logoUrl ? (
                    <Pressable onPress={() => setForm({ ...form, logoUrl: '' })}>
                      <Text className="text-xs text-rose-600 mt-2 font-bold">{t('auto.index.remove_logo')}</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Input
                  label="Brand Name *"
                  value={form.name}
                  onChangeText={(name) => setForm({ ...form, name })}
                  placeholder="e.g. Nestle, Unilever"
                />

                <View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">{t('auto.edit.description')}</Text>
                  <View className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2">
                    <ScrollView style={{ maxHeight: 100 }}>
                      <Input
                        value={form.description ?? ''}
                        onChangeText={(t) => setForm({ ...form, description: t })}
                        placeholder="Brief description..."
                        multiline
                      />
                    </ScrollView>
                  </View>
                </View>

                <Input
                  label="Website (optional)"
                  value={form.website ?? ''}
                  onChangeText={(t) => setForm({ ...form, website: t })}
                  placeholder="https://example.com"
                  keyboardType="url"
                  autoCapitalize="none"
                  leftIcon={<Globe size={20} color="#9ca3af" />}
                />

                <Pressable
                  onPress={() => setForm({ ...form, isActive: !form.isActive })}
                  className="flex-row items-center gap-3 py-2"
                >
                  <View
                    className={`h-6 w-6 rounded-md border-2 items-center justify-center ${
                      form.isActive ? 'bg-violet-600 border-violet-600' : 'border-neutral-300'
                    }`}
                  >
                    {form.isActive && (
                      <Text className="text-white font-bold text-xs">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{t('auto.index.active')}</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Button
                size="lg"
                loading={saveMutation.isPending}
                onPress={() => {
                  if (!form.name.trim()) {
                    Toast.show({ type: 'error', text1: 'Name required' });
                    return;
                  }
                  saveMutation.mutate();
                }}
              >
                <Save size={18} color="#ffffff" />
                <Text className="text-white font-bold text-base">
                  {editing ? 'Update' : 'Create'} Brand
                </Text>
              </Button>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="brand-logo"
        multiple={false}
        title="Brand Logo"
        onUploaded={(records) => {
          if (records[0]) {
            setForm((f) => ({ ...f, logoUrl: records[0].url }));
            setShowPicker(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
