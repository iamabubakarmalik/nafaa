import { useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X, Wrench, Plus, Trash2, Sparkles, Droplet, Hammer,
  Scissors, Truck, Layers, Package, CheckCircle2,
} from 'lucide-react-native';
import type { ServiceChargeItem } from '@/api/sales.api';
import { formatPKRFull } from '@/lib/format';

const PRESETS: Array<{
  type: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  suggested?: number;
}> = [
  { type: 'GLUE',         label: 'Adhesive / Glue',    icon: Droplet,  color: '#2563eb', bg: '#dbeafe', suggested: 2000 },
  { type: 'INSTALLATION', label: 'Installation Labor', icon: Hammer,   color: '#d97706', bg: '#fef3c7', suggested: 3000 },
  { type: 'CUTTING',      label: 'Cutting / Fitting',  icon: Scissors, color: '#8b5cf6', bg: '#ede9fe', suggested: 1500 },
  { type: 'DELIVERY',     label: 'Delivery',           icon: Truck,    color: '#16a34a', bg: '#dcfce7', suggested: 1000 },
  { type: 'UNDERLAY',     label: 'Underlay / Foam',    icon: Layers,   color: '#dc2626', bg: '#fee2e2', suggested: 5000 },
  { type: 'OTHER',        label: 'Other / Custom',     icon: Package,  color: '#525252', bg: '#f1f5f9' },
];

interface Props {
  visible: boolean;
  charges: ServiceChargeItem[];
  onChange: (charges: ServiceChargeItem[]) => void;
  onClose: () => void;
}

export function ServiceChargesSheet({ visible, charges, onChange, onClose }: Props) {
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const total = charges.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const togglePreset = (preset: typeof PRESETS[number]) => {
    Haptics.selectionAsync();
    const existing = charges.findIndex((c) => c.type === preset.type);
    if (existing >= 0) {
      onChange(charges.filter((_, i) => i !== existing));
      return;
    }
    onChange([
      ...charges,
      { type: preset.type, label: preset.label, amount: preset.suggested ?? 0 },
    ]);
  };

  const updateCharge = (idx: number, patch: Partial<ServiceChargeItem>) => {
    onChange(charges.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCharge = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(charges.filter((_, i) => i !== idx));
  };

  const addCustom = () => {
    const label = customLabel.trim();
    const amount = Number(customAmount);
    if (!label || !(amount > 0)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange([...charges, { type: 'CUSTOM', label, amount }]);
    setCustomLabel('');
    setCustomAmount('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          {/* Header */}
          <View className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: '#d97706' }}>
              <Wrench size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-wider text-amber-700 font-extrabold">
                Service Charges
              </Text>
              <Text className="text-base font-bold text-neutral-900 dark:text-white">
                Glue, Installation, Delivery...
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Presets */}
            <View className="mb-4">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Sparkles size={12} color="#f59e0b" />
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">
                  Quick Add
                </Text>
              </View>
              <View className="flex-row flex-wrap -mx-1">
                {PRESETS.map((p) => {
                  const Icon = p.icon;
                  const active = charges.some((c) => c.type === p.type);
                  return (
                    <View key={p.type} style={{ width: '50%', padding: 4 }}>
                      <Pressable
                        onPress={() => togglePreset(p)}
                        className="rounded-2xl border-2 p-3 active:opacity-70"
                        style={{
                          borderColor: active ? p.color : '#e5e7eb',
                          backgroundColor: active ? p.bg : '#ffffff',
                        }}
                      >
                        <View className="flex-row items-center gap-2">
                          <Icon size={18} color={active ? p.color : '#9ca3af'} />
                          {active && <CheckCircle2 size={14} color={p.color} />}
                        </View>
                        <Text
                          className="text-xs font-extrabold mt-1"
                          style={{ color: active ? p.color : '#374151' }}
                        >
                          {p.label}
                        </Text>
                        {p.suggested && (
                          <Text className="text-[10px] font-bold text-slate-500 mt-0.5">
                            ~ Rs {p.suggested.toLocaleString()}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Applied charges */}
            {charges.length > 0 && (
              <View className="mb-4">
                <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
                  Applied Charges ({charges.length})
                </Text>
                <View className="gap-2">
                  {charges.map((charge, idx) => (
                    <View
                      key={`${charge.type}-${idx}`}
                      className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-amber-200 dark:border-amber-900/50 p-3"
                    >
                      <View className="flex-row items-center gap-2">
                        <View className="flex-1">
                          <TextInput
                            value={charge.label}
                            onChangeText={(t) => updateCharge(idx, { label: t })}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-neutral-900"
                          />
                        </View>
                        <View style={{ width: 100 }}>
                          <View className="flex-row items-center rounded-lg border border-slate-200 bg-white h-10 px-2">
                            <Text className="text-[10px] font-extrabold text-slate-500 mr-1">Rs</Text>
                            <TextInput
                              value={String(charge.amount)}
                              onChangeText={(t) => updateCharge(idx, { amount: Number(t) || 0 })}
                              keyboardType="decimal-pad"
                              className="flex-1 text-sm font-extrabold text-neutral-900 text-right"
                            />
                          </View>
                        </View>
                        <Pressable
                          onPress={() => removeCharge(idx)}
                          className="h-10 w-10 rounded-lg bg-rose-50 items-center justify-center"
                        >
                          <Trash2 size={14} color="#dc2626" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View
                  className="mt-3 rounded-2xl p-4"
                  style={{ backgroundColor: '#d97706' }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white/80 text-xs uppercase tracking-wider font-bold">
                      Service Total
                    </Text>
                    <Text className="text-white text-2xl font-extrabold">
                      {formatPKRFull(total)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Custom charge */}
            <View className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-slate-800 p-4">
              <Text className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
                Custom Charge
              </Text>
              <View className="gap-2">
                <TextInput
                  value={customLabel}
                  onChangeText={setCustomLabel}
                  placeholder="Label (e.g. Padding, Extra service)"
                  placeholderTextColor="#9ca3af"
                  className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-neutral-900"
                />
                <View className="flex-row gap-2">
                  <View className="flex-1 flex-row items-center rounded-xl border-2 border-slate-200 bg-white h-11 px-3">
                    <Text className="text-xs font-extrabold text-slate-500 mr-1">Rs</Text>
                    <TextInput
                      value={customAmount}
                      onChangeText={setCustomAmount}
                      keyboardType="decimal-pad"
                      placeholder="Amount"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 text-sm font-extrabold text-neutral-900"
                    />
                  </View>
                  <Pressable
                    onPress={addCustom}
                    disabled={!customLabel.trim() || !(Number(customAmount) > 0)}
                    className="h-11 px-4 rounded-xl items-center justify-center flex-row gap-1 active:opacity-80"
                    style={{
                      backgroundColor: customLabel.trim() && Number(customAmount) > 0 ? '#d97706' : '#9ca3af',
                    }}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text className="text-white font-extrabold text-sm">Add</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Pressable
              onPress={onClose}
              className="h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-80"
              style={{ backgroundColor: '#16a34a' }}
            >
              <CheckCircle2 size={20} color="#ffffff" />
              <Text className="text-white font-extrabold text-base">
                Done {total > 0 && `• +${formatPKRFull(total)}`}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
