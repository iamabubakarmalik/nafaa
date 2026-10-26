import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download, Upload, RefreshCw, Package, CheckCircle2,
  AlertCircle, Search,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { apiClient } from '@core/api/client';
import { Alert, Badge, Button, EmptyState, Input, SkeletonCard } from '@/design-system/components';
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
      <Alert
        tone="info"
        icon={isCustomWebsite ? <Upload className="h-4 w-4 text-blue-600" /> : <Download className="h-4 w-4 text-blue-600" />}
        title={isCustomWebsite ? 'Website se Products Import Karo' : 'Channel se Products Pull Karo'}
      >
        {isCustomWebsite
          ? 'Apni website ka code Nafaa webhook ko products bheje — sab automatically POS mein aa jayenge (name, price, stock, images, sab).'
          : 'Foodpanda/Daraz ke saare products ek click mein Nafaa POS mein import karo. Mapping automatic ban jayegi.'}
      </Alert>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {!isCustomWebsite && (
          <Button
            variant="primary"
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
        <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
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
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
                >
                  <Package className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[0.6875rem] text-slate-500">
                      SKU: {p.sku} · Rs {Number(p.price).toFixed(0)} · Stock: {p.stock ?? 0}
                    </div>
                  </div>
                  <Upload className="h-3.5 w-3.5 shrink-0 text-brand-600" />
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
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mapped Products ({mappings?.length ?? 0})
          </div>
          <Button
            size="xs"
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
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="Koi mapped product nahi"
            description={isCustomWebsite ? 'Website se products bhejo ya Import button dabao' : 'Import All Products dabao'}
          />
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {mappings!.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  m.syncStatus === 'SUCCESS' ? 'bg-success-50' : 'bg-amber-50',
                )}>
                  {m.syncStatus === 'SUCCESS'
                    ? <CheckCircle2 className="h-4 w-4 text-success-600" />
                    : <AlertCircle className="h-4 w-4 text-amber-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-900">
                    {m.product?.name ?? 'Unknown Product'}
                  </div>
                  <div className="text-[0.6875rem] text-slate-500 font-mono">
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
