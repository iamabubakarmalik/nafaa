import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ArrowRight, Check, Store, User, MapPin, Settings,
  Package, Users, Sparkles, X, Clock, Phone, Crown, Plus, Trash2,
  SkipForward, Search,
} from 'lucide-react-native';
import { onboardingApi } from '@/api/onboarding.api';
import { useAuthStore } from '@/store/auth.store';
import {
  BusinessTypeSelector,
  BUSINESS_TYPES,
  type BusinessTypeCard,
} from '@/components/onboarding/BusinessTypeSelector';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';

const stepMeta = [
  { num: 1, title: 'Business Type', icon: Store, color: '#16a34a' },
  { num: 2, title: 'Your Profile', icon: User, color: '#2563eb' },
  { num: 3, title: 'Shop Details', icon: MapPin, color: '#7c3aed' },
  { num: 4, title: 'Preferences', icon: Settings, color: '#ec4899' },
  { num: 5, title: 'First Products', icon: Package, color: '#f59e0b' },
  { num: 6, title: 'Team & Done', icon: Users, color: '#dc2626' },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateTenant = useAuthStore((s) => s.updateTenant);

  const { data: options } = useQuery({
    queryKey: ['onboarding-options'],
    queryFn: onboardingApi.getOptions,
  });

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
  });

  const [step, setStep] = useState(1);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    if (progress) {
      if (progress.isCompleted) {
        router.replace('/(tabs)');
        return;
      }
      setStep(progress.currentStep);
    }
  }, [progress]);

  const [s1, setS1] = useState({ businessType: '', businessSize: 'SMALL', city: '', province: '' });
  const [s2, setS2] = useState({ whatsappNumber: '', cnic: '', preferredLanguage: 'roman_ur' });
  const [s3, setS3] = useState({
    shopAddress: '', openTime: '09:00', closeTime: '22:00',
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], taxNumber: '',
  });
  const [s4, setS4] = useState({
    enabledCategories: [] as string[], paymentMethods: ['CASH'],
    receiptTemplate: 'THERMAL_58MM', lowStockThreshold: 10,
  });
  const [s5Products, setS5Products] = useState<Array<{ name: string; price: string; stock: string }>>([]);
  const [s6Team, setS6Team] = useState<Array<{ fullName: string; email: string; password: string; role: 'MANAGER' | 'CASHIER' | 'STAFF' }>>([]);
  const [wantsTutorial, setWantsTutorial] = useState(true);

  useEffect(() => {
    if (!progress) return;
    setS1({
      businessType: progress.businessType || '',
      businessSize: progress.businessSize || 'SMALL',
      city: progress.city || '',
      province: progress.province || '',
    });
    setS2({
      whatsappNumber: progress.whatsappNumber || '',
      cnic: progress.cnic || '',
      preferredLanguage: progress.preferredLanguage || 'roman_ur',
    });
    setS3({
      shopAddress: progress.shopAddress || '',
      openTime: progress.openTime || '09:00',
      closeTime: progress.closeTime || '22:00',
      workingDays: progress.workingDays?.length ? progress.workingDays : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      taxNumber: progress.taxNumber || '',
    });
    setS4({
      enabledCategories: progress.enabledCategories || [],
      paymentMethods: progress.paymentMethods?.length ? progress.paymentMethods : ['CASH'],
      receiptTemplate: progress.receiptTemplate || 'THERMAL_58MM',
      lowStockThreshold: progress.lowStockThreshold ?? 10,
    });
  }, [progress]);

  // Filter cities by search
  const filteredCities = useMemo(() => {
    if (!options?.cities) return [];
    const q = citySearch.toLowerCase().trim();
    if (!q) return options.cities.slice(0, 15);
    return options.cities.filter((c) => c.toLowerCase().includes(q));
  }, [options, citySearch]);

  // Map API business types to BusinessTypeCard format (with fallback)
  const businessTypeOptions = useMemo(() => {
    if (!options?.businessTypes) return BUSINESS_TYPES;
    // If API returns expanded list with highlights, use it
    if ((options.businessTypes[0] as any)?.highlights) {
      return options.businessTypes as any;
    }
    // Otherwise use default BUSINESS_TYPES
    return BUSINESS_TYPES;
  }, [options]);

  // Suggested categories based on selected business type
  const suggestedCategories = useMemo(() => {
    const type = s1.businessType || progress?.businessType || 'GENERAL';
    return (
      options?.suggestedCategories?.[type] ||
      options?.suggestedCategories?.OTHER ||
      []
    );
  }, [s1.businessType, progress, options]);

  const stepMutation = useMutation({
    mutationFn: async () => {
      if (step === 1) {
        const result = await onboardingApi.step1(s1);
        // Auto-update tenant so other screens see new businessType
        await updateTenant({ businessType: s1.businessType });
        // Invalidate business config cache
        queryClient.invalidateQueries({ queryKey: ['business-config'] });
        return result;
      }
      if (step === 2) return onboardingApi.step2(s2);
      if (step === 3) return onboardingApi.step3(s3);
      if (step === 4) return onboardingApi.step4(s4);
      if (step === 5) {
        const products = s5Products
          .filter((p) => p.name && Number(p.price) > 0)
          .map((p) => ({ name: p.name, price: Number(p.price), stock: Number(p.stock) || 0 }));
        return onboardingApi.step5({ products });
      }
      return onboardingApi.step6({
        teamMembers: s6Team.filter((m) => m.email && m.password),
        wantsTutorial,
      });
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      if (data.isCompleted) {
        Toast.show({ type: 'success', text1: '🎉 Mubarak ho! Aap ka shop ready hai!' });
        setTimeout(() => router.replace('/(tabs)'), 800);
      } else {
        setStep(data.currentStep);
      }
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail ho gaya',
      });
    },
  });

  const skipMutation = useMutation({
    mutationFn: () => onboardingApi.skip(step),
    onSuccess: (data) => {
      Haptics.selectionAsync();
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      setStep(data.currentStep);
    },
  });

  const meta = stepMeta[step - 1];

  const canProceed = useMemo(() => {
    if (step === 1) return !!s1.businessType && !!s1.businessSize && !!s1.city;
    if (step === 4) return s4.paymentMethods.length > 0;
    return true;
  }, [step, s1, s4]);

  if (isLoading || !options || !progress) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Sparkles size={36} color="#16a34a" />
        <Text className="mt-3 text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        {step > 1 ? (
          <Pressable
            onPress={() => setStep(step - 1)}
            hitSlop={12}
            className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
          >
            <ArrowLeft size={20} color={meta.color} />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}
        <View className="flex-1 items-center">
          <Text className="text-xs text-neutral-500 font-semibold">
            Step {step} of {stepMeta.length}
          </Text>
          <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
            {meta.title}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert('Exit Setup?', 'Aap kabhi bhi yahan wapas aa sakte hain.', [
              { text: 'Continue', style: 'cancel' },
              { text: 'Skip for now', onPress: () => router.replace('/(tabs)') },
            ]);
          }}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <X size={18} color="#737373" />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View className="px-5 mb-3">
        <View className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${(step / stepMeta.length) * 100}%`,
              backgroundColor: meta.color,
            }}
          />
        </View>
        <View className="flex-row justify-between mt-2">
          {stepMeta.map((m) => {
            const done = progress.completedSteps.includes(m.num);
            const current = m.num === step;
            return (
              <View
                key={m.num}
                className="h-7 w-7 rounded-full items-center justify-center border-2"
                style={{
                  backgroundColor: done ? meta.color : current ? '#ffffff' : '#f3f4f6',
                  borderColor: done || current ? meta.color : '#e5e7eb',
                }}
              >
                {done ? (
                  <Check size={12} color="#ffffff" />
                ) : (
                  <Text
                    className="text-[10px] font-extrabold"
                    style={{ color: current ? meta.color : '#9ca3af' }}
                  >
                    {m.num}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View
            className="rounded-3xl p-5 mb-5"
            style={{
              backgroundColor: meta.color,
              shadowColor: meta.color,
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <meta.icon size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Step {step}
                </Text>
                <Text className="text-2xl font-extrabold text-white">{meta.title}</Text>
                <Text className="text-xs text-white/80 mt-1">
                  {step === 1 && 'Software auto-configure ho jayega'}
                  {step === 2 && 'WhatsApp aur language'}
                  {step === 3 && 'Shop address aur timings'}
                  {step === 4 && 'Categories aur payment'}
                  {step === 5 && 'Pehle products add karein'}
                  {step === 6 && 'Team members (optional)'}
                </Text>
              </View>
            </View>
          </View>

          {/* ===== STEP 1: Business Type with BEAUTIFUL SELECTOR ===== */}
          {step === 1 && (
            <View className="gap-5">
              <BusinessTypeSelector
                value={s1.businessType}
                options={businessTypeOptions as any}
                onChange={(t) => setS1({ ...s1, businessType: t.value })}
                onSelect={(t) => setS1({ ...s1, businessType: t.value })}
                showConfirmButton={false}
                primaryColor={meta.color}
              />

              {/* Business Size */}
              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
                  Business ka size? <Text className="text-rose-600">*</Text>
                </Text>
                <View className="gap-2">
                  {options.businessSizes.map((bs) => {
                    const active = s1.businessSize === bs.value;
                    return (
                      <Pressable
                        key={bs.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setS1({ ...s1, businessSize: bs.value });
                        }}
                        className="flex-row items-center gap-3 p-3 rounded-2xl border-2"
                        style={{
                          borderColor: active ? meta.color : '#e5e7eb',
                          backgroundColor: active ? `${meta.color}15` : '#ffffff',
                        }}
                      >
                        <Text className="text-2xl">{bs.icon}</Text>
                        <View className="flex-1">
                          <Text
                            className="font-extrabold"
                            style={{ color: active ? meta.color : '#0f172a' }}
                          >
                            {bs.label}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5">{bs.desc}</Text>
                        </View>
                        {active && (
                          <View
                            className="h-6 w-6 rounded-full items-center justify-center"
                            style={{ backgroundColor: meta.color }}
                          >
                            <Check size={14} color="#ffffff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* City with search */}
              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
                  Shahar (City) <Text className="text-rose-600">*</Text>
                </Text>
                <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-11 mb-2">
                  <Search size={16} color="#9ca3af" />
                  <TextInput
                    value={citySearch}
                    onChangeText={setCitySearch}
                    placeholder="Search city..."
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-sm text-neutral-900"
                  />
                </View>
                <View className="flex-row flex-wrap -m-1">
                  {filteredCities.map((city) => {
                    const active = s1.city === city;
                    return (
                      <View key={city} className="p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setS1({ ...s1, city });
                          }}
                          className="px-3 h-10 rounded-xl border-2 items-center justify-center"
                          style={{
                            borderColor: active ? meta.color : '#e5e7eb',
                            backgroundColor: active ? meta.color : '#ffffff',
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {city}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Province */}
              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
                  Province (optional)
                </Text>
                <View className="flex-row flex-wrap -m-1">
                  {options.provinces.map((p) => {
                    const active = s1.province === p;
                    return (
                      <View key={p} className="p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setS1({ ...s1, province: active ? '' : p });
                          }}
                          className="px-3 h-9 rounded-xl border-2 items-center justify-center"
                          style={{
                            borderColor: active ? meta.color : '#e5e7eb',
                            backgroundColor: active ? meta.color : '#ffffff',
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ===== STEP 2: Profile (CNIC Optional) ===== */}
          {step === 2 && (
            <View className="gap-5">
              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                  WhatsApp Number
                </Text>
                <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                  <Phone size={18} color="#9ca3af" />
                  <TextInput
                    value={s2.whatsappNumber}
                    onChangeText={(t) => setS2({ ...s2, whatsappNumber: t })}
                    placeholder="+923001234567"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    className="flex-1 text-base text-neutral-900"
                  />
                </View>
                <Text className="text-[11px] text-neutral-500 mt-1">
                  Customers ko WhatsApp pe receipts bhejne ke liye
                </Text>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
                  CNIC <Text className="text-neutral-400 font-normal">(Optional)</Text>
                </Text>
                <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 h-12">
                  <TextInput
                    value={s2.cnic}
                    onChangeText={(t) => setS2({ ...s2, cnic: t })}
                    placeholder="42101-1234567-1"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numbers-and-punctuation"
                    className="flex-1 text-base text-neutral-900"
                    maxLength={15}
                  />
                </View>
                <Text className="text-[11px] text-neutral-500 mt-1">
                  Optional — sirf identity verification ke liye
                </Text>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
                  Preferred Language
                </Text>
                <View className="gap-2">
                  {options.languages.map((lang) => {
                    const active = s2.preferredLanguage === lang.value;
                    return (
                      <Pressable
                        key={lang.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setS2({ ...s2, preferredLanguage: lang.value });
                        }}
                        className="flex-row items-center justify-between p-3 rounded-2xl border-2"
                        style={{
                          borderColor: active ? meta.color : '#e5e7eb',
                          backgroundColor: active ? `${meta.color}15` : '#ffffff',
                        }}
                      >
                        <View>
                          <Text
                            className="font-extrabold text-lg"
                            style={{ color: active ? meta.color : '#0f172a' }}
                          >
                            {lang.label}
                          </Text>
                          <Text className="text-xs text-neutral-500">{lang.english}</Text>
                        </View>
                        {active && <Check size={20} color={meta.color} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ===== STEP 3: Shop Details ===== */}
          {step === 3 && (
            <View className="gap-5">
              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">Shop Address</Text>
                <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <TextInput
                    value={s3.shopAddress}
                    onChangeText={(t) => setS3({ ...s3, shopAddress: t })}
                    placeholder="Shop ka pura address..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    className="text-base text-neutral-900 min-h-[70px]"
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-2">Working Hours</Text>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Open</Text>
                    <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 h-11">
                      <Clock size={16} color="#9ca3af" />
                      <TextInput
                        value={s3.openTime}
                        onChangeText={(t) => setS3({ ...s3, openTime: t })}
                        placeholder="09:00"
                        placeholderTextColor="#9ca3af"
                        className="flex-1 text-base font-bold"
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Close</Text>
                    <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 h-11">
                      <Clock size={16} color="#9ca3af" />
                      <TextInput
                        value={s3.closeTime}
                        onChangeText={(t) => setS3({ ...s3, closeTime: t })}
                        placeholder="22:00"
                        placeholderTextColor="#9ca3af"
                        className="flex-1 text-base font-bold"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-2">Working Days</Text>
                <View className="flex-row flex-wrap -m-1">
                  {options.workingDays.map((d) => {
                    const active = s3.workingDays.includes(d.value);
                    return (
                      <View key={d.value} className="p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setS3({
                              ...s3,
                              workingDays: active
                                ? s3.workingDays.filter((x) => x !== d.value)
                                : [...s3.workingDays, d.value],
                            });
                          }}
                          className="h-10 px-4 rounded-xl border-2 items-center justify-center"
                          style={{
                            borderColor: active ? meta.color : '#e5e7eb',
                            backgroundColor: active ? meta.color : '#ffffff',
                          }}
                        >
                          <Text
                            className="text-sm font-bold"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {d.short}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">
                  GST / NTN <Text className="text-neutral-400 font-normal">(Optional)</Text>
                </Text>
                <View className="rounded-2xl border border-neutral-200 bg-white px-4 h-12 flex-row items-center">
                  <TextInput
                    value={s3.taxNumber}
                    onChangeText={(t) => setS3({ ...s3, taxNumber: t })}
                    placeholder="e.g. 1234567-8"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 text-base text-neutral-900"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ===== STEP 4: Preferences with auto-suggested categories ===== */}
          {step === 4 && (
            <View className="gap-5">
              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1">Categories shuru karein</Text>
                <Text className="text-xs text-neutral-500 mb-3">
                  ✨ Aap ke business ke liye auto-suggested
                </Text>
                <View className="flex-row flex-wrap -m-1">
                  {suggestedCategories.map((cat: string) => {
                    const active = s4.enabledCategories.includes(cat);
                    return (
                      <View key={cat} className="p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setS4({
                              ...s4,
                              enabledCategories: active
                                ? s4.enabledCategories.filter((x) => x !== cat)
                                : [...s4.enabledCategories, cat],
                            });
                          }}
                          className="px-3 h-10 rounded-xl border-2 items-center justify-center"
                          style={{
                            borderColor: active ? meta.color : '#e5e7eb',
                            backgroundColor: active ? meta.color : '#ffffff',
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {active ? '✓ ' : ''}{cat}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-2">
                  Payment Methods <Text className="text-rose-600">*</Text>
                </Text>
                <View className="flex-row flex-wrap -m-1">
                  {options.paymentMethods.map((pm) => {
                    const active = s4.paymentMethods.includes(pm.value);
                    return (
                      <View key={pm.value} className="w-1/2 p-1">
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setS4({
                              ...s4,
                              paymentMethods: active
                                ? s4.paymentMethods.filter((x) => x !== pm.value)
                                : [...s4.paymentMethods, pm.value],
                            });
                          }}
                          className="flex-row items-center gap-2 p-3 rounded-2xl border-2"
                          style={{
                            borderColor: active ? meta.color : '#e5e7eb',
                            backgroundColor: active ? `${meta.color}15` : '#ffffff',
                          }}
                        >
                          <Text className="text-xl">{pm.emoji}</Text>
                          <Text
                            className="text-sm font-bold flex-1"
                            style={{ color: active ? meta.color : '#374151' }}
                          >
                            {pm.label}
                          </Text>
                          {active && <Check size={16} color={meta.color} />}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-2">Receipt Type</Text>
                <View className="gap-2">
                  {options.receiptTemplates.map((rt) => {
                    const active = s4.receiptTemplate === rt.value;
                    return (
                      <Pressable
                        key={rt.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setS4({ ...s4, receiptTemplate: rt.value });
                        }}
                        className="flex-row items-center justify-between p-3 rounded-2xl border-2"
                        style={{
                          borderColor: active ? meta.color : '#e5e7eb',
                          backgroundColor: active ? `${meta.color}15` : '#ffffff',
                        }}
                      >
                        <View className="flex-1">
                          <Text
                            className="font-extrabold"
                            style={{ color: active ? meta.color : '#0f172a' }}
                          >
                            {rt.label}
                          </Text>
                          <Text className="text-xs text-neutral-500 mt-0.5">{rt.desc}</Text>
                        </View>
                        {active && <Check size={18} color={meta.color} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">Low Stock Alert</Text>
                <View className="rounded-2xl border border-neutral-200 bg-white px-4 h-12 flex-row items-center">
                  <TextInput
                    value={String(s4.lowStockThreshold)}
                    onChangeText={(t) => setS4({ ...s4, lowStockThreshold: Math.max(0, Number(t) || 0) })}
                    keyboardType="numeric"
                    placeholder="10"
                    className="flex-1 text-base text-neutral-900 font-bold"
                  />
                  <Text className="text-xs text-neutral-500">units</Text>
                </View>
              </View>
            </View>
          )}

          {/* ===== STEP 5: First Products ===== */}
          {step === 5 && (
            <View className="gap-4">
              <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex-row items-start gap-3">
                <Sparkles size={18} color="#b45309" />
                <Text className="flex-1 text-xs text-amber-900 leading-5">
                  Pehle 2-3 products quickly add karein. Baad mein bhi add kar sakte hain.
                </Text>
              </View>

              {s5Products.map((p, idx) => (
                <View key={idx} className="rounded-2xl bg-white border border-neutral-200 p-3 gap-2">
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 rounded-lg bg-amber-100 items-center justify-center">
                      <Text className="text-xs font-extrabold text-amber-700">#{idx + 1}</Text>
                    </View>
                    <Text className="flex-1 font-bold text-neutral-700">Product {idx + 1}</Text>
                    <Pressable
                      onPress={() => setS5Products(s5Products.filter((_, i) => i !== idx))}
                      className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                    >
                      <Trash2 size={12} color="#dc2626" />
                    </Pressable>
                  </View>
                  <TextInput
                    value={p.name}
                    onChangeText={(t) => {
                      const next = [...s5Products];
                      next[idx] = { ...next[idx], name: t };
                      setS5Products(next);
                    }}
                    placeholder="Product name"
                    placeholderTextColor="#9ca3af"
                    className="border border-neutral-200 rounded-xl px-3 h-10 text-sm"
                  />
                  <View className="flex-row gap-2">
                    <TextInput
                      value={p.price}
                      onChangeText={(t) => {
                        const next = [...s5Products];
                        next[idx] = { ...next[idx], price: t };
                        setS5Products(next);
                      }}
                      placeholder="Price"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      className="flex-1 border border-neutral-200 rounded-xl px-3 h-10 text-sm"
                    />
                    <TextInput
                      value={p.stock}
                      onChangeText={(t) => {
                        const next = [...s5Products];
                        next[idx] = { ...next[idx], stock: t };
                        setS5Products(next);
                      }}
                      placeholder="Stock"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      className="flex-1 border border-neutral-200 rounded-xl px-3 h-10 text-sm"
                    />
                  </View>
                </View>
              ))}

              <Pressable
                onPress={() => setS5Products([...s5Products, { name: '', price: '', stock: '' }])}
                className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 flex-row items-center justify-center gap-2"
              >
                <Plus size={18} color="#b45309" />
                <Text className="font-extrabold text-amber-700">Add Product</Text>
              </Pressable>
            </View>
          )}

          {/* ===== STEP 6: Team ===== */}
          {step === 6 && (
            <View className="gap-4">
              <View className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 flex-row items-start gap-3">
                <Crown size={18} color="#dc2626" />
                <Text className="flex-1 text-xs text-rose-900 leading-5">
                  Staff add karein taa ke wo bhi POS use kar saken. Skip kar sakte hain.
                </Text>
              </View>

              {s6Team.map((m, idx) => (
                <View key={idx} className="rounded-2xl bg-white border border-neutral-200 p-3 gap-2">
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 rounded-lg bg-rose-100 items-center justify-center">
                      <Text className="text-xs font-extrabold text-rose-700">#{idx + 1}</Text>
                    </View>
                    <Text className="flex-1 font-bold text-neutral-700">Member {idx + 1}</Text>
                    <Pressable
                      onPress={() => setS6Team(s6Team.filter((_, i) => i !== idx))}
                      className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 items-center justify-center"
                    >
                      <Trash2 size={12} color="#dc2626" />
                    </Pressable>
                  </View>
                  <TextInput
                    value={m.fullName}
                    onChangeText={(t) => {
                      const next = [...s6Team];
                      next[idx] = { ...next[idx], fullName: t };
                      setS6Team(next);
                    }}
                    placeholder="Full Name"
                    placeholderTextColor="#9ca3af"
                    className="border border-neutral-200 rounded-xl px-3 h-10 text-sm"
                  />
                  <TextInput
                    value={m.email}
                    onChangeText={(t) => {
                      const next = [...s6Team];
                      next[idx] = { ...next[idx], email: t };
                      setS6Team(next);
                    }}
                    placeholder="Email"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-neutral-200 rounded-xl px-3 h-10 text-sm"
                  />
                  <TextInput
                    value={m.password}
                    onChangeText={(t) => {
                      const next = [...s6Team];
                      next[idx] = { ...next[idx], password: t };
                      setS6Team(next);
                    }}
                    placeholder="Set password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    className="border border-neutral-200 rounded-xl px-3 h-10 text-sm"
                  />
                  <View className="flex-row gap-1.5">
                    {(['MANAGER', 'CASHIER', 'STAFF'] as const).map((r) => {
                      const active = m.role === r;
                      return (
                        <Pressable
                          key={r}
                          onPress={() => {
                            const next = [...s6Team];
                            next[idx] = { ...next[idx], role: r };
                            setS6Team(next);
                          }}
                          className="flex-1 h-9 rounded-lg border-2 items-center justify-center"
                          style={{
                            borderColor: active ? meta.color : '#e5e7eb',
                            backgroundColor: active ? meta.color : '#ffffff',
                          }}
                        >
                          <Text
                            className="text-[11px] font-bold"
                            style={{ color: active ? '#ffffff' : '#374151' }}
                          >
                            {r}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <Pressable
                onPress={() =>
                  setS6Team([...s6Team, { fullName: '', email: '', password: '', role: 'CASHIER' }])
                }
                className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-4 flex-row items-center justify-center gap-2"
              >
                <Plus size={18} color="#dc2626" />
                <Text className="font-extrabold text-rose-700">Add Team Member</Text>
              </Pressable>

              <View className="rounded-2xl bg-white border border-neutral-200 p-4 flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="font-bold text-neutral-900">Tutorial dekhna chahte hain?</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">App use karne ki guidance</Text>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWantsTutorial(!wantsTutorial);
                  }}
                  style={{
                    height: 28,
                    width: 50,
                    borderRadius: 14,
                    padding: 2,
                    justifyContent: 'center',
                    backgroundColor: wantsTutorial ? meta.color : '#d1d5db',
                  }}
                >
                  <View
                    style={{
                      height: 24,
                      width: 24,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      transform: [{ translateX: wantsTutorial ? 22 : 0 }],
                    }}
                  />
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action bar */}
        <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-row gap-2">
          {(step === 5 || step === 6) && (
            <Pressable
              onPress={() => skipMutation.mutate()}
              disabled={skipMutation.isPending}
              className="h-14 px-5 rounded-2xl items-center justify-center flex-row gap-1.5 border-2 border-neutral-200"
            >
              <SkipForward size={16} color="#6b7280" />
              <Text className="text-neutral-700 font-bold text-sm">Skip</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => stepMutation.mutate()}
            disabled={!canProceed || stepMutation.isPending}
            className="flex-1 h-14 rounded-2xl items-center justify-center flex-row gap-2"
            style={{
              backgroundColor: !canProceed || stepMutation.isPending ? '#9ca3af' : meta.color,
              shadowColor: meta.color,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-white font-extrabold text-base">
              {stepMutation.isPending
                ? 'Saving...'
                : step === 6
                ? 'Finish Setup 🎉'
                : 'Continue'}
            </Text>
            {!stepMutation.isPending && step < 6 && <ArrowRight size={18} color="#ffffff" />}
            {!stepMutation.isPending && step === 6 && <Check size={18} color="#ffffff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
