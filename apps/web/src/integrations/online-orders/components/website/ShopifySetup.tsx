import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, ChevronRight, CircleDashed, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Package,
  Send, ShieldCheck, Stethoscope, Unplug, Webhook, XCircle,
} from 'lucide-react';
import { Alert, Badge, Button, Segmented, confirmDialog, controlClass } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import {
  apiErrorMessage, onlineOrdersApi, type ShopifyCheckResult, type ShopifyCustomBody, type WebsiteOverview,
} from '../../api/online-orders.api';
import { CHANNELS_KEY } from '../../hooks/useSalesChannels';
import { SHOPIFY_SCOPES, SHOPIFY_WEBHOOK_EVENTS, type ResolvedAddress } from '../../lib/shopifyAddress';
import { CopyField } from './CopyField';

/* ═════════════════════════════════════════════════════════════
   Shopify setup pieces shared by the connect page and the channel
   Setup tab: address field, the two-path chooser, manual (own app)
   credentials, webhooks, the step-by-step check and common errors.
   ═════════════════════════════════════════════════════════════ */

export type ShopifyPath = 'auto' | 'manual';

/* ─── small building blocks ─── */

export function SetupStep({ n, title, done, children }: { n: number; title: ReactNode; done?: boolean; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold',
        done ? 'bg-success-100 text-success-700' : 'bg-brand-600 text-brand-fg')}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[0.875rem] font-semibold text-slate-900">{title}</div>
        {children && <div className="mt-1.5 space-y-2.5 text-[0.8125rem] leading-relaxed text-slate-600">{children}</div>}
      </div>
    </li>
  );
}

/** Click path in the Shopify admin: Settings → Apps → … */
function Path({ items }: { items: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
      {items.map((x, i) => (
        <span key={x} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
          <b className="font-semibold text-slate-800">{x}</b>
        </span>
      ))}
    </span>
  );
}

/* ─── 1. store address ─── */

/** Address input with the live "we will use" line underneath. */
export function ShopifyAddressField({ value, onChange, address, onEnter, autoFocus, label = 'Shopify store ka address' }: {
  value: string; onChange: (v: string) => void; address: ResolvedAddress; onEnter?: () => void; autoFocus?: boolean; label?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</label>
      <input
        autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoCapitalize="off"
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(); }}
        placeholder="kissanmall-pk.myshopify.com"
        className={cn(controlClass(address.state === 'error'), 'h-11 px-3 font-mono text-[0.875rem]')}
      />
      <div className="mt-1.5 min-h-[1.25rem] text-[0.78125rem]" aria-live="polite">
        {address.state === 'ok' && (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-success-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Hum ye istemal karenge: <b className="font-mono font-semibold">{address.shop}</b>
            {address.fromDomain && <span className="text-slate-500">({address.fromDomain} se mila)</span>}
          </span>
        )}
        {address.state === 'looking' && (
          <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {address.message}</span>
        )}
        {address.state === 'error' && (
          <span className="inline-flex items-start gap-1.5 text-rose-600"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {address.message}</span>
        )}
        {address.state === 'empty' && (
          <span className="text-slate-500">Kuch bhi paste karein — store ka naam, admin ka link, ya website ka address. Hum sahi kar lenge.</span>
        )}
      </div>
    </div>
  );
}

/** Where the myshopify address is shown in Shopify. */
export function FindAddressHelp() {
  return (
    <details className="group rounded-lg bg-slate-50 px-3 py-2 text-[0.78125rem] text-slate-600">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-slate-700">
        <ChevronRight className="h-3.5 w-3.5 transition group-open:rotate-90" /> Address kahan milega?
      </summary>
      <ul className="mt-2 space-y-1.5 pl-5">
        <li>Shopify admin → <Path items={['Settings', 'Domains']} /> — jo address <b>.myshopify.com</b> par khatam ho (jaise kissanmall-pk.myshopify.com).</li>
        <li>Ya browser ka address: <code className="rounded bg-white px-1">admin.shopify.com/store/<b>kissanmall-pk</b></code> — yahan <b>kissanmall-pk</b> hi naam hai.</li>
        <li>Apna domain (jaise kissanmall.pk) bhi chalega — hum us se asal address dhoond lete hain.</li>
      </ul>
    </details>
  );
}

