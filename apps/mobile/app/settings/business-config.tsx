import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Store, Sparkles, Check, AlertCircle, Settings as SettingsIcon,
  Layers, Ruler, ScanLine, Calendar, Package2, ShieldCheck,
  Briefcase, Utensils, CalendarClock, ChefHat, FileCheck, Grid3x3, ChevronRight,
} from 'lucide-react-native';
import { businessConfigApi, type BusinessFeatures } from '@/api/business-config.api';
import { onboardingApi } from '@/api/onboarding.api';
import { BusinessTypeSelector } from '@/components/onboarding/BusinessTypeSelector';
import { useAuthStore } from '@/store/auth.store';
import Toast from 'react-native-toast-message';

interface FeatureMeta {
  key: keyof BusinessFeatures;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
}

const DEFAULT_FEATURES: BusinessFeatures = {
  variants: true, variantImages: false, lengthWidthCalc: false, weightBased: false,
  imei: false, expiry: false, batches: false, warranty: false, emi: false,
  services: false, tables: false, appointments: false, kitchenPrinter: false,
  prescriptionRequired: false, multiUnit: false, sizeMatrix: false,
};

const FEATURE_META: FeatureMeta[] = [
  { key: 'variants', label: 'Product Variants', description: 'Multiple variants per product', icon: Layers, color: '#8b5cf6', bg: '#ede9fe' },
  { key: 'variantImages', label: 'Variant Images', description: 'Separate image per variant', icon: Package2, color: '#ec4899', bg: '#fce7f3' },
  { key: 'lengthWidthCalc', label: 'L × W Calculator', description: 'sqft/sqm calc in POS', icon: Ruler, color: '#16a34a', bg: '#dcfce7' },
  { key: 'weightBased', label: 'Weight-Based Pricing', description: 'kg/gram decimal pricing', icon: Package2, color: '#f59e0b', bg: '#fef3c7' },
  { key: 'imei', label: 'IMEI / Serial Tracking', description: 'Mobile/electronics tracking', icon: ScanLine, color: '#2563eb', bg: '#dbeafe' },
  { key: 'expiry', label: 'Expiry Tracking', description: 'Track expiry dates', icon: Calendar, color: '#dc2626', bg: '#fee2e2' },
  { key: 'batches', label: 'Batch Numbers', description: 'Batch-wise inventory', icon: FileCheck, color: '#ea580c', bg: '#ffedd5' },
  { key: 'warranty', label: 'Warranty Tracking', description: 'Track warranty periods', icon: ShieldCheck, color: '#0891b2', bg: '#cffafe' },
  { key: 'emi', label: 'EMI / Installments', description: 'Offer EMI plans', icon: Briefcase, color: '#6366f1', bg: '#e0e7ff' },
  { key: 'services', label: 'Service Items', description: 'Non-stock services', icon: SettingsIcon, color: '#06b6d4', bg: '#cffafe' },
  { key: 'tables', label: 'Table Management', description: 'Restaurant floor plan', icon: Utensils, color: '#ef4444', bg: '#fee2e2' },
  { key: 'appointments', label: 'Appointments', description: 'Salon booking system', icon: CalendarClock, color: '#a855f7', bg: '#f3e8ff' },
  { key: 'kitchenPrinter', label: 'Kitchen Printer', description: 'Auto-print orders', icon: ChefHat, color: '#f59e0b', bg: '#fef3c7' },
  { key: 'prescriptionRequired', label: 'Prescription Required', description: 'Pharmacy compliance', icon: FileCheck, color: '#dc2626', bg: '#fee2e2' },
  { key: 'multiUnit', label: 'Multi-Unit Purchase', description: 'Buy carton, sell pieces', icon: Layers, color: '#16a34a', bg: '#dcfce7' },
  { key: 'sizeMatrix', label: 'Size × Color Matrix', description: 'Clothing variants grid', icon: Grid3x3, color: '#ec4899', bg: '#fce7f3' },
];

