import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Lock, Package, Send, Stethoscope, XCircle } from 'lucide-react';
import { Alert, Button, Card, controlClass } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, onlineOrdersApi, type ShopifyCheckItem } from '../../api/online-orders.api';
import { useChannelConnect } from '../../hooks/useWooConnect';
import { useShopifyAddress } from '../../lib/shopifyAddress';
import { HttpsNotice } from './ManualKeysForm';
import {
  FindAddressHelp, SetupStep, ShopifyAddressField, ShopifyAppGuide, ShopifyCheckPanel, ShopifyCredentialsStep,
  ShopifyErrorsHelp, ShopifyManualConnected, ShopifyPathCards, type ShopifyPath,
} from './ShopifySetup';

/**
 * Connect page, Shopify: one chooser with two paths. Automatic keeps the
 * Nafaa app install exactly as before (same start call and popup); Manual
 * connects the merchant's own app and creates the channel only after
 * Shopify accepts the credentials.
 */
export function ShopifyConnectFlow({ path, onPath, shopList, initialShop }: {
  path: ShopifyPath; onPath: (p: ShopifyPath) => void; shopList: { id: string; name: string }[]; initialShop?: string;
}) {
  const [store, setStore] = useState(initialShop ?? '');
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');
  const [kind, setKind] = useState<'token' | 'client'>('token');
  const [manualChannel, setManualChannel] = useState<string | null>(null);
  const address = useShopifyAddress(store);
  const conn = useChannelConnect('shopify');

  const details = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Naam (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="jaise Kissan Mall" className={cn(controlClass(), 'h-10 px-3 text-[0.875rem]')} />
        <p className="mt-1 text-[0.75rem] text-slate-500">Sidebar me yahi dikhega</p>
      </div>
      <div>
        <label className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Stock kis branch se</label>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={cn(controlClass(), 'h-10 px-3 text-[0.875rem]')}>
          <option value="">Main branch</option>
          {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <p className="mt-1 text-[0.75rem] text-slate-500">Isi branch ka stock Shopify par jayega</p>
      </div>
    </div>
  );

  const addressStep = (
    <SetupStep n={1} title="Store ka address aur naam" done={path === 'manual' && !!manualChannel}>
      <ShopifyAddressField autoFocus value={store} onChange={setStore} address={address}
        onEnter={() => { if (path === 'auto' && address.shop && conn.oneClickReady) conn.start({ siteUrl: address.shop, displayName: name.trim() || undefined, shopId: shopId || undefined }); }} />
      <FindAddressHelp />
      {details}
    </SetupStep>
  );

  return (
    <>
      <Card title={<StepTitle n={2}>Kaise jorna hai?</StepTitle>}>
        <ShopifyPathCards value={path} onChange={(p) => { onPath(p); conn.reset(); }}
          autoNote={!conn.shopifyOAuth ? 'Server par Nafaa app ki keys nahi lagi — abhi Manual istemal karein.' : null} />
      </Card>

      {path === 'auto' ? (
        <Card title={<StepTitle n={3}><span className="inline-flex items-center gap-2"><BrandLogo name="shopify" size="sm" /> Automatic — Nafaa app se</span></StepTitle>}>
          {conn.phase === 'connected' && conn.channelId ? (
            <Connected channelId={conn.channelId} />
          ) : conn.phase === 'waiting' ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <div className="min-w-0 flex-1">
                <div className="text-[0.875rem] font-semibold text-slate-900">Shopify window me "Install" dabayein</div>
                <div className="text-[0.78125rem] text-slate-500">Login nahi hain to pehle Shopify login maangega. Window khud band hogi.</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => conn.reopen()} leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>Window dobara</Button>
              <Button size="sm" variant="ghost" onClick={() => conn.reopen(true)}>Isi tab me</Button>
            </div>
          ) : conn.phase === 'denied' ? (
            <Alert tone="danger" title="Install nahi hua" action={<Button size="sm" variant="secondary" onClick={() => conn.reset()}>Dobara koshish</Button>}>
              Shopify window me "Install" nahi dabaya gaya, ya window band ho gayi.
            </Alert>
          ) : (
            <ol className="space-y-5">
              {addressStep}
              <SetupStep n={2} title={'Check karein, phir "Shopify se jorein"'}>
                <p>Chhoti window me Shopify khulega → login → <b>Install</b>. Token, webhooks, location aur stock sync Nafaa khud lagata hai.</p>
                <AutoCheck shop={address.shop} addressError={address.state === 'error' ? address.message ?? null : null} conn={conn} />
                {conn.error && <p className="text-[0.78125rem] font-medium text-rose-600">{conn.error}</p>}
                {conn.phase === 'manual' && <HttpsNotice reason={conn.hint?.reason} fix={conn.hint?.fix} />}
                {!conn.oneClickReady && conn.phase !== 'manual' && (
                  <Alert tone="warning" title="Automatic abhi is server par nahi chal sakta">
                    {!conn.shopifyOAuth ? 'Server par Nafaa app (Shopify) ki keys nahi lagi.' : conn.publicApi?.reason} Abhi upar se <b>Manual</b> chunein.
                  </Alert>
                )}
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  <Button loading={conn.phase === 'starting'} disabled={!address.shop || !conn.oneClickReady}
                    onClick={() => conn.start({ siteUrl: address.shop!, displayName: name.trim() || undefined, shopId: shopId || undefined })}
                    leftIcon={<BrandLogo name="shopify" size={18} />}>
                    Shopify se jorein
                  </Button>
                  <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> Password Nafaa tak nahi aata</span>
                </div>
              </SetupStep>
            </ol>
          )}
        </Card>
      ) : (
        <Card title={<StepTitle n={3}>Manual — apni app ka token</StepTitle>}
          description="Shopify me apni app banayein, us ka Admin API token yahan daalein. Token ke saath products, stock aur qeemat — sab chalta hai.">
          {manualChannel ? (
            <div className="space-y-4">
              <ShopifyManualConnected channelId={manualChannel} />
              <ShopifyCheckPanel channelId={manualChannel} />
              <Link to={`/online-store/channels/${manualChannel}`}><Button variant="secondary">Channel kholo</Button></Link>
            </div>
          ) : (
            <div className="space-y-6">
              <ol className="space-y-5">
                {addressStep}
                <ShopifyAppGuide kind={kind} onKind={setKind} first={2} />
                <ShopifyCredentialsStep n={4} kind={kind} channelId={null} shop={address.shop}
                  extra={{ displayName: name.trim() || undefined, shopId: shopId || undefined }} onConnected={setManualChannel} />
                <SetupStep n={5} title="Webhooks aur test order">
                  <p>Jurte hi yahan agla step khulega: <b>Webhooks khud lagayein</b> (ek click) ya hath se, phir test order.</p>
                </SetupStep>
              </ol>
              <div className="border-t border-slate-100 pt-4"><ShopifyErrorsHelp /></div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.6875rem] font-bold text-white dark:bg-ink-white dark:text-ink-900">{n}</span>
      {children}
    </span>
  );
}

/** Automatic path pre-check: address, Nafaa app keys on the server, https API, already connected. */
function AutoCheck({ shop, addressError, conn }: { shop: string | null; addressError: string | null; conn: ReturnType<typeof useChannelConnect> }) {
  const [items, setItems] = useState<ShopifyCheckItem[] | null>(null);
  const run = useMutation({
    mutationFn: async () => {
      const out: ShopifyCheckItem[] = [];
      if (!shop) {
        out.push({ key: 'address', ok: false, title: 'Store ka address', detail: addressError ?? 'Address daalein', fix: 'Shopify admin → Settings → Domains me ".myshopify.com" wala address.' });
      } else {
        const r = await onlineOrdersApi.shopifyResolve(shop);
        out.push(r.ok
          ? { key: 'address', ok: true, title: 'Store ka address', detail: `${r.shop} — Shopify par mil gaya` }
          : { key: 'address', ok: false, title: 'Store ka address', detail: r.error ?? 'Store nahi mila' });
        const hit = await onlineOrdersApi.shopifyLookup(shop).catch(() => null);
        if (hit?.connected) out.push({ key: 'dup', ok: true, warn: true, title: 'Pehle se jura', detail: 'Ye store is account me pehle se jura hai — dobara jorne se wahi channel taaza hoga.' });
      }
      out.push(conn.shopifyOAuth
        ? { key: 'app', ok: true, title: 'Nafaa app', detail: 'Server par tayyar' }
        : { key: 'app', ok: false, title: 'Nafaa app', detail: 'Server par Shopify app ki keys nahi lagi', fix: 'Abhi Manual istemal karein.' });
      if (conn.publicApi && !conn.publicApi.reachable) out.push({ key: 'https', ok: false, title: 'Nafaa server', detail: conn.publicApi.reason ?? 'Bahar se nahi dikhta', fix: conn.publicApi.fix ?? undefined });
      return out;
    },
    onSuccess: setItems,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Stethoscope className="h-5 w-5 text-slate-500" />
        <span className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">Jorne se pehle check: address sahi hai, store maujood hai, Nafaa app tayyar hai.</span>
        <Button size="sm" variant="secondary" loading={run.isPending} onClick={() => run.mutate()}>Check karein</Button>
      </div>
      {items && (
        <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
          {items.map((c) => (
            <li key={c.key} className="flex gap-2 text-[0.8125rem]">
              {c.ok && !c.warn ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                : c.warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
              <span><b className="font-semibold text-slate-900">{c.title}:</b> <span className="text-slate-600">{c.detail}</span>{c.fix && !c.ok && <span className="block text-slate-500">Hal: {c.fix}</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Connected({ channelId }: { channelId: string }) {
  const navigate = useNavigate();
  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(channelId),
    onSuccess: (r) => navigate(`/online-orders?order=${r.channelOrderId}`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="rounded-lg border border-success-200 bg-success-50 p-5 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success-600" />
      <div className="mt-2 text-[1rem] font-semibold text-slate-900">Shopify jur gaya</div>
      <p className="mt-1 text-[0.8125rem] text-slate-600">Webhooks lag gaye aur stock sync shuru. Ab products jorein — har variant ke saath.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate(`/online-store/channels/${channelId}?tab=products`)} leftIcon={<Package className="h-4 w-4" />}>Products jorein</Button>
        <Button variant="secondary" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<Send className="h-4 w-4" />}>Test order</Button>
        <Button variant="ghost" onClick={() => navigate(`/online-store/channels/${channelId}`)}>Channel kholo</Button>
      </div>
    </div>
  );
}