/* ─── 2. path chooser ─── */

export function ShopifyPathCards({ value, onChange, autoNote }: { value: ShopifyPath; onChange: (p: ShopifyPath) => void; autoNote?: string | null }) {
  const cards: { key: ShopifyPath; icon: ReactNode; title: string; badge?: ReactNode; desc: string; points: string[] }[] = [
    {
      key: 'auto', icon: <BrandLogo name="shopify" size="md" />, title: 'Automatic (Nafaa app se)',
      badge: <Badge variant="success">Recommended</Badge>,
      desc: 'Popup me Shopify khulega, "Install" dabayein. Baaqi sab Nafaa khud karta hai.',
      points: ['Koi key ya token copy nahi', 'Orders, stock, products, tracking — sab'],
    },
    {
      key: 'manual', icon: <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><KeyRound className="h-4 w-4" /></span>,
      title: 'Manual (apni app / webhooks)',
      desc: 'Shopify me apni app bana kar us ka Admin API token yahan daalein.',
      points: ['Jab Nafaa app install na ho sake', 'Token ke saath products aur stock bhi'],
    },
  ];
  return (
    <div role="radiogroup" aria-label="Jorne ka tareeqa" className="grid gap-3 md:grid-cols-2">
      {cards.map((c) => {
        const on = value === c.key;
        return (
          <button key={c.key} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.key)}
            className={cn('relative rounded-xl border-2 p-4 text-left transition',
              on ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300')}>
            <div className="flex items-start gap-3">
              {c.icon}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9375rem] font-semibold text-slate-900">{c.title}</span>
                  {c.badge}
                </div>
                <p className="mt-1 text-[0.8125rem] text-slate-600">{c.desc}</p>
              </div>
              <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                on ? 'border-brand-600 bg-brand-600 text-brand-fg' : 'border-slate-300 bg-white')}>
                {on && <CheckCircle2 className="h-3.5 w-3.5" />}
              </span>
            </div>
            <ul className="mt-3 space-y-1 pl-11 text-[0.78125rem] text-slate-500">
              {c.points.map((p) => <li key={p} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> {p}</li>)}
            </ul>
            {c.key === 'auto' && autoNote && <p className="mt-2 pl-11 text-[0.75rem] font-medium text-amber-700">{autoNote}</p>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── 3. own app: guide + credentials ─── */

type CredKind = 'token' | 'client';

/** Step-by-step: make the app in Shopify and copy its credentials. */
export function ShopifyAppGuide({ kind, onKind, first }: { kind: CredKind; onKind: (k: CredKind) => void; first: number }) {
  const scopes = SHOPIFY_SCOPES.join(',');
  return (
    <>
      <SetupStep n={first} title="Shopify me apni app banayein">
        <Segmented<CredKind> value={kind} onChange={onKind} label="App ki qism" items={[
          { value: 'token', label: 'Admin API token (shpat_)' },
          { value: 'client', label: 'Client ID + secret (Dev Dashboard)' },
        ]} />
        {kind === 'token' ? (
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Shopify admin → <Path items={['Settings', 'Apps and sales channels', 'Develop apps']} />.</li>
            <li>Pehli dafa ho to <b>Allow custom app development</b> dabayein.</li>
            <li><b>Create an app</b> → naam <b>Nafaa POS</b> → <b>Create app</b>. (App pehle se bani ho to wahi kholein.)</li>
            <li><Path items={['Configuration', 'Admin API integration', 'Configure']} /> → neeche wale scopes tick karein → <b>Save</b>.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Shopify admin → <Path items={['Settings', 'Apps and sales channels', 'Develop apps']} /> → <b>Build apps in Dev Dashboard</b> (ya <a href="https://dev.shopify.com/dashboard/" target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">dev.shopify.com <ExternalLink className="inline h-3 w-3" /></a>).</li>
            <li><b>Create app</b> → naam <b>Nafaa POS</b>.</li>
            <li><b>Versions</b> me <b>Access scopes</b> par neeche wali line paste karein → <b>Release</b>.</li>
            <li>App ke Home par <b>Install app</b> → apna store chunein → <b>Install</b>.</li>
          </ol>
        )}
        <CopyField label="Scopes (sab tick / paste karein)" value={scopes}
          hint="read_products, write_products, read_inventory, write_inventory, read_locations, read_orders zaroori. Baaqi order status aur tracking ke liye." />
        {kind === 'token' && (
          <p className="text-[0.75rem] text-slate-500">
            "Create an app" nahi dikhta? Shopify ne 1 Jan 2026 se naye custom apps band kar diye hain — purani bani app chalti hai. Warna "Client ID + secret" wala tareeqa, ya Automatic.
          </p>
        )}
      </SetupStep>
      <SetupStep n={first + 1} title={kind === 'token' ? 'App install karein aur token copy karein' : 'Client ID aur secret copy karein'}>
        {kind === 'token' ? (
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><b>API credentials</b> tab → <b>Install app</b> → <b>Install</b>.</li>
            <li><b>Admin API access token</b> → <b>Reveal token once</b> → copy. Ye <b>sirf ek dafa</b> dikhta hai — kahin mehfooz rakhein.</li>
            <li>Isi safhe par <b>API secret key</b> bhi copy karein (webhooks ki hifazat ke liye, optional).</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Dev Dashboard me app → <b>Settings</b>.</li>
            <li><b>Client ID</b> aur <b>Client secret</b> copy karein. Nafaa har 24 ghante khud naya token le leta hai.</li>
            <li>Shart: store aur app ek hi Shopify organization me hon. Na hon to Shopify token nahi deta — phir Automatic istemal karein.</li>
          </ol>
        )}
      </SetupStep>
    </>
  );
}

function SecretInput({ value, onChange, placeholder, label, hint }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          autoComplete="off" spellCheck={false} className={cn(controlClass(), 'h-10 pl-3 pr-10 font-mono text-[0.8125rem]')} />
        <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Chhupao' : 'Dikhao'}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[0.75rem] text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * Credentials form + "Check karein aur jorein". With channelId null the API
 * verifies first and only then creates (or reuses) the channel.
 */
export function ShopifyCredentialsStep({ n, kind, channelId, shop, extra, onConnected }: {
  n: number; kind: CredKind; channelId: string | null; shop: string | null;
  extra?: Pick<ShopifyCustomBody, 'displayName' | 'shopId'>; onConnected: (channelId: string) => void;
}) {
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const connect = useMutation({
    mutationFn: () => onlineOrdersApi.shopifyCustom(channelId, {
      shop: shop ?? undefined, ...extra,
      ...(kind === 'token' ? { token: token.trim(), apiSecret: apiSecret.trim() || undefined } : { clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
    }),
    onSuccess: (r) => {
      setError(null);
      setToken(''); setApiSecret(''); setClientSecret('');
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      qc.invalidateQueries({ queryKey: ['sales-channel', r.channelId] });
      toast.success('Shopify jur gaya', { description: r.missingScopes.length ? `Kuch permissions kam hain: ${r.missingScopes.join(', ')}` : 'Products aur stock ab Nafaa se' });
      onConnected(r.channelId);
    },
    onError: (e) => setError(apiErrorMessage(e, 'Jor nahi sake')),
  });
  const ready = !!shop && (kind === 'token' ? token.trim().length > 10 : clientId.trim() && clientSecret.trim());
  return (
    <SetupStep n={n} title={kind === 'token' ? 'Token yahan daalein' : 'Client ID aur secret yahan daalein'}>
      <div className="grid gap-3 md:grid-cols-2">
        {kind === 'token' ? (
          <>
            <SecretInput label="Admin API access token" value={token} onChange={setToken} placeholder="shpat_…" />
            <SecretInput label="API secret key (optional)" value={apiSecret} onChange={setApiSecret} placeholder="shpss_…" hint="Is se har webhook ki pehchan pakki hoti hai." />
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Client ID</label>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="a1b2c3…" spellCheck={false} autoComplete="off"
                className={cn(controlClass(), 'h-10 px-3 font-mono text-[0.8125rem]')} />
            </div>
            <SecretInput label="Client secret" value={clientSecret} onChange={setClientSecret} placeholder="shpss_…" />
          </>
        )}
      </div>
      {error && (
        <Alert tone="danger" title="Nahi jura">{error}</Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={connect.isPending} disabled={!ready} onClick={() => { setError(null); connect.mutate(); }} leftIcon={<Stethoscope className="h-4 w-4" />}>
          Check karein aur jorein
        </Button>
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Encrypt karke rakha jata hai, dobara poora nahi dikhta</span>
      </div>
      {!shop && <p className="text-[0.75rem] text-amber-700">Pehle upar store ka sahi address daalein.</p>}
    </SetupStep>
  );
}

/* ─── 4. webhooks ─── */

/** Webhooks: one click through the Admin API, or by hand in Notifications. */
export function ShopifyWebhooksStep({ n, channelId, hook, canAuto, signingKey }: {
  n: number; channelId: string; hook: string; canAuto: boolean; signingKey: string | null;
}) {
  const qc = useQueryClient();
  const [byHand, setByHand] = useState(!canAuto);
  const [key, setKey] = useState(signingKey ?? '');
  const install = useMutation({
    mutationFn: () => onlineOrdersApi.shopifyCustomWebhooks(channelId),
    onSuccess: (r) => { toast.success(r.installed ? `${r.installed} webhooks lag gaye` : 'Webhooks pehle se lage hain'); qc.invalidateQueries({ queryKey: ['sales-channel', channelId] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const saveKey = useMutation({
    mutationFn: () => onlineOrdersApi.updateChannel(channelId, { shopifySecret: key.trim() || null }),
    onSuccess: (d) => { qc.setQueryData(['sales-channel', channelId], d); toast.success('Signing key save ho gayi'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <SetupStep n={n} title="Orders ke webhooks">
      {canAuto && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
          <Webhook className="h-5 w-5 text-brand-600" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900">Webhooks khud lagayein</div>
            <div className="text-[0.75rem] text-slate-500">Token se Nafaa khud lagata hai: order bana, badla, cancel, paid. Hath se pehle lagaye hon to dobara mat lagayein.</div>
          </div>
          <Button size="sm" loading={install.isPending} onClick={() => install.mutate()}>Webhooks khud lagayein</Button>
        </div>
      )}
      {canAuto && (
        <button type="button" onClick={() => setByHand((v) => !v)} className="inline-flex items-center gap-1 text-[0.78125rem] font-semibold text-slate-600 hover:text-slate-900">
          <ChevronRight className={cn('h-3.5 w-3.5 transition', byHand && 'rotate-90')} /> Ya hath se lagayein
        </button>
      )}
      {byHand && (
        <div className="space-y-2.5 rounded-lg border border-slate-200 p-3">
          <p>Shopify admin → <Path items={['Settings', 'Notifications', 'Webhooks']} /> (safhe ke neeche) → <b>Create webhook</b>. Har event ke liye ek dafa:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.78125rem]">
              <thead className="text-slate-500"><tr><th className="py-1 pr-3 font-medium">Event</th><th className="py-1 pr-3 font-medium">Topic</th><th className="py-1 font-medium">Kis liye</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {SHOPIFY_WEBHOOK_EVENTS.map((e) => (
                  <tr key={e.topic}><td className="py-1.5 pr-3 font-semibold text-slate-800">{e.event}</td><td className="py-1.5 pr-3 font-mono text-slate-600">{e.topic}</td><td className="py-1.5 text-slate-500">{e.why}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Format: <b>JSON</b> · Webhook API version: sab se naya (Latest) · URL:</p>
          <CopyField label="Webhook URL" value={hook} />
          <p>Webhooks ki list ke neeche likha hota hai <i>"Your webhooks will be signed with …"</i> — wo key yahan daalein:</p>
          <div className="flex flex-wrap gap-2">
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Signing key" spellCheck={false} autoComplete="off"
              className={cn(controlClass(), 'h-9 min-w-[220px] flex-1 px-3 font-mono text-[0.8125rem]')} />
            <Button size="sm" variant="secondary" loading={saveKey.isPending} onClick={() => saveKey.mutate()}>Save</Button>
          </div>
        </div>
      )}
    </SetupStep>
  );
}

/* ─── 5. check ─── */

/** "Check karein": every part of the connection with the exact fix. */
export function ShopifyCheckPanel({ channelId, compact }: { channelId: string; compact?: boolean }) {
  const qc = useQueryClient();
  const [result, setResult] = useState<ShopifyCheckResult | null>(null);
  const check = useMutation({
    mutationFn: () => onlineOrdersApi.shopifyCheck(channelId),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: ['sales-channel', channelId] }); },
    onError: (e) => { setResult({ ok: false, mode: null, checks: [{ key: 'error', ok: false, title: 'Check nahi hua', detail: apiErrorMessage(e) }] }); },
  });
  return (
    <div className={cn('rounded-lg border border-slate-200', compact ? 'p-3' : 'p-4')}>
      <div className="flex flex-wrap items-center gap-3">
        <Stethoscope className="h-5 w-5 text-slate-500" />
        <div className="min-w-0 flex-1">
          <div className="text-[0.875rem] font-semibold text-slate-900">Connection check</div>
          <div className="text-[0.75rem] text-slate-500">Address, token, permissions, location, webhooks aur orders — ek ek karke.</div>
        </div>
        <Button size="sm" variant={result?.ok ? 'secondary' : 'primary'} loading={check.isPending} onClick={() => check.mutate()}>Check karein</Button>
      </div>
      {result && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          {result.checks.map((c) => (
            <li key={c.key} className="flex gap-2.5 py-2">
              {c.ok && !c.warn ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                : c.warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
              <div className="min-w-0 flex-1 text-[0.8125rem]">
                <span className="font-semibold text-slate-900">{c.title}:</span> <span className="text-slate-600">{c.detail}</span>
                {c.fix && !c.ok && <div className="mt-0.5 text-[0.78125rem] text-slate-500">Hal: {c.fix}</div>}
                {c.fix && c.ok && c.warn && <div className="mt-0.5 text-[0.78125rem] text-slate-500">{c.fix}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── common errors ─── */

export function ShopifyErrorsHelp() {
  const items: { q: string; a: ReactNode }[] = [
    { q: 'Ghalat address / "store nahi mila"', a: <>Shopify admin → <Path items={['Settings', 'Domains']} /> me <b>.myshopify.com</b> wala address copy karein. Apna domain (kissanmall.pk) ya admin ka link bhi chalega — hum khud sahi kar lete hain.</> },
    { q: '"Permissions kam hain" (scope missing)', a: <>App → <b>Configuration</b> → <b>Admin API scopes</b> me jo naam likhe hain wo tick karein → <b>Save</b>. Phir app dobara install karein aur naya token lagayein (Dev Dashboard me naya version <b>Release</b> karke store par approve karein).</> },
    { q: 'Token qabool nahi hua (401)', a: <>Token aadha copy hua, ya app uninstall ho gayi / token band (revoke) hua. App → <b>API credentials</b> se naya token lein. "Reveal" dobara na ho to app uninstall karke phir install karein — naya token milega.</> },
    { q: 'Shopify par order hua, Nafaa me nahi aaya', a: <>"Webhooks khud lagayein" dabayein, ya Notifications → Webhooks me URL dobara copy karein (aakhir tak). Phir neeche <b>Check karein</b> aur channel ki <b>Activity</b> dekhein. "Signature" ki ghalti ho to signing key / API secret key dobara daalein.</> },
    { q: 'Stock Shopify par nahi badalta', a: <>Shopify → <Path items={['Settings', 'Locations']} /> me kam az kam ek location active ho. Product par <b>Track quantity</b> on ho. Product Nafaa se jura (Products tab) ya SKU dono taraf ek jaisa ho.</> },
    { q: '"Create an app" ka button nahi', a: <>Shopify ne 1 Jan 2026 se naye custom apps band kar diye. Purani app ho to us ka token chalega; warna <b>Client ID + secret (Dev Dashboard)</b> ya <b>Automatic</b> istemal karein.</> },
  ];
  return (
    <div>
      <div className="mb-1 text-[0.875rem] font-semibold text-slate-900">Aam masle aur hal</div>
      <ul className="divide-y divide-slate-100">
        {items.map((x) => (
          <li key={x.q}>
            <details className="group py-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.8125rem] font-medium text-slate-800">
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" /> {x.q}
              </summary>
              <div className="mt-1 pl-6 text-[0.8125rem] leading-relaxed text-slate-600">{x.a}</div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── after a manual connect ─── */

/** Next steps once the merchant's own app is connected: webhooks, test order, products, check. */
export function ShopifyManualConnected({ channelId, overview, first = 1 }: { channelId: string; overview?: WebsiteOverview; first?: number }) {
  const { data } = useQuery({ queryKey: ['sales-channel', channelId], queryFn: () => onlineOrdersApi.channel(channelId), enabled: !overview, initialData: overview });
  const i = data?.integration;
  const s = i?.shopify;
  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(channelId),
    onSuccess: () => toast.success('Test order aa gaya', { description: 'Accept karein → bill aur stock kam. Cancel → stock wapas.' }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  if (!i || !data) return <div className="flex items-center gap-2 text-[0.8125rem] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Load ho raha hai…</div>;
  return (
    <ol className="space-y-5">
      <SetupStep n={first} done title={<>Shopify jur gaya <span className="font-normal text-slate-500">— {s?.shop}</span></>}>
        <p>Products, stock aur qeemat ab Nafaa se. {s?.locationName ? <>Stock location: <b>{s.locationName}</b>.</> : null}</p>
      </SetupStep>
      <ShopifyWebhooksStep n={first + 1} channelId={channelId} hook={data.urls.hook ?? ''} canAuto={!!s?.connected} signingKey={i.config.shopifySecret} />
      <SetupStep n={first + 2} title="Products jorein">
        <p>Shopify ke har product / variant ko Nafaa product se jorein — order aate hi sahi item aur stock.</p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/online-store/channels/${channelId}?tab=products`}><Button size="sm" leftIcon={<Package className="h-4 w-4" />}>Products jorein</Button></Link>
          <Link to="/online-store/products"><Button size="sm" variant="secondary">Online products</Button></Link>
        </div>
      </SetupStep>
      <SetupStep n={first + 3} title="Test order se check karein">
        <p>Shopify par apne aap ko ek order karein (Cash on Delivery) — yahan ghanti bajegi. Ya Nafaa ka test order:</p>
        <Button size="sm" variant="secondary" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<Send className="h-4 w-4" />}>Nafaa test order</Button>
      </SetupStep>
    </ol>
  );
}

/** Connected with the merchant's own app: status line with change / remove. */
export function ShopifyManualStatus({ channelId, overview, onChange }: { channelId: string; overview: WebsiteOverview; onChange: (d: WebsiteOverview) => void }) {
  const s = overview.integration?.shopify;
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => onlineOrdersApi.shopifyCustomRemove(channelId),
    onSuccess: async () => { toast.success('Token hata diya'); onChange(await onlineOrdersApi.channel(channelId)); qc.invalidateQueries({ queryKey: CHANNELS_KEY }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success-200 bg-success-50 p-3">
      <BrandLogo name="shopify" size="md" />
      <div className="min-w-0 flex-1">
        <div className="text-[0.875rem] font-semibold text-slate-900">Apni app se jura hai ✓</div>
        <div className="truncate text-[0.75rem] text-slate-600">
          {s?.shop} · {s?.mode === 'client' ? `Client ID ${s.clientId ?? ''}` : 'Admin API token'}{s?.locationName ? ` · stock: ${s.locationName}` : ''}
        </div>
      </div>
      <Button size="sm" variant="ghost" loading={remove.isPending} leftIcon={<Unplug className="h-4 w-4" />}
        onClick={async () => { if (await confirmDialog({ title: 'Token hatayein?', text: 'Products, stock aur status ruk jayenge. Orders aur bills mehfooz rahenge.', danger: true })) remove.mutate(); }}>
        Token hatayein
      </Button>
    </div>
  );
}

/** Webhook-only channel (no token yet): what it can and cannot do. */
export function NoTokenNotice() {
  return (
    <Alert tone="warning" title="Products dekhne ke liye Admin API token lagayein" icon={<CircleDashed className="h-4 w-4" />}>
      Abhi sirf webhook se orders aa sakte hain. Shopify ke products jorne, stock aur qeemat bhejne ke liye neeche wale steps se token lagayein.
    </Alert>
  );
}