export default function BusinessConfigScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['business-config'],
    queryFn: businessConfigApi.get,
    staleTime: 0,
  });

  const { data: options } = useQuery({
    queryKey: ['onboarding-options'],
    queryFn: onboardingApi.getOptions,
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: (features: Partial<BusinessFeatures>) =>
      businessConfigApi.updateFeatures(features),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!config) return;
      const nextConfig = {
        ...config,
        features: { ...DEFAULT_FEATURES, ...(result?.features || {}) },
      };
      queryClient.setQueryData(['business-config'], nextConfig);
      updateTenant({ businessFeatures: nextConfig.features as any });
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      Toast.show({ type: 'success', text1: 'Feature updated' });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Failed to update',
      });
    },
  });

  const changeTypeMutation = useMutation({
    mutationFn: (businessType: string) => businessConfigApi.changeType(businessType),
    onSuccess: (nextConfig) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.setQueryData(['business-config'], nextConfig);
      updateTenant({
        businessType: nextConfig.businessType,
        businessFeatures: nextConfig.features as any,
        defaultUnit: nextConfig.defaultUnit,
      });
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      setShowTypeSelector(false);
      Toast.show({
        type: 'success',
        text1: 'Business type updated!',
        text2: 'Features auto-configured',
      });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message || 'Failed to change type',
      });
    },
  });

  if (isLoading || !config) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Sparkles size={36} color="#7c3aed" />
        <Text className="mt-3 text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const features = { ...DEFAULT_FEATURES, ...(config.features || {}) };
  const enabledCount = Object.values(features).filter(Boolean).length;

  const toggleFeature = (key: keyof BusinessFeatures) => {
    const current = features[key] ?? DEFAULT_FEATURES[key];
    Haptics.selectionAsync();
    updateFeaturesMutation.mutate({ [key]: !current });
  };

  const handleTypeChange = (type: any) => {
    Alert.alert(
      'Change Business Type?',
      `${type.label} pe switch karne se features auto re-configure ho jayenge. Aap ka data safe rahega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          style: 'default',
          onPress: () => changeTypeMutation.mutate(type.value),
        },
      ],
    );
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
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
            Business Config
          </Text>
          <Text className="text-xs text-neutral-500">Industry features</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Current business hero */}
        <View
          className="rounded-3xl p-5 mb-5"
          style={{
            backgroundColor: '#1e1b4b',
            shadowColor: '#7c3aed',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View className="flex-row items-start gap-3 mb-4">
            <Text className="text-5xl">{config.template?.emoji || '🏬'}</Text>
            <View className="flex-1">
              <View className="self-start inline-flex flex-row items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <Store size={10} color="#ffffff" />
                <Text className="text-[10px] font-bold text-white">Current Type</Text>
              </View>
              <Text className="mt-2 text-2xl font-extrabold text-white" numberOfLines={1}>
                {config.template?.label || config.businessType}
              </Text>
              <Text className="text-sm text-white/70 mt-0.5" numberOfLines={2}>
                {config.template?.description || 'Business configuration'}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 flex-wrap mb-3">
            <View className="px-2.5 py-1 rounded-full bg-emerald-500/20">
              <Text className="text-[10px] font-bold text-emerald-300">
                Default: {config.defaultUnit}
              </Text>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-white/10">
              <Text className="text-[10px] font-bold text-white">
                {enabledCount} of {FEATURE_META.length} active
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setShowTypeSelector((v) => !v)}
            className="rounded-2xl bg-white/10 border border-white/20 p-3 flex-row items-center gap-3"
          >
            <SettingsIcon size={18} color="#ffffff" />
            <Text className="flex-1 text-white font-bold text-sm">
              {showTypeSelector ? 'Hide Type Selector' : 'Change Business Type'}
            </Text>
            <ChevronRight size={16} color="#ffffff" />
          </Pressable>
        </View>

        {/* Type Selector (collapsible) */}
        {showTypeSelector && (
          <View className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 mb-5">
            <View className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex-row items-start gap-2 mb-4">
              <AlertCircle size={16} color="#b45309" />
              <Text className="flex-1 text-xs text-amber-900 leading-5">
                <Text className="font-extrabold">Note: </Text>
                Type change se features re-configure honge. Products/sales safe rahenge.
              </Text>
            </View>

            <BusinessTypeSelector
              value={config.businessType}
              options={(options?.businessTypes as any) || []}
              onSelect={handleTypeChange}
              confirmText={changeTypeMutation.isPending ? 'Applying...' : 'Apply Changes'}
              loading={changeTypeMutation.isPending}
              primaryColor="#7c3aed"
            />
          </View>
        )}

        {/* Features section */}
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
              Active Features
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              Tap to toggle individual features
            </Text>
          </View>
          <View className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
            <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {enabledCount} / {FEATURE_META.length}
            </Text>
          </View>
        </View>

        {/* Features grid */}
        <View className="gap-2">
          {FEATURE_META.map((f) => {
            const Icon = f.icon;
            const enabled = features[f.key] ?? DEFAULT_FEATURES[f.key];

            return (
              <Pressable
                key={f.key}
                onPress={() => toggleFeature(f.key)}
                disabled={updateFeaturesMutation.isPending}
                className="rounded-2xl border-2 p-3 flex-row items-center gap-3"
                style={{
                  borderColor: enabled ? f.color : '#e5e7eb',
                  backgroundColor: enabled ? f.bg : '#ffffff',
                }}
              >
                <View
                  className="h-11 w-11 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: enabled ? '#ffffff' : f.bg }}
                >
                  <Icon size={20} color={f.color} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text
                    className="font-extrabold text-sm"
                    style={{ color: enabled ? f.color : '#0f172a' }}
                    numberOfLines={1}
                  >
                    {f.label}
                  </Text>
                  <Text
                    className="text-[11px] mt-0.5"
                    style={{ color: enabled ? f.color : '#737373', opacity: enabled ? 0.85 : 1 }}
                    numberOfLines={2}
                  >
                    {f.description}
                  </Text>
                </View>

                {/* Toggle switch */}
                <View
                  style={{
                    height: 28,
                    width: 50,
                    borderRadius: 14,
                    padding: 2,
                    justifyContent: 'center',
                    backgroundColor: enabled ? f.color : '#d1d5db',
                  }}
                >
                  <View
                    style={{
                      height: 24,
                      width: 24,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      transform: [{ translateX: enabled ? 22 : 0 }],
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    {enabled && (
                      <View className="h-full w-full items-center justify-center">
                        <Check size={12} color={f.color} />
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info footer */}
        <View className="mt-5 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 p-4 flex-row items-start gap-3">
          <Sparkles size={18} color="#7c3aed" />
          <View className="flex-1">
            <Text className="text-sm font-bold text-violet-900 dark:text-violet-300">
              Smart Configuration
            </Text>
            <Text className="text-xs text-violet-800 dark:text-violet-400 mt-1 leading-5">
              Features automatically POS, Products, aur dosre screens mein appear/hide hote hain. Jaisa business type select karein, sab adjust ho jata hai.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
