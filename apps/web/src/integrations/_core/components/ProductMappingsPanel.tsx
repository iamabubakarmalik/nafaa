import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Link2, AlertCircle } from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { apiClient } from '@core/api/client';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { SkeletonCard } from '@core/ui/Skeleton';
import { cn } from '@core/lib/cn';

export function ProductMappingsPanel({ integrationId }: { integrationId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [externalSku, setExternalSku] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['product-mappings', integrationId],
    queryFn: () => integrationsApi.listProductMappings(integrationId),
  });

  const { data: products } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: () =>
      apiClient
        .get('/products', { params: { search: productSearch, limit: 10 } })
        .then((r) => r.data?.data?.items ?? r.data?.items ?? []),
    enabled: productSearch.length >= 2,
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      integrationsApi.upsertProductMapping(integrationId, {
        productId: selectedProduct.id,
        externalSku: externalSku || selectedProduct.sku,
      }),
    onSuccess: () => {
      toast.success('Mapping save ho gaya');
      queryClient.invalidateQueries({ queryKey: ['product-mappings', integrationId] });
      setShowAdd(false);
      setSelectedProduct(null);
      setExternalSku('');
      setProductSearch('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mid: string) => integrationsApi.deleteProductMapping(integrationId, mid),
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['product-mappings', integrationId] });
    },
  });

  if (isLoading) return <SkeletonCard />;

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <div className="font-black mb-1">Product Mapping kya hai?</div>
            Website pe "Chicken Karahi" → Nafaa mein "Chicken Handi" hai? Yahan map karo.
            Order aane pe smart matching hogi.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-black text-slate-600 dark:text-slate-400">
          {mappings?.length ?? 0} MAPPINGS
        </div>
        <Button
          size="sm"
          variant={showAdd ? 'outline' : 'gradient'}
          onClick={() => setShowAdd(!showAdd)}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          {showAdd ? 'Cancel' : 'Add Mapping'}
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
          <Input
            label="External SKU (website ka SKU)"
            placeholder="e.g. WEB-001"
            value={externalSku}
            onChange={(e) => setExternalSku(e.target.value)}
          />
          <Input
            label="Nafaa Product Search"
            placeholder="Product name likho..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {products && products.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {products.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={cn(
                    'w-full p-2 rounded-lg text-left text-xs transition',
                    selectedProduct?.id === p.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white dark:bg-neutral-800 hover:bg-slate-100',
                  )}
                >
                  <div className="font-bold">{p.name}</div>
                  <div className="text-[10px] opacity-70">
                    SKU: {p.sku} · Rs {Number(p.price).toFixed(0)}
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedProduct && (
            <Button
              fullWidth
              variant="gradient"
              loading={upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
              leftIcon={<Link2 className="h-4 w-4" />}
            >
              Map: {externalSku || selectedProduct.sku} → {selectedProduct.name}
            </Button>
          )}
        </div>
      )}

      {(mappings ?? []).length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <div className="font-bold">Koi mapping nahi</div>
          <div className="text-[11px] mt-1">Auto-match SKU ya name se hoga</div>
        </div>
      ) : (
        <div className="space-y-2">
          {mappings!.map((m: any) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <Link2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 items-center">
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">External SKU</div>
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate font-mono">
                    {m.externalSku ?? m.externalProductId ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">Nafaa Product</div>
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {m.product?.name ?? m.productId}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Delete mapping?')) deleteMutation.mutate(m.id);
                }}
                className="h-8 w-8 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 flex items-center justify-center shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
