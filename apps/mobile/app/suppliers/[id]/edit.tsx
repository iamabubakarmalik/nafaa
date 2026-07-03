import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image,
  TextInput, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft, Save, Trash2, Truck, Building2, CreditCard, FileText,
  Phone, Mail, Camera, MapPin, User, Hash, Wallet, ShieldCheck,
  Sparkles, MessageCircle, CheckCircle2, AlertCircle, Copy, Eye, EyeOff,
  Banknote, Info, X, ChevronRight,
} from 'lucide-react-native';
import { ImagePickerSheet } from '@/components/uploads';
import { suppliersApi, type UpsertSupplierPayload } from '@/api/suppliers.api';
import { useSmartBack } from '@/hooks/useSmartBack';
import Toast from 'react-native-toast-message';

type Section = 'company' | 'location' | 'tax' | 'banking' | 'notes';

const sections: { id: Section; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'company', label: 'Company', icon: Building2, color: '#f97316', desc: 'Basic company info' },
  { id: 'location', label: 'Location', icon: MapPin, color: '#e11d48', desc: 'City & address' },
  { id: 'tax', label: 'Tax', icon: FileText, color: '#2563eb', desc: 'CNIC & NTN' },
  { id: 'banking', label: 'Banking', icon: CreditCard, color: '#16a34a', desc: 'Bank & payment' },
  { id: 'notes', label: 'Notes', icon: Info, color: '#d97706', desc: 'Internal notes' },
];

const PAYMENT_TERMS = [
  { value: 'Cash on delivery', emoji: '💵', desc: 'Foran payment' },
  { value: 'Advance payment', emoji: '🎯', desc: 'Pehle pay' },
  { value: 'Net 7 days', emoji: '📅', desc: 'Hafta mein' },
  { value: 'Net 15 days', emoji: '🗓️', desc: '15 din' },
  { value: 'Net 30 days', emoji: '📆', desc: '1 mahina' },
  { value: 'Net 45 days', emoji: '⏳', desc: '45 din' },
  { value: 'Net 60 days', emoji: '⌛', desc: '2 mahine' },
];

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
  'Hyderabad', 'Gujranwala', 'Peshawar', 'Quetta', 'Sialkot', 'Sargodha',
];

const PAKISTAN_BANKS = [
  'HBL (Habib Bank)', 'UBL (United Bank)', 'MCB Bank', 'Bank Alfalah',
  'Meezan Bank', 'Allied Bank', 'Faysal Bank', 'Standard Chartered',
  'Bank of Punjab', 'JS Bank', 'Habib Metropolitan', 'Bank Al Habib',
  'NBP (National Bank)', 'Dubai Islamic Bank', 'BankIslami',
];

const empty: UpsertSupplierPayload = { name: '', isActive: true };

// Helpers
const formatCNIC = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

const formatIBAN = (value: string): string => {
  const cleaned = value.replace(/\s/g, '').toUpperCase().slice(0, 24);
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('92')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('0')) return digits.slice(0, 11);
  return digits.slice(0, 11);
};

const validateNTN = (ntn: string) => {
  const cleaned = ntn.replace(/\D/g, '');
  return cleaned.length === 7 || cleaned.length === 9 || cleaned.length === 13;
};

function Field({ label, required, hint, icon, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        {icon}
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12 justify-center">
        <TextInput placeholderTextColor="#9ca3af" className="text-base font-bold text-neutral-900 dark:text-white" {...props} />
      </View>
      {hint && <Text className="mt-1 text-xs text-neutral-500 font-semibold">{hint}</Text>}
    </View>
  );
}

