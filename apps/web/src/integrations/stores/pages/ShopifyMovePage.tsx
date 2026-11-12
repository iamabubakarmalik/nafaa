/**
 * "Shopify se aayein": moves a Shopify store to the Nafaa website through
 * the existing Shopify connection, read-only. The shop picks what to bring
 * (products, product addresses, collections, shop details, policies, and
 * pages/blog/menus/redirects/customers when Shopify allows reading them),
 * watches the progress, then follows the domain switch steps. Shopify
 * stays untouched until the shop closes it itself.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Circle, Globe, GraduationCap, Loader2, Lock, MinusCircle, PackageCheck, Palette, Rocket, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Button, Card, Checkbox, EmptyState, PageShell, Skeleton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type MigrateKey, type MigrateRun } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK } from '../lib/hooks';

export default function ShopifyMovePage() {
  return (
    <PageShell>
      <StoreGate title={t('Shopify se aayein')}>{(ctx) => <Move ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const ITEM_LABEL: Record<MigrateKey, { title: string; text: string }> = {
  products: { title: t('Products'), text: t('Naam, tasveerein, size/rang, qeemat') },
  handles: { title: t('Product ke address'), text: t('Wahi URL, taake Google ranking na gire') },
  collections: { title: t('Collections'), text: t('Khud bharne wali bhi, unke qaide ke saath') },
  redirects: { title: t('Purane address'), text: t('Shopify ke redirects') },
  shop: { title: t('Dukaan ki details'), text: t('Naam, email, phone, logo, rang') },
  policies: { title: t('Policies'), text: t('Return, privacy, terms') },
  pages: { title: t('Pages'), text: t('About, contact waghera') },
  blogs: { title: t('Blog posts'), text: t('Sab posts aur tags') },
  menus: { title: t('Menu'), text: t('Upar aur neeche ke links') },
  customers: { title: t('Customers'), text: t('Sirf jinhon ne ijazat di ho') },
};

const STEP_ICON = { waiting: Circle, running: Loader2, done: CheckCircle2, skipped: MinusCircle, failed: XCircle };

function Move({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const q = useQuery({ queryKey: SK.migration(id), queryFn: () => storesApi.migration(id) });
  const [channelId, setChannelId] = useState<string | null>(null);
  const [pick, setPick] = useState<Set<MigrateKey>>(new Set());
  const [run, setRun] = useState<MigrateRun | null>(null);
  useEffect(() => {
    if (!q.data) return;
    if (!channelId) setChannelId(q.data.channels.find((c) => c.connected)?.id ?? null);
    if (!pick.size) setPick(new Set(q.data.items.filter((i) => i.available).map((i) => i.key)));
    if (!run && q.data.lastRun) setRun(q.data.lastRun);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const status = useQuery({
    queryKey: [...SK.migration(id), 'status'],
    queryFn: () => storesApi.migrationStatus(id),
    enabled: run?.status === 'RUNNING',
    refetchInterval: 3000,
  });
  useEffect(() => {
    const r = status.data?.run;
    if (!r) return;
    setRun(r);
    if (r.status !== 'RUNNING') {
      void qc.invalidateQueries({ queryKey: ['stores', id] });
      if (r.status === 'DONE') toast.success(t('Shopify se sab aa gaya!'));
    }
  }, [status.data, id, qc]);

  const start = useMutation({
    mutationFn: () => storesApi.startMigration(id, channelId!, [...pick]),
    onSuccess: (r) => setRun(r.run),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const data = q.data;
  const running = run?.status === 'RUNNING';
  const imported = run?.steps.reduce((n, s) => n + s.imported, 0) ?? 0;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Shopify se aayein')} loading={q.isLoading}
        meta={t('Ek click me Shopify ka store Nafaa par. Shopify me kuch nahi badalta — jab tak aap khud band na karein.')}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[
          { label: t('Shopify store'), value: data?.channels.find((c) => c.id === channelId)?.shop ?? t('Jora nahi') },
          { label: t('Laa sakte hain'), value: data ? `${data.items.filter((i) => i.available).length} / ${data.items.length}` : '—' },
          { label: t('Aa chuke'), value: imported.toLocaleString() },
          { label: t('Halat'), value: !run ? t('Shuru nahi') : run.status === 'RUNNING' ? t('Chal raha hai') : run.status === 'DONE' ? t('Mukammal') : t('Ruk gaya') },
        ]} />

      {q.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : !data?.channels.length ? (
        <Card>
          <EmptyState icon={<BrandLogo name="shopify" size="lg" />} title={t('Pehle Shopify jorein')}
            description={t('Shopify store Nafaa se jura ho to products pehle hi aa jate hain. Phir yahan se baqi sab.')}
            action={<Link to="/online-store/connect" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-[0.875rem] font-semibold text-white">{t('Shopify jorein')}<ArrowRight className="h-4 w-4 rtl-flip" /></Link>} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {data.channels.length > 1 && (
              <Card title={t('Kaun sa Shopify store')}>
                <div className="space-y-2">
                  {data.channels.map((c) => (
                    <button key={c.id} type="button" disabled={!c.connected || running} onClick={() => setChannelId(c.id)}
                      className={cn('flex w-full items-center gap-3 rounded-xl p-3 text-start ring-1 disabled:opacity-50', channelId === c.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200')}>
                      <BrandLogo name="shopify" />
                      <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-semibold">{c.name}</span><span className="block text-[0.75rem] text-slate-500 dir-ltr">{c.shop}</span></span>
                      {!c.connected && <Badge size="xs" variant="warning">{t('Jora nahi')}</Badge>}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card title={t('Kya kya laana hai')} description={t('Jo cheez Shopify abhi parhne nahi deta, wo neeche wajah ke saath likhi hai.')}>
              <ul className="space-y-2">
                {data.items.map((i) => {
                  const st = run?.steps.find((s) => s.key === i.key);
                  const Icon = st ? STEP_ICON[st.status] : null;
                  return (
                    <li key={i.key} className={cn('flex items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200/80', !i.available && 'bg-slate-50')}>
                      {i.available
                        ? <Checkbox checked={pick.has(i.key)} disabled={running} onChange={() => setPick((p) => { const n = new Set(p); if (n.has(i.key)) n.delete(i.key); else n.add(i.key); return n; })} aria-label={ITEM_LABEL[i.key]?.title ?? i.label} />
                        : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-semibold text-slate-900">
                          {ITEM_LABEL[i.key]?.title ?? i.label}
                          {i.count != null && <span className="text-[0.75rem] font-normal text-slate-500">{t('{{n}} mile', { n: i.count })}</span>}
                        </p>
                        <p className="text-[0.75rem] text-slate-500">{i.available ? ITEM_LABEL[i.key]?.text : (i.reason ?? t('Shopify abhi ijazat nahi deta'))}</p>
                        {st && (st.imported > 0 || st.skipped > 0 || st.note) && (
                          <p className="mt-1 text-[0.75rem] text-slate-600">{t('{{a}} aaye', { a: st.imported })}{st.skipped ? ` · ${t('{{s}} pehle se the', { s: st.skipped })}` : ''}{st.note ? ` · ${st.note}` : ''}</p>
                        )}
                      </div>
                      {Icon && st && <Icon className={cn('h-5 w-5 shrink-0', st.status === 'done' ? 'text-success-600' : st.status === 'failed' ? 'text-rose-600' : st.status === 'running' ? 'animate-spin text-brand-600' : 'text-slate-300')} />}
                    </li>
                  );
                })}
              </ul>
              {pick.has('customers') && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900">{t('Customers sirf wo aayenge jinhon ne Shopify par marketing ki ijazat di thi. Unhein bina ijazat message na bhejein.')}</p>}
              <Button className="mt-4 w-full" size="lg" disabled={!channelId || !pick.size || running} loading={start.isPending || running}
                onClick={() => start.mutate()} leftIcon={<Rocket className="h-4 w-4" />}>
                {running ? t('Laa rahe hain...') : run?.status === 'DONE' ? t('Dobara laayein (naye hi aayenge)') : t('Shopify se laayein')}
              </Button>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Palette className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-semibold text-slate-900">{t('Shopify ka design bhi laayein')}</p>
                  <p className="text-[0.8125rem] text-slate-600">{t('Shopify se theme file download karein aur yahan daalein. Rang, fonts, logo, banners aur text aa jayenge.')}</p>
                </div>
                <Link to="/online-store/site/theme/import" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-[0.8125rem] font-semibold text-white">{t('Theme laayein')}<ArrowRight className="h-4 w-4 rtl-flip" /></Link>
              </div>
            </Card>
          </div>

          <Card title={t('Uske baad: domain Nafaa par')}>
            <ol className="space-y-4">
              <Step n={1} done={run?.status === 'DONE'} title={t('Sab cheezein laayein')} text={t('Bayein se "Shopify se laayein" dabayein. Products aur stock Nafaa se hi chalenge.')} />
              <Step n={2} title={t('Website dekh lein')} text={t('Theme editor me design theek karein aur muft address par check karein.')} link={{ to: '/online-store/site/theme', label: t('Theme editor') }} />
              <Step n={3} title={t('Apna domain Nafaa par lagayein')} text={t('Domains page par apna domain add karein aur "Kaise karein" ke mutabiq domain company me likhein.')} link={{ to: '/online-store/site/domains', label: t('Domains') }} />
              <Step n={4} title={t('Hara nishan aane tak Shopify chalne dein')} text={t('Domain Nafaa par chal jaye (hara nishan + taala) tab tak Shopify store band na karein. Koi order nahi rukega.')} />
              <Step n={5} title={t('Shopify plan band karein')} text={t('Sab theek ho to Shopify ka plan band kar dein. Purane address Nafaa khud naye par bhej deta hai.')} />
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-success-50 p-3 text-[0.8125rem] text-success-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t('Nafaa Shopify me kuch nahi likhta ya mitata. Sirf parhta hai.')}
            </div>
          </Card>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Shopify se aana — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Laayein'), hint: t('Ek click'), icon: PackageCheck, color: '#2563eb' },
            { label: t('Dekh lein'), hint: t('Muft address par'), icon: CheckCircle2, color: '#7c3aed' },
            { label: t('Domain'), hint: t('Nafaa par'), icon: Globe, color: '#ea580c' },
            { label: t('Shopify band'), hint: t('Sab theek ho to'), icon: Rocket, color: '#16a34a' },
          ]}
          steps={[
            { icon: Lock, color: '#64748b', title: t('Taale wali cheezein'), text: t('Pages, blog, menu aur customers ke liye Shopify app ko extra ijazat chahiye. Nafaa support se baat karein.') },
            { icon: PackageCheck, color: '#2563eb', title: t('Dobara chalana'), text: t('Dobara chalane se pehle se aayi cheezein dobara nahi banti, sirf nayi aati hain.') },
          ]} />
      )}
    </>
  );
}

function Step({ n, title, text, done, link }: { n: number; title: string; text: string; done?: boolean; link?: { to: string; label: string } }) {
  return (
    <li className="flex gap-3">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold', done ? 'bg-success-100 text-success-700' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100')}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-semibold text-slate-900">{title}</p>
        <p className="text-[0.8125rem] text-slate-600">{text}</p>
        {link && <Link to={link.to} className="mt-1 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700">{link.label}<ArrowRight className="h-3.5 w-3.5 rtl-flip" /></Link>}
      </div>
    </li>
  );
}
