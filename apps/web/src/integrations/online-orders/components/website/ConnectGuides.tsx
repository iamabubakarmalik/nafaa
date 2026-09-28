import { useState } from 'react';
import { Download, ExternalLink, KeyRound, Loader2, MessageCircle, Sparkles, Wrench, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { CodeBlock } from '@integrations/_core/components/CodeBlock';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { useWooConnect } from '../../hooks/useWooConnect';
import { HttpsNotice, ManualKeysForm } from './ManualKeysForm';
import { developerGuide, snippets } from '../../lib/snippets';
import { CopyField } from './CopyField';
import { cn } from '@core/lib/cn';

export type Platform = 'woocommerce' | 'shopify' | 'custom';

export const PLATFORM_CARDS: { key: Platform; title: string; emoji: string; sub: string }[] = [
  { key: 'woocommerce', title: 'WordPress / WooCommerce', emoji: '🟣', sub: 'Plugin install karo, key paste karo' },
  { key: 'shopify', title: 'Shopify', emoji: '🟢', sub: 'Shopify admin me ek URL paste' },
  { key: 'custom', title: 'Apni banayi website', emoji: '💻', sub: 'Developer ke liye tayyar code' },
];

export function PlatformPicker({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {PLATFORM_CARDS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'rounded-2xl border-2 p-4 text-left transition',
            value === p.key
              ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:bg-emerald-500/10'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900',
          )}
        >
          <div className="text-2xl">{p.emoji}</div>
          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{p.title}</div>
          <div className="text-xs text-slate-500">{p.sub}</div>
        </button>
      ))}
    </div>
  );
}

export function ConnectGuide({ platform, overview, shopName, channelId, onChange }: {
  platform: Platform; overview: WebsiteOverview; shopName: string; channelId: string; onChange: (d: WebsiteOverview) => void;
}) {
  const i = overview.integration!;
  const u = overview.urls;
  if (platform === 'woocommerce') {
    return (
      <WooGuide
        apiKey={i.apiKey} secret={i.webhookSecret} hook={u.hook!} pluginZip={u.pluginZip}
        channelId={channelId} isWooChannel={i.type === 'WOOCOMMERCE'} woo={i.woo} siteUrl={i.config.siteUrl}
        name={i.displayName} onChange={onChange}
      />
    );
  }
  if (platform === 'shopify') return <ShopifyGuide hook={u.hook!} />;
  return <CustomGuide overview={overview} shopName={shopName} />;
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-3">{children}</ol>;
}
function StepItem({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">{n}</span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
        {children && <div className="mt-1.5 space-y-2 text-sm text-slate-600 dark:text-slate-300">{children}</div>}
      </div>
    </li>
  );
}

function WooGuide({ apiKey, secret, hook, pluginZip, channelId, isWooChannel, woo, siteUrl, name, onChange }: {
  apiKey: string; secret: string; hook: string; pluginZip: string;
  channelId: string; isWooChannel: boolean; woo: { connected: boolean; connectedAt: string | null } | null;
  siteUrl: string | null; name: string; onChange: (d: WebsiteOverview) => void;
}) {
  // "Apni website" wale purane channel par ek-click nahi (wo alag type hai) — plugin/webhook
  const [mode, setMode] = useState<'oneclick' | 'plugin' | 'webhook'>(isWooChannel ? 'oneclick' : 'plugin');
  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 dark:bg-neutral-900">
        {isWooChannel && (
          <button onClick={() => setMode('oneclick')} className={tab(mode === 'oneclick')}>
            <Zap className="h-3.5 w-3.5" /> Ek click (sab se aasaan)
          </button>
        )}
        <button onClick={() => setMode('plugin')} className={tab(mode === 'plugin')}>
          <Sparkles className="h-3.5 w-3.5" /> Nafaa plugin
        </button>
        <button onClick={() => setMode('webhook')} className={tab(mode === 'webhook')}>Bina plugin</button>
      </div>

      {mode === 'oneclick' ? (
        <WooOneClick channelId={channelId} woo={woo} siteUrl={siteUrl} name={name} onChange={onChange} />
      ) : mode === 'plugin' ? (
        <>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
            Plugin se: orders khud aate hain · Nafaa me status badlo to website par bhi badle · stock har 15 min sync · products 1 click me dono taraf.
          </div>
          <Steps>
            <StepItem n={1} title="Plugin download karein">
              <a href={pluginZip} download>
                <Button size="sm" leftIcon={<Download className="h-4 w-4" />}>nafaa-woocommerce.zip</Button>
              </a>
            </StepItem>
            <StepItem n={2} title="WordPress me upload karein">
              WP Admin → <b>Plugins</b> → <b>Add New</b> → <b>Upload Plugin</b> → zip chunein → <b>Install</b> → <b>Activate</b>
            </StepItem>
            <StepItem n={3} title="Key aur Secret paste karein">
              WP Admin → <b>WooCommerce</b> → <b>Nafaa POS</b> me ye dono daal kar <b>Save & Connect</b> dabayein:
              <CopyField label="Nafaa Key" value={apiKey} secret />
              <CopyField label="Secret" value={secret} secret />
            </StepItem>
            <StepItem n={4} title="Bas! Website par ek test order karein — yahan ghanti bajegi 🔔" />
          </Steps>
        </>
      ) : (
        <Steps>
          <StepItem n={1} title="WooCommerce → Settings → Advanced → Webhooks → Add webhook" />
          <StepItem n={2} title="Ye bharein:">
            <div className="grid gap-1 text-xs">
              <div><b>Name:</b> Nafaa POS</div>
              <div><b>Status:</b> Active</div>
              <div><b>Topic:</b> Order created</div>
              <div><b>API version:</b> WP REST API Integration v3</div>
            </div>
            <CopyField label="Delivery URL" value={hook} />
            <CopyField label="Secret" value={secret} secret />
          </StepItem>
          <StepItem n={3} title="Save webhook">
            Ek aur webhook isi tarah banayein <b>Topic: Order updated</b> ke saath — taake cancel aur payment ki khabar bhi aaye.
          </StepItem>
          <StepItem n={4} title="Website par test order karein — yahan ghanti bajegi 🔔">
            <span className="text-xs text-slate-500">Bina plugin sirf orders aate hain. Status/stock sync ke liye plugin lagayein.</span>
          </StepItem>
        </Steps>
      )}
    </div>
  );
}

