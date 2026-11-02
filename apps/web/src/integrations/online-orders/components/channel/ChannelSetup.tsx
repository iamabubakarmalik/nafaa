/**
 * Channel Setup tab: connect (or repair) the channel on the left, the
 * platform's step-by-step guide on the right.
 *
 * Shopify and WooCommerce keep their install/approve flow exactly as before
 * (useChannelConnect); the manual guides, branch URLs and Indolj General POS
 * guide are the existing website components, shown unchanged.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ChevronDown, ExternalLink, KeyRound, Loader2, RefreshCw, Wrench, Zap } from 'lucide-react';
import { Alert, Badge, Button, confirmDialog, controlClass, Segmented } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { useChannelConnect } from '../../hooks/useWooConnect';
import { whenText } from '../../lib/labels';
import { ConnectGuide, ShopifyGuide } from '../website/ConnectGuides';
import { CustomConnect } from '../website/CustomConnect';
import { CopyField } from '../website/CopyField';
import { HttpsNotice } from '../website/ManualKeysForm';
import { BranchSetup, IndoljGuide } from '../website/SetupGuides';
import { DarazChannelCard } from '../daraz/Daraz';
import { GuideCard } from '../guides/Guide';
import { channelGuide } from './channelGuides';
import { IndoljMenuConnect } from './IndoljMenuConnect';
import { PanelHead, panel } from './ChannelOverview';
import type { ChannelFacts, ChannelTab } from './meta';
import { t as tr } from '@core/i18n';

export function ChannelSetup({ id, data, facts, onChange, setTab, via, setVia }: {
  id: string; data: WebsiteOverview; facts: ChannelFacts; onChange: (d: WebsiteOverview) => void; setTab: (t: ChannelTab) => void;
  via: 'indolj' | 'custom'; setVia: (v: 'indolj' | 'custom') => void;
}) {
  const i = data.integration!;
  const tenantName = useAuthStore((s) => s.tenant?.name) ?? 'Meri dukaan';
  const guide = channelGuide(facts, data);
  const isWebsite = i.type === 'CUSTOM_WEBSITE';

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0 space-y-4">
        {isWebsite && !i.indolj?.connected && (
          <section className={cn(panel, 'flex flex-wrap items-center gap-3 p-4 sm:p-5')}>
            <div className="min-w-0 flex-1">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('Website kis par bani hai?')}</h2>
              <p className="text-[0.75rem] text-slate-500">{tr('Isi hisaab se jorne ke qadam badalte hain')}</p>
            </div>
            <Segmented value={via} onChange={setVia} label={tr('Website kis par bani hai')} items={[
              { value: 'custom', label: tr('Developer ne banayi') },
              { value: 'indolj', label: tr('Indolj') },
            ]} />
          </section>
        )}

        {facts.kind === 'shopify' && facts.ownApp && (
          <section className={panel}>
            <PanelHead title={tr('Shopify connection (apni app)')} hint={tr('Store ki apni Shopify app ke zariye jura hai — status, webhooks aur check yahan')} />
            <div className="p-4 sm:p-5">
              <ShopifyGuide hook={data.urls.hook ?? ''} channelId={id} isShopifyChannel shopify={i.shopify ?? null}
                siteUrl={i.config.siteUrl} name={i.displayName} onChange={onChange} overview={data} />
            </div>
          </section>
        )}

        {((facts.kind === 'shopify' && !facts.ownApp) || facts.kind === 'woocommerce') && (
          <>
            <ConnectionCard id={id} data={data} platform={facts.kind} onChange={onChange} />
            {!facts.automatic && (
              <section className={panel}>
                <PanelHead title={tr('Manual setup')} hint={tr('Ek click nahi chal raha? Yahan se khud jorein.')} />
                <div className="p-4 sm:p-5"><ConnectGuide platform={facts.kind} overview={data} shopName={tenantName} channelId={id} onChange={onChange} /></div>
              </section>
            )}
          </>
        )}

        {facts.kind === 'daraz' && <DarazChannelCard id={id} data={data} />}

        {facts.kind === 'indolj' && (
          <>
            <IndoljMenuConnect data={data} onChange={onChange} />
            {i.indolj?.connected && <IndoljGuide data={data} onOpenProducts={() => setTab('products')} />}
          </>
        )}

        {facts.kind === 'custom' && <CustomConnect channelId={id} data={data} onChange={onChange} />}

        {/* Branch URLs only matter where the site posts orders to Nafaa itself. */}
        {(facts.kind === 'custom' || facts.kind === 'indolj') && <BranchSetup data={data} />}
        {facts.kind !== 'daraz' && <KeysCard id={id} data={data} facts={facts} onChange={onChange} />}
      </div>

      <div className="min-w-0">
        <GuideCard guide={guide} className="xl:sticky xl:top-4" />
      </div>
    </div>
  );
}

