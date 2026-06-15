import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Save, Trash2, User, Briefcase, Wallet, Sparkles,
} from 'lucide-react-native';
import { staffApi, type CreateStaffPayload, type StaffStatus } from '@/api/staff.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

function FormInput({ label, ...props }: any) {
  return (
    <View>
      <Text className="text-sm font-bold text-neutral-700 mb-1.5">{label}</Text>
      <View className="rounded-2xl border border-neutral-200 bg-white px-4 h-12 justify-center">
        <TextInput
          placeholderTextColor="#9ca3af"
          className="text-base text-neutral-900"
          {...props}
        />
      </View>
    </View>
  );
}

export default function EditStaffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CreateStaffPayload>>({});
  const [loaded, setLoaded] = useState(false);

  const { data: staff } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffApi.getOne(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (staff && !loaded) {
      setForm({
        fullName: staff.fullName,
        phone: staff.phone,
        email: staff.email ?? undefined,
        cnic: staff.cnic ?? undefined,
        designation: staff.designation,
        department: staff.department ?? undefined,
        baseSalary: staff.baseSalary,
        salaryType: staff.salaryType,
        status: staff.status,
        address: staff.address ?? undefined,
        city: staff.city ?? undefined,
        bankName: staff.bankName ?? undefined,
        accountNumber: staff.accountNumber ?? undefined,
        emergencyName: staff.emergencyName ?? undefined,
        emergencyPhone: staff.emergencyPhone ?? undefined,
        notes: staff.notes ?? undefined,
      });
      setLoaded(true);
    }
  }, [staff, loaded]);

  const updateMutation = useMutation({
    mutationFn: () => staffApi.update(id, form),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Updated' });
      queryClient.invalidateQueries({ queryKey: ['staff', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      router.back();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => staffApi.remove(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Staff terminated' });
      router.replace('/staff' as any);
    },
  });

  if (!staff || !loaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <Text className="text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white border border-neutral-200 items-center justify-center"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Editing</Text>
          <Text className="text-xl font-bold text-neutral-900" numberOfLines={1}>
            {staff.fullName}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
          <View className="gap-4">
            <FormInput
              label="Full Name"
              value={form.fullName ?? ''}
              onChangeText={(t: string) => setForm({ ...form, fullName: t })}
            />
            <FormInput
              label="Phone"
              value={form.phone ?? ''}
              onChangeText={(t: string) => setForm({ ...form, phone: t })}
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
              label="CNIC"
              value={form.cnic ?? ''}
              onChangeText={(t: string) => setForm({ ...form, cnic: t })}
              keyboardType="number-pad"
            />
            <FormInput
              label="Designation"
              value={form.designation ?? ''}
              onChangeText={(t: string) => setForm({ ...form, designation: t })}
            />
            <FormInput
              label="Department"
              value={form.department ?? ''}
              onChangeText={(t: string) => setForm({ ...form, department: t })}
            />
            <FormInput
              label="Base Salary"
              value={String(form.baseSalary ?? 0)}
              onChangeText={(t: string) => setForm({ ...form, baseSalary: Number(t) || 0 })}
              keyboardType="decimal-pad"
            />
            <FormInput
              label="City"
              value={form.city ?? ''}
              onChangeText={(t: string) => setForm({ ...form, city: t })}
            />
            <FormInput
              label="Address"
              value={form.address ?? ''}
              onChangeText={(t: string) => setForm({ ...form, address: t })}
            />

            <View>
              <Text className="text-sm font-bold text-neutral-700 mb-2">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED'] as StaffStatus[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setForm({ ...form, status: s })}
                    className="px-4 h-10 rounded-xl border-2 items-center justify-center"
                    style={{
                      backgroundColor: form.status === s ? '#7c3aed' : '#ffffff',
                      borderColor: form.status === s ? '#7c3aed' : '#e5e7eb',
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: form.status === s ? '#ffffff' : '#374151' }}
                    >
                      {s.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="border-t border-neutral-200 pt-4 gap-4">
              <Text className="text-sm font-bold text-neutral-700">Bank Details</Text>
              <FormInput
                label="Bank Name"
                value={form.bankName ?? ''}
                onChangeText={(t: string) => setForm({ ...form, bankName: t })}
              />
              <FormInput
                label="Account Number"
                value={form.accountNumber ?? ''}
                onChangeText={(t: string) => setForm({ ...form, accountNumber: t })}
              />
            </View>

            <View className="border-t border-neutral-200 pt-4 gap-4">
              <Text className="text-sm font-bold text-neutral-700">Emergency Contact</Text>
              <FormInput
                label="Name"
                value={form.emergencyName ?? ''}
                onChangeText={(t: string) => setForm({ ...form, emergencyName: t })}
              />
              <FormInput
                label="Phone"
                value={form.emergencyPhone ?? ''}
                onChangeText={(t: string) => setForm({ ...form, emergencyPhone: t })}
                keyboardType="phone-pad"
              />
            </View>

            <Pressable
              onPress={() => {
                Alert.alert('Terminate?', `Are you sure?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Terminate', style: 'destructive', onPress: () => removeMutation.mutate() },
                ]);
              }}
              className="h-12 rounded-2xl bg-rose-50 border border-rose-200 flex-row items-center justify-center gap-1.5 mt-4"
            >
              <Trash2 size={16} color="#dc2626" />
              <Text className="text-rose-700 font-bold">Terminate Staff</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View className="px-5 py-3 border-t border-neutral-200 bg-white">
          <Pressable
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="h-12 rounded-2xl flex-row items-center justify-center gap-2"
            style={{ backgroundColor: updateMutation.isPending ? '#9ca3af' : '#7c3aed' }}
          >
            <Save size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
