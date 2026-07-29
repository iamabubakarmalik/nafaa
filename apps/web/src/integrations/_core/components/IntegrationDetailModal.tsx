import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw, Trash2, CheckCircle2, AlertCircle, ExternalLink, Clock, Sparkles,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { getIntegrationMeta } from '../registry/catalog';
import { CodeBlock, CopyField } from './CodeBlock';
import { ProductMappingsPanel } from './ProductMappingsPanel';
import { ProductSyncPanel } from './ProductSyncPanel';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { Modal } from '@core/ui/Modal';
import { Badge } from '@core/ui/Badge';
import { SkeletonCard } from '@core/ui/Skeleton';
import { cn } from '@core/lib/cn';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000/api';

type TabKey = 'settings' | 'credentials' | 'connect' | 'products' | 'mappings' | 'logs';

export function IntegrationDetailModal({
  integrationId,
  onClose,
}: {
  integrationId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('settings');
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const { data: integration, isLoading } = useQuery({
    queryKey: ['integration-detail', integrationId],
    queryFn: () => integrationsApi.get(integrationId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['integration-detail', integrationId] });
    queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
  };

  const syncMutation = useMutation({
    mutationFn: () => integrationsApi.sync(integration!),
    onSuccess: (r: any) => {
      toast.success('Sync complete', {
        description: r?.total ? `${r.success ?? 0} / ${r.total} records imported` : undefined,
      });
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Sync failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => integrationsApi.update(integrationId, data),
    onSuccess: () => {
      toast.success('Save ho gaya');
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => integrationsApi.remove(integrationId),
    onSuccess: () => {
      toast.success('Integration remove ho gaya');
      invalidate();
      onClose();
    },
  });

  const testMutation = useMutation({
    mutationFn: () => integrationsApi.testConnection(integrationId),
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message, { duration: 5000 });
      } else {
        toast.error(r.message, {
          duration: 8000,
          description: r.fixSteps ? r.fixSteps.join(' • ') : r.error,
        });
      }
      invalidate();
    },
  });

  const demoMutation = useMutation({
    mutationFn: () => integrationsApi.createDemoOrder(integrationId),
    onSuccess: (r) => {
      toast.success(r.message, {
        duration: 6000,
        description: 'Channel Orders tab kholo aur "Convert to Sale" click karo.',
      });
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Demo order fail'),
  });

  const darazAuthMutation = useMutation({
    mutationFn: () =>
      integrationsApi.getDarazAuthUrl(integrationId, integration?.credentials ?? {}),
    onSuccess: (r) => {
      if (r?.authUrl) window.open(r.authUrl, '_blank', 'noopener');
      else toast.error('Auth URL nahi mila');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });

  if (isLoading || !integration) {
    return (
      <Modal open onClose={onClose} title="Loading..." size="lg">
        <SkeletonCard />
      </Modal>
    );
  }

  const meta = getIntegrationMeta(integration.type);
  const isSalesChannel = integration.category === 'SALES_CHANNEL';
  const canManualSync = integration.type === 'FOODPANDA' || integration.type === 'DARAZ';
  const isCustomWebsite = integration.type === 'CUSTOM_WEBSITE';

  const webhookUrl = integration.webhookUrl ?? '';
  const productsApiUrl = integration.apiKey
    ? API_BASE + '/integrations/webhooks/custom-website/' + integration.apiKey + '/products'
    : '';
  const verifyUrl = integration.apiKey
    ? API_BASE + '/integrations/webhooks/custom-website/' + integration.apiKey + '/verify'
    : '';

  // ── Code snippets: template strings (JSX braces ka koi masla nahi) ──
  const orderSnippet = [
    '// Customer ne aap ki website pe order kiya -> ye call karein',
    'await fetch("' + (webhookUrl || '<WEBHOOK_URL>') + '", {',
    '  method: "POST",',
    '  headers: { "Content-Type": "application/json" },',
    '  body: JSON.stringify({',
    '    orderId: "ORD-1001",',
    '    orderNumber: "#1001",',
    '    customer: {',
    '      name: "Ahmad Ali",',
    '      phone: "03001234567",',
    '      email: "ahmad@example.com",',
    '      address: "House 5, Street 10, Model Town",',
    '      city: "Lahore"',
    '    },',
    '    items: [',
    '      { name: "Persian Carpet 9x12", sku: "CAR-001", quantity: 1, price: 15000 }',
    '    ],',
    '    subtotal: 15000,',
    '    deliveryFee: 200,',
    '    discount: 0,',
    '    total: 15200,',
    '    paymentMethod: "COD",',
    '    paymentStatus: "PENDING",',
    '    status: "PENDING",',
    '    notes: "Shaam 5 baje ke baad deliver karein"',
    '  })',
    '});',
  ].join('\n');

  const productsSnippet = [
    '// Apni website pe Nafaa ke products dikhane ke liye',
    'const res = await fetch("' + (productsApiUrl || '<PRODUCTS_API_URL>') + '?limit=50");',
    'const { products, total } = await res.json();',
    '',
    'products.forEach(p => {',
    '  console.log(p.name, p.price, p.images[0], p.inStock);',
    '});',
  ].join('\n');

  const statusSnippet = [
    '// Apni website pe order status badla -> Nafaa ko batayein',
    'await fetch("' + (webhookUrl || '<WEBHOOK_URL>') + '/order-status", {',
    '  method: "POST",',
    '  headers: { "Content-Type": "application/json" },',
    '  body: JSON.stringify({',
    '    orderId: "ORD-1001",',
    '    status: "DELIVERED",',
    '    paymentStatus: "PAID"',
    '  })',
    '});',
  ].join('\n');

  const tabs: Array<[TabKey, string]> = [
    ['settings', 'Settings'],
    ['credentials', 'Credentials'],
    ['connect', isCustomWebsite ? 'API & Code' : 'Webhook'],
    ['products', 'Products'],
    ['mappings', 'Product Mappings'],
    ['logs', 'Sync Logs'],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={integration.displayName}
      size="lg"
      footer={
        <>
          {canManualSync && (
            <Button
              variant="outline"
              loading={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Sync Now
            </Button>
          )}
          <Button
            variant="danger"
            loading={removeMutation.isPending}
            onClick={() => {
              const ok = window.confirm(
                integration.displayName + ' delete karna hai? Ye wapas nahi hoga.',
              );
              if (ok) removeMutation.mutate();
            }}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
        </>
      }
    >
      {/* Header strip */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-900">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: (meta.color ?? '#64748b') + '22' }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-slate-900 dark:text-white truncate">
            {integration.displayName}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {integration.type.replace(/_/g, ' ')} · {integration.category.replace(/_/g, ' ')}
          </div>
        </div>
        <Badge variant={integration.status === 'CONNECTED' ? 'success' : 'warning'} size="sm">
          {integration.status === 'CONNECTED' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {integration.status}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl mb-4 overflow-x-auto">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap',
              tab === key
                ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={nameDraft ?? integration.displayName}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              if (nameDraft && nameDraft !== integration.displayName) {
                updateMutation.mutate({ displayName: nameDraft });
              }
            }}
          />

          <div className="grid grid-cols-3 gap-2">
            <MetricBox label="Orders" value={integration.totalOrdersSynced} />
            <MetricBox label="Products" value={integration.totalProductsSynced} />
            <MetricBox
              label="Errors"
              value={integration.totalErrors}
              danger={integration.totalErrors > 0}
            />
          </div>

          {/* Test + Demo buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              loading={testMutation.isPending}
              onClick={() => testMutation.mutate()}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Test Connection
            </Button>
            <Button
              variant="outline"
              loading={demoMutation.isPending}
              onClick={() => demoMutation.mutate()}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Send Demo Order
            </Button>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
            <div className="font-black mb-1">💡 Kaise Test Karein?</div>
            <div className="space-y-1 text-[11px]">
              <div>1. <strong>Test Connection</strong> → check credentials real hain ya nahi</div>
              <div>2. <strong>Send Demo Order</strong> → fake order banao</div>
              <div>3. Modal band karo → <strong>Channel Orders</strong> tab kholo</div>
              <div>4. Demo order dekho → <strong>Convert to Sale</strong> click karo</div>
              <div>5. POS ke <strong>Sales</strong> section mein sale check karo</div>
            </div>
          </div>

          {integration.lastSyncAt && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 flex items-center gap-2 text-xs flex-wrap">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400 font-bold">Last sync:</span>
              <span className="text-slate-900 dark:text-white font-black">
                {new Date(integration.lastSyncAt).toLocaleString('en-PK')}
              </span>
              {integration.lastSyncStatus && (
                <Badge
                  variant={integration.lastSyncStatus === 'SUCCESS' ? 'success' : 'danger'}
                  size="xs"
                >
                  {integration.lastSyncStatus}
                </Badge>
              )}
            </div>
          )}

          {integration.type === 'DARAZ' && (
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <div className="font-black text-sm text-orange-900 dark:text-orange-300 mb-1">
                Daraz Authorization
              </div>
              <p className="text-[11px] text-orange-700 dark:text-orange-400 mb-3">
                Orders sync karne ke liye ek baar Daraz account authorize karna hoga.
              </p>
              <Button
                size="sm"
                variant="outline"
                loading={darazAuthMutation.isPending}
                onClick={() => darazAuthMutation.mutate()}
                leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Authorize Daraz Account
              </Button>
            </div>
          )}

          {meta.portalUrl && (
            <a
              href={meta.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 hover:underline"
            >
              Partner portal kholein
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* CREDENTIALS */}
      {tab === 'credentials' && (
        <div className="space-y-3">
          {Object.keys(integration.credentials ?? {}).length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 font-bold">
              Is integration ke liye koi credentials required nahi
            </div>
          ) : (
            Object.entries(integration.credentials ?? {}).map(([key, value]) => (
              <CopyField
                key={key}
                label={key}
                value={typeof value === 'string' ? value : JSON.stringify(value)}
                secret={/secret|token|password|key/i.test(key)}
              />
            ))
          )}
        </div>
      )}

      {/* CONNECT / WEBHOOK */}
      {tab === 'connect' && (
        <div className="space-y-4">
          {integration.apiKey && (
            <CopyField label="API Key" value={integration.apiKey} secret />
          )}
          {webhookUrl && (
            <CopyField label="Webhook URL (orders yahan bhejein)" value={webhookUrl} />
          )}

          {isCustomWebsite && (
            <>
              <CodeBlock label="1. Order bhejne ka code" code={orderSnippet} />
              <CopyField label="Products API (GET)" value={productsApiUrl} />
              <CodeBlock label="2. Products fetch karne ka code" code={productsSnippet} />
              <CodeBlock label="3. Order status update" code={statusSnippet} />
              <CopyField label="Connection test URL (GET)" value={verifyUrl} />
            </>
          )}

          {integration.type === 'FOODPANDA' && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-400">
              <div className="font-black mb-1">Foodpanda webhook setup:</div>
              Ye URL Foodpanda partner portal ke Webhooks section mein paste karein. Har naya order
              automatically Nafaa POS mein aa jayega.
            </div>
          )}

          {isSalesChannel && (
            <div className="flex items-center gap-2">
              <Badge variant={integration.webhookVerified ? 'success' : 'warning'} size="sm">
                {integration.webhookVerified ? 'Verified' : 'Waiting for first webhook'}
              </Badge>
            </div>
          )}
        </div>
      )}

      {tab === 'products' && <ProductSyncPanel integrationId={integrationId} integrationType={integration.type} />}

      {tab === 'mappings' && <ProductMappingsPanel integrationId={integrationId} />}

      {/* LOGS */}
      {tab === 'logs' && (
        <div className="space-y-2 max-h-[52vh] overflow-y-auto">
          {(integration.syncLogs ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <div className="font-bold">Koi sync log nahi</div>
            </div>
          ) : (
            (integration.syncLogs ?? []).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/60 flex items-center gap-3"
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-600'
                      : log.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-amber-100 text-amber-600',
                  )}
                >
                  {log.status === 'SUCCESS' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : log.status === 'FAILED' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {log.operation} · {log.direction}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {log.recordsProcessed} processed · {log.recordsSuccess} ok ·{' '}
                    {log.recordsFailed} failed
                    {log.errorMessage ? ' · ' + log.errorMessage : ''}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold shrink-0 text-right">
                  {new Date(log.startedAt).toLocaleString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

function MetricBox({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 text-center">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          'text-xl font-black mt-0.5',
          danger ? 'text-rose-600' : 'text-slate-900 dark:text-white',
        )}
      >
        {value}
      </div>
    </div>
  );
}
