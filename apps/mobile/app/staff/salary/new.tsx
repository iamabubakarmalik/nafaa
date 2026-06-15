import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Wallet, Plus, Minus, Save, Sparkles, User, ChevronDown,
} from 'lucide-react-native';
import { staffApi } from '@/api/staff.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

function FormInput({ label, hint, ...props }: any) {
  return (
    <View>
      <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">{label}</Text>
      <View className="rounded-xl border border-neutral-200 bg-white px-3 h-11 justify-center">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="text-base font-bold text-neutral-900"
          {...props}
        />
      </View>
      {hint && <Text className="text-[10px] text-neutral-500 mt-1">{hint}</Text>}
    </View>
  );
}

export default function SalaryProcessScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ staffId?: string }>();

  const [staffId, setStaffId] = useState(params.staffId || '');
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });
  const [overtimePay, setOvertimePay] = useState('0');
  const [commissionEarned, setCommissionEarned] = useState('0');
  const [bonuses, setBonuses] = useState('0');
  const [advances, setAdvances] = useState('0');
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list-active'],
    queryFn: () => staffApi.list({ status: 'ACTIVE' }),
  });

  const selectedStaff = staff.find((s) => s.id === staffId);

  const estimatedBase = selectedStaff?.salaryType === 'MONTHLY' ? selectedStaff.baseSalary : 0;
  const totalAdditions = Number(overtimePay) + Number(commissionEarned) + Number(bonuses);
  const totalDeductions = Number(advances) + Number(otherDeductions);
  const estimatedNet = Math.max(estimatedBase + totalAdditions - totalDeductions, 0);

  useEffect(() => {
    if (estimatedNet > 0 && !paidAmount) {
      setPaidAmount(String(estimatedNet));
    }
  }, [estimatedNet]);

  const processMutation = useMutation({
    mutationFn: () =>
      staffApi.processSalary({
        staffId,
        periodStart,
        periodEnd,
        overtimePay: Number(overtimePay) || 0,
        commissionEarned: Number(commissionEarned) || 0,
        bonuses: Number(bonuses) || 0,
        advances: Number(advances) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        paidAmount: paidAmount ? Number(paidAmount) : undefined,
        paymentMethod,
        notes: notes || undefined,
      }),
    onSuccess: (payment) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `${payment.paymentNumber} processed` });
      queryClient.invalidateQueries({ queryKey: ['staff', staffId] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      router.replace(`/staff/${staffId}` as any);
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' });
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white border border-neutral-200 items-center justify-center"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={11} color="#f59e0b" />
            <Text className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">
              Process Salary
            </Text>
          </View>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">Salary Payment</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
          {/* Staff Selector */}
          <Pressable
            onPress={() => setShowStaffPicker(!showStaffPicker)}
            className="rounded-2xl bg-white border border-neutral-200 p-4 flex-row items-center gap-3 mb-4"
          >
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#7c3aed' }}
            >
              <User size={20} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Employee</Text>
              <Text className="text-base font-extrabold text-neutral-900" numberOfLines={1}>
                {selectedStaff?.fullName || 'Tap to select'}
              </Text>
              {selectedStaff && (
                <Text className="text-xs text-violet-700 font-bold">{selectedStaff.designation}</Text>
              )}
            </View>
            <ChevronDown size={20} color="#9ca3af" />
          </Pressable>

          {showStaffPicker && (
            <View className="rounded-2xl bg-white border border-neutral-200 p-2 mb-4">
              {staff.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setStaffId(s.id);
                    setShowStaffPicker(false);
                  }}
                  className="p-3 rounded-xl flex-row items-center gap-3"
                  style={{ backgroundColor: staffId === s.id ? '#ede9fe' : 'transparent' }}
                >
                  <View
                    className="h-10 w-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    <Text className="text-white font-extrabold">{s.fullName.charAt(0)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-neutral-900">{s.fullName}</Text>
                    <Text className="text-xs text-neutral-500">{s.designation} • {formatPKRFull(s.baseSalary)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Period */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <FormInput
                label="Period Start"
                value={periodStart}
                onChangeText={setPeriodStart}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View className="flex-1">
              <FormInput
                label="Period End"
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {/* Additions */}
          <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Plus size={16} color="#16a34a" />
              <Text className="font-extrabold text-emerald-900">Additions</Text>
            </View>
            <View className="gap-3">
              <FormInput
                label="Overtime Pay"
                value={overtimePay}
                onChangeText={setOvertimePay}
                keyboardType="decimal-pad"
              />
              <FormInput
                label="Commission"
                value={commissionEarned}
                onChangeText={setCommissionEarned}
                keyboardType="decimal-pad"
              />
              <FormInput
                label="Bonuses"
                value={bonuses}
                onChangeText={setBonuses}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Deductions */}
          <View className="rounded-2xl bg-rose-50 border border-rose-200 p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Minus size={16} color="#dc2626" />
              <Text className="font-extrabold text-rose-900">Deductions</Text>
            </View>
            <View className="gap-3">
              <FormInput
                label="Advances Taken"
                value={advances}
                onChangeText={setAdvances}
                keyboardType="decimal-pad"
              />
              <FormInput
                label="Other Deductions"
                value={otherDeductions}
                onChangeText={setOtherDeductions}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Net Amount */}
          {selectedStaff && (
            <View
              className="rounded-2xl p-5 mb-4 items-center"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Text className="text-xs uppercase tracking-wider text-white/80 font-bold">Net Payable</Text>
              <Text className="text-4xl font-extrabold text-white mt-1">{formatPKRFull(estimatedNet)}</Text>
              <Text className="text-[10px] text-white/70 mt-2">
                Base: {formatPKRFull(estimatedBase)} + Additions: {formatPKRFull(totalAdditions)} − Deductions: {formatPKRFull(totalDeductions)}
              </Text>
            </View>
          )}

          {/* Payment */}
          <View className="rounded-2xl bg-white border border-neutral-200 p-4 gap-3 mb-4">
            <FormInput
              label="Paid Amount"
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="decimal-pad"
              hint="Leave full to mark fully paid"
            />

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Payment Method
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {[
                  { v: 'CASH', l: 'Cash' },
                  { v: 'BANK_TRANSFER', l: 'Bank' },
                  { v: 'JAZZCASH', l: 'JazzCash' },
                  { v: 'EASYPAISA', l: 'EasyPaisa' },
                ].map((m) => (
                  <Pressable
                    key={m.v}
                    onPress={() => setPaymentMethod(m.v)}
                    className="px-3 h-10 rounded-xl border-2 items-center justify-center"
                    style={{
                      backgroundColor: paymentMethod === m.v ? '#16a34a' : '#ffffff',
                      borderColor: paymentMethod === m.v ? '#16a34a' : '#e5e7eb',
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: paymentMethod === m.v ? '#ffffff' : '#374151' }}
                    >
                      {m.l}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Notes</Text>
              <View className="rounded-xl border border-neutral-200 px-3 py-2">
                <TextInput
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any notes..."
                  placeholderTextColor="#9ca3af"
                  className="text-sm text-neutral-900 min-h-[60px]"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="px-5 py-3 border-t border-neutral-200 bg-white">
          <Pressable
            onPress={() => {
              if (!staffId) {
                Toast.show({ type: 'error', text1: 'Select staff' });
                return;
              }
              processMutation.mutate();
            }}
            disabled={processMutation.isPending}
            className="h-12 rounded-2xl flex-row items-center justify-center gap-2"
            style={{ backgroundColor: processMutation.isPending ? '#9ca3af' : '#16a34a' }}
          >
            <Save size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {processMutation.isPending ? 'Processing...' : 'Process Salary'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
