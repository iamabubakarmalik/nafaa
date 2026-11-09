/**
 * Channel Settings tab: every option the channel has in one place, grouped
 * by what it decides — orders, two-way sync, stock, price, product details, order status
 * mapping, sync, delivery charges, safety, name, and turning the channel
 * off. Only options the channel's platform allows are shown; what it does
 * not allow is said in words, never as a dead button.
 */

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Pause, Play, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button, confirmDialog, Input, Select, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteConfig, type WebsiteOverview } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type PushContent } from '../../api/online-products.api';
import { channelOpsApi } from '../../api/channel-ops.api';
import { timeAgo } from '../../lib/labels';
import { StatusMapSection } from './StatusMapSection';
import { CHANNELS_KEY } from '../../hooks/useSalesChannels';
import { ChannelSettingsModal } from '../online-products/ChannelSettingsModal';
import { ruleText } from '../online-products/meta';
import { SyncSettingsCard } from '../online-products/SyncSettingsCard';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { panel } from './ChannelOverview';
import type { ChannelFacts } from './meta';
import { t } from '@core/i18n';

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

const On = ({ text = t('Chalu') }: { text?: string }) => (
  <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-success-700"><CheckCircle2 className="h-4 w-4" /> {text}</span>
);

export function useChannelLifecycle(id: string, onChange: (d: WebsiteOverview) => void) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toggle = useMutation({
    mutationFn: (active: boolean) => (active ? onlineOrdersApi.resume(id) : onlineOrdersApi.pause(id)),
    onSuccess: (d) => { onChange(d); toast.success(d.integration?.isActive ? t('Channel chalu') : t('Channel band — naye orders nahi aayenge')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => onlineOrdersApi.removeChannel(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      toast.success(r.archived ? t('Channel hata diya — purane orders aur bills mehfooz') : t('Channel hata diya'));
      navigate('/online-store/channels');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const askRemove = async (name: string) => {
    if (await confirmDialog({ title: t('"{{name}}" hata dein?', { name }), text: t('Naye orders aana band ho jayenge. Purane orders aur bills mehfooz rahenge.'), danger: true })) remove.mutate();
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
  const canManage = usePermission(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const [priceOpen, setPriceOpen] = useState(false);
  const [displayName, setDisplayName] = useState(i.displayName);
  const [statusUrl, setStatusUrl] = useState(cfg.statusWebhookUrl ?? '');
  const [shopifySecret, setShopifySecret] = useState(cfg.shopifySecret ?? '');
  const life = useChannelLifecycle(id, onChange);

  const save = useMutation({
    mutationFn: (patch: Partial<WebsiteConfig> & { displayName?: string }) => onlineOrdersApi.updateChannel(id, patch),
    onSuccess: (d) => { onChange(d); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const testHook = useMutation({
    mutationFn: () => onlineOrdersApi.testStatusWebhook(id),
    onSuccess: (r) => (r.ok ? toast.success(t('Website ne jawab diya')) : toast.error(r.error ?? t('Jawab nahi aaya'))),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  // Catalog switches (stock, price, details, auto-link) save one at a time.
  const catSave = useMutation({
    mutationFn: (patch: Parameters<typeof onlineProductsApi.settings>[1]) => onlineProductsApi.settings(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY] });
      qc.invalidateQueries({ queryKey: ['sales-channel', id] });
      toast.success(t('Save ho gaya'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const syncNow = useMutation({
    mutationFn: () => channelOpsApi.syncNow(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sales-channel', id] });
      qc.invalidateQueries({ queryKey: ['channel-logs', id] });
      const o = r.orders;
      toast.success(t('Sync ho gaya'), {
        description: [
          o ? t('{{seen}} orders dekhe, {{created}} naye, {{updated}} ka status badla', { seen: o.seen, created: o.created, updated: o.updated }) : null,
          r.catalog?.error ?? null, ...r.notes,
        ].filter(Boolean).join(' · ') || undefined,
      });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const pc = productChannel;
  const stockShare = !pc ? '—' : pc.stockMode === 'PERCENT' ? t('{{n}}% stock', { n: pc.stockPercent }) : pc.stockMode === 'FIXED' ? t('{{n}} piece har product', { n: pc.stockFixed }) : t('Poora stock');
  const CONTENT_FIELDS: Array<{ key: keyof PushContent; label: string }> = [
    { key: 'title', label: t('Naam (title)') }, { key: 'description', label: t('Description') }, { key: 'images', label: t('Tasveerein') },
    { key: 'compareAt', label: t('Sale price (compare-at)') }, { key: 'sku', label: t('SKU / barcode') }, { key: 'weight', label: t('Weight') },
  ];

  const site = facts.kind === 'custom' ? 'website' : facts.name;
  const twoWay = facts.automatic && (facts.kind === 'shopify' || facts.kind === 'woocommerce');
  const signable = facts.kind === 'custom' || ((facts.kind === 'shopify' || facts.kind === 'woocommerce') && !facts.automatic);
  const buffer = productChannel?.stockBuffer ?? 0;
  // Two-way sync (the shared card) holds stock sending and auto-link where Nafaa pushes.
  const syncCard = !!(facts.productChannel && productChannel?.canPush && facts.kind !== 'custom');

  return (
    <div className="space-y-6">
      <Section title={t('Order aane par')} help={t('Naya order aate hi Nafaa khud kitna kaam kare.')}>
        <Row title={t('Order khud accept karein')}
          help={t('Bill aur stock khud. Stock kam ho ya product jura na ho to order \'Naya\' me ruk jata hai — aap dekh kar accept karein.')}
          control={<Switch size="sm" checked={cfg.autoAccept} disabled={save.isPending} onChange={(e) => save.mutate({ autoAccept: e.target.checked })} aria-label={t('Order khud accept')} />} />
        <Row title={t('Accept par receipt kholein')} help={t('Accept dabate hi receipt ka safha khulta hai (POS par auto-print on ho to print bhi).')}
          control={<Switch size="sm" checked={cfg.autoPrint} disabled={save.isPending} onChange={(e) => save.mutate({ autoPrint: e.target.checked })} aria-label={t('Receipt kholein')} />} />
      </Section>

      {syncCard && productChannel && (
        <Section title={t('Sync settings')} help={t('Nafaa aur {{name}} ke beech kya khud badle: qeemat, naam aur tasveerein, naye products aur Stock.', { name: facts.name })}>
          <SyncSettingsCard channel={productChannel} canManage={canManage} onSaved={() => qc.invalidateQueries({ queryKey: ['sales-channel', id] })} />
        </Section>
      )}

      <Section title={t('Stock')} help={t('Kis branch ka maal {{site}} par bikta hai, aur stock kaise jata hai.', { site })}>
        <Row title={t('Stock kis branch se')} help={t('Isi branch ka stock kam hoga{{value}}.', { value: facts.productChannel ? t(' aur {{name}} par isi ka dikhega', { name: facts.name }) : '' })}
          control={
            <Select size="sm" aria-label={t('Stock kis branch se')} wrapperClassName="w-full sm:w-64" value={cfg.shopId ?? shopList.find((s) => s.isMain)?.id ?? ''}
              onChange={(e) => save.mutate({ shopId: e.target.value || null })}>
              {!shopList.length && <option value="">{t('Main branch')}</option>}
              {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isMain ? t(' (main)') : ''}</option>)}
            </Select>
          } />
        {facts.productChannel && !syncCard && (
          <Row title={t('Stock {{name}} par bhejein', { name: facts.name })}
            help={!facts.automatic ? t('Pehle {{name}} ko Setup se automatic jorein.', { name: facts.name })
              : pc?.pushStock === false ? t('Band hai — {{name}} par Stock haath se rakhein.', { name: facts.name })
                : t('POS par sale, purchase ya adjustment → 1 minute me update, aur har 15 minute poori sync.')}
            control={facts.automatic && pc
              ? <Switch size="sm" checked={pc.pushStock} disabled={catSave.isPending} onChange={(e) => catSave.mutate({ pushStock: e.target.checked })} aria-label={t('Stock bhejein')} />
              : <span className="text-[0.8125rem] font-medium text-slate-500">{t('Jorna baqi')}</span>} />
        )}
        {facts.productChannel && (
          <Row title={t('Kitna stock aur buffer')}
            help={t('{{name}} ko poora stock, % ya fixed hissa — aur buffer jitne piece kam batayein taake POS aur online ek saath bik kar minus na ho.', { name: facts.name })}
            control={<div className="flex items-center gap-2">
              <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{pc ? `${stockShare} · ${buffer ? t('buffer {{buffer}}', { buffer }) : t('buffer nahi')}` : '—'}</span>
              <Button size="sm" variant="secondary" disabled={!pc} onClick={() => setPriceOpen(true)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>{t('Badlein')}</Button>
            </div>} />
        )}
        {facts.productChannel && pc && facts.kind !== 'custom' && !syncCard && (
          <Row title={t('Pakke match khud jorein')} help={t('{{name}} par naya product aaye aur SKU ya barcode Nafaa se bilkul mile to khud jur jata hai.', { name: facts.name })}
            control={<Switch size="sm" checked={pc.autoLink} disabled={catSave.isPending} onChange={(e) => catSave.mutate({ autoLink: e.target.checked })} aria-label={t('Pakke match khud jorein')} />} />
        )}
        {facts.kind === 'shopify' && i.shopify?.locationName && (
          <Row title={t('Shopify stock location')} help={t('Nafaa stock isi location par likhta hai. Badalni ho to Shopify me pehli location badal kar Setup → Check.')} control={<span className="text-[0.875rem] font-semibold text-slate-900">{i.shopify.locationName}</span>} />
        )}
      </Section>

      <Section title={t('Price')} help={t('Bill me kaun si price lage, aur Nafaa ki price channel par jaye ya nahi.')}>
        <Row title={t('Bill me price')} help={t('{{site}} par sale/offer chal raha ho to "{{value}} wali" rakhein.', { site, value: facts.kind === 'custom' ? t('Website') : facts.name })}
          control={
            <Select size="sm" aria-label={t('Bill me price')} wrapperClassName="w-full sm:w-64" value={cfg.priceSource} onChange={(e) => save.mutate({ priceSource: e.target.value as WebsiteConfig['priceSource'] })}>
              <option value="WEBSITE">{t('{{value}} wali (jo customer ne di)', { value: facts.kind === 'custom' ? t('Website') : facts.name })}</option>
              <option value="NAFAA">{t('Nafaa wali (POS ki price)')}</option>
            </Select>
          } />
        {facts.productChannel && pc && facts.kind !== 'custom' && (
          <Row title={t('{{name}} par price ka rule', { name: facts.name })}
            help={pc.pushPrice ? t('Nafaa bhejta hai: {{priceRule}}. Kisi product ki apni price Online products me.', { priceRule: ruleText(pc.priceRule) }) : t('Nafaa price nahi bhejta — {{name}} par jo hai wahi rehti hai. Ye "Sync settings" me badlein.', { name: facts.name })}
            control={<Button size="sm" variant="secondary" onClick={() => setPriceOpen(true)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>{t('Price rule')}</Button>} />
        )}
      </Section>

      {facts.productChannel && facts.kind !== 'custom' && (
        <Section title={t('Product ki tafseel')} help={t('Product ki kaun si cheezein Nafaa {{name}} par bheje.', { name: facts.name })}>
          {pc?.canContent ? CONTENT_FIELDS.map((f) => (
            <Row key={f.key} title={f.label}
              control={<Switch size="sm" checked={pc.pushContent[f.key]} disabled={catSave.isPending}
                onChange={(e) => catSave.mutate({ pushContent: { [f.key]: e.target.checked } })} aria-label={f.label} />} />
          )) : (
            <p className="py-3.5 text-[0.8125rem] text-slate-500">{pc?.contentNote ?? t('{{name}} par sirf Stock aur Price jate hain.', { name: facts.name })}</p>
          )}
        </Section>
      )}

      {facts.kind !== 'indolj' && (
        <Section title={t('Order status')} help={t('{{name}} ka kaun sa status Nafaa board ke kis status ke barabar hai — dono taraf.', { name: facts.kind === 'custom' ? t('Website') : facts.name })}>
          {facts.kind === 'custom' || ((facts.kind === 'shopify' || facts.kind === 'woocommerce') && !facts.automatic) ? (
            <div className="py-3.5">
              <Input size="sm" label={t('Status URL (Nafaa → website)')} value={statusUrl} onChange={(e) => setStatusUrl(e.target.value)} placeholder="https://meri-website.com/nafaa-status"
                hint={t('Har status badalne par Nafaa is URL par khabar bhejta hai. Nafaa plugin ise khud lagata hai.')} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" loading={save.isPending} disabled={(statusUrl.trim() || null) === (cfg.statusWebhookUrl ?? null)} onClick={() => save.mutate({ statusWebhookUrl: statusUrl.trim() || null })}>{t('Save')}</Button>
                <Button size="sm" variant="secondary" loading={testHook.isPending} disabled={!cfg.statusWebhookUrl} onClick={() => testHook.mutate()}>{t('Test')}</Button>
              </div>
            </div>
          ) : twoWay ? (
            <Row title={<span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success-600" /> {' '}{t('Rabta theek')}</span>}
              help={t('Check dabayein — Nafaa {{name}} se baat kar ke batata hai.', { name: facts.name })}
              control={<Button size="sm" variant="ghost" loading={testHook.isPending} onClick={() => testHook.mutate()}>{t('Check')}</Button>} />
          ) : null}
          <StatusMapSection id={id} channelName={facts.kind === 'custom' ? t('Website') : facts.name} />
        </Section>
      )}

      {(facts.kind === 'shopify' || facts.kind === 'woocommerce' || facts.kind === 'daraz') && (
        <Section title={t('Sync')} help={t('Webhook kabhi chhoot jaye to — {{name}} se pichle 3 din ke orders, phir Stock aur Price dobara.', { name: facts.name })}>
          <Row title={t('Abhi sync karein')}
            help={i.lastSyncAt ? t('Aakhri sync {{when}}', { when: timeAgo(i.lastSyncAt) }) : t('Har 30 minute khud bhi hota hai.')}
            control={<Button size="sm" variant="secondary" loading={syncNow.isPending} disabled={!facts.automatic || !i.isActive} onClick={() => syncNow.mutate()} leftIcon={<RefreshCw className="h-4 w-4" />}>{t('Sync now')}</Button>} />
        </Section>
      )}

      <Section title={t('Delivery charges')} help={t('Customer jo delivery charges deta hai, wo kis ke paas jate hain.')}>
        <Row title={t('Delivery charges kis ke paas')}
          help={t('Apna rider ho to \'Dukaan\'. Bahar ka rider (Indolj, Bykea) charges khud le to \'Rider\' — bill par likha aata hai, sale aur galle me nahi.')}
          control={
            <Select size="sm" aria-label={t('Delivery charges')} wrapperClassName="w-full sm:w-64" value={cfg.deliveryFeeMode ?? 'SHOP'} onChange={(e) => save.mutate({ deliveryFeeMode: e.target.value as 'SHOP' | 'RIDER' })}>
              <option value="SHOP">{t('Dukaan ke — bill aur sale me')}</option>
              <option value="RIDER">{t('Rider ke — sirf likha, sale me nahi')}</option>
            </Select>
          } />
      </Section>

      {signable && (
        <Section title={t('Hifazat')} help={t('Sirf asli website ke orders qabool hon.')}>
          <Row title={t('Sirf signed orders')} help={t('Bina signature wala order reject. Nafaa plugin aur automatic connection khud sign karte hain.')}
            control={<Switch size="sm" checked={cfg.requireSignature} disabled={save.isPending} onChange={(e) => save.mutate({ requireSignature: e.target.checked })} aria-label={t('Sirf signed orders')} />} />
          {facts.platform === 'shopify' && (
            <div className="py-3.5">
              <Input size="sm" label={t('Shopify webhook signing key')} value={shopifySecret} onChange={(e) => setShopifySecret(e.target.value)} autoComplete="off" className="font-mono"
                hint={t('Shopify admin → Settings → Notifications → Webhooks ke neeche wali key.')} />
              <Button size="sm" className="mt-2" loading={save.isPending} disabled={shopifySecret === (cfg.shopifySecret ?? '')} onClick={() => save.mutate({ shopifySecret })}>{t('Save')}</Button>
            </div>
          )}
        </Section>
      )}

      <Section title={t('Naam')} help={t('Sidebar, orders aur receipts par yahi naam.')}>
        <div className="py-3.5">
          <Input size="sm" label={t('Channel ka naam')} value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} />
          <Button size="sm" className="mt-2" disabled={!displayName.trim() || displayName === i.displayName} loading={save.isPending} onClick={() => save.mutate({ displayName: displayName.trim() })}>{t('Save')}</Button>
        </div>
      </Section>

      <Section title={t('Channel band ya hatayein')} help={t('Band karne se naye orders rukte hain; hatane se channel list se nikal jata hai. Purane orders aur bills dono soorat me mehfooz.')} danger>
        <Row title={i.isActive ? t('Channel band karein') : t('Channel chalu karein')}
          help={i.isActive ? t('{{site}} par order ho to bhi Nafaa me nahi aayega, jab tak dobara chalu na karein.', { site }) : t('Naye orders phir se aane lagenge.')}
          control={<Button size="sm" variant="secondary" loading={life.toggle.isPending} onClick={() => life.toggle.mutate(!i.isActive)}
            leftIcon={i.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}>{i.isActive ? t('Band karein') : t('Chalu karein')}</Button>} />
        <Row title={t('Channel hatayein')} help={facts.kind === 'shopify' ? t('Shopify se app bhi hatana ho to Shopify admin → Settings → Apps se uninstall karein.') : t('Ye wapas nahi hota — dobara jorna padega.')}
          control={<Button size="sm" variant="critical" loading={life.remove.isPending} onClick={() => life.askRemove(i.displayName)} leftIcon={<Trash2 className="h-4 w-4" />}>{t('Hatayein')}</Button>} />
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
