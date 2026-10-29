/**
 * Channel Settings tab: every option the channel has, grouped by what it
 * decides — orders, stock, price, delivery charges, status back to the site,
 * safety, name, and turning the channel off. Only options that apply to the
 * channel's platform are shown.
 */

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Pause, Play, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button, confirmDialog, Input, Select, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteConfig, type WebsiteOverview } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi } from '../../api/online-products.api';
import { CHANNELS_KEY } from '../../hooks/useSalesChannels';
import { ChannelSettingsModal } from '../online-products/ChannelSettingsModal';
import { ruleText } from '../online-products/meta';
import { panel } from './ChannelOverview';
import type { ChannelFacts } from './meta';

function Section({ title, help, children, danger }: { title: string; help: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
      <div className="lg:pt-4">
        <h3 className={cn('text-[0.875rem] font-semibold', danger ? 'text-rose-700' : 'text-slate-900')}>{title}</h3>
        <p className="mt-0.5 text-[0.78125rem] leading-relaxed text-slate-500">{help}</p>
      </div>
      <div className={cn(panel, 'divide-y divide-slate-100 px-4 sm:px-5', danger && 'ring-rose-200')}>{children}</div>
    </div>
  );
}

function Row({ title, help, control }: { title: ReactNode; help?: ReactNode; control: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[0.875rem] font-medium text-slate-900">{title}</p>
        {help && <p className="mt-0.5 text-[0.78125rem] leading-relaxed text-slate-500">{help}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

const On = ({ text = 'Chalu' }: { text?: string }) => (
  <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-success-700"><CheckCircle2 className="h-4 w-4" /> {text}</span>
);

export function useChannelLifecycle(id: string, onChange: (d: WebsiteOverview) => void) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toggle = useMutation({
    mutationFn: (active: boolean) => (active ? onlineOrdersApi.resume(id) : onlineOrdersApi.pause(id)),
    onSuccess: (d) => { onChange(d); toast.success(d.integration?.isActive ? 'Channel chalu' : 'Channel band — naye orders nahi aayenge'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => onlineOrdersApi.removeChannel(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      toast.success(r.archived ? 'Channel hata diya — purane orders aur bills mehfooz' : 'Channel hata diya');
      navigate('/online-store/channels');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const askRemove = async (name: string) => {
    if (await confirmDialog({ title: `"${name}" hata dein?`, text: 'Naye orders aana band ho jayenge. Purane orders aur bills mehfooz rahenge.', danger: true })) remove.mutate();
  };
  return { toggle, remove, askRemove };
}

export function ChannelSettings({ id, data, facts, onChange }: { id: string; data: WebsiteOverview; facts: ChannelFacts; onChange: (d: WebsiteOverview) => void }) {
  const qc = useQueryClient();
  const i = data.integration!;
  const cfg = i.config;
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shopList = ((Array.isArray(shops) ? shops : (shops as any)?.items ?? []) as Array<{ id: string; name: string; isMain?: boolean; isActive?: boolean }>)
    .filter((s) => s.isActive !== false);
  const channelsQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'channels'], queryFn: onlineProductsApi.channels, staleTime: 30_000, enabled: facts.productChannel });
  const productChannel = channelsQ.data?.channels.find((c) => c.id === id);
  const [priceOpen, setPriceOpen] = useState(false);
  const [displayName, setDisplayName] = useState(i.displayName);
  const [statusUrl, setStatusUrl] = useState(cfg.statusWebhookUrl ?? '');
  const [shopifySecret, setShopifySecret] = useState(cfg.shopifySecret ?? '');
  const life = useChannelLifecycle(id, onChange);

  const save = useMutation({
    mutationFn: (patch: Partial<WebsiteConfig> & { displayName?: string }) => onlineOrdersApi.updateChannel(id, patch),
    onSuccess: (d) => { onChange(d); toast.success('Save ho gaya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const testHook = useMutation({
    mutationFn: () => onlineOrdersApi.testStatusWebhook(id),
    onSuccess: (r) => (r.ok ? toast.success('Website ne jawab diya') : toast.error(r.error ?? 'Jawab nahi aaya')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const site = facts.kind === 'custom' ? 'website' : facts.name;
  const twoWay = facts.automatic && (facts.kind === 'shopify' || facts.kind === 'woocommerce');
  const signable = facts.kind === 'custom' || ((facts.kind === 'shopify' || facts.kind === 'woocommerce') && !facts.automatic);
  const buffer = productChannel?.stockBuffer ?? 0;

  return (
    <div className="space-y-6">
      <Section title="Order aane par" help="Naya order aate hi Nafaa khud kitna kaam kare.">
        <Row title="Order khud accept karein"
          help="Bill aur stock khud. Stock kam ho ya product jura na ho to order 'Naya' me ruk jata hai — aap dekh kar accept karein."
          control={<Switch size="sm" checked={cfg.autoAccept} disabled={save.isPending} onChange={(e) => save.mutate({ autoAccept: e.target.checked })} aria-label="Order khud accept" />} />
        <Row title="Accept par receipt kholein" help="Accept dabate hi receipt ka safha khulta hai (POS par auto-print on ho to print bhi)."
          control={<Switch size="sm" checked={cfg.autoPrint} disabled={save.isPending} onChange={(e) => save.mutate({ autoPrint: e.target.checked })} aria-label="Receipt kholein" />} />
      </Section>

      <Section title="Stock" help={`Kis branch ka maal ${site} par bikta hai, aur stock kaise jata hai.`}>
        <Row title="Stock kis branch se" help={`Isi branch ka stock kam hoga${facts.productChannel ? ` aur ${facts.name} par isi ka dikhega` : ''}.`}
          control={
            <Select size="sm" aria-label="Stock kis branch se" wrapperClassName="w-full sm:w-64" value={cfg.shopId ?? shopList.find((s) => s.isMain)?.id ?? ''}
              onChange={(e) => save.mutate({ shopId: e.target.value || null })}>
              {!shopList.length && <option value="">Main branch</option>}
              {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (main)' : ''}</option>)}
            </Select>
          } />
        {facts.productChannel && (
          <Row title={`Stock ${facts.name} par khud`}
            help={facts.automatic ? 'POS par sale, purchase ya adjustment → 1 minute me update, aur har 15 minute poori sync.' : `Pehle ${facts.name} ko Setup se automatic jorein.`}
            control={facts.automatic ? <On /> : <span className="text-[0.8125rem] font-medium text-slate-500">Jorna baqi</span>} />
        )}
        {facts.productChannel && (
          <Row title="Stock buffer" help={`${facts.name} ko asli stock se itne kam batayein — taake POS aur online ek saath bik kar minus na ho.`}
            control={<span className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{productChannel ? (buffer ? `${buffer} piece` : 'Koi nahi') : '—'}</span>} />
        )}
        {facts.kind === 'shopify' && i.shopify?.locationName && (
          <Row title="Shopify stock location" help="Nafaa stock isi location par likhta hai. Badalni ho to Shopify me pehli location badal kar Setup → Check." control={<span className="text-[0.875rem] font-semibold text-slate-900">{i.shopify.locationName}</span>} />
        )}
      </Section>

      <Section title="Price" help="Bill me kaun si price lage, aur Nafaa ki price channel par jaye ya nahi.">
        <Row title="Bill me price" help={`${site} par sale/offer chal raha ho to "${facts.kind === 'custom' ? 'Website' : facts.name} wali" rakhein.`}
          control={
            <Select size="sm" aria-label="Bill me price" wrapperClassName="w-full sm:w-64" value={cfg.priceSource} onChange={(e) => save.mutate({ priceSource: e.target.value as WebsiteConfig['priceSource'] })}>
              <option value="WEBSITE">{facts.kind === 'custom' ? 'Website' : facts.name} wali (jo customer ne di)</option>
              <option value="NAFAA">Nafaa wali (POS ki price)</option>
            </Select>
          } />
        {facts.productChannel && (
          <Row title={`${facts.name} par price`}
            help={productChannel
              ? (productChannel.pushPrice ? `Nafaa bhejta hai: ${ruleText(productChannel.priceRule)}. Kisi product ki apni price Online products me.` : `Nafaa price nahi bhejta — ${facts.name} par jo hai wahi rehti hai.`)
              : 'Price rule, rounding aur stock buffer yahan se badlein.'}
            control={<Button size="sm" variant="secondary" disabled={!productChannel} onClick={() => setPriceOpen(true)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>Price aur buffer</Button>} />
        )}
      </Section>

      <Section title="Delivery charges" help="Customer jo delivery charges deta hai, wo kis ke paas jate hain.">
        <Row title="Delivery charges kis ke paas"
          help="Apna rider ho to 'Dukaan'. Bahar ka rider (Indolj, Bykea) charges khud le to 'Rider' — bill par likha aata hai, sale aur galle me nahi."
          control={
            <Select size="sm" aria-label="Delivery charges" wrapperClassName="w-full sm:w-64" value={cfg.deliveryFeeMode ?? 'SHOP'} onChange={(e) => save.mutate({ deliveryFeeMode: e.target.value as 'SHOP' | 'RIDER' })}>
              <option value="SHOP">Dukaan ke — bill aur sale me</option>
              <option value="RIDER">Rider ke — sirf likha, sale me nahi</option>
            </Select>
          } />
      </Section>

      {facts.kind !== 'daraz' && facts.kind !== 'indolj' && (
        <Section title={`${facts.kind === 'custom' ? 'Website' : facts.name} ko status`} help="Accept, raste me, deliver aur cancel ki khabar wapas.">
          {twoWay ? (
            <Row title={<span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success-600" /> Khud ho raha hai</span>}
              help={facts.kind === 'shopify'
                ? 'Accept par tag, raste me par fulfillment + tracking (customer ko Shopify email), deliver par Delivered, cancel par order cancel.'
                : 'Accept par Processing, deliver par Completed, cancel par Cancelled, aur customer ko "raste me" note.'}
              control={<Button size="sm" variant="ghost" loading={testHook.isPending} onClick={() => testHook.mutate()}>Check</Button>} />
          ) : (
            <div className="py-3.5">
              <Input size="sm" label="Status URL (Nafaa → website)" value={statusUrl} onChange={(e) => setStatusUrl(e.target.value)} placeholder="https://meri-website.com/nafaa-status"
                hint="Har status badalne par Nafaa is URL par khabar bhejta hai. Nafaa plugin ise khud lagata hai." />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" loading={save.isPending} disabled={(statusUrl.trim() || null) === (cfg.statusWebhookUrl ?? null)} onClick={() => save.mutate({ statusWebhookUrl: statusUrl.trim() || null })}>Save</Button>
                <Button size="sm" variant="secondary" loading={testHook.isPending} disabled={!cfg.statusWebhookUrl} onClick={() => testHook.mutate()}>Test</Button>
              </div>
            </div>
          )}
        </Section>
      )}

      {signable && (
        <Section title="Hifazat" help="Sirf asli website ke orders qabool hon.">
          <Row title="Sirf signed orders" help="Bina signature wala order reject. Nafaa plugin aur automatic connection khud sign karte hain."
            control={<Switch size="sm" checked={cfg.requireSignature} disabled={save.isPending} onChange={(e) => save.mutate({ requireSignature: e.target.checked })} aria-label="Sirf signed orders" />} />
          {facts.platform === 'shopify' && (
            <div className="py-3.5">
              <Input size="sm" label="Shopify webhook signing key" value={shopifySecret} onChange={(e) => setShopifySecret(e.target.value)} autoComplete="off" className="font-mono"
                hint="Shopify admin → Settings → Notifications → Webhooks ke neeche wali key." />
              <Button size="sm" className="mt-2" loading={save.isPending} disabled={shopifySecret === (cfg.shopifySecret ?? '')} onClick={() => save.mutate({ shopifySecret })}>Save</Button>
            </div>
          )}
        </Section>
      )}

      <Section title="Naam" help="Sidebar, orders aur receipts par yahi naam.">
        <div className="py-3.5">
          <Input size="sm" label="Channel ka naam" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} />
          <Button size="sm" className="mt-2" disabled={!displayName.trim() || displayName === i.displayName} loading={save.isPending} onClick={() => save.mutate({ displayName: displayName.trim() })}>Save</Button>
        </div>
      </Section>

      <Section title="Channel band ya hatayein" help="Band karne se naye orders rukte hain; hatane se channel list se nikal jata hai. Purane orders aur bills dono soorat me mehfooz." danger>
        <Row title={i.isActive ? 'Channel band karein' : 'Channel chalu karein'}
          help={i.isActive ? `${site} par order ho to bhi Nafaa me nahi aayega, jab tak dobara chalu na karein.` : 'Naye orders phir se aane lagenge.'}
          control={<Button size="sm" variant="secondary" loading={life.toggle.isPending} onClick={() => life.toggle.mutate(!i.isActive)}
            leftIcon={i.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}>{i.isActive ? 'Band karein' : 'Chalu karein'}</Button>} />
        <Row title="Channel hatayein" help={facts.kind === 'shopify' ? 'Shopify se app bhi hatana ho to Shopify admin → Settings → Apps se uninstall karein.' : 'Ye wapas nahi hota — dobara jorna padega.'}
          control={<Button size="sm" variant="critical" loading={life.remove.isPending} onClick={() => life.askRemove(i.displayName)} leftIcon={<Trash2 className="h-4 w-4" />}>Hatayein</Button>} />
      </Section>

      {priceOpen && productChannel && (
        <ChannelSettingsModal channel={productChannel} onClose={() => {
          setPriceOpen(false);
          qc.invalidateQueries({ queryKey: ['sales-channel', id] });
        }} />
      )}
    </div>
  );
}
