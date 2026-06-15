import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, Alert, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Edit3, Trash2, Phone, Mail, MapPin, Calendar,
  User, Briefcase, Wallet, FileText, CheckCircle2, XCircle,
  Clock, Coffee, TrendingUp, ChevronRight, Building2,
  AlertTriangle, MessageCircle, CreditCard,
} from 'lucide-react-native';
import { staffApi } from '@/api/staff.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

type Tab = 'overview' | 'attendance' | 'salary' | 'leaves';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
  { id: 'salary', label: 'Salary', icon: Wallet },
  { id: 'leaves', label: 'Leaves', icon: Coffee },
];

const formatDate = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(d)) : '—';

const formatTime = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('en-PK', { hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const { data: staff, refetch } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffApi.getOne(id),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => staffApi.remove(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Staff terminated' });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      router.back();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleWhatsApp = () => {
    if (!staff?.phone) return;
    const phone = staff.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`).catch(() => {
      Linking.openURL(`https://wa.me/${cleanPhone}`);
    });
  };

  const handleCall = () => {
    if (!staff?.phone) return;
    Linking.openURL(`tel:${staff.phone}`);
  };

  if (!staff) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Text className="text-neutral-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const presentDays = staff.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const totalAttendance = staff.attendances.length;
  const attendancePct = totalAttendance > 0 ? (presentDays / totalAttendance) * 100 : 0;

  const totalSalaryPaid = staff.salaryPayments
    .filter((p) => p.status === 'PAID' || p.status === 'PARTIAL')
    .reduce((sum, p) => sum + p.paidAmount, 0);

  const pendingLeaves = staff.leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#7c3aed" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500">Staff Profile</Text>
          <Text className="text-base font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
            {staff.fullName}
          </Text>
        </View>
        <Link href={`/staff/${id}/edit` as any} asChild>
          <Pressable className="h-10 w-10 rounded-2xl bg-violet-100 items-center justify-center">
            <Edit3 size={16} color="#7c3aed" />
          </Pressable>
        </Link>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View
          className="mx-5 mt-2 rounded-3xl p-5"
          style={{ backgroundColor: '#7c3aed' }}
        >
          <View className="items-center">
            {staff.avatarUrl ? (
              <Image
                source={{ uri: staff.avatarUrl }}
                className="h-24 w-24 rounded-3xl border-4 border-white/20"
                resizeMode="cover"
              />
            ) : (
              <View className="h-24 w-24 rounded-3xl bg-white/20 items-center justify-center border-4 border-white/20">
                <Text className="text-white text-4xl font-extrabold">
                  {staff.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text className="text-[10px] uppercase tracking-wider text-white/60 font-bold mt-3">
              {staff.staffNumber}
            </Text>
            <Text className="text-2xl font-extrabold text-white mt-1">{staff.fullName}</Text>
            <Text className="text-sm font-bold text-white/90 mt-0.5">{staff.designation}</Text>
            {staff.department && (
              <Text className="text-xs text-white/70 mt-0.5">{staff.department}</Text>
            )}
            <View className="mt-3 px-3 py-1 rounded-full bg-white/15">
              <Text className="text-white text-[10px] font-extrabold">
                {staff.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-5 pt-4 flex-row gap-2">
          <Pressable
            onPress={handleCall}
            className="flex-1 h-12 rounded-2xl bg-emerald-100 flex-row items-center justify-center gap-1.5"
          >
            <Phone size={16} color="#16a34a" />
            <Text className="text-emerald-700 font-bold text-sm">Call</Text>
          </Pressable>
          <Pressable
            onPress={handleWhatsApp}
            className="flex-1 h-12 rounded-2xl bg-green-100 flex-row items-center justify-center gap-1.5"
          >
            <MessageCircle size={16} color="#16a34a" />
            <Text className="text-emerald-700 font-bold text-sm">WhatsApp</Text>
          </Pressable>
          <Link href={`/staff/salary/new?staffId=${id}` as any} asChild>
            <Pressable
              className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5"
              style={{ backgroundColor: '#16a34a' }}
            >
              <CreditCard size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">Pay</Text>
            </Pressable>
          </Link>
        </View>

        {/* Quick Stats */}
        <View className="px-5 pt-4">
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 items-center">
                <Text className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Base</Text>
                <Text className="text-base font-extrabold text-emerald-700 mt-0.5">
                  {formatPKRFull(staff.baseSalary)}
                </Text>
              </View>
              <View className="w-px h-10 bg-neutral-200 dark:bg-neutral-800" />
              <View className="flex-1 items-center">
                <Text className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Paid</Text>
                <Text className="text-base font-extrabold text-blue-700 mt-0.5">
                  {formatPKRFull(totalSalaryPaid)}
                </Text>
              </View>
              <View className="w-px h-10 bg-neutral-200 dark:bg-neutral-800" />
              <View className="flex-1 items-center">
                <Text className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Attendance</Text>
                <Text className="text-base font-extrabold text-violet-700 mt-0.5">
                  {attendancePct.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingTop: 16 }}
          style={{ maxHeight: 60 }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTab(t.id);
                }}
                className="px-4 h-10 rounded-2xl flex-row items-center gap-1.5"
                style={{ backgroundColor: active ? '#7c3aed' : '#ffffff', borderWidth: 1, borderColor: active ? '#7c3aed' : '#e5e7eb' }}
              >
                <Icon size={14} color={active ? '#ffffff' : '#7c3aed'} />
                <Text className="text-sm font-bold" style={{ color: active ? '#ffffff' : '#374151' }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        <View className="px-5 pt-4">
          {tab === 'overview' && (
            <View className="gap-4">
              <Section title="Personal" icon={User}>
                <InfoRow label="Father's Name" value={staff.fatherName} />
                <InfoRow label="Gender" value={staff.gender} />
                <InfoRow label="Date of Birth" value={staff.dateOfBirth ? formatDate(staff.dateOfBirth) : null} />
                <InfoRow label="CNIC" value={staff.cnic} mono />
                <InfoRow label="Email" value={staff.email} />
                <InfoRow label="Phone" value={staff.phone} />
                <InfoRow label="Address" value={staff.address} />
                <InfoRow label="City" value={staff.city} />
              </Section>

              <Section title="Job Details" icon={Briefcase}>
                <InfoRow label="Designation" value={staff.designation} />
                <InfoRow label="Department" value={staff.department} />
                <InfoRow label="Join Date" value={formatDate(staff.joinDate)} />
                <InfoRow label="Hours/Day" value={`${staff.workingHoursPerDay} hours`} />
                <InfoRow label="Days/Month" value={`${staff.workingDaysPerMonth} days`} />
              </Section>

              {staff.bankName && (
                <Section title="Bank" icon={Building2}>
                  <InfoRow label="Bank" value={staff.bankName} />
                  <InfoRow label="Account #" value={staff.accountNumber} mono />
                  <InfoRow label="IBAN" value={staff.iban} mono />
                </Section>
              )}

              {staff.emergencyName && (
                <Section title="Emergency Contact" icon={AlertTriangle} color="#dc2626">
                  <InfoRow label="Name" value={staff.emergencyName} />
                  <InfoRow label="Relation" value={staff.emergencyRelation} />
                  <InfoRow label="Phone" value={staff.emergencyPhone} />
                </Section>
              )}

              {staff.status !== 'TERMINATED' && (
                <Pressable
                  onPress={() => {
                    Alert.alert('Terminate?', `Are you sure you want to terminate "${staff.fullName}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Terminate', style: 'destructive', onPress: () => removeMutation.mutate() },
                    ]);
                  }}
                  className="h-12 rounded-2xl bg-rose-50 border border-rose-200 flex-row items-center justify-center gap-1.5"
                >
                  <Trash2 size={16} color="#dc2626" />
                  <Text className="text-rose-700 font-bold text-sm">Terminate Staff</Text>
                </Pressable>
              )}
            </View>
          )}

          {tab === 'attendance' && (
            <View className="gap-2">
              {staff.attendances.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No attendance" subtitle="Attendance abhi track nahi hui" />
              ) : (
                staff.attendances.map((a) => (
                  <View
                    key={a.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 flex-row items-center gap-3"
                  >
                    <View
                      className="h-10 w-10 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor:
                          a.status === 'PRESENT' ? '#dcfce7' :
                          a.status === 'LATE' ? '#fef3c7' :
                          a.status === 'ABSENT' ? '#fee2e2' : '#f1f5f9',
                      }}
                    >
                      {a.status === 'PRESENT' || a.status === 'LATE' ? (
                        <CheckCircle2 size={18} color={a.status === 'LATE' ? '#f59e0b' : '#16a34a'} />
                      ) : a.status === 'ABSENT' ? (
                        <XCircle size={18} color="#dc2626" />
                      ) : (
                        <Coffee size={18} color="#64748b" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-neutral-900 dark:text-white">{formatDate(a.date)}</Text>
                      <View className="flex-row items-center gap-3 mt-0.5">
                        {a.checkIn && (
                          <Text className="text-[11px] text-neutral-500">In: {formatTime(a.checkIn)}</Text>
                        )}
                        {a.checkOut && (
                          <Text className="text-[11px] text-neutral-500">Out: {formatTime(a.checkOut)}</Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor:
                            a.status === 'PRESENT' ? '#dcfce7' :
                            a.status === 'LATE' ? '#fef3c7' :
                            a.status === 'ABSENT' ? '#fee2e2' : '#f1f5f9',
                          color:
                            a.status === 'PRESENT' ? '#16a34a' :
                            a.status === 'LATE' ? '#f59e0b' :
                            a.status === 'ABSENT' ? '#dc2626' : '#64748b',
                        }}
                      >
                        {a.status}
                      </Text>
                      <Text className="text-[10px] text-neutral-500 mt-1">
                        {a.workedHours.toFixed(1)} hrs
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'salary' && (
            <View className="gap-2">
              <Link href={`/staff/salary/new?staffId=${id}` as any} asChild>
                <Pressable
                  className="h-12 rounded-2xl flex-row items-center justify-center gap-1.5 mb-2"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <Wallet size={16} color="#ffffff" />
                  <Text className="text-white font-extrabold text-sm">Process New Salary</Text>
                </Pressable>
              </Link>

              {staff.salaryPayments.length === 0 ? (
                <EmptyState icon={Wallet} title="No payments yet" subtitle="Process kar ke yahan dikhega" />
              ) : (
                staff.salaryPayments.map((p) => (
                  <View
                    key={p.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View>
                        <Text className="font-bold text-neutral-900 dark:text-white font-mono text-sm">
                          {p.paymentNumber}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-0.5">
                          {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xl font-extrabold text-emerald-700">
                          {formatPKRFull(p.netAmount)}
                        </Text>
                        <Text
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md mt-1"
                          style={{
                            backgroundColor:
                              p.status === 'PAID' ? '#dcfce7' :
                              p.status === 'PARTIAL' ? '#fef3c7' : '#f1f5f9',
                            color:
                              p.status === 'PAID' ? '#16a34a' :
                              p.status === 'PARTIAL' ? '#f59e0b' : '#64748b',
                          }}
                        >
                          {p.status}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-3 flex-wrap text-xs">
                      {p.daysWorked > 0 && (
                        <Text className="text-[11px] text-neutral-600">{p.daysWorked} days</Text>
                      )}
                      {p.bonuses > 0 && (
                        <Text className="text-[11px] text-emerald-700">Bonus: {formatPKRFull(p.bonuses)}</Text>
                      )}
                      {p.advances > 0 && (
                        <Text className="text-[11px] text-rose-700">Adv: {formatPKRFull(p.advances)}</Text>
                      )}
                      {p.balanceAmount > 0 && (
                        <Text className="text-[11px] text-amber-700 font-bold">
                          Balance: {formatPKRFull(p.balanceAmount)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'leaves' && (
            <View className="gap-2">
              {staff.leaves.length === 0 ? (
                <EmptyState icon={Coffee} title="No leave records" subtitle="Leaves yahan dikhenge" />
              ) : (
                staff.leaves.map((l) => (
                  <View
                    key={l.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
                  >
                    <View className="flex-row items-start justify-between">
                      <View>
                        <View className="flex-row items-center gap-2">
                          <Text className="font-bold text-neutral-900 dark:text-white">{l.type}</Text>
                          <Text
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor:
                                l.status === 'APPROVED' ? '#dcfce7' :
                                l.status === 'PENDING' ? '#fef3c7' :
                                l.status === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                              color:
                                l.status === 'APPROVED' ? '#16a34a' :
                                l.status === 'PENDING' ? '#f59e0b' :
                                l.status === 'REJECTED' ? '#dc2626' : '#64748b',
                            }}
                          >
                            {l.status}
                          </Text>
                        </View>
                        <Text className="text-xs text-neutral-500 mt-1">
                          {formatDate(l.startDate)} → {formatDate(l.endDate)} ({l.days} days)
                        </Text>
                        {l.reason && <Text className="text-sm text-neutral-700 mt-2">{l.reason}</Text>}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon: Icon, color = '#7c3aed', children }: { title: string; icon: any; color?: string; children: any }) {
  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Icon size={16} color={color} />
        <Text className="font-extrabold text-neutral-900 dark:text-white">{title}</Text>
      </View>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-xs text-neutral-500 font-bold uppercase">{label}</Text>
      <Text className={`text-sm text-neutral-900 dark:text-white font-semibold flex-1 text-right ${mono ? 'font-mono' : ''}`} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-8 items-center">
      <Icon size={32} color="#9ca3af" />
      <Text className="mt-3 font-bold text-neutral-700 dark:text-neutral-300">{title}</Text>
      <Text className="text-xs text-neutral-500 mt-1">{subtitle}</Text>
    </View>
  );
}
