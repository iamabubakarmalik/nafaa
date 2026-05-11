import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Save, Check } from 'lucide-react-native';
import { settingsApi, type TenantSettings } from '@/api/settings.api';
import { ImagePickerSheet } from '@/components/uploads';
import { Image as RNImage } from 'react-native';
import Toast from 'react-native-toast-message';

const TITLES: Record<string, string> = {
  business: 'Business Profile',
  localization: 'Localization',
  tax: 'Tax & Pricing',
  receipt: 'Receipt',
  pos: 'POS Settings',
  inventory: 'Inventory',
  customer: 'Customers & Udhaar',
  notifications: 'Notifications',
  security: 'Security',
  appearance: 'Appearance',
};

const COLORS: Record<string, string> = {
  business: '#16a34a',
  localization: '#2563eb',
  tax: '#f59e0b',
  receipt: '#7c3aed',
  pos: '#ec4899',
  inventory: '#0891b2',
  customer: '#6366f1',
  notifications: '#ea580c',
  security: '#dc2626',
  appearance: '#14b8a6',
};

export default function SettingsSectionScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Partial<TenantSettings & { managerPin?: string }>>({});

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const settings = data?.settings;
  const merged = { ...settings, ...draft } as TenantSettings;
  const hasChanges = Object.keys(draft).length > 0;
  const color = COLORS[section || 'business'] || '#16a34a';

  const updateMutation = useMutation({
    mutationFn: () => settingsApi.update(draft as any),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Settings save ho gayi ✅' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setDraft({});
    },
    onError: (e: any) =>
      Toast.show({
        type: 'error',
        text1: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail',
      }),
  });

  const set = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  if (isLoading || !settings) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Text className="text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            if (hasChanges) {
              // Inline confirm
            }
            router.back();
          }}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color={color} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-neutral-900 dark:text-white">
            {TITLES[section || ''] || 'Settings'}
          </Text>
        </View>
        {hasChanges && (
          <Pressable
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="h-10 px-4 rounded-2xl flex-row items-center gap-1.5"
            style={{ backgroundColor: color }}
          >
            <Save size={14} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Save</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {section === 'business' && <BusinessSection s={merged} set={set} />}
          {section === 'localization' && <LocalizationSection s={merged} set={set} />}
          {section === 'tax' && <TaxSection s={merged} set={set} />}
          {section === 'receipt' && <ReceiptSection s={merged} set={set} />}
          {section === 'pos' && <POSSection s={merged} set={set} color={color} />}
          {section === 'inventory' && <InventorySection s={merged} set={set} />}
          {section === 'customer' && <CustomerSection s={merged} set={set} />}
          {section === 'notifications' && <NotificationsSection s={merged} set={set} />}
          {section === 'security' && <SecuritySection s={merged} set={set} />}
          {section === 'appearance' && <AppearanceSection s={merged} set={set} />}
        </ScrollView>

        {/* Sticky save bar */}
        {hasChanges && (
          <View className="px-5 pb-5 pt-3 border-t border-neutral-200 bg-white dark:bg-neutral-900">
            <Pressable
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
              style={{
                backgroundColor: updateMutation.isPending ? '#9ca3af' : color,
                shadowColor: color,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Save size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                {updateMutation.isPending ? 'Saving...' : `Save ${Object.keys(draft).length} change${Object.keys(draft).length > 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ===== Reusable atoms =====
function FieldLabel({ label, required }: any) {
  return (
    <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
      {label}{required && <Text className="text-rose-600"> *</Text>}
    </Text>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, multiline }: any) {
  return (
    <TextInput
      value={value ?? ''}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      multiline={multiline}
      className="rounded-2xl border-2 border-neutral-200 bg-white dark:bg-neutral-900 px-4 text-base text-neutral-900 dark:text-white"
      style={{ minHeight: multiline ? 80 : 48, paddingVertical: multiline ? 12 : 0 }}
    />
  );
}

function ToggleRow({ checked, onChange, label, desc }: any) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{label}</Text>
        {desc && <Text className="text-xs text-neutral-500 mt-0.5">{desc}</Text>}
      </View>
      <Switch value={!!checked} onValueChange={onChange} trackColor={{ true: '#16a34a' }} />
    </View>
  );
}

function ChoiceList({ value, onChange, options }: any) {
  return (
    <View className="gap-2">
      {options.map((o: any) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            className="flex-row items-center justify-between p-3 rounded-2xl border-2"
            style={{
              borderColor: active ? '#16a34a' : '#e5e7eb',
              backgroundColor: active ? '#dcfce715' : '#ffffff',
            }}
          >
            <View className="flex-1">
              <Text className="font-extrabold" style={{ color: active ? '#16a34a' : '#0f172a' }}>
                {o.label}
              </Text>
              {o.desc && <Text className="text-xs text-neutral-500 mt-0.5">{o.desc}</Text>}
            </View>
            {active && <Check size={18} color="#16a34a" />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ===== Sections =====
function BusinessSection({ s, set }: any) {
  const [showLogoPicker, setShowLogoPicker] = useState(false);

  return (
    <View className="gap-4">
      {/* Logo upload */}
      <View>
        <FieldLabel label="Shop Logo" />
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => setShowLogoPicker(true)}
            className="h-24 w-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 items-center justify-center overflow-hidden"
          >
            {s.logoUrl ? (
              <RNImage source={{ uri: s.logoUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Text className="text-xs text-neutral-500 font-bold">Tap to upload</Text>
            )}
          </Pressable>
          <View className="flex-1">
            <Pressable
              onPress={() => setShowLogoPicker(true)}
              className="h-10 px-4 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1.5"
            >
              <Text className="text-white text-sm font-bold">
                {s.logoUrl ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </Pressable>
            {s.logoUrl ? (
              <Pressable onPress={() => set('logoUrl', '')} className="mt-2">
                <Text className="text-xs text-rose-600 font-bold">Remove</Text>
              </Pressable>
            ) : null}
            <Text className="text-[11px] text-neutral-500 mt-1">PNG/JPG, max 5MB</Text>
          </View>
        </View>
      </View>

      <View><FieldLabel label="Shop Name" required /><Input value={s.shopName} onChangeText={(v: string) => set('shopName', v)} placeholder="Ahmad Bakery" /></View>
      <View><FieldLabel label="Phone" /><Input value={s.shopPhone} onChangeText={(v: string) => set('shopPhone', v)} placeholder="+92 300 1234567" keyboardType="phone-pad" /></View>
      <View><FieldLabel label="WhatsApp" /><Input value={s.shopWhatsapp} onChangeText={(v: string) => set('shopWhatsapp', v)} placeholder="+92 300 1234567" keyboardType="phone-pad" /></View>
      <View><FieldLabel label="Email" /><Input value={s.shopEmail} onChangeText={(v: string) => set('shopEmail', v)} placeholder="shop@nafaa.pk" keyboardType="email-address" /></View>
      <View><FieldLabel label="Address" /><Input value={s.shopAddress} onChangeText={(v: string) => set('shopAddress', v)} placeholder="Main Bazaar, Lahore" multiline /></View>
      <View><FieldLabel label="City" /><Input value={s.shopCity} onChangeText={(v: string) => set('shopCity', v)} placeholder="Lahore" /></View>

      <ImagePickerSheet
        visible={showLogoPicker}
        onClose={() => setShowLogoPicker(false)}
        purpose={"logo" as any}
        multiple={false}
        title="Shop Logo Upload"
        onUploaded={(records) => {
          if (records[0]) {
            set('logoUrl', records[0].url);
            setShowLogoPicker(false);
          }
        }}
      />
    </View>
  );
}

function LocalizationSection({ s, set }: any) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useLocaleStore } = require('@/store/locale.store');
  const currentLocale = useLocaleStore((st: any) => st.locale);
  const setLocale = useLocaleStore((st: any) => st.setLocale);

  const languages = [
    { value: 'en', label: '🇬🇧  English', desc: 'Left-to-right' },
    { value: 'ur', label: '🇵🇰  اردو', desc: 'Right-to-left (RTL)' },
  ];

  return (
    <>
      <FieldLabel label="Language" />
      <View className="gap-2 mb-4">
        {languages.map((l) => {
          const active = currentLocale === l.value;
          return (
            <Pressable
              key={l.value}
              onPress={async () => {
                const result = await setLocale(l.value);
                set('language' as any, l.value as any);
                Haptics.selectionAsync();

                if (result?.needsReload) {
                  // RTL change requires app reload (React Native limitation).
                  // Show confirm + reload via expo-updates.
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const { Alert } = require('react-native');
                  Alert.alert(
                    'Language Changed',
                    'App restart hoga taa ke layout sahi ho. Continue?',
                    [
                      { text: 'Baad mein', style: 'cancel' },
                      {
                        text: 'Restart',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            const Updates = require('expo-updates');
                            await Updates.reloadAsync();
                          } catch (e) {
                            // Fallback for Expo Go where reloadAsync isn't available
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            const DevSettings = require('react-native').DevSettings;
                            if (DevSettings && DevSettings.reload) {
                              DevSettings.reload();
                            }
                          }
                        },
                      },
                    ]
                  );
                }
              }}
              className={`rounded-2xl border p-4 flex-row items-center justify-between ${
                active
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800'
              }`}
            >
              <View className="flex-1">
                <Text className="font-extrabold text-neutral-900 dark:text-white text-base">
                  {l.label}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {l.desc}
                </Text>
              </View>
              {active && <Check size={22} color="#2563eb" />}
            </Pressable>
          );
        })}
      </View>

      <FieldLabel label="Currency" />
      <ChoiceList
        value={s?.currency || 'PKR'}
        onChange={(v: any) => set('currency', v)}
        options={[
          { value: 'PKR', label: '🇵🇰 PKR' },
          { value: 'USD', label: '🇺🇸 USD' },
          { value: 'AED', label: '🇦🇪 AED' },
          { value: 'SAR', label: '🇸🇦 SAR' },
        ]}
      />

      <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-4 px-1">
        💡 Language change ke baad app restart maang sakta hai RTL layout ke liye.
      </Text>
    </>
  );
}

function TaxSection({ s, set }: any) {
  return (
    <View className="gap-4">
      <ToggleRow checked={s.enableTax} onChange={(v: boolean) => set('enableTax', v)} label="Enable Tax" desc="Sales par tax auto-calculate" />
      {s.enableTax && (
        <>
          <View><FieldLabel label="Tax Rate (%)" /><Input value={String(s.taxRate ?? 0)} onChangeText={(v: string) => set('taxRate', Number(v) || 0)} placeholder="17" keyboardType="numeric" /></View>
          <View><FieldLabel label="Tax Label" /><Input value={s.taxLabel} onChangeText={(v: string) => set('taxLabel', v)} placeholder="GST" /></View>
          <View><FieldLabel label="NTN / Tax #" /><Input value={s.taxNumber} onChangeText={(v: string) => set('taxNumber', v)} placeholder="1234567-8" /></View>
          <View>
            <FieldLabel label="Tax Calculation" />
            <ChoiceList
              value={String(s.taxInclusive)}
              onChange={(v: string) => set('taxInclusive', v === 'true')}
              options={[
                { value: 'false', label: 'Exclusive', desc: 'Tax price ke upar add hoga' },
                { value: 'true', label: 'Inclusive', desc: 'Price mein tax shamil hai' },
              ]}
            />
          </View>
        </>
      )}
      <View>
        <FieldLabel label="Round Prices To" />
        <ChoiceList
          value={String(s.roundPriceTo)}
          onChange={(v: string) => set('roundPriceTo', Number(v))}
          options={[
            { value: '1', label: 'Rs 1' },
            { value: '5', label: 'Rs 5' },
            { value: '10', label: 'Rs 10' },
          ]}
        />
      </View>
    </View>
  );
}

function ReceiptSection({ s, set }: any) {
  return (
    <View className="gap-5">
      <View>
        <FieldLabel label="Receipt Size" />
        <ChoiceList
          value={s.receiptSize}
          onChange={(v: string) => set('receiptSize', v)}
          options={[
            { value: 'THERMAL_58MM', label: '58mm Thermal' },
            { value: 'THERMAL_80MM', label: '80mm Thermal' },
            { value: 'A4_BASIC', label: 'A4 Basic' },
            { value: 'A4_DETAILED', label: 'A4 Detailed' },
          ]}
        />
      </View>
      <View><FieldLabel label="Invoice Prefix" /><Input value={s.invoicePrefix} onChangeText={(v: string) => set('invoicePrefix', v)} placeholder="INV-" /></View>
      <View><FieldLabel label="Header" /><Input value={s.receiptHeader} onChangeText={(v: string) => set('receiptHeader', v)} placeholder="Welcome to our store" /></View>
      <View><FieldLabel label="Footer" /><Input value={s.receiptFooter} onChangeText={(v: string) => set('receiptFooter', v)} placeholder="Shukriya!" multiline /></View>
      <View>
        <Text className="text-sm font-bold text-neutral-700 mb-2">Display Options</Text>
        <ToggleRow checked={s.receiptShowLogo} onChange={(v: boolean) => set('receiptShowLogo', v)} label="Show Logo" />
        <ToggleRow checked={s.receiptShowTax} onChange={(v: boolean) => set('receiptShowTax', v)} label="Show Tax" />
        <ToggleRow checked={s.receiptShowCustomer} onChange={(v: boolean) => set('receiptShowCustomer', v)} label="Show Customer Info" />
        <ToggleRow checked={s.autoPrintReceipt} onChange={(v: boolean) => set('autoPrintReceipt', v)} label="Auto-print after sale" />
      </View>
    </View>
  );
}

function POSSection({ s, set }: any) {
  return (
    <View className="gap-4">
      <View>
        <FieldLabel label="Default Payment Method" />
        <ChoiceList
          value={s.defaultPaymentMethod}
          onChange={(v: string) => set('defaultPaymentMethod', v)}
          options={[
            { value: 'CASH', label: '💵 Cash' },
            { value: 'CARD', label: '💳 Card' },
            { value: 'JAZZCASH', label: '📱 JazzCash' },
            { value: 'EASYPAISA', label: '💚 EasyPaisa' },
            { value: 'BANK_TRANSFER', label: '🏦 Bank Transfer' },
          ]}
        />
      </View>
      <View>
        <ToggleRow checked={s.confirmBeforeCheckout} onChange={(v: boolean) => set('confirmBeforeCheckout', v)} label="Confirm before checkout" />
        <ToggleRow checked={s.requireCustomerForSale} onChange={(v: boolean) => set('requireCustomerForSale', v)} label="Require customer" />
        <ToggleRow checked={s.allowNegativeStock} onChange={(v: boolean) => set('allowNegativeStock', v)} label="Allow negative stock" />
        <ToggleRow checked={s.roundTotal} onChange={(v: boolean) => set('roundTotal', v)} label="Round total" />
        <ToggleRow checked={s.allowDiscount} onChange={(v: boolean) => set('allowDiscount', v)} label="Allow discounts" />
        <ToggleRow checked={s.showProductImages} onChange={(v: boolean) => set('showProductImages', v)} label="Show product images" />
        <ToggleRow checked={s.enableBarcodeScanner} onChange={(v: boolean) => set('enableBarcodeScanner', v)} label="Enable barcode scanner" />
      </View>
    </View>
  );
}

function InventorySection({ s, set }: any) {
  return (
    <View className="gap-4">
      <View><FieldLabel label="Default Low Stock Alert" /><Input value={String(s.defaultLowStockAlert ?? 10)} onChangeText={(v: string) => set('defaultLowStockAlert', Number(v) || 0)} placeholder="10" keyboardType="numeric" /></View>
      <ToggleRow checked={s.trackExpiry} onChange={(v: boolean) => set('trackExpiry', v)} label="Track expiry dates" />
      {s.trackExpiry && (
        <View><FieldLabel label="Expiry Warning Days" /><Input value={String(s.expiryWarningDays ?? 30)} onChangeText={(v: string) => set('expiryWarningDays', Number(v) || 30)} keyboardType="numeric" /></View>
      )}
      <View>
        <FieldLabel label="Stock Method" />
        <ChoiceList
          value={s.stockMethod}
          onChange={(v: string) => set('stockMethod', v)}
          options={[
            { value: 'AVERAGE', label: 'Average', desc: 'Recommended' },
            { value: 'FIFO', label: 'FIFO' },
            { value: 'LIFO', label: 'LIFO' },
          ]}
        />
      </View>
    </View>
  );
}

function CustomerSection({ s, set }: any) {
  return (
    <View className="gap-4">
      <ToggleRow checked={s.allowCredit} onChange={(v: boolean) => set('allowCredit', v)} label="Allow Credit (Udhaar)" desc="Customers ko udhaar de sakte hain" />
      {s.allowCredit && (
        <>
          <View><FieldLabel label="Default Credit Limit (Rs)" /><Input value={String(s.defaultCreditLimit ?? 0)} onChangeText={(v: string) => set('defaultCreditLimit', Number(v) || 0)} keyboardType="numeric" /></View>
          <View><FieldLabel label="Overdue Days" /><Input value={String(s.creditOverdueDays ?? 30)} onChangeText={(v: string) => set('creditOverdueDays', Number(v) || 30)} keyboardType="numeric" /></View>
        </>
      )}
      <ToggleRow checked={s.enableLoyalty} onChange={(v: boolean) => set('enableLoyalty', v)} label="Loyalty Points" />
      <ToggleRow checked={s.autoCreateCustomer} onChange={(v: boolean) => set('autoCreateCustomer', v)} label="Auto-create customers" />
    </View>
  );
}

function NotificationsSection({ s, set }: any) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-bold text-neutral-700 mb-1">Channels</Text>
      <ToggleRow checked={s.emailNotifications} onChange={(v: boolean) => set('emailNotifications', v)} label="Email" />
      <ToggleRow checked={s.smsNotifications} onChange={(v: boolean) => set('smsNotifications', v)} label="SMS" />
      <ToggleRow checked={s.whatsappNotifications} onChange={(v: boolean) => set('whatsappNotifications', v)} label="WhatsApp" />
      <ToggleRow checked={s.pushNotifications} onChange={(v: boolean) => set('pushNotifications', v)} label="Push (Mobile)" />

      <Text className="text-sm font-bold text-neutral-700 mt-4 mb-1">Events</Text>
      <ToggleRow checked={s.notifyLowStock} onChange={(v: boolean) => set('notifyLowStock', v)} label="Low stock alerts" />
      <ToggleRow checked={s.notifyOutOfStock} onChange={(v: boolean) => set('notifyOutOfStock', v)} label="Out of stock alerts" />
      <ToggleRow checked={s.notifyNewSale} onChange={(v: boolean) => set('notifyNewSale', v)} label="New sale" />
      <ToggleRow checked={s.notifyDailySummary} onChange={(v: boolean) => set('notifyDailySummary', v)} label="Daily summary" />
      {s.notifyDailySummary && (
        <View><FieldLabel label="Summary Time" /><Input value={s.dailySummaryTime} onChangeText={(v: string) => set('dailySummaryTime', v)} placeholder="21:00" /></View>
      )}
    </View>
  );
}

function SecuritySection({ s, set }: any) {
  return (
    <View className="gap-4">
      {s.hasManagerPin && (
        <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
          <Text className="text-xs font-bold text-emerald-900">✓ Manager PIN set hai</Text>
        </View>
      )}
      <View><FieldLabel label={s.hasManagerPin ? 'Change PIN (4-6 digits)' : 'Set PIN'} /><Input value={undefined} onChangeText={(v: string) => set('managerPin' as any, v.replace(/\D/g, '').slice(0, 6))} placeholder="••••" keyboardType="numeric" /></View>
      <Text className="text-sm font-bold text-neutral-700 mt-2">Require PIN For</Text>
      <ToggleRow checked={s.requirePinForVoid} onChange={(v: boolean) => set('requirePinForVoid', v)} label="Voiding sales" />
      <ToggleRow checked={s.requirePinForDiscount} onChange={(v: boolean) => set('requirePinForDiscount', v)} label="Large discounts" />
      <ToggleRow checked={s.requirePinForRefund} onChange={(v: boolean) => set('requirePinForRefund', v)} label="Refunds" />
      <View><FieldLabel label="Auto Logout (minutes)" /><Input value={String(s.autoLogoutMinutes ?? 60)} onChangeText={(v: string) => set('autoLogoutMinutes', Number(v) || 60)} keyboardType="numeric" /></View>
    </View>
  );
}

function AppearanceSection({ s, set }: any) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useThemeStore } = require('@/store/theme.store');
  const themeMode = useThemeStore((st: any) => st.mode);
  const setThemeMode = useThemeStore((st: any) => st.setMode);

  const themes = [
    { value: 'light', label: '☀️  Light', desc: 'Hamesha din ka mode' },
    { value: 'dark', label: '🌙  Dark', desc: 'Hamesha raat ka mode' },
    { value: 'system', label: '⚙️  System', desc: 'Phone ki setting ke mutabiq' },
  ];

  return (
    <>
      <FieldLabel label="Theme Mode" />
      <View className="gap-2">
        {themes.map((t) => {
          const active = themeMode === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={async () => {
                await setThemeMode(t.value);
                // Map local 'system' → backend 'auto' (backend only accepts light|dark|auto)
                const apiValue = t.value === 'system' ? 'auto' : t.value;
                set('theme' as any, apiValue as any);
                Haptics.selectionAsync();
              }}
              className={`rounded-2xl border p-4 flex-row items-center justify-between ${
                active
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                  : 'border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800'
              }`}
            >
              <View className="flex-1">
                <Text className="font-extrabold text-neutral-900 dark:text-white text-base">
                  {t.label}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t.desc}
                </Text>
              </View>
              {active && <Check size={22} color="#14b8a6" />}
            </Pressable>
          );
        })}
      </View>

      <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-4 px-1">
        💡 Theme select karte hi fauran apply ho jayega. Save button cloud par bhi sync karega.
      </Text>
    </>
  );
}