/** WooCommerce "Approve" wala tareeqa — jura ho to sehat aur marammat ke buttons */
function WooOneClick({ channelId, woo, siteUrl, name, onChange }: {
  channelId: string; woo: { connected: boolean; connectedAt: string | null } | null; siteUrl: string | null; name: string;
  onChange: (d: WebsiteOverview) => void;
}) {
  const qc = useQueryClient();
  const [site, setSite] = useState(siteUrl ?? '');
  const [showKeys, setShowKeys] = useState(false);
  const connect = useWooConnect(() => {
    onlineOrdersApi.channel(channelId).then(onChange).catch(() => null);
  });
  const repair = useMutation({
    mutationFn: () => onlineOrdersApi.wooRepair(channelId),
    onSuccess: (r) => { toast.success(r.installed ? `${r.installed} webhook dobara lag gaye` : 'Webhooks theek hain ✅'); qc.invalidateQueries({ queryKey: ['sales-channel', channelId] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (woo?.connected && connect.phase !== 'waiting') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 p-4 flex flex-wrap items-center gap-4">
          <span className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 shadow flex items-center justify-center text-2xl shrink-0">🟣</span>
          <div className="min-w-0 flex-1">
            <div className="font-black text-slate-900 dark:text-white">WooCommerce se jura hai ✓</div>
            <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300 truncate">
              {siteUrl}{woo.connectedAt ? ` · ${new Date(woo.connectedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} se` : ''}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" loading={repair.isPending} onClick={() => repair.mutate()} leftIcon={<Wrench className="h-4 w-4" />}>Webhooks check</Button>
            <Button size="sm" variant="ghost" loading={connect.phase === 'starting'} onClick={() => connect.start({ siteUrl: siteUrl ?? '', channelId })}>Dobara approve</Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ['🔔', 'Orders khud aate hain', 'Order bana / badla / delete'],
            ['🔁', 'Status wapas website par', 'Processing → Completed'],
            ['📦', 'Stock har 15 minute', 'Accept/cancel par foran'],
          ].map(([e, t, d]) => (
            <div key={t} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="text-lg">{e}</div>
              <div className="mt-1 text-xs font-black text-slate-800 dark:text-slate-100">{t}</div>
              <div className="text-[11px] font-bold text-slate-500">{d}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (connect.phase === 'manual') {
    return (
      <div className="space-y-3">
        <HttpsNotice reason={connect.hint?.reason} fix={connect.hint?.fix} />
        <ManualKeysForm channelId={channelId} site={site} onDone={() => onlineOrdersApi.channel(channelId).then(onChange)} />
      </div>
    );
  }

  if (connect.phase === 'waiting') {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> WordPress window me "Approve" dabayein…
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => connect.reopen()} leftIcon={<ExternalLink className="h-4 w-4" />}>Window dobara kholo</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowKeys((v) => !v)} leftIcon={<KeyRound className="h-4 w-4" />}>Keys khud daalein</Button>
        </div>
        {showKeys && <ManualKeysForm channelId={channelId} site={site} onDone={() => onlineOrdersApi.channel(channelId).then(onChange)} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4">
        <div className="text-sm font-black text-slate-900 dark:text-white">Site ka address</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="ahmedstore.pk"
            className="h-11 min-w-[220px] flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <Button variant="success" loading={connect.phase === 'starting'} disabled={!site.trim()}
            onClick={() => connect.start({ siteUrl: site.trim(), channelId, displayName: name })}
            leftIcon={<span>🟣</span>}>
            {connect.oneClickReady ? 'WooCommerce se jorein' : 'Keys se jorein'}
          </Button>
        </div>
        {!connect.oneClickReady && <div className="mt-3"><HttpsNotice compact reason={connect.publicApi?.reason} fix={connect.publicApi?.fix} /></div>}
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          Chhoti window me aap ki WordPress site khulegi → login → <b>Approve</b>. Keys aur webhooks Nafaa khud lagata hai.
        </p>
        {connect.phase === 'denied' && <p className="mt-2 text-[12px] font-bold text-rose-600">Approve nahi hua — dobara koshish karein.</p>}
        {connect.error && <p className="mt-2 text-[12px] font-bold text-rose-600">{connect.error}</p>}
      </div>
      <button onClick={() => setShowKeys((v) => !v)} className="text-[12px] font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1">
        <KeyRound className="h-3.5 w-3.5" /> Popup nahi chalta? Keys khud daalein
      </button>
      {showKeys && <ManualKeysForm channelId={channelId} site={site} onDone={() => onlineOrdersApi.channel(channelId).then(onChange)} />}
    </div>
  );
}

function ShopifyGuide({ hook }: { hook: string }) {
  return (
    <Steps>
      <StepItem n={1} title="Shopify Admin → Settings → Notifications → Webhooks → Create webhook" />
      <StepItem n={2} title="Event: Order creation · Format: JSON · URL:">
        <CopyField label="Webhook URL" value={hook} />
      </StepItem>
      <StepItem n={3} title="Isi URL se 2 aur webhook banayein">
        <b>Order cancellation</b> aur <b>Order payment</b> — taake cancel aur paisa aane ki khabar bhi Nafaa me aaye.
      </StepItem>
      <StepItem n={4} title="Signing key Nafaa me daalein (safety ke liye)">
        Webhooks list ke neeche likha hota hai "Your webhooks will be signed with …" — wo key copy karke neeche <b>Settings → Shopify signing key</b> me paste karein.
      </StepItem>
      <StepItem n={5} title="Products: neeche se Shopify CSV download karke Shopify → Products → Import me daalein" />
    </Steps>
  );
}

function CustomGuide({ overview, shopName }: { overview: WebsiteOverview; shopName: string }) {
  const i = overview.integration!;
  const code = snippets(overview.urls.orders, i.apiKey, i.webhookSecret);
  const [lang, setLang] = useState<keyof typeof code>('php');
  const guide = developerGuide(overview.urls, i.apiKey, i.webhookSecret, shopName);

  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(guide)}`, '_blank');
  const copyGuide = () => navigator.clipboard?.writeText(guide).then(() => toast.success('Poori guide copy ho gayi'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 p-3 dark:bg-sky-500/10">
        <div className="flex-1 text-sm font-semibold text-sky-900 dark:text-sky-200">
          Developer nahi jaante kya karna hai? Ye guide unhein bhej dein — 15 minute ka kaam hai.
        </div>
        <Button size="sm" variant="success" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={share}>WhatsApp par bhejo</Button>
        <Button size="sm" variant="outline" onClick={copyGuide}>Copy</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CopyField label="Orders URL (POST)" value={overview.urls.orders} />
        <CopyField label="X-Nafaa-Key" value={i.apiKey} secret />
      </div>
      <CopyField label="Signature secret (optional)" value={i.webhookSecret} secret hint="HMAC-SHA256(body, secret) → X-Nafaa-Signature: sha256=…" />

      <div>
        <div className="mb-2 flex flex-wrap gap-1">
          {(['php', 'node', 'python', 'curl', 'json'] as const).map((k) => (
            <button key={k} onClick={() => setLang(k)} className={tab(lang === k)}>
              {k === 'node' ? 'Node.js' : k === 'json' ? 'JSON sample' : k.toUpperCase()}
            </button>
          ))}
        </div>
        <CodeBlock code={code[lang]} />
      </div>
      <p className="text-xs text-slate-500">
        ⚠️ Key sirf server par rakhein (backend code). Browser ke JavaScript me mat daalein.
      </p>
    </div>
  );
}

const tab = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition',
    active ? 'bg-white text-slate-900 shadow dark:bg-neutral-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
  );
