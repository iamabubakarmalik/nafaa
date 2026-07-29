import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download, Upload, RefreshCw, Package, CheckCircle2,
  AlertCircle, Search, ChevronRight, Sparkles,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { apiClient } from '@core/api/client';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { Badge } from '@core/ui/Badge';
import { SkeletonCard } from '@core/ui/Skeleton';
import { CodeBlock } from './CodeBlock';
import { cn } from '@core/lib/cn';

export function ProductSyncPanel({ integrationId, integrationType }: { integrationId: string; integrationType: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showPush, setShowPush] = useState(false);

  const isCustomWebsite = integrationType === 'CUSTOM_WEBSITE';

  // Existing mappings
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['product-mappings', integrationId],
    queryFn: () => integrationsApi.listProductMappings(integrationId),
  });

  // Product search (for push)
  const { data: products } = useQuery({
    queryKey: ['push-product-search', search],
    queryFn: () =>
      apiClient
        .get('/products', { params: { search, limit: 10 } })
        .then((r) => r.data?.data?.items ?? r.data?.items ?? []),
    enabled: search.length >= 2,
  });

  // Import all products from channel
  const importMutation = useMutation({
    mutationFn: () => integrationsApi.syncProducts(integrationId),
    onSuccess: (r) => {
      toast.success(r.message, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['product-mappings', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Import failed'),
  });

  // Push single product
  const pushMutation = useMutation({
    mutationFn: (productId: string) => integrationsApi.pushProduct(integrationId, productId),
    onSuccess: (r) => {
      toast.success(r.message);
      queryClient.invalidateQueries({ queryKey: ['product-mappings', integrationId] });
      setShowPush(false);
      setSearch('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Push failed'),
  });

  // Code snippet for custom website product push
  const pushSnippet = [
    '// Apni website ke products Nafaa mein import karein',
    'await fetch("YOUR_WEBHOOK_URL/products-batch", {',
    '  method: "POST",',
    '  headers: { "Content-Type": "application/json" },',
    '  body: JSON.stringify({',
    '    products: [',
    '      {',
    '        name: "Persian Carpet 9x12",',
    '        sku: "CAR-001",',
    '        price: 15000,',
    '        cost: 10000,',
    '        stock: 5,',
    '        description: "Handmade Persian carpet",',
    '        images: ["https://example.com/carpet.jpg"],',
    '        category: "Carpets"',
    '      },',
    '      {',
    '        name: "Runner Carpet 3x10",',
    '        sku: "CAR-002",',
    '        price: 8000,',
    '        stock: 3',
    '      }',
    '    ]',
    '  })',
    '});',
  ].join('\n');

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className={cn(
        'p-4 rounded-2xl border',
        isCustomWebsite
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800'
          : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800',
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
            isCustomWebsite ? 'bg-emerald-500' : 'bg-blue-500',
          )}>
            {isCustomWebsite ? <Upload className="h-5 w-5 text-white" /> : <Download className="h-5 w-5 text-white" />}
          </div>
          <div className="flex-1">
            <div className="font-black text-sm text-slate-900 dark:text-white">
              {isCustomWebsite ? 'Website se Products Import Karo' : 'Channel se Products Pull Karo'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {isCustomWebsite
                ? 'Apni website ka code Nafaa webhook ko products bheje — sab automatically POS mein aa jayenge (name, price, stock, images, sab).'
                : 'Foodpanda/Daraz ke saare products ek click mein Nafaa POS mein import karo. Mapping automatic ban jayegi.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {!isCustomWebsite && (
          <Button
            variant="gradient"
            loading={importMutation.isPending}
            onClick={() => importMutation.mutate()}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Import All Products
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setShowPush(!showPush)}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          Push Product to Channel
        </Button>
        {isCustomWebsite && <div />}
      </div>

      {/* Custom website code example */}
      {isCustomWebsite && (
        <CodeBlock label="Website se products bhejne ka code" code={pushSnippet} />
      )}

      {/* Push product search */}
      {showPush && (
        <div className="p-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
          <Input
            label="Nafaa Product Search"
            placeholder="Product name likho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          {products && products.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {products.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => pushMutation.mutate(p.id)}
                  disabled={pushMutation.isPending}
                  className="w-full p-2.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-left text-xs transition flex items-center gap-2"
                >
                  <Package className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      SKU: {p.sku} · Rs {Number(p.price).toFixed(0)} · Stock: {p.stock ?? 0}
                    </div>
                  </div>
                  <Upload className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
          {search.length >= 2 && products?.length === 0 && (
            <div className="text-center text-xs text-slate-500 py-2">Koi product nahi mila</div>
          )}
        </div>
      )}

      {/* Mappings list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Mapped Products ({mappings?.length ?? 0})
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['product-mappings', integrationId] })}
            leftIcon={<RefreshCw className="h-3 w-3" />}
          >
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <SkeletonCard />
        ) : (mappings ?? []).length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-slate-50 dark:bg-neutral-800/50">
            <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <div className="font-bold text-sm text-slate-500">Koi mapped product nahi</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isCustomWebsite ? 'Website se products bhejo ya Import button dabao' : 'Import All Products dabao'}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {mappings!.map((m: any) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center gap-3"
              >
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  m.syncStatus === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40',
                )}>
                  {m.syncStatus === 'SUCCESS'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <AlertCircle className="h-4 w-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {m.product?.name ?? 'Unknown Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ext: {m.externalSku ?? m.externalProductId ?? '—'}
                  </div>
                </div>
                <Badge variant={m.syncStatus === 'SUCCESS' ? 'success' : 'warning'} size="xs">
                  {m.syncStatus}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
