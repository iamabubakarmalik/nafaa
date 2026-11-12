/**
 * Domains: the free store address, adding the shop's own domain, the exact
 * DNS records to enter at the domain company (with copy buttons), live
 * verification while the records spread, and choosing the main address.
 * When the server cannot attach domains yet, the page says so plainly.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Clock, Copy, Globe, GraduationCap, Loader2, Lock, Plus, RefreshCw, ShieldCheck, Star, Trash2, XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Input, PageShell, Skeleton, confirmDialog, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { CopyField } from '@integrations/online-orders/components/website/CopyField';
import { storesApi, type DomainsState, type StoreDomain } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK } from '../lib/hooks';

export default function DomainsPage() {
  return (
    <PageShell>
      <StoreGate title={t('Domains')}>{(ctx) => <Domains ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const STATUS: Record<StoreDomain['status'], { label: string; variant: 'success' | 'warning' | 'info' | 'danger'; icon: typeof Clock }> = {
  ACTIVE: { label: t('Chal raha hai'), variant: 'success', icon: CheckCircle2 },
  PENDING: { label: t('Intezar'), variant: 'warning', icon: Clock },
  VERIFYING: { label: t('Check ho raha hai'), variant: 'info', icon: Loader2 },
  ERROR: { label: t('Masla hai'), variant: 'danger', icon: XCircle },
};

const cleanHost = (s: string) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
const validHost = (s: string) => /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(s);

function Domains({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const q = useQuery({ queryKey: SK.domains(id), queryFn: () => storesApi.domains(id) });
  const [host, setHost] = useState('');
  const setDomains = (domains: StoreDomain[]) => qc.setQueryData<DomainsState>(SK.domains(id), (old) => (old ? { ...old, domains } : old));

  const add = useMutation({
    mutationFn: () => storesApi.addDomain(id, cleanHost(host)),
    onSuccess: (r) => { setDomains(r.domains); setHost(''); toast.success(t('Domain add ho gaya. Ab neeche "Kaise karein" dekhein.')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const primary = useMutation({
    mutationFn: (domainId: string) => storesApi.primaryDomain(id, domainId),
    onSuccess: (r) => { setDomains(r.domains); void qc.invalidateQueries({ queryKey: SK.list }); toast.success(t('Ab yahi website ka asal address hai')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (domainId: string) => storesApi.removeDomain(id, domainId),
    onSuccess: (r) => { setDomains(r.domains); void qc.invalidateQueries({ queryKey: SK.list }); toast.success(t('Domain hata diya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const [checking, setChecking] = useState<string | null>(null);
  const verify = async (domainId: string, quiet = false) => {
    if (!quiet) setChecking(domainId);
    try {
      const d = await storesApi.verifyDomain(id, domainId);
      qc.setQueryData<DomainsState>(SK.domains(id), (old) => (old ? { ...old, domains: old.domains.map((x) => (x.id === d.id ? d : x)) } : old));
      if (!quiet) toast[d.status === 'ACTIVE' ? 'success' : 'message'](d.status === 'ACTIVE' ? t('Domain chal gaya!') : t('Abhi nahi mila. Domain company ki tabdeeli phailne me 10 minute se kuch ghante lagte hain.'));
    } catch (e) {
      if (!quiet) toast.error(apiErrorMessage(e));
    } finally {
      if (!quiet) setChecking(null);
    }
  };

  // Check waiting domains every 15 seconds while the page is open.
  const waiting = (q.data?.domains ?? []).filter((d) => d.status === 'PENDING' || d.status === 'VERIFYING').map((d) => d.id).join(',');
  useEffect(() => {
    if (!waiting) return;
    const h = setInterval(() => { waiting.split(',').forEach((d) => void verify(d, true)); }, 15_000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const data = q.data;
  const domains = data?.domains ?? [];
  const active = domains.filter((d) => d.status === 'ACTIVE').length;
  const main = domains.find((d) => d.isPrimary);
  const hostOk = validHost(cleanHost(host));

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Domains')} loading={q.isLoading}
        meta={t('Apna domain jorein, jaise www.apnidukaan.pk. SSL (taala) khud lagta hai.')}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[
          { label: t('Apne domain'), value: String(domains.length) },
          { label: t('Chal rahe'), value: String(active) },
          { label: t('Asal address'), value: main?.hostname ?? data?.subdomain.host ?? '—' },
          { label: t('SSL'), value: domains.length ? `${domains.filter((d) => d.sslReady).length}/${domains.length}` : t('Muft address par hai') },
        ]} />

      {q.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : !data ? (
        <Card><p className="text-[0.875rem] text-slate-600">{apiErrorMessage(q.error)}</p></Card>
      ) : (
        <>
          <Card title={t('Muft address')} description={t('Ye hamesha chalta hai. Apna domain lagane par ye us par bhej deta hai.')}
            actions={!main && <Badge variant="success" size="sm"><Star className="me-1 h-3 w-3" />{t('Asal address')}</Badge>}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <CopyField label={t('Website ka muft address')} value={data.subdomain.url} />
              <a href={data.subdomain.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
                <Globe className="h-4 w-4" />{t('Kholein')}
              </a>
            </div>
          </Card>

          <Card title={t('Apna domain jorein')} description={t('Domain kisi bhi company se lein (PKNIC, GoDaddy, Namecheap, Hostinger) aur yahan likhein. Hum batayenge kya karna hai.')}>
            {!data.ready ? (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-[0.875rem] font-semibold text-amber-900">{t('Domain jorna jald')}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-amber-800">{t('Apna domain jorne ki suhoolat jald shuru ho rahi hai. Tab tak muft address poori tarah chalta hai, aur aap ka domain tayyar rakhein.')}</p>
                </div>
              </div>
            ) : (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (hostOk) add.mutate(); }}>
                <div className="min-w-0 flex-1">
                  <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="www.apnidukaan.pk" leftIcon={<Globe className="h-4 w-4" />}
                    error={host && !hostOk ? t('Domain theek likhein, jaise www.apnidukaan.pk') : undefined} className="dir-ltr" />
                </div>
                <Button type="submit" disabled={!hostOk} loading={add.isPending} leftIcon={<Plus className="h-4 w-4" />}>{t('Domain add karein')}</Button>
              </form>
            )}
            <p className="mt-2 text-[0.75rem] text-slate-500">{t('www wala domain add karne par bina www wala bhi khud jur jata hai aur www par chala jata hai.')}</p>
          </Card>

          {domains.map((d) => (
            <DomainCard key={d.id} d={d} checking={checking === d.id} onVerify={() => void verify(d.id)}
              onPrimary={() => primary.mutate(d.id)} primaryBusy={primary.isPending && primary.variables === d.id}
              onRemove={async () => {
                if (await confirmDialog({ title: t('{{h}} hatayein?', { h: d.hostname }), text: t('Is address par website band ho jayegi. Muft address chalta rahega.'), yes: t('Hatayein'), danger: true })) remove.mutate(d.id);
              }} />
          ))}
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title={t('Apna domain — aasaan tareeqa')}
          description={t('Shopify se aa rahe hain? Domain yahan chalne tak Shopify store band na karein.')}
          onClose={guide.close}
          flow={[
            { label: t('Domain lein'), hint: t('PKNIC, GoDaddy...'), icon: Globe, color: '#2563eb' },
            { label: t('Yahan add karein'), hint: 'www.apnidukaan.pk', icon: Plus, color: '#7c3aed' },
            { label: t('Copy karke likhein'), hint: t('Domain company me'), icon: Copy, color: '#ea580c' },
            { label: t('Chal gaya'), hint: t('SSL khud lagta hai'), icon: ShieldCheck, color: '#16a34a' },
          ]}
          steps={[
            { icon: Plus, color: '#7c3aed', title: t('Domain add karein'), text: t('Upar dabbe me apna domain likhein. Nafaa batayega kaun se records dalne hain.') },
            { icon: Copy, color: '#ea580c', title: t('Domain company me likhein'), text: t('Har domain ke neeche "Kaise karein" kholein. Wahan har cheez ka copy button hai.') },
            { icon: RefreshCw, color: '#0d9488', title: t('Intezar'), text: t('Tabdeeli phailne me 10 minute se 24 ghante lagte hain. Ye page khud check karta rehta hai.') },
            { icon: Star, color: '#16a34a', title: t('Asal address'), text: t('Domain chal jaye to "Asal address banayein" dabayein. Muft address aur doosra domain khud is par aayenge.') },
          ]}
        />
      )}
    </>
  );
}

function DomainCard({ d, checking, onVerify, onPrimary, primaryBusy, onRemove }: {
  d: StoreDomain; checking: boolean; onVerify: () => void; onPrimary: () => void; primaryBusy: boolean; onRemove: () => void;
}) {
  const st = STATUS[d.status] ?? STATUS.PENDING;
  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast.success(t('Copy ho gaya')));
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="h-5 w-5 text-slate-400" />
        <p className="min-w-0 flex-1 truncate text-[1rem] font-semibold text-slate-900 dir-ltr">{d.hostname}</p>
        {d.isPrimary && <Badge variant="success" size="sm"><Star className="me-1 h-3 w-3" />{t('Asal address')}</Badge>}
        {d.redirectTo && <Badge size="sm">{t('{{h}} par bhejta hai', { h: d.redirectTo })}</Badge>}
        <Badge variant={st.variant} size="sm"><st.icon className={cn('me-1 h-3 w-3', d.status === 'VERIFYING' && 'animate-spin')} />{st.label}</Badge>
        {d.sslReady && <Badge variant="success" size="sm"><Lock className="me-1 h-3 w-3" />SSL</Badge>}
      </div>

      {d.error && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[0.8125rem] text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{d.error}
        </p>
      )}

      {d.status !== 'ACTIVE' && !d.redirectTo && d.records.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
          <p className="text-[0.875rem] text-slate-700">
            {t('Jahan se domain liya (GoDaddy, PKNIC, Namecheap...) wahan {{n}} cheez(ein) likhni hain. Phir ye page khud check karta rahega.', { n: d.records.length })}
          </p>
          <details className="group mt-2" open={d.records.every((r) => r.ok !== true)}>
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[0.875rem] font-semibold text-brand-700">
              <ChevronRight className="h-4 w-4 transition group-open:rotate-90 rtl-flip rtl:group-open:-rotate-90" />{t('Kaise karein')}
            </summary>
            <ol className="mt-3 space-y-3">
              <HowStep n={1} text={t('Domain company ki website par login karein aur apna domain kholein.')} />
              <HowStep n={2} text={t('"DNS", "DNS settings" ya "Manage DNS" dhoondein aur kholein.')} />
              <HowStep n={3} text={t('Is naam ke purane A ya CNAME record hon to hata dein (warna domain nahi chalega).')} />
              <HowStep n={4} text={t('"Add record" dabayein aur neeche wali har line copy karke dalein:')} />
            </ol>
            <div className="mt-3 space-y-2">
              {d.records.map((r, i) => (
                <div key={i} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-center">
                  <Pair label={t('Type')} value={r.type} onCopy={copy} />
                  <Pair label={t('Name / Host')} value={r.name} onCopy={copy} />
                  <Pair label={t('Value / Points to')} value={r.value} onCopy={copy} />
                  <span className="text-[0.75rem]">
                    {r.ok === true ? <span className="inline-flex items-center gap-1 font-semibold text-success-700"><CheckCircle2 className="h-4 w-4" />{t('Mil gaya')}</span>
                      : r.ok === false ? <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="h-4 w-4" />{t('Abhi nahi')}</span> : null}
                  </span>
                </div>
              ))}
            </div>
            <ol className="mt-3 space-y-3" start={5}>
              <HowStep n={5} text={t('Save karein. 10 minute se kuch ghante lag sakte hain. Hara nishan aate hi domain chal jayega, taala (SSL) khud lagega.')} />
            </ol>
            <p className="mt-2 text-[0.75rem] text-slate-500">{t('"@" ka matlab hai khali naam (sirf domain). Kuch companies me Name me poora domain likhna hota hai.')}</p>
          </details>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {d.status !== 'ACTIVE' && <Button size="sm" variant="secondary" loading={checking} onClick={onVerify} leftIcon={<RefreshCw className="h-4 w-4" />}>{t('Abhi check karein')}</Button>}
        {d.status === 'ACTIVE' && !d.isPrimary && !d.redirectTo && <Button size="sm" loading={primaryBusy} onClick={onPrimary} leftIcon={<Star className="h-4 w-4" />}>{t('Asal address banayein')}</Button>}
        <span className="flex-1" />
        {d.lastCheckedAt && <span className="text-[0.75rem] text-slate-400">{t('Aakhri check {{time}}', { time: new Date(d.lastCheckedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) })}</span>}
        <Button size="sm" variant="ghost" onClick={onRemove} leftIcon={<Trash2 className="h-4 w-4" />} className="text-rose-600">{t('Hatayein')}</Button>
      </div>
    </Card>
  );
}

function HowStep({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[0.75rem] font-bold text-brand-700 ring-1 ring-brand-100">{n}</span>
      <span className="pt-0.5 text-[0.8125rem] text-slate-700">{text}</span>
    </li>
  );
}

function Pair({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <span className="flex items-center gap-1">
        <code className="min-w-0 truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.78125rem] font-semibold text-slate-800 dir-ltr">{value}</code>
        <button type="button" onClick={() => onCopy(value)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t('Copy')}><Copy className="h-3.5 w-3.5" /></button>
      </span>
    </div>
  );
}
