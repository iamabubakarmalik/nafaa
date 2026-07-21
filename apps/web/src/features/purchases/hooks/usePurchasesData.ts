import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { purchasesApi } from '@/api/purchases.api';
import { suppliersApi } from '@/api/suppliers.api';
import { productsApi } from '@/api/products.api';

export function usePurchasesData() {
  const queryClient = useQueryClient();

  const purchases = useQuery({
    queryKey: ['purchases-list'],
    queryFn: purchasesApi.list,
  });

  const summary = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: purchasesApi.summary,
  });

  const suppliersData = useQuery({
    queryKey: ['suppliers-for-purchase'],
    queryFn: () => suppliersApi.list({ page: 1, limit: 200 }),
  });

  const productsData = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: (data: any) => {
      const rollCount = Object.values(data.createdRollsByItem || {}).flat().length;
      toast.success('Purchase saved successfully!', {
        description: rollCount > 0
          ? `Stock updated + ${rollCount} carpet rolls created`
          : 'Stock automatically update ho gaya',
      });
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-purchase'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Purchase fail'),
  });

  return {
    purchases: purchases.data ?? [],
    summary: summary.data,
    suppliers: suppliersData.data?.items ?? [],
    products: productsData.data?.items ?? [],
    isLoading: purchases.isLoading || summary.isLoading,
    isRefetching: purchases.isRefetching,
    refetch: () => {
      purchases.refetch();
      summary.refetch();
    },
    createMutation,
  };
}
