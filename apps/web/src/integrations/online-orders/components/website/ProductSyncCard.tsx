import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, Loader2, RefreshCw, Upload } from 'lucide-react';
import { Alert, Button, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, onlineOrdersApi, type ImportResult } from '../../api/online-orders.api';
import { csvToProducts, downloadText, shopifyCsv, wooCsv, type CsvFormat, type ParsedProduct } from '../../lib/csv';
import { rs } from '../../lib/labels';
import { t, Trans } from '@core/i18n';

const FORMAT_LABEL: Record<CsvFormat, string> = {
  woocommerce: t('WooCommerce CSV'),
  shopify: t('Shopify CSV'),
  simple: t('Simple CSV'),
};

/**
 * Dono taraf products:
 *  POS → Website: WooCommerce/Shopify ki CSV (unke apne Import me seedha)
 *  Website → POS: unki export CSV yahan daalo — naye products ban jate hain, stock branch me
 */
export function ProductSyncCard({ channelId, productLinks, platform, wooConnected, shopifyConnected }: {
  channelId: string; productLinks: number; platform: string | null; wooConnected?: boolean; shopifyConnected?: boolean;
}) {
  const qc = useQueryClient();
  // The channel page does not pass the live connection; read it from the shared channel query.
  const { data: overview } = useQuery({
    queryKey: ['sales-channel', channelId], queryFn: () => onlineOrdersApi.channel(channelId),
    enabled: !!channelId && (wooConnected === undefined || shopifyConnected === undefined), staleTime: 30_000,
  });
  const isShopify = overview?.integration?.type === 'SHOPIFY';
  const shopifyLive = shopifyConnected ?? !!overview?.integration?.shopify?.connected;
  const wooLive = wooConnected ?? !!overview?.integration?.woo?.connected;
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ format: CsvFormat; products: ParsedProduct[]; file: string } | null>(null);
  const [updatePrice, setUpdatePrice] = useState(false);
  const [updateStock, setUpdateStock] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const exportMut = useMutation({
    mutationFn: async (kind: 'woo' | 'shopify') => ({ kind, products: await onlineOrdersApi.exportProducts(channelId) }),
    onSuccess: ({ kind, products }) => {
      if (!products.length) return toast.error(t('Koi active product nahi mila'));
      const date = new Date().toISOString().slice(0, 10);
      if (kind === 'woo') downloadText(`nafaa-products-woocommerce-${date}.csv`, wooCsv(products));
      else downloadText(`nafaa-products-shopify-${date}.csv`, shopifyCsv(products));
      toast.success(t('{{count}} products ki CSV download ho gayi', { count: products.length }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const importMut = useMutation({
    mutationFn: () => onlineOrdersApi.importProducts(channelId, { products: parsed!.products, updatePrice, updateStock }),
    onSuccess: (r) => {
      setResult(r);
      setParsed(null);
      qc.invalidateQueries({ queryKey: ['sales-channel', channelId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('{{imported}} naye, {{updated}} update{{value}}', { imported: r.imported, updated: r.updated, value: r.failed ? t(', {{failed}} fail', { failed: r.failed }) : '' }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const onFile = async (f?: File) => {
    if (!f) return;
    setResult(null);
    const text = await f.text();
    const res = csvToProducts(text);
    if (!res.products.length) {
      toast.error(t('Is file me koi product nahi mila. Pehli line me column ke naam hone chahiye (name, sku, price, stock).'));
      return;
    }
    setParsed({ ...res, file: f.name });
  };

  return (
    <div className="space-y-4">
      {wooLive && <WooDirect channelId={channelId} kind="woocommerce" />}
      {shopifyLive && <WooDirect channelId={channelId} kind="shopify" />}
      {isShopify && !shopifyLive && (
        <Alert tone="warning" title={t('Shopify ke products dekhne ke liye Admin API token lagayein')}
          action={<Link to={`/online-store/channels/${channelId}?tab=developer`}><Button size="sm" variant="secondary">{t('Setup kholein')}</Button></Link>}>
          {t('Setup → Manual me apni app ka token daalein (ya Automatic se Nafaa app install karein). Phir products yahan aur Online products me jorein.')}
        </Alert>
      )}
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ─── POS → Website ─── */}
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5 text-emerald-600" />
          <div className="text-sm font-black text-slate-900 dark:text-ink-white">{t('POS ke products → Website')}</div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {t('Sab products, qeemat, tasveerein aur asli stock ki file. Website ke "Import products" me daal dein.')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={exportMut.isPending && exportMut.variables === 'woo'} onClick={() => exportMut.mutate('woo')} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
            {t('WooCommerce CSV')}
          </Button>
          <Button size="sm" variant="outline" loading={exportMut.isPending && exportMut.variables === 'shopify'} onClick={() => exportMut.mutate('shopify')} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
            {t('Shopify CSV')}
          </Button>
        </div>
        <ul className="mt-3 space-y-1 text-[0.6875rem] text-slate-500">
          <li>{t('• WooCommerce: Products → Import → file chunein → Run')}</li>
          <li>{t('• Shopify: Products → Import → file chunein')}</li>
          {platform === 'woocommerce' && <li>• <Trans text={'Plugin laga hai to WP me {{menu}} ek click me'} values={{ menu: <b>{t('Nafaa POS → "Products Nafaa se lao"')}</b> }} /></li>}
          <li>• <Trans text="Custom website: API {{call}} (developer guide me)" values={{ call: <code>GET /products</code> }} /></li>
        </ul>
      </div>

      {/* ─── Website → POS ─── */}
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5 text-sky-600" />
          <div className="text-sm font-black text-slate-900 dark:text-ink-white">{t('Website ke products → POS')}</div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {t('Website se export ki hui CSV (WooCommerce, Shopify ya apni) yahan daalein. Naye products ban jayenge, jo pehle hain unse jud jayenge.')}
        </p>

        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

        {!parsed ? (
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
            className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 p-5 text-center hover:border-sky-400 hover:bg-sky-50/50 dark:border-ink-700 dark:hover:bg-sky-500/5"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm font-bold text-slate-700 dark:text-ink-200">{t('CSV file chunein ya yahan chhorein')}</span>
            <span className="text-[0.6875rem] text-slate-500">{t('WooCommerce / Shopify / Excel se "Save as CSV"')}</span>
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-ink-900">
            <div className="text-sm font-black text-slate-900 dark:text-ink-white">
              {t('{{count}} products mile', { count: parsed.products.length })}{' '} <span className="font-semibold text-slate-500">· {FORMAT_LABEL[parsed.format]} · {parsed.file}</span>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-white text-xs dark:bg-ink-950">
              {parsed.products.slice(0, 6).map((p, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-slate-100 px-2 py-1 last:border-0 dark:border-ink-800">
                  <span className="truncate">{p.name}{p.sku ? ` · ${p.sku}` : ''}</span>
                  <span className="shrink-0 font-bold">{p.price !== undefined ? rs(p.price) : '—'}{p.stock !== undefined ? ` · ${p.stock}` : ''}</span>
                </div>
              ))}
              {parsed.products.length > 6 && <div className="px-2 py-1 text-slate-500">{t('…aur {{value}}', { value: parsed.products.length - 6 })}</div>}
            </div>
            <Switch size="sm" checked={updatePrice} onChange={(e) => setUpdatePrice(e.target.checked)} label={t('Pehle wale products ki qeemat bhi badlo')} />
            <Switch size="sm" checked={updateStock} onChange={(e) => setUpdateStock(e.target.checked)} label={t('Pehle wale products ka stock bhi file wala kar do')} description={t('Naye products ka stock hamesha file se aata hai')} />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" loading={importMut.isPending} onClick={() => importMut.mutate()} leftIcon={<ArrowDownToLine className="h-4 w-4" />}>
                {t('{{count}} products import karein', { count: parsed.products.length })}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setParsed(null)}>{t('Chhoro')}</Button>
            </div>
            {importMut.isPending && (
              <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {' '}{t('Ho raha hai — bari file me thora waqt lagta hai')}</div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-500/10">
            <div className="font-black text-emerald-900 dark:text-emerald-200">
              {t('✅ {{imported}} naye · {{updated}} update · {{failed}} fail', { imported: result.imported, updated: result.updated, failed: result.failed })}
            </div>
            <div className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
              {t('Cost price file me nahi tha to 0 rakha hai — Products me ja kar daal dein taake profit sahi aaye.')}
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-rose-700 dark:text-rose-300">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>• {e.name}: {e.error}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 lg:col-span-2">
        {t('🔗 {{productLinks}} products website se jude hue hain — order me yahi products khud match hote hain.', { productLinks })}
      </div>
    </div>
    </div>
  );
}

/** WooCommerce / Shopify ek click se jura ho — CSV ki zaroorat hi nahi */
function WooDirect({ channelId, kind }: { channelId: string; kind: 'woocommerce' | 'shopify' }) {
  const shopify = kind === 'shopify';
  const label = shopify ? 'Shopify' : 'Woo';
  const qc = useQueryClient();
  const [updatePrice, setUpdatePrice] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['sales-channel', channelId] });

  const pull = useMutation({
    mutationFn: () => (shopify ? onlineOrdersApi.shopifyImport(channelId, { updatePrice }) : onlineOrdersApi.wooImport(channelId, { updatePrice })),
    onSuccess: (r) => { refresh(); qc.invalidateQueries({ queryKey: ['products'] }); toast.success(t('{{value}} se: {{imported}} naye, {{updated}} jore{{value2}}', { value: shopify ? 'Shopify' : 'WooCommerce', imported: r.imported, updated: r.updated, value2: r.failed ? t(', {{failed}} fail', { failed: r.failed }) : '' })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const push = useMutation({
    mutationFn: () => (shopify ? onlineOrdersApi.shopifyExport(channelId, { updatePrice }) : onlineOrdersApi.wooExport(channelId, { updatePrice })),
    onSuccess: (r) => { refresh(); toast.success(t('{{value}} par: {{created}} naye, {{updated}} update{{value2}}', { value: shopify ? 'Shopify' : 'WooCommerce', created: r.created, updated: r.updated, value2: r.failed ? t(', {{failed}} fail', { failed: r.failed }) : '' })); if (r.errors?.[0]) toast.error(r.errors[0]); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const stock = useMutation({
    mutationFn: () => (shopify ? onlineOrdersApi.shopifySyncStock(channelId) : onlineOrdersApi.wooSyncStock(channelId)),
    onSuccess: (r) => { refresh(); toast.success(t('Stock sync: {{updated}} update{{value}}', { updated: r.updated, value: r.missing ? t(' · {{missing}} SKU Nafaa me nahi', { missing: r.missing }) : '' })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className={cn('rounded-2xl border-2 p-4', shopify
      ? 'border-lime-200 dark:border-lime-500/30 bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-lime-500/10 dark:to-emerald-500/5'
      : 'border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-500/10 dark:to-fuchsia-500/5')}>
      <div className="flex items-center gap-2">
        <BrandLogo name={shopify ? 'shopify' : 'woocommerce'} size="sm" />
        <div className="text-sm font-black text-slate-900 dark:text-ink-white">{t('{{value}} se seedha — ek click', { value: shopify ? 'Shopify' : 'WooCommerce' })}</div>
      </div>
      <p className="mt-1 text-[0.75rem] font-bold text-slate-600 dark:text-ink-300">
        {t('Products SKU se jurte hain. Stock har 15 minute khud jata hai — abhi chahiye to "Stock sync" dabayein.')}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Button variant="outline" loading={pull.isPending} onClick={() => pull.mutate()} leftIcon={<ArrowDownToLine className="h-4 w-4" />}>
          {t('Products {{label}} se lao', { label })}
        </Button>
        <Button variant="outline" loading={push.isPending} onClick={() => push.mutate()} leftIcon={<ArrowUpFromLine className="h-4 w-4" />}>
          {t('Products {{label}} par bhejo', { label })}
        </Button>
        <Button variant="primary" loading={stock.isPending} onClick={() => stock.mutate()} leftIcon={<RefreshCw className="h-4 w-4" />}>
          {t('Stock sync abhi')}
        </Button>
      </div>
      <div className="mt-3">
        <Switch size="sm" checked={updatePrice} onChange={(e) => setUpdatePrice(e.target.checked)} label={t('Jo products dono taraf hain un ki qeemat bhi badlo')} />
      </div>
    </div>
  );
}
