import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Save, User, Briefcase, Wallet, Phone, Building2,
  AlertTriangle, ChevronLeft, ChevronRight, Check, Sparkles,
} from 'lucide-react-native';
import { staffApi, type CreateStaffPayload, type SalaryType, type StaffGender } from '@/api/staff.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

type Step = 'personal' | 'job' | 'salary' | 'emergency';

const steps: { id: Step; label: string; icon: any; color: string }[] = [
  { id: 'personal', label: 'Personal', icon: User, color: '#7c3aed' },
  { id: 'job', label: 'Job', icon: Briefcase, color: '#2563eb' },
  { id: 'salary', label: 'Salary', icon: Wallet, color: '#16a34a' },
  { id: 'emergency', label: 'Contact', icon: Phone, color: '#dc2626' },
];

function FormInput({ label, required, hint, ...props }: any) {
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</Text>
        {required && <Text className="text-rose-600 font-bold">*</Text>}
      </View>
      <View className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12 justify-center">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="text-base text-neutral-900 dark:text-white"
          {...props}
        />
      </View>
      {hint && <Text className="text-xs text-neutral-500 mt-1">{hint}</Text>}
    </View>
  );
}

export default function NewStaffScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('personal');
  const [form, setForm] = useState<CreateStaffPayload>({
    fullName: '',
    phone: '',
    designation: '',
    joinDate: new Date().toISOString().split('T')[0],
    salaryType: 'MONTHLY',
    baseSalary: 0,
    workingHoursPerDay: 8,
    workingDaysPerMonth: 26,
    status: 'ACTIVE',
  });

  const createMutation = useMutation({
    mutationFn: () => staffApi.create(form),
    onSuccess: (saved) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '✅ Staff added!' });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      router.replace(`/staff/${saved.id}` as any);
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message?.[0] || 'Failed' });
    },
  });

  const stepIndex = steps.findIndex((s) => s.id === step);
  const currentStep = steps[stepIndex];

  const isStepValid = () => {
    if (step === 'personal') return form.fullName.trim() && form.phone.trim();
    if (step === 'job') return form.designation.trim();
    if (step === 'salary') return form.baseSalary > 0;
    return true;
  };

  const goNext = () => {
    if (!isStepValid()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: 'error', text1: 'Required fields missing' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex < steps.length - 1) setStep(steps[stepIndex + 1].id);
  };

  const goPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex > 0) setStep(steps[stepIndex - 1].id);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white border border-neutral-200 items-center justify-center"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">
              New Employee
            </Text>
          </View>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            Step {stepIndex + 1} of {steps.length}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="px-5 pb-2">
        <View className="h-1.5 rounded-full bg-neutral-200 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${((stepIndex + 1) / steps.length) * 100}%`,
              backgroundColor: currentStep.color,
            }}
          />
        </View>
      </View>

      {/* Step pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
        style={{ maxHeight: 50 }}
      >
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const active = step === s.id;
          const completed = idx < stepIndex;
          return (
            <Pressable
              key={s.id}
              onPress={() => setStep(s.id)}
              className="px-3 h-9 rounded-2xl flex-row items-center gap-1.5 border-2"
              style={{
                backgroundColor: active ? s.color : completed ? `${s.color}15` : '#ffffff',
                borderColor: active ? s.color : completed ? s.color : '#e5e7eb',
              }}
            >
              {completed ? (
                <View className="h-4 w-4 rounded-full items-center justify-center" style={{ backgroundColor: s.color }}>
                  <Check size={10} color="#ffffff" />
                </View>
              ) : (
                <Icon size={12} color={active ? '#ffffff' : s.color} />
              )}
              <Text
                className="text-xs font-bold"
                style={{ color: active ? '#ffffff' : completed ? s.color : '#6b7280' }}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
          {/* Step Hero */}
          <View
            className="rounded-2xl p-4 mb-4 flex-row items-center gap-3"
            style={{ backgroundColor: currentStep.color }}
          >
            <View className="h-12 w-12 rounded-xl bg-white/20 items-center justify-center">
              <currentStep.icon size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-extrabold">{currentStep.label} Info</Text>
              <Text className="text-white/80 text-xs">Fill required fields to continue</Text>
            </View>
          </View>

          {/* Personal Step */}
          {step === 'personal' && (
            <View className="gap-4">
              <FormInput
                label="Full Name"
                required
                value={form.fullName}
                onChangeText={(t: string) => setForm({ ...form, fullName: t })}
                placeholder="Muhammad Ali"
              />
              <FormInput
                label="Father's Name"
                value={form.fatherName ?? ''}
                onChangeText={(t: string) => setForm({ ...form, fatherName: t })}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-700 mb-1.5">Gender</Text>
                  <View className="flex-row gap-1.5">
                    {(['MALE', 'FEMALE', 'OTHER'] as StaffGender[]).map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => setForm({ ...form, gender: g })}
                        className="flex-1 h-12 rounded-xl border-2 items-center justify-center"
                        style={{
                          backgroundColor: form.gender === g ? '#7c3aed' : '#ffffff',
                          borderColor: form.gender === g ? '#7c3aed' : '#e5e7eb',
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: form.gender === g ? '#ffffff' : '#374151' }}
                        >
                          {g.charAt(0)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <FormInput
                label="CNIC"
                value={form.cnic ?? ''}
                onChangeText={(t: string) => setForm({ ...form, cnic: t })}
                placeholder="42101-1234567-1"
                keyboardType="number-pad"
              />
              <FormInput
                label="Phone"
                required
                value={form.phone}
                onChangeText={(t: string) => setForm({ ...form, phone: t })}
                placeholder="03001234567"
                keyboardType="phone-pad"
              />
              <FormInput
                label="Email"
                value={form.email ?? ''}
                onChangeText={(t: string) => setForm({ ...form, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormInput
                label="City"
                value={form.city ?? ''}
                onChangeText={(t: string) => setForm({ ...form, city: t })}
                placeholder="Lahore, Karachi..."
              />
            </View>
          )}

          {/* Job Step */}
          {step === 'job' && (
            <View className="gap-4">
              <FormInput
                label="Designation"
                required
                value={form.designation}
                onChangeText={(t: string) => setForm({ ...form, designation: t })}
                placeholder="Cashier, Manager, Helper..."
              />
              <FormInput
                label="Department"
                value={form.department ?? ''}
                onChangeText={(t: string) => setForm({ ...form, department: t })}
                placeholder="Sales, Inventory..."
              />
              <FormInput
                label="Join Date"
                required
                value={form.joinDate}
                onChangeText={(t: string) => setForm({ ...form, joinDate: t })}
                placeholder="YYYY-MM-DD"
              />
              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-1.5">Notes</Text>
                <View className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <TextInput
                    multiline
                    numberOfLines={4}
                    value={form.notes ?? ''}
                    onChangeText={(t) => setForm({ ...form, notes: t })}
                    placeholder="Any additional info..."
                    placeholderTextColor="#9ca3af"
                    className="text-base text-neutral-900 min-h-[80px]"
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Salary Step */}
          {step === 'salary' && (
            <View className="gap-4">
              <View>
                <Text className="text-sm font-bold text-neutral-700 mb-2">Salary Type</Text>
                <View className="flex-row flex-wrap gap-2">
                  {([
                    { v: 'MONTHLY', l: 'Monthly' },
                    { v: 'DAILY', l: 'Daily' },
                    { v: 'HOURLY', l: 'Hourly' },
                    { v: 'PER_TASK', l: 'Per Task' },
                    { v: 'COMMISSION', l: 'Commission' },
                    { v: 'HYBRID', l: 'Hybrid' },
                  ] as { v: SalaryType; l: string }[]).map((opt) => (
                    <Pressable
                      key={opt.v}
                      onPress={() => setForm({ ...form, salaryType: opt.v })}
                      className="px-4 h-11 rounded-xl border-2 items-center justify-center"
                      style={{
                        backgroundColor: form.salaryType === opt.v ? '#16a34a' : '#ffffff',
                        borderColor: form.salaryType === opt.v ? '#16a34a' : '#e5e7eb',
                      }}
                    >
                      <Text
                        className="text-sm font-bold"
                        style={{ color: form.salaryType === opt.v ? '#ffffff' : '#374151' }}
                      >
                        {opt.l}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <FormInput
                label={`Base ${form.salaryType === 'COMMISSION' ? '(%)' : '(PKR)'}`}
                required
                value={form.baseSalary > 0 ? String(form.baseSalary) : ''}
                onChangeText={(t: string) => setForm({ ...form, baseSalary: Number(t) || 0 })}
                keyboardType="decimal-pad"
                placeholder="0"
              />

              {form.baseSalary > 0 && (
                <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <Text className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Preview</Text>
                  <Text className="text-3xl font-extrabold text-emerald-900 mt-1">
                    {form.salaryType === 'COMMISSION' ? `${form.baseSalary}%` : formatPKRFull(form.baseSalary)}
                  </Text>
                </View>
              )}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormInput
                    label="Hours/Day"
                    value={String(form.workingHoursPerDay ?? 8)}
                    onChangeText={(t: string) => setForm({ ...form, workingHoursPerDay: Number(t) || 8 })}
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <FormInput
                    label="Days/Month"
                    value={String(form.workingDaysPerMonth ?? 26)}
                    onChangeText={(t: string) => setForm({ ...form, workingDaysPerMonth: Number(t) || 26 })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View className="border-t border-neutral-200 pt-4 gap-4">
                <Text className="text-sm font-bold text-neutral-700">Bank (Optional)</Text>
                <FormInput
                  label="Bank Name"
                  value={form.bankName ?? ''}
                  onChangeText={(t: string) => setForm({ ...form, bankName: t })}
                  placeholder="HBL, MCB, UBL..."
                />
                <FormInput
                  label="Account Number"
                  value={form.accountNumber ?? ''}
                  onChangeText={(t: string) => setForm({ ...form, accountNumber: t })}
                />
              </View>
            </View>
          )}

          {/* Emergency Step */}
          {step === 'emergency' && (
            <View className="gap-4">
              <View className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex-row items-start gap-2">
                <AlertTriangle size={16} color="#d97706" />
                <Text className="text-xs text-amber-900 flex-1">
                  Emergency contact zaroori hai accidents / health issues ke liye
                </Text>
              </View>
              <FormInput
                label="Contact Name"
                value={form.emergencyName ?? ''}
                onChangeText={(t: string) => setForm({ ...form, emergencyName: t })}
                placeholder="Spouse, parent..."
              />
              <FormInput
                label="Relation"
                value={form.emergencyRelation ?? ''}
                onChangeText={(t: string) => setForm({ ...form, emergencyRelation: t })}
                placeholder="Father, Mother..."
              />
              <FormInput
                label="Contact Phone"
                value={form.emergencyPhone ?? ''}
                onChangeText={(t: string) => setForm({ ...form, emergencyPhone: t })}
                placeholder="03XXXXXXXXX"
                keyboardType="phone-pad"
              />

              <View className="rounded-2xl bg-violet-50 border border-violet-200 p-4 mt-4">
                <Text className="text-sm font-bold text-violet-900 mb-2">Ready to create</Text>
                <Text className="text-xs text-violet-700">
                  {form.fullName} • {form.designation} • {formatPKRFull(form.baseSalary)} {form.salaryType}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View className="px-5 py-3 border-t border-neutral-200 bg-white flex-row gap-2">
          {stepIndex > 0 && (
            <Pressable
              onPress={goPrev}
              className="h-12 px-5 rounded-2xl bg-neutral-100 flex-row items-center gap-1.5"
            >
              <ChevronLeft size={16} color="#374151" />
              <Text className="font-bold text-neutral-700">Back</Text>
            </Pressable>
          )}
          {stepIndex < steps.length - 1 ? (
            <Pressable
              onPress={goNext}
              className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: currentStep.color }}
            >
              <Text className="text-white font-extrabold">Next: {steps[stepIndex + 1].label}</Text>
              <ChevronRight size={16} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: createMutation.isPending ? '#9ca3af' : '#7c3aed' }}
            >
              <Save size={16} color="#ffffff" />
              <Text className="text-white font-extrabold">
                {createMutation.isPending ? 'Creating...' : 'Create Staff'}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
