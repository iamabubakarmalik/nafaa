import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Users, Plus, Phone, BookOpen, Award, X, Save,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { customersApi } from '@/api/customers.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

export default function CustomersScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCredit, setFilterCredit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      customersApi.list({
        search: search || undefined,
        limit: 100,
      }),
  });

  // Client-side filter for "with credit"
  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    return filterCredit ? items.filter((c) => c.balance > 0) : items;
  }, [data, filterCredit]);

  const createMutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: '✅ Customer added!' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setName(''); setPhone(''); setEmail(''); setAddress('');
      setShowForm(false);
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Could not create',
      });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalKhata = (data?.items ?? []).reduce(
    (s, c) => s + (c.balance > 0 ? c.balance : 0),
    0,
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Customers
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {data?.meta?.total ?? 0} total • {formatPKRFull(totalKhata)} udhaar
          </Text>
        </View>
        <Pressable
          onPress={() => setShowForm(true)}
          className="h-11 w-11 rounded-2xl bg-brand-600 items-center justify-center active:opacity-80"
        >
          <Plus size={22} color="#ffffff" />
        </Pressable>
      </View>

      <View className="px-5 pb-3">
        <Card variant="outline" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-2xl bg-amber-200 dark:bg-amber-900/50 items-center justify-center">
              <BookOpen size={22} color="#b45309" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wide">
                Total Udhaar (Khata)
              </Text>
              <Text className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-0.5">
                {formatPKRFull(totalKhata)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View className="px-5 pb-3 gap-2">
        <Input
          placeholder="Search by name, phone..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={20} color="#9ca3af" />}
        />
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setFilterCredit(false)}
            className={`flex-1 py-2 rounded-xl ${
              !filterCredit ? 'bg-brand-600' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text className={`text-center text-sm font-semibold ${
              !filterCredit ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
            }`}>All</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterCredit(true)}
            className={`flex-1 py-2 rounded-xl ${
              filterCredit ? 'bg-amber-600' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text className={`text-center text-sm font-semibold ${
              filterCredit ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
            }`}>With Khata</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Users size={48} color="#d1d5db" />
            <Text className="mt-4 text-base font-semibold text-neutral-700 dark:text-neutral-300">
              {filterCredit ? 'No customers with udhaar' : 'No customers yet'}
            </Text>
            {!filterCredit && (
              <Button size="md" className="mt-6" onPress={() => setShowForm(true)}>
                <Plus size={18} color="#fff" />
                <Text className="text-white font-semibold">Add Customer</Text>
              </Button>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => (
          <Card variant="outline" className="p-3">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-950/40 items-center justify-center">
                <Text className="text-violet-700 dark:text-violet-300 font-bold text-base">
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                  {item.name}
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  {item.phone && (
                    <View className="flex-row items-center gap-1">
                      <Phone size={11} color="#9ca3af" />
                      <Text className="text-xs text-neutral-500">{item.phone}</Text>
                    </View>
                  )}
                  {item.loyaltyPoints > 0 && (
                    <View className="flex-row items-center gap-0.5">
                      <Award size={11} color="#f59e0b" />
                      <Text className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                        {item.loyaltyPoints}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="items-end">
                {item.balance > 0 ? (
                  <Badge variant="warning" size="sm">{formatPKRFull(item.balance)}</Badge>
                ) : (
                  <Text className="text-xs text-neutral-500">
                    {formatPKRFull(item.totalSpent)}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">New Customer</Text>
              <Pressable
                onPress={() => setShowForm(false)}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-4">
                <Input label="Customer Name *" placeholder="Ahmad Ali"
                  value={name} onChangeText={setName} />
                <Input label="Phone Number" placeholder="+923001234567"
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Input label="Email (optional)" placeholder="ahmad@example.com"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <Input label="Address (optional)" placeholder="House #, Street, City"
                  value={address} onChangeText={setAddress} />
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Button
                size="lg"
                loading={createMutation.isPending}
                onPress={() => {
                  if (!name.trim()) {
                    Toast.show({ type: 'error', text1: 'Customer name required' });
                    return;
                  }
                  createMutation.mutate();
                }}
              >
                <Save size={18} color="#ffffff" />
                <Text className="text-white font-bold text-base">Save Customer</Text>
              </Button>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
