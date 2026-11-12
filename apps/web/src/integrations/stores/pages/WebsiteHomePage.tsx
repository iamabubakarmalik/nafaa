/**
 * Website home: the store's address and status (draft, password, live),
 * the setup checklist from logo to launch, 30-day numbers, recent website
 * orders and links to every website editor.
 */

import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CheckCircle2, Circle, CreditCard, ExternalLink, FileText, Globe, GraduationCap, KeyRound, LayoutTemplate, ListTree, Paintbrush,
  PackageCheck, Rocket, Settings2, ShieldCheck, ShoppingBag, Store, Tags, Truck, Upload, EyeOff,
} from 'lucide-react';
import { Badge, Button, Card, PageShell, Skeleton, confirmDialog, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type ChecklistKey, type StoreStatus } from '../api/stores.api';
import { StoreGate, StorePicker, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK, storeLink, useStoreFull } from '../lib/hooks';
import { rs } from '../lib/format';
import { setupPending } from './SetupWizardPage';

export default function WebsiteHomePage() {
  return (
    <PageShell>
      <StoreGate title={t('Website')}>{(ctx) => <Home ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const CHECK: Record<ChecklistKey, { title: string; hint: string; icon: typeof Store }> = {
  logo: { title: t('Logo lagayein'), hint: t('Naam, logo aur favicon'), icon: Upload },
  theme: { title: t('Design banayein'), hint: t('Banner, rang aur hisse'), icon: Paintbrush },
  products: { title: t('Products dikhayein'), hint: t('Kaun se products website par hon'), icon: PackageCheck },
  domain: { title: t('Apna domain'), hint: t('www.apnidukaan.pk (zaroori nahi)'), icon: Globe },
  payments: { title: t('Payment tareeqe'), hint: t('COD, JazzCash, Easypaisa'), icon: CreditCard },
  shipping: { title: t('Delivery charges'), hint: t('Shehar ke hisaab se rate'), icon: Truck },
  policies: { title: t('Policies'), hint: t('Return, privacy, terms'), icon: ShieldCheck },
  launch: { title: t('Website live karein'), hint: t('Sab ke liye khol dein'), icon: Rocket },
};

export const STATUS_META: Record<StoreStatus, { label: string; variant: 'success' | 'warning' | 'default' | 'danger' }> = {
  LIVE: { label: t('Live'), variant: 'success' },
  PASSWORD: { label: t('Password laga hai'), variant: 'warning' },
  DRAFT: { label: t('Abhi band hai'), variant: 'default' },
  CLOSED: { label: t('Band'), variant: 'danger' },
};

const LINKS = [
  { to: '/online-store/site/theme', icon: Paintbrush, title: t('Theme editor'), text: t('Design, banner, hisse') },
  { to: '/online-store/site/products', icon: PackageCheck, title: t('Website products'), text: t('Dikhana, SEO, URL') },
  { to: '/online-store/site/collections', icon: Tags, title: t('Collections'), text: t('Products ke group') },
  { to: '/online-store/site/pages', icon: FileText, title: t('Pages aur blog'), text: t('About, contact, FAQ') },
  { to: '/online-store/site/navigation', icon: ListTree, title: t('Menu'), text: t('Upar aur neeche ke links') },
  { to: '/online-store/site/domains', icon: Globe, title: t('Domains'), text: t('Apna domain jorein') },
  { to: '/online-store/site/checkout', icon: CreditCard, title: t('Checkout aur payment'), text: t('COD, advance, fields') },
  { to: '/online-store/site/shipping', icon: Truck, title: t('Delivery charges'), text: t('Zone aur rate') },
  { to: '/online-store/site/policies', icon: ShieldCheck, title: t('Policies'), text: t('Return, privacy, terms') },
  { to: '/online-store/site/preferences', icon: Settings2, title: t('Website settings'), text: t('Logo, social, tracking') },
  { to: '/online-store/site/analytics', icon: BarChart3, title: t('Website analytics'), text: t('Visitors aur sale') },
  { to: '/online-store/site/shopify', icon: LayoutTemplate, title: t('Shopify se aayein'), text: t('Sab kuch ek click me') },
];

function Home({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const home = useQuery({ queryKey: SK.home(id), queryFn: () => storesApi.home(id), staleTime: 30_000 });
  const full = useStoreFull(id);
  const store = home.data?.store ?? ctx.store;
  const status = STATUS_META[store.status] ?? STATUS_META.DRAFT;
  const checklist = home.data?.checklist ?? [];
  const done = checklist.filter((c) => c.done).length;

  const setStatus = useMutation({
    mutationFn: (s: 'LIVE' | 'PASSWORD' | 'DRAFT') => storesApi.setStatus(id, s),
    onSuccess: (r) => {
      qc.setQueryData(SK.full(id), r);
      void qc.invalidateQueries({ queryKey: SK.home(id) });
      void qc.invalidateQueries({ queryKey: SK.list });
      toast.success(r.status === 'LIVE' ? t('Mubarak ho! Website live hai.') : r.status === 'PASSWORD' ? t('Website par password lag gaya') : t('Website band kar di'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const launch = async () => {
    const left = checklist.filter((c) => !c.done && c.key !== 'launch' && c.key !== 'domain');
    if (left.length) {
      const ok = await confirmDialog({
        title: t('Kuch kaam baqi hai'),
        text: t('Ye abhi baqi hain: {{list}}. Phir bhi website live karein?', { list: left.map((c) => CHECK[c.key]?.title ?? c.key).join(', ') }),
        yes: t('Haan, live karein'),
      });
      if (!ok) return;
    }
    setStatus.mutate('LIVE');
  };

  const link = storeLink(store, ctx.list.storefrontUrl);

  return (
    <>
      <WebsiteHero ctx={ctx} back="/online-store" backLabel={t('Online store')} title={store.name}
        chip={<Badge variant={status.variant} dot size="sm">{status.label}</Badge>}
        meta={<a href={link} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline dir-ltr">{store.primaryHost || store.url}</a>}
        loading={home.isLoading}
        actions={<>
          <StorePicker ctx={ctx} />
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <a href={link} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" />{t('Store dekhein')}</a>
          <Link to="/online-store/site/theme" className={heroPrimaryButton}><Paintbrush className="h-4 w-4" />{t('Design karein')}</Link>
        </>}
        stats={[
          { label: t('Visitors (30 din)'), value: (home.data?.stats.visitors ?? 0).toLocaleString() },
          { label: t('Orders'), value: (home.data?.stats.orders ?? 0).toLocaleString() },
          { label: t('Sale'), value: rs(home.data?.stats.revenue ?? 0) },
          { label: t('Conversion'), value: `${(home.data?.stats.conversion ?? 0).toFixed(1)}%` },
        ]} />

      {setupPending(id) && (
        <Link to="/online-store/site/setup" className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-200 hover:bg-brand-100">
          <Rocket className="h-5 w-5 shrink-0 text-brand-700" />
          <span className="min-w-0 flex-1 text-[0.875rem] font-semibold text-brand-900">{t('Setup adhoora hai — wahin se jaari rakhein jahan chhora tha')}</span>
          <span className="text-[0.8125rem] font-semibold text-brand-700">{t('Jaari rakhein')}</span>
        </Link>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title={t('Website tayyar karein')} description={t('{{done}} / {{total}} kaam ho gaye', { done, total: checklist.length || 8 })}
          actions={<div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-success-500 transition-all" style={{ width: `${checklist.length ? (done / checklist.length) * 100 : 0}%` }} /></div>}>
          {home.isLoading ? <Skeleton className="h-72 rounded-xl" /> : (
            <ol className="divide-y divide-slate-100">
              {checklist.map((c) => {
                const m = CHECK[c.key];
                if (!m) return null;
                const isLaunch = c.key === 'launch';
                return (
                  <li key={c.key} className="flex items-center gap-3 py-2.5">
                    {c.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', c.done ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-600')}><m.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[0.875rem] font-semibold', c.done ? 'text-slate-500' : 'text-slate-900')}>{m.title}</p>
                      <p className="text-[0.75rem] text-slate-500">{m.hint}</p>
                    </div>
                    {isLaunch && !c.done ? (
                      <Button size="sm" loading={setStatus.isPending && setStatus.variables === 'LIVE'} onClick={() => void launch()} leftIcon={<Rocket className="h-4 w-4" />}>{t('Live karein')}</Button>
                    ) : (
                      <Link to={toWebPath(c.link)} className="rounded-lg px-2.5 py-1 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">{c.done ? t('Dekhein') : t('Shuru karein')}</Link>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="space-y-4">
          <Card title={t('Website ki halat')}>
            <div className="space-y-3">
              <StatusRow active={store.status === 'LIVE'} icon={Rocket} title={t('Live')} text={t('Sab customers website dekh aur order kar sakte hain')}
                action={store.status !== 'LIVE' && <Button size="xs" loading={setStatus.isPending && setStatus.variables === 'LIVE'} onClick={() => void launch()}>{t('Live karein')}</Button>} />
              <StatusRow active={store.status === 'PASSWORD'} icon={KeyRound} title={t('Password ke saath')} text={t('"Jald aa rahe hain" page; password wale andar aa sakte hain')}
                action={store.status !== 'PASSWORD' && (full.data?.hasPassword
                  ? <Button size="xs" variant="secondary" loading={setStatus.isPending && setStatus.variables === 'PASSWORD'} onClick={() => setStatus.mutate('PASSWORD')}>{t('Password lagayein')}</Button>
                  : <Link to="/online-store/site/preferences#password" className="text-[0.75rem] font-semibold text-brand-700">{t('Pehle password banayein')}</Link>)} />
              <StatusRow active={store.status === 'DRAFT'} icon={EyeOff} title={t('Band (sirf aap)')} text={t('Sirf editor ka preview chalta hai')}
                action={store.status !== 'DRAFT' && <Button size="xs" variant="ghost" loading={setStatus.isPending && setStatus.variables === 'DRAFT'}
                  onClick={async () => { if (await confirmDialog({ title: t('Website band karein?'), text: t('Customers website nahi khol sakenge. Data sab mehfooz rahega.'), yes: t('Band karein'), danger: true })) setStatus.mutate('DRAFT'); }}>{t('Band karein')}</Button>} />
            </div>
          </Card>

          <Card title={t('Naye website orders')} actions={<Link to="/online-orders" className="text-[0.8125rem] font-semibold text-brand-700">{t('Sab orders')}</Link>}>
            {home.isLoading ? <Skeleton className="h-32 rounded-xl" /> : !home.data?.recentOrders.length ? (
              <div className="flex flex-col items-center py-6 text-center">
                <ShoppingBag className="h-7 w-7 text-slate-300" />
                <p className="mt-2 text-[0.8125rem] text-slate-500">{t('Abhi website se koi order nahi aaya')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {home.data.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link to={`/online-orders?order=${o.id}`} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">#{o.orderNumber} · {o.customerName ?? t('Customer')}</span>
                        <span className="block text-[0.6875rem] text-slate-500">{new Date(o.receivedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </span>
                      <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{rs(o.total)}</span>
                      <Badge size="xs">{o.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title={t('Website ke sab kaam')}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:ring-slate-300">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><l.icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-semibold text-slate-900">{l.title}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{l.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {guide.isOpen && (
        <PageGuide
          title={t('Apni website — aasaan tareeqa')}
          description={t('Nafaa ke products, orders aur courier ke saath apni website. 10 minute ka kaam.')}
          onClose={guide.close}
          flow={[
            { label: t('Design'), hint: t('Theme editor'), icon: Paintbrush, color: '#7c3aed' },
            { label: t('Products'), hint: t('Kaun se dikhen'), icon: PackageCheck, color: '#2563eb' },
            { label: t('Payment aur delivery'), hint: t('COD, rate'), icon: Truck, color: '#ea580c' },
            { label: t('Live'), hint: t('Domain aur launch'), icon: Rocket, color: '#16a34a' },
          ]}
          steps={[
            { icon: Paintbrush, color: '#7c3aed', title: t('Design karein'), text: t('Theme editor me banner, rang aur hisse badlein. Publish dabane par website par lagta hai.') },
            { icon: PackageCheck, color: '#2563eb', title: t('Products'), text: t('Nafaa ke products khud website par aate hain. Website products page se chhupayein ya SEO likhein.') },
            { icon: ShoppingBag, color: '#0d9488', title: t('Orders'), text: t('Website ka har order Online orders board par aata hai. Courier, COD sab wahi se.') },
            { icon: Globe, color: '#16a34a', title: t('Domain'), text: t('Muft address foran chalta hai. Apna domain Domains page se jorein.') },
          ]}
        />
      )}
    </>
  );
}

/** The API sends checklist links as web paths; old-style keys map to our routes. */
function toWebPath(link: string) {
  if (link.startsWith('/online-store/')) return link;
  return `/online-store/site/${link.replace(/^\/+/, '')}`;
}

function StatusRow({ active, icon: Icon, title, text, action }: { active: boolean; icon: typeof Store; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl p-3 ring-1', active ? 'bg-brand-50 ring-brand-200' : 'ring-slate-200/80')}>
      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-brand-700' : 'text-slate-400')} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900">{title}{active && <CheckCircle2 className="h-4 w-4 text-brand-600" />}</p>
        <p className="text-[0.75rem] text-slate-500">{text}</p>
      </div>
      {action || null}
    </div>
  );
}