export default function SupplierFormScreen({ mode }: { mode?: 'new' } = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSmartBack();
  const queryClient = useQueryClient();
  const isNew = mode === 'new' || !id;
  const supplierId = isNew ? null : (id as string);

  const [section, setSection] = useState<Section>('company');
  const [form, setForm] = useState<UpsertSupplierPayload>(empty);
  const [showPicker, setShowPicker] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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

  const updateForm = (patch: Partial<UpsertSupplierPayload>) => {
    setForm((f) => ({ ...f, ...patch }));
    setIsDirty(true);
  };

  // Progress calculation
  const completionStats = useMemo(() => {
    const fields = [
      form.name, form.contactPerson, form.phone, form.email,
      form.address, form.city, form.bankName, form.accountNumber,
      form.iban, form.paymentTerms, form.ntn, form.cnic, form.logoUrl,
    ];
    const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
    const percent = Math.round((filled / fields.length) * 100);
    return { filled, total: fields.length, percent };
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleaned: any = { ...form };
      ['phone', 'altPhone', 'email', 'cnic', 'ntn', 'address', 'city', 'area',
       'logoUrl', 'bankName', 'accountNumber', 'iban', 'paymentTerms', 'notes', 'contactPerson']
        .forEach((k) => {
          if (cleaned[k] === '' || cleaned[k] === null) cleaned[k] = undefined;
        });
      return supplierId ? suppliersApi.update(supplierId, cleaned) : suppliersApi.create(cleaned);
    },
    onSuccess: (saved) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: supplierId ? '✅ Updated!' : '✅ Supplier created!' });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', saved.id] });
      router.replace(`/suppliers/${saved.id}`);
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Save failed' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(supplierId!),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Supplier deleted' });
      router.replace('/suppliers');
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Company name required' });
      setSection('company');
      return;
    }
    if (form.cnic && form.cnic.replace(/\D/g, '').length !== 13) {
      Toast.show({ type: 'error', text1: 'CNIC should be 13 digits' });
      setSection('tax');
      return;
    }
    if (form.ntn && !validateNTN(form.ntn)) {
      Toast.show({ type: 'error', text1: 'NTN should be 7, 9, or 13 digits' });
      setSection('tax');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      Toast.show({ type: 'error', text1: 'Invalid email format' });
      setSection('company');
      return;
    }
    saveMutation.mutate();
  };

  const handleDelete = () => {
    Alert.alert('Delete Supplier?', `Delete ${form.name}? Yeh action undo nahi ho sakta.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
    ]);
  };

  const copyField = async (value: string, label: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Toast.show({ type: 'success', text1: `${label} copied` });
  };

  const currentSection = sections.find((s) => s.id === section)!;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-3">
        <Pressable onPress={goBack} hitSlop={12} className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800">
          <ArrowLeft size={20} color="#f97316" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-extrabold text-neutral-900 dark:text-white" numberOfLines={1}>
              {supplierId ? 'Edit Supplier' : 'New Supplier'}
            </Text>
            {isDirty && (
              <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7' }}>
                <Text className="text-[9px] font-extrabold uppercase text-amber-700">Unsaved</Text>
              </View>
            )}
          </View>
          {form.name && (
            <Text className="text-[11px] text-neutral-500 font-semibold" numberOfLines={1}>{form.name}</Text>
          )}
        </View>
        {supplierId && (
          <Pressable onPress={handleDelete} className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 items-center justify-center">
            <Trash2 size={18} color="#dc2626" />
          </Pressable>
        )}
      </View>

      {/* Progress bar */}
      <View className="px-5 pb-2">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-500">Profile Completion</Text>
          <Text className="text-xs font-extrabold text-orange-600">{completionStats.percent}%</Text>
        </View>
        <View className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${completionStats.percent}%`,
              backgroundColor: completionStats.percent === 100 ? '#16a34a' : '#f97316',
            }}
          />
        </View>
      </View>

      {/* Section pills */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 10, paddingTop: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {sections.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => { Haptics.selectionAsync(); setSection(s.id); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38,
                  borderRadius: 999, borderWidth: 2,
                  backgroundColor: active ? s.color : '#ffffff',
                  borderColor: active ? s.color : '#e5e7eb',
                }}
              >
                <Icon size={14} color={active ? '#ffffff' : s.color} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : '#6b7280' }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 4 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Section Hero */}
          <View style={{ borderRadius: 20, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: currentSection.color }}>
            <View style={{ height: 44, width: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <currentSection.icon size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>{currentSection.label}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{currentSection.desc}</Text>
            </View>
          </View>

          {/* COMPANY INFO */}
          {section === 'company' && (
            <View className="gap-4">
              {/* Logo */}
              <View className="items-center">
                <Pressable onPress={() => setShowPicker(true)} className="relative">
                  {form.logoUrl ? (
                    <Image source={{ uri: form.logoUrl }} className="h-28 w-28 rounded-3xl" style={{ borderWidth: 3, borderColor: '#f97316' }} />
                  ) : (
                    <View className="h-28 w-28 rounded-3xl items-center justify-center" style={{ backgroundColor: '#7c2d12', borderWidth: 3, borderColor: '#f97316' }}>
                      <Text className="text-4xl font-extrabold text-white">
                        {(form.name || 'S').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-orange-600 items-center justify-center" style={{ borderWidth: 3, borderColor: '#f8fafc' }}>
                    <Camera size={16} color="#ffffff" />
                  </View>
                </Pressable>
                <Text className="text-[10px] text-neutral-500 mt-2 font-semibold">Tap to change logo</Text>
              </View>

              <Field
                label="Supplier / Company Name"
                required
                value={form.name}
                onChangeText={(t: string) => updateForm({ name: t })}
                placeholder="e.g. Sun Fibre, ABC Wholesalers"
                hint="Yahi naam purchases mein dikhega"
              />

              <Field
                icon={<User size={13} color="#64748b" />}
                label="Contact Person"
                value={form.contactPerson ?? ''}
                onChangeText={(t: string) => updateForm({ contactPerson: t })}
                placeholder="e.g. Mr. Ahmed, Sales Manager"
              />

              <Field
                icon={<Phone size={13} color="#64748b" />}
                label="Phone Number"
                value={form.phone ?? ''}
                onChangeText={(t: string) => updateForm({ phone: formatPhone(t) })}
                placeholder="+923009998877"
                keyboardType="phone-pad"
              />

              {form.phone && (
                <Pressable
                  onPress={() => {
                    const phone = form.phone!.replace(/[^0-9]/g, '').replace(/^0/, '92');
                    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
                      Linking.openURL(`https://wa.me/${phone}`),
                    );
                  }}
                  className="h-10 rounded-xl bg-green-100 flex-row items-center justify-center gap-1.5"
                >
                  <MessageCircle size={14} color="#16a34a" />
                  <Text className="text-green-700 font-extrabold text-xs">Test on WhatsApp</Text>
                </Pressable>
              )}

              <Field
                icon={<Phone size={13} color="#64748b" />}
                label="Alternate Phone"
                value={form.altPhone ?? ''}
                onChangeText={(t: string) => updateForm({ altPhone: formatPhone(t) })}
                placeholder="Optional landline"
                keyboardType="phone-pad"
              />

              <Field
                icon={<Mail size={13} color="#64748b" />}
                label="Email"
                value={form.email ?? ''}
                onChangeText={(t: string) => updateForm({ email: t })}
                placeholder="contact@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                <View className="flex-row items-center gap-1">
                  <AlertCircle size={12} color="#dc2626" />
                  <Text className="text-[10px] text-rose-600 font-bold">Invalid email format</Text>
                </View>
              )}

              {/* Status toggle */}
              <Pressable
                onPress={() => updateForm({ isActive: !form.isActive })}
                className="flex-row items-center gap-3 p-4 rounded-2xl border-2"
                style={{
                  borderColor: form.isActive ? '#16a34a' : '#e5e7eb',
                  backgroundColor: form.isActive ? '#dcfce7' : '#ffffff',
                }}
              >
                <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: form.isActive ? '#16a34a' : '#f3f4f6' }}>
                  {form.isActive ? <CheckCircle2 size={20} color="#ffffff" /> : <X size={20} color="#6b7280" />}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold" style={{ color: form.isActive ? '#15803d' : '#6b7280' }}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </Text>
                  <Text className="text-[11px] text-neutral-500 font-semibold">
                    {form.isActive ? 'Purchases mein dikhega' : 'Hidden from selection'}
                  </Text>
                </View>
                <View style={{ height: 28, width: 48, borderRadius: 14, padding: 2, justifyContent: 'center', backgroundColor: form.isActive ? '#16a34a' : '#d1d5db' }}>
                  <View style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: '#ffffff', transform: [{ translateX: form.isActive ? 20 : 0 }] }} />
                </View>
              </Pressable>
            </View>
          )}

          {/* LOCATION */}
          {section === 'location' && (
            <View className="gap-4">
              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">City</Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 justify-center">
                  <TextInput
                    value={form.city ?? ''}
                    onChangeText={(t) => updateForm({ city: t })}
                    placeholder="Karachi, Lahore, Islamabad..."
                    placeholderTextColor="#9ca3af"
                    className="text-base font-bold text-neutral-900"
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                  {PAKISTAN_CITIES.slice(0, 8).map((city) => (
                    <Pressable
                      key={city}
                      onPress={() => { Haptics.selectionAsync(); updateForm({ city }); }}
                      className="h-8 px-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor: form.city === city ? '#e11d48' : '#ffffff',
                        borderWidth: 2,
                        borderColor: form.city === city ? '#e11d48' : '#e5e7eb',
                      }}
                    >
                      <Text className="text-xs font-extrabold" style={{ color: form.city === city ? '#ffffff' : '#374151' }}>
                        {city}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Field
                label="Area / Locality"
                value={form.area ?? ''}
                onChangeText={(t: string) => updateForm({ area: t })}
                placeholder="Saddar, DHA Phase 5..."
              />

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">Full Address</Text>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 py-3">
                  <TextInput
                    value={form.address ?? ''}
                    onChangeText={(t) => updateForm({ address: t })}
                    placeholder="Shop #, Street, Block, Sector..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="text-base font-semibold text-neutral-900 min-h-[80px]"
                  />
                </View>
                <Text className="text-[10px] text-neutral-500 mt-1 font-semibold">
                  Pura address invoices par dikhega
                </Text>
              </View>
            </View>
          )}

          {/* TAX INFO */}
          {section === 'tax' && (
            <View className="gap-4">
              <View className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex-row items-start gap-2">
                <ShieldCheck size={16} color="#2563eb" />
                <Text className="flex-1 text-xs text-blue-900 font-semibold">
                  Tax info sensitive hai — sirf aap aur team dekh sakti hai
                </Text>
                <Pressable onPress={() => setShowSensitive(!showSensitive)} className="flex-row items-center gap-1">
                  {showSensitive ? <EyeOff size={14} color="#2563eb" /> : <Eye size={14} color="#2563eb" />}
                  <Text className="text-blue-700 font-extrabold text-[11px]">{showSensitive ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              <View>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Hash size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">CNIC</Text>
                  <Text className="text-[10px] font-bold text-neutral-400">(13 digits)</Text>
                </View>
                <View className="flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12">
                  <TextInput
                    value={form.cnic ?? ''}
                    onChangeText={(t) => updateForm({ cnic: formatCNIC(t) })}
                    placeholder="12345-6789012-3"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showSensitive}
                    keyboardType="number-pad"
                    maxLength={15}
                    className="flex-1 text-base font-mono font-bold text-neutral-900"
                  />
                  {form.cnic && (
                    <Pressable onPress={() => copyField(form.cnic || '', 'CNIC')} className="h-8 w-8 rounded-lg bg-blue-100 items-center justify-center">
                      <Copy size={12} color="#2563eb" />
                    </Pressable>
                  )}
                </View>
                {form.cnic && form.cnic.replace(/\D/g, '').length !== 13 && (
                  <View className="flex-row items-center gap-1 mt-1">
                    <AlertCircle size={12} color="#d97706" />
                    <Text className="text-[10px] text-amber-700 font-bold">CNIC should be 13 digits</Text>
                  </View>
                )}
              </View>

              <View>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Hash size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">NTN</Text>
                  <Text className="text-[10px] font-bold text-neutral-400">(7/9/13 digits)</Text>
                </View>
                <View className="flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12">
                  <TextInput
                    value={form.ntn ?? ''}
                    onChangeText={(t) => updateForm({ ntn: t })}
                    placeholder="National Tax Number"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-base font-mono font-bold text-neutral-900"
                  />
                  {form.ntn && (
                    <Pressable onPress={() => copyField(form.ntn || '', 'NTN')} className="h-8 w-8 rounded-lg bg-blue-100 items-center justify-center">
                      <Copy size={12} color="#2563eb" />
                    </Pressable>
                  )}
                </View>
                {form.ntn && !validateNTN(form.ntn) && (
                  <View className="flex-row items-center gap-1 mt-1">
                    <AlertCircle size={12} color="#d97706" />
                    <Text className="text-[10px] text-amber-700 font-bold">NTN should be 7, 9, or 13 digits</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* BANKING */}
          {section === 'banking' && (
            <View className="gap-4">
              <View>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Building2 size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">Bank Name</Text>
                </View>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12 justify-center">
                  <TextInput
                    value={form.bankName ?? ''}
                    onChangeText={(t) => updateForm({ bankName: t })}
                    placeholder="HBL, MCB, UBL, Meezan..."
                    placeholderTextColor="#9ca3af"
                    className="text-base font-bold text-neutral-900"
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                  {PAKISTAN_BANKS.slice(0, 6).map((bank) => (
                    <Pressable
                      key={bank}
                      onPress={() => { Haptics.selectionAsync(); updateForm({ bankName: bank }); }}
                      className="h-8 px-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor: form.bankName === bank ? '#16a34a' : '#ffffff',
                        borderWidth: 2,
                        borderColor: form.bankName === bank ? '#16a34a' : '#e5e7eb',
                      }}
                    >
                      <Text className="text-[11px] font-extrabold" style={{ color: form.bankName === bank ? '#ffffff' : '#374151' }}>
                        {bank.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Hash size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">Account Number</Text>
                </View>
                <View className="flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12">
                  <TextInput
                    value={form.accountNumber ?? ''}
                    onChangeText={(t) => updateForm({ accountNumber: t })}
                    placeholder="00000000000"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showSensitive}
                    keyboardType="number-pad"
                    className="flex-1 text-base font-mono font-bold text-neutral-900"
                  />
                  {form.accountNumber && (
                    <Pressable onPress={() => copyField(form.accountNumber || '', 'Account')} className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
                      <Copy size={12} color="#16a34a" />
                    </Pressable>
                  )}
                </View>
              </View>

              <View>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Banknote size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">IBAN</Text>
                  <Text className="text-[10px] font-bold text-neutral-400">(24 chars)</Text>
                </View>
                <View className="flex-row items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-4 h-12">
                  <TextInput
                    value={form.iban ?? ''}
                    onChangeText={(t) => updateForm({ iban: formatIBAN(t) })}
                    placeholder="PK00BANK0000000000000000"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="characters"
                    maxLength={29}
                    className="flex-1 text-base font-mono font-bold text-neutral-900"
                  />
                  {form.iban && (
                    <Pressable onPress={() => copyField(form.iban?.replace(/\s/g, '') || '', 'IBAN')} className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
                      <Copy size={12} color="#16a34a" />
                    </Pressable>
                  )}
                </View>
              </View>

              <View>
                <View className="flex-row items-center gap-1 mb-2">
                  <Wallet size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">Payment Terms</Text>
                </View>
                <View className="gap-2">
                  {PAYMENT_TERMS.map((t) => {
                    const active = form.paymentTerms === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          updateForm({ paymentTerms: active ? '' : t.value });
                        }}
                        className="flex-row items-center gap-3 p-3 rounded-2xl border-2"
                        style={{
                          backgroundColor: active ? '#16a34a' : '#ffffff',
                          borderColor: active ? '#16a34a' : '#e5e7eb',
                        }}
                      >
                        <Text className="text-2xl">{t.emoji}</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-extrabold" style={{ color: active ? '#ffffff' : '#0f172a' }}>
                            {t.value}
                          </Text>
                          <Text className="text-[11px] font-semibold" style={{ color: active ? 'rgba(255,255,255,0.85)' : '#64748b' }}>
                            {t.desc}
                          </Text>
                        </View>
                        {active && (
                          <View className="h-7 w-7 rounded-full bg-white/25 items-center justify-center">
                            <CheckCircle2 size={16} color="#ffffff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* NOTES */}
          {section === 'notes' && (
            <View className="gap-4">
              <View className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex-row items-start gap-2">
                <ShieldCheck size={16} color="#d97706" />
                <Text className="flex-1 text-xs text-amber-900 font-semibold">
                  Sirf aap aur team dekh sakti hai — supplier ko nahi dikhega
                </Text>
              </View>

              <View>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Info size={13} color="#64748b" />
                  <Text className="text-sm font-bold text-neutral-700">Internal Notes</Text>
                </View>
                <View className="rounded-2xl border-2 border-neutral-200 bg-white px-4 py-3">
                  <TextInput
                    value={form.notes ?? ''}
                    onChangeText={(t) => updateForm({ notes: t })}
                    placeholder="e.g. Best supplier for cotton, 2 days delivery, discount on bulk > 50k, prefers JazzCash..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    className="text-base font-semibold text-neutral-900 min-h-[120px]"
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        <View className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8 }}>
          <Pressable
            onPress={handleSave}
            disabled={saveMutation.isPending}
            className="h-12 rounded-2xl items-center justify-center flex-row gap-2"
            style={{
              backgroundColor: saveMutation.isPending ? '#9ca3af' : '#f97316',
              shadowColor: '#f97316',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {saveMutation.isPending ? (
              <Text className="text-white font-extrabold text-base">Saving...</Text>
            ) : (
              <>
                <Save size={20} color="#ffffff" />
                <Text className="text-white font-extrabold text-base">
                  {supplierId ? 'Save Changes' : 'Create Supplier'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        purpose="brand-logo"
        multiple={false}
        title="Supplier Logo"
        onUploaded={(records) => {
          if (records[0]) updateForm({ logoUrl: records[0].url });
          setShowPicker(false);
        }}
      />
    </SafeAreaView>
  );
}
