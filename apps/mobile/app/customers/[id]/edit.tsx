import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Crown, User, Phone, Mail, MapPin, FileText,
  CreditCard, Plus, Check, Camera,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImagePickerSheet } from '@/components/uploads';
import { customersApi, type UpsertCustomerPayload } from '@/api/customers.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const empty: UpsertCustomerPayload = {
  name: '',
  phone: '',
  email: '',
  cnic: '',
  address: '',
  city: '',
  area: '',
  notes: '',
  creditLimit: 0,
  isVip: false,
  isActive: true,
};

export default function CustomerFormScreen({ mode }: { mode?: 'new' } = {}) {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = mode === 'new' || !id;
  const customerId = isNew ? null : (id as string);

  const [form, setForm] = useState<UpsertCustomerPayload>(empty);
  const [showPicker, setShowPicker] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getOne(customerId!),
    enabled: !!customerId,
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        cnic: customer.cnic ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        area: customer.area ?? '',
        gender: customer.gender ?? undefined,
        dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
        avatarUrl: customer.avatarUrl ?? '',
        notes: customer.notes ?? '',
        creditLimit: customer.creditLimit,
        isVip: customer.isVip,
        isActive: customer.isActive,
      });
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: () =>
      customerId ? customersApi.update(customerId, form) : customersApi.create(form),
    onSuccess: (saved) => {
      Toast.show({ type: 'success', text1: customerId ? 'Update ho gaya' : 'Customer add ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customer', saved.id] });
      router.replace(`/customers/${saved.id}`);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Fail ho gaya' }),
  });

  const removeMutation = useMutation({
    mutationFn: () => customersApi.remove(customerId!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Delete ho gaya' });
      router.replace('/(tabs)/customers');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#2563eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {customerId ? 'Edit Customer' : 'Naya Customer'}
          </Text>
          <Text className="text-xs text-neutral-500">
            {customerId ? form.name || 'Update info' : 'Customer ki details darj karein'}
          </Text>
        </View>
        {customerId && (
          <Pressable
            onPress={() => removeMutation.mutate()}
            className="h-11 w-11 rounded-2xl bg-rose-100 dark:bg-rose-950/40 items-center justify-center"
          >
            <Trash2 size={18} color="#dc2626" />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View className="items-center mb-5">
            <Pressable
              onPress={() => setShowPicker(true)}
              className="relative"
            >
              {form.avatarUrl ? (
                <Image
                  source={{ uri: form.avatarUrl }}
                  className="h-28 w-28 rounded-full"
                />
              ) : (
                <View className={`h-28 w-28 rounded-full items-center justify-center ${
                  form.isVip
                    ? 'bg-amber-500'
                    : 'bg-blue-100 dark:bg-blue-950/40'
                }`}>
                  <Text className={`text-4xl font-bold ${
                    form.isVip ? 'text-white' : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {(form.name || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-blue-600 items-center justify-center border-4 border-white dark:border-neutral-950">
                <Camera size={16} color="#ffffff" />
              </View>
              {form.isVip && (
                <View className="absolute -top-1 -right-1 h-9 w-9 rounded-full bg-amber-500 items-center justify-center border-4 border-white dark:border-neutral-950">
                  <Crown size={14} color="#ffffff" />
                </View>
              )}
            </Pressable>
            {form.avatarUrl ? (
              <Pressable onPress={() => setForm({ ...form, avatarUrl: '' })} className="mt-2">
                <Text className="text-xs text-rose-600 font-bold">{t('auto.edit.photo_hatao')}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Flags */}
          <Card variant="outline" className="p-4 mb-4">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setForm({ ...form, isVip: !form.isVip })}
                className={`flex-1 flex-row items-center gap-2 px-3 py-3 rounded-xl border-2 ${
                  form.isVip
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200'
                }`}
              >
                <Crown size={18} color={form.isVip ? '#f59e0b' : '#6b7280'} fill={form.isVip ? '#f59e0b' : 'none'} />
                <Text className="font-bold text-neutral-900 dark:text-white">
                  {form.isVip ? 'VIP Customer' : 'Make VIP'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setForm({ ...form, isActive: !form.isActive })}
                className={`flex-1 flex-row items-center gap-2 px-3 py-3 rounded-xl border-2 ${
                  form.isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200'
                }`}
              >
                <Check size={18} color={form.isActive ? '#16a34a' : '#6b7280'} />
                <Text className="font-bold text-neutral-900 dark:text-white">
                  {form.isActive ? 'Active' : 'Inactive'}
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Personal info */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <User size={16} color="#2563eb" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.personal_info')}</Text>
            </View>
            <View className="gap-3">
              <Input
                label="Naam *"
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                placeholder="Ali Raza"
                leftIcon={<User size={18} color="#9ca3af" />}
              />
              <Input
                label="Phone"
                value={form.phone ?? ''}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="+923001112233"
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color="#9ca3af" />}
              />
              <Input
                label="Email"
                value={form.email ?? ''}
                onChangeText={(t) => setForm({ ...form, email: t })}
                placeholder="ali@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={18} color="#9ca3af" />}
              />
              <Input
                label="CNIC"
                value={form.cnic ?? ''}
                onChangeText={(t) => setForm({ ...form, cnic: t })}
                placeholder="12345-6789012-3"
              />

              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">{t('auto.edit.gender')}</Text>
                <View className="flex-row gap-2">
                  {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                    <Pressable
                      key={g}
                      onPress={() =>
                        setForm({ ...form, gender: form.gender === g ? undefined : g })
                      }
                      className={`flex-1 px-3 py-2.5 rounded-xl border-2 ${
                        form.gender === g
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-bold ${
                          form.gender === g ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {g === 'MALE' ? 'Mard' : g === 'FEMALE' ? 'Aurat' : 'Other'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Location */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <MapPin size={16} color="#dc2626" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.edit.location')}</Text>
            </View>
            <View className="gap-3">
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    label="Sheher"
                    value={form.city ?? ''}
                    onChangeText={(t) => setForm({ ...form, city: t })}
                    placeholder="Lahore"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Area"
                    value={form.area ?? ''}
                    onChangeText={(t) => setForm({ ...form, area: t })}
                    placeholder="Gulberg"
                  />
                </View>
              </View>
              <Input
                label="Address"
                value={form.address ?? ''}
                onChangeText={(t) => setForm({ ...form, address: t })}
                placeholder="House #, Street"
              />
            </View>
          </View>

          {/* Credit */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CreditCard size={16} color="#16a34a" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.edit.khata_limit')}</Text>
            </View>
            <Input
              label="Credit Limit (PKR)"
              value={String(form.creditLimit ?? 0)}
              onChangeText={(t) => setForm({ ...form, creditLimit: Number(t) || 0 })}
              placeholder="0"
              keyboardType="numeric"
              hint="Maximum udhaar jo customer le sake"
            />
          </View>

          {/* Notes */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <FileText size={16} color="#f59e0b" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.new.notes')}</Text>
            </View>
            <Card variant="outline" className="p-3">
              <Input
                value={form.notes ?? ''}
                onChangeText={(t) => setForm({ ...form, notes: t })}
                placeholder="Customer ke baare mein notes..."
                multiline
              />
            </Card>
          </View>
        </ScrollView>

        <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Button
            size="lg"
            loading={saveMutation.isPending}
            onPress={() => {
              if (!form.name.trim()) {
                Toast.show({ type: 'error', text1: 'Naam zaroori hai' });
                return;
              }
              saveMutation.mutate();
            }}
          >
            <Save size={18} color="#ffffff" />
            <Text className="text-white font-bold text-base">
              {customerId ? 'Update karein' : 'Save karein'}
            </Text>
          </Button>
        </View>
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="avatar"
        multiple={false}
        title="Customer Photo"
        onUploaded={(records) => {
          if (records[0]) setForm((f) => ({ ...f, avatarUrl: records[0].url }));
          setShowPicker(false);
        }}
      />
    </SafeAreaView>
  );
}
