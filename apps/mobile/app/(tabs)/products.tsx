import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Package, Plus, AlertTriangle, X, Save,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { productsApi } from '@/api/products.api';
import { formatPKRFull } from '@/lib/format';
import Toast from 'react-native-toast-message';

export default function ProductsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('5');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list({ search: search || undefined, limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      productsApi.create({
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        unit: unit.trim() || 'pcs',
        price: Number(price),
        costPrice: Number(costPrice) || 0,
        stock: Number(stock) || 0,
        lowStockAlert: Number(lowStockAlert) || 5,
      }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: '✅ Product added!' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      resetForm();
      setShowForm(false);
    },
    onError: (e: any) => {
      console.error('Create product error:', e?.response?.data || e?.message);
      Toast.show({
        type: 'error',
        text1: 'Failed to create',
        text2: e?.response?.data?.message || e?.message || 'Try again',
      });
    },
  });

  const resetForm = () => {
    setName(''); setSku(''); setBarcode('');
    setUnit('pcs'); setPrice(''); setCostPrice('');
    setStock(''); setLowStockAlert('5');
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Product name required' });
      return;
    }
    if (!price || Number(price) <= 0) {
      Toast.show({ type: 'error', text1: 'Valid price required' });
      return;
    }
    createMutation.mutate();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items = data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Products
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {data?.meta?.total ?? items.length} total products
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
        <Input
          placeholder="Search by name, SKU, barcode..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={20} color="#9ca3af" />}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-20">
              <Package size={48} color="#d1d5db" />
              <Text className="mt-4 text-base font-semibold text-neutral-700 dark:text-neutral-300">
                No products yet
              </Text>
              <Text className="mt-1 text-sm text-neutral-500 text-center px-10">
                Add your first product to start selling
              </Text>
              <Button size="md" className="mt-6" onPress={() => setShowForm(true)}>
                <Plus size={18} color="#fff" />
                <Text className="text-white font-semibold">Add Product</Text>
              </Button>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        renderItem={({ item }) => {
          const isLowStock = item.stock > 0 && item.stock <= item.lowStockAlert;
          const isOutOfStock = item.stock === 0;
          return (
            <Card variant="outline" className="p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-14 w-14 rounded-2xl bg-brand-100 dark:bg-brand-950/40 items-center justify-center">
                  <Package size={22} color="#16a34a" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    {item.sku && (
                      <Text className="text-xs text-neutral-500 font-mono">{item.sku}</Text>
                    )}
                    {item.category && (
                      <Badge variant="brand" size="sm">{item.category.name}</Badge>
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-neutral-900 dark:text-white">
                    {formatPKRFull(item.price)}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    {isOutOfStock ? (
                      <Badge variant="danger" size="sm">Out of Stock</Badge>
                    ) : isLowStock ? (
                      <Badge variant="warning" size="sm">
                        <View className="flex-row items-center gap-0.5">
                          <AlertTriangle size={10} color="#b45309" />
                          <Text className="text-amber-700 text-xs font-bold">
                            {item.stock} {item.unit}
                          </Text>
                        </View>
                      </Badge>
                    ) : (
                      <Text className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                        {item.stock} {item.unit}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                New Product
              </Text>
              <Pressable
                onPress={() => { setShowForm(false); resetForm(); }}
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
                <Input
                  label="Product Name *"
                  placeholder="e.g. Basmati Rice 5kg"
                  value={name}
                  onChangeText={setName}
                />
                <Input
                  label="SKU (optional)"
                  placeholder="RICE-5KG-001"
                  value={sku}
                  onChangeText={setSku}
                  autoCapitalize="characters"
                />
                <Input
                  label="Barcode (optional)"
                  placeholder="1234567890123"
                  value={barcode}
                  onChangeText={setBarcode}
                  keyboardType="number-pad"
                />
                <Input
                  label="Unit"
                  placeholder="pcs, kg, liter, dozen..."
                  value={unit}
                  onChangeText={setUnit}
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Sell Price *"
                      placeholder="0"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Cost Price"
                      placeholder="0"
                      value={costPrice}
                      onChangeText={setCostPrice}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Initial Stock"
                      placeholder="0"
                      value={stock}
                      onChangeText={setStock}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Low Stock Alert"
                      placeholder="5"
                      value={lowStockAlert}
                      onChangeText={setLowStockAlert}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Button
                size="lg"
                loading={createMutation.isPending}
                onPress={handleSubmit}
              >
                <Save size={18} color="#ffffff" />
                <Text className="text-white font-bold text-base">Save Product</Text>
              </Button>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