/** Shopify / WooCommerce connection: install or approve, health, repair. */
function ConnectionCard({ id, data, platform, onChange }: {
  id: string; data: WebsiteOverview; platform: 'woocommerce' | 'shopify'; onChange: (d: WebsiteOverview) => void;
}) {
  const i = data.integration!;
  const qc = useQueryClient();
  const name = platform === 'shopify' ? tr('Shopify') : tr('WooCommerce');
  const auto = platform === 'shopify' ? i.shopify : i.woo;
  const connected = !!auto?.connected;
  const needsReinstall = platform === 'shopify' && !!i.shopify?.needsReinstall;
  const [site, setSite] = useState(platform === 'shopify'
    ? (i.shopify?.shop ?? i.config.siteUrl ?? '').replace(/^https?:\/\//, '').replace('.myshopify.com', '')
    : i.config.siteUrl ?? '');
  const conn = useChannelConnect(platform, () => { onlineOrdersApi.channel(id).then(onChange).catch(() => null); });

  const repair = useMutation({
    mutationFn: () => (platform === 'shopify' ? onlineOrdersApi.shopifyRepair(id) : onlineOrdersApi.wooRepair(id)),
    onSuccess: () => { toast.success(tr('Connection check ho gaya — Activity dekhein')); qc.invalidateQueries({ queryKey: ['sales-channel', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const sync = useMutation({
    mutationFn: () => (platform === 'shopify' ? onlineOrdersApi.shopifySyncStock(id) : onlineOrdersApi.wooSyncStock(id)),
    onSuccess: (r) => { toast.success(tr('Stock sync: {{updated}} update{{value}}', { updated: r.updated, value: r.missing ? tr(' · {{missing}} jure nahi', { missing: r.missing }) : '' })); qc.invalidateQueries({ queryKey: ['sales-channel', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const start = () => conn.start({ siteUrl: site.trim(), channelId: id, displayName: i.displayName });
  const verb = platform === 'shopify' ? tr('Install') : tr('Approve');

  return (
    <section className={cn(panel, 'p-4 sm:p-5')}>
      <div className="flex flex-wrap items-center gap-3">
        <BrandLogo name={platform} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
            {tr('{{name}} connection', { name })}{' '} {connected ? <Badge size="xs" variant="success" dot>{tr('Automatic')}</Badge> : <Badge size="xs" variant="warning" dot>{tr('Jorna baqi')}</Badge>}
          </h2>
          <p className="text-[0.75rem] text-slate-500">{connected ? tr('{{name}} aur Nafaa khud baat karte hain', { name }) : tr('{{name}} se jorein — automatic sab se aasaan hai', { name })}</p>
        </div>
      </div>

      {needsReinstall && (
        <Alert className="mt-4" tone="danger" title={tr('{{name}} ko ek dafa dobara install karein', { name })}
          action={<Button size="xs" loading={conn.phase === 'starting'} onClick={start}>{tr('Dobara install')}</Button>}>
          {tr('{{name}} ne nayi ijazat maangi hai. Dobara install se sab chal padega — koi data nahi mitega.', { name })}
        </Alert>
      )}

      {connected && conn.phase !== 'waiting' ? (
        <>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
            <div className="flex min-w-0 items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.84375rem] font-semibold text-slate-900">{tr('{{name}} se jura hai', { name })}</p>
              <p className="break-words text-[0.78125rem] text-slate-500">
                {platform === 'shopify' ? i.shopify?.shop : i.config.siteUrl}
                {platform === 'shopify' && i.shopify?.locationName ? tr(' · stock location: {{locationName}}', { locationName: i.shopify.locationName }) : ''}
                {auto?.connectedAt ? tr(' · {{connectedAt}} se', { connectedAt: whenText(auto.connectedAt) }) : ''}
              </p>
            </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 ps-8">
              <Button size="xs" variant="secondary" loading={sync.isPending} onClick={() => sync.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>{tr('Stock sync abhi')}</Button>
              <Button size="xs" variant="secondary" loading={repair.isPending} onClick={() => repair.mutate()} leftIcon={<Wrench className="h-3.5 w-3.5" />}>{tr('Check')}</Button>
              <Button size="xs" variant="ghost" loading={conn.phase === 'starting'} onClick={start}>{tr('Dobara {{value}}', { value: verb.toLowerCase() })}</Button>
            </div>
          </div>
          <ul className="mt-3 grid gap-2 text-[0.78125rem] text-slate-600 sm:grid-cols-3">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> {' '}{tr('Orders khud aate hain')}</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> {platform === 'shopify' ? tr('Fulfillment + tracking wapas') : tr('Status wapas website par')}</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success-600" /> {' '}{tr('Stock khud, har 15 minute poora')}</li>
          </ul>
        </>
      ) : conn.phase === 'waiting' ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          <p className="min-w-0 flex-1 text-[0.8125rem] font-medium text-slate-900">{tr('{{name}} window me "{{verb}}" dabayein…', { name, verb })}</p>
          <Button size="xs" variant="secondary" onClick={() => conn.reopen()} leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>{tr('Window dobara kholein')}</Button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl p-4 ring-2 ring-inset ring-brand-500/60">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-600" />
            <span className="text-[0.84375rem] font-semibold text-slate-900">{tr('Automatic')}</span>
            <Badge size="xs" variant="success">{tr('Recommended')}</Badge>
          </div>
          <p className="mt-1 text-[0.78125rem] text-slate-500">{tr('Window me {{name}} khulega — {{verb}} dabayein, baaqi sab Nafaa khud karta hai.', { name, verb })}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input value={site} onChange={(e) => setSite(e.target.value)} placeholder={platform === 'shopify' ? 'mera-store' : 'ahmedstore.pk'} aria-label={platform === 'shopify' ? tr('Shopify store ka naam') : tr('Website ka address')}
                className={cn(controlClass(), 'h-10 px-3 text-[0.875rem]', platform === 'shopify' && 'pe-32')} />
              {platform === 'shopify' && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-slate-400">.myshopify.com</span>}
            </div>
            <Button loading={conn.phase === 'starting'} disabled={!site.trim() || !conn.oneClickReady} onClick={start}>{tr('{{name}} se jorein', { name })}</Button>
          </div>
          {conn.error && <p className="mt-2 text-[0.78125rem] text-rose-600">{conn.error}</p>}
          {conn.phase === 'denied' && <p className="mt-2 text-[0.78125rem] text-rose-600">{tr('Ijazat nahi di gayi — dobara koshish karein.')}</p>}
          {!conn.oneClickReady && conn.publicApi && <p className="mt-2 text-[0.75rem] text-amber-700">{conn.publicApi.reason}</p>}
        </div>
      )}
      {conn.phase === 'manual' && <div className="mt-3"><HttpsNotice reason={conn.hint?.reason} fix={conn.hint?.fix} /></div>}
    </section>
  );
}

/** Channel keys: needed by the plugin, own website, Indolj or a developer. */
function KeysCard({ id, data, facts, onChange }: { id: string; data: WebsiteOverview; facts: ChannelFacts; onChange: (d: WebsiteOverview) => void }) {
  const i = data.integration!;
  // With an automatic connection the keys are only for developers, so they start folded.
  const [open, setOpen] = useState(!facts.automatic || facts.kind === 'indolj');
  const rotate = useMutation({
    mutationFn: () => onlineOrdersApi.rotateKeys(id),
    onSuccess: (d) => { onChange(d); toast.success(facts.automatic && facts.kind !== 'indolj' ? tr('Nayi key ban gayi — webhooks khud shift ho gaye') : tr('Nayi key ban gayi — {{value}} me nayi daalein', { value: facts.kind === 'indolj' ? tr('Indolj') : tr('website / plugin') })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <section className={panel}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-start sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><KeyRound className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold text-slate-900">{tr('Keys aur URLs')}</span>
          <span className="block text-[0.75rem] text-slate-500">{tr('Sirf apni website, plugin{{value}} ya developer ko dein', { value: facts.kind === 'indolj' ? tr(', Indolj') : '' })}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <CopyField label={facts.kind === 'indolj' ? tr('Token (Nafaa key)') : tr('Nafaa key')} value={i.apiKey} secret />
            <CopyField label={tr('Secret (signature)')} value={i.webhookSecret} secret />
            <CopyField label={tr('Orders URL (POST)')} value={data.urls.orders} />
            {data.urls.hook && facts.kind !== 'indolj' && facts.kind !== 'custom' && <CopyField label={tr('Webhook URL ({{name}})', { name: facts.name })} value={data.urls.hook} secret />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 ring-1 ring-inset ring-rose-200">
            <span className="text-[0.78125rem] text-rose-900">{tr('Key galat haath lagi? Nayi banayein — purani foran band ho jati hai.')}</span>
            <Button size="xs" variant="critical" loading={rotate.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={async () => { if (await confirmDialog({ title: tr('Nayi key banayein?'), text: tr('Purani foran band ho jayegi.'), danger: true })) rotate.mutate(); }}>{tr('Nayi key')}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
