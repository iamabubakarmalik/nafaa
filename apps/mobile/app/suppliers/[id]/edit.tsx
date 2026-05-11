import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Truck, Building2, CreditCard, FileText,
  Phone, Mail, Camera, MapPin,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImagePickerSheet } from '@/components/uploads';
import { suppliersApi, type UpsertSupplierPayload } from '@/api/suppliers.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const empty: UpsertSupplierPayload = { name: '', isActive: true };

const TERMS = ['Net 7 days', 'Net 15 days', 'Net 30 days', 'Cash on delivery', 'Advance payment'];

export default function SupplierFormScreen({ mode }: { mode?: 'new' } = {}) {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = mode === 'new' || !id;
  const supplierId = isNew ? null : (id as string);

  const [form, setForm] = useState<UpsertSupplierPayload>(empty);
  const [showPicker, setShowPicker] = useState(false);

  const { data: supplier } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersApi.getOne(supplierId!),
    enabled: !!supplierId,
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contactPerson: supplier.contactPerson ?? '',
        phone: supplier.phone ?? '',
        altPhone: supplier.altPhone ?? '',
        email: supplier.email ?? '',
        cnic: supplier.cnic ?? '',
        ntn: supplier.ntn ?? '',
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        area: supplier.area ?? '',
        logoUrl: supplier.logoUrl ?? '',
        bankName: supplier.bankName ?? '',
        accountNumber: supplier.accountNumber ?? '',
        iban: supplier.iban ?? '',
        paymentTerms: supplier.paymentTerms ?? '',
        notes: supplier.notes ?? '',
        isActive: supplier.isActive,
      });
    }
  }, [supplier]);

  const saveMutation = useMutation({
    mutationFn: () =>
      supplierId ? suppliersApi.update(supplierId, form) : suppliersApi.create(form),
    onSuccess: (saved) => {
      Toast.show({ type: 'success', text1: supplierId ? 'Update ho gaya' : 'Supplier add ho gaya' });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      router.replace(`/suppliers/${saved.id}`);
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Fail ho gaya' }),
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(supplierId!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Delete ho gaya' });
      router.replace('/suppliers');
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
          <ArrowLeft size={20} color="#f97316" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {supplierId ? 'Edit Supplier' : 'Naya Supplier'}
          </Text>
        </View>
        {supplierId && (
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
          {/* Logo */}
          <View className="items-center mb-5">
            <Pressable onPress={() => setShowPicker(true)} className="relative">
              {form.logoUrl ? (
                <Image source={{ uri: form.logoUrl }} className="h-28 w-28 rounded-3xl" />
              ) : (
                <View className="h-28 w-28 rounded-3xl bg-orange-100 dark:bg-orange-950/40 items-center justify-center">
                  <Text className="text-4xl font-bold text-orange-700 dark:text-orange-300">
                    {(form.name || 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-orange-600 items-center justify-center border-4 border-white dark:border-neutral-950">
                <Camera size={16} color="#ffffff" />
              </View>
            </Pressable>
          </View>

          {/* Company info */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Building2 size={16} color="#f97316" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.edit.company_info')}</Text>
            </View>
            <View className="gap-3">
              <Input
                label="Supplier Naam *"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="ABC Wholesalers"
              />
              <Input
                label="Contact Person"
                value={form.contactPerson ?? ''}
                onChangeText={(t) => setForm({ ...form, contactPerson: t })}
                placeholder="Mr. Ahmed"
              />
              <Input
                label="Phone"
                value={form.phone ?? ''}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="+923009998877"
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color="#9ca3af" />}
              />
              <Input
                label="Alternate Phone"
                value={form.altPhone ?? ''}
                onChangeText={(t) => setForm({ ...form, altPhone: t })}
                keyboardType="phone-pad"
              />
              <Input
                label="Email"
                value={form.email ?? ''}
                onChangeText={(t) => setForm({ ...form, email: t })}
                placeholder="contact@abc.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={18} color="#9ca3af" />}
              />
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
                    label="City"
                    value={form.city ?? ''}
                    onChangeText={(t) => setForm({ ...form, city: t })}
                    placeholder="Karachi"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Area"
                    value={form.area ?? ''}
                    onChangeText={(t) => setForm({ ...form, area: t })}
                    placeholder="Saddar"
                  />
                </View>
              </View>
              <Input
                label="Address"
                value={form.address ?? ''}
                onChangeText={(t) => setForm({ ...form, address: t })}
              />
            </View>
          </View>

          {/* Tax info */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <FileText size={16} color="#2563eb" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.edit.tax_info')}</Text>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label="CNIC"
                  value={form.cnic ?? ''}
                  onChangeText={(t) => setForm({ ...form, cnic: t })}
                  placeholder="12345-6789012-3"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="NTN"
                  value={form.ntn ?? ''}
                  onChangeText={(t) => setForm({ ...form, ntn: t })}
                  placeholder="0000000-0"
                />
              </View>
            </View>
          </View>

          {/* Banking */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CreditCard size={16} color="#16a34a" />
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t('auto.index.banking_payment')}</Text>
            </View>
            <View className="gap-3">
              <Input
                label="Bank Name"
                value={form.bankName ?? ''}
                onChangeText={(t) => setForm({ ...form, bankName: t })}
                placeholder="HBL, MCB, UBL..."
              />
              <Input
                label="Account Number"
                value={form.accountNumber ?? ''}
                onChangeText={(t) => setForm({ ...form, accountNumber: t })}
              />
              <Input
                label="IBAN"
                value={form.iban ?? ''}
                onChangeText={(t) => setForm({ ...form, iban: t })}
                placeholder="PK00BANK0000000000000000"
                autoCapitalize="characters"
              />
              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{t('auto.edit.payment_terms')}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {TERMS.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setForm({ ...form, paymentTerms: form.paymentTerms === t ? '' : t })}
                      className={`px-3 py-2 rounded-xl border-2 ${
                        form.paymentTerms === t
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          form.paymentTerms === t ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Notes */}
          <Card variant="outline" className="p-3">
            <Input
              label="Notes"
              value={form.notes ?? ''}
              onChangeText={(t) => setForm({ ...form, notes: t })}
              placeholder="Internal notes..."
              multiline
            />
          </Card>
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
            className="bg-orange-600"
          >
            <Save size={18} color="#ffffff" />
            <Text className="text-white font-bold text-base">
              {supplierId ? 'Update' : 'Save'}
            </Text>
          </Button>
        </View>
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="brand-logo"
        multiple={false}
        title="Supplier Logo"
        onUploaded={(records) => {
          if (records[0]) setForm((f) => ({ ...f, logoUrl: records[0].url }));
          setShowPicker(false);
        }}
      />
    </SafeAreaView>
  );
}
