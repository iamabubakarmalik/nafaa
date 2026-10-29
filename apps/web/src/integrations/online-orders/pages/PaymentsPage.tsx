/**
 * Online payments: the shop connects its own gateway (Safepay, JazzCash,
 * Easypaisa). An order can then get a payment link for the full amount or an
 * advance; the customer pays by card or wallet, the money goes straight to
 * the shop's account and the order is marked paid after the gateway confirms.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, ExternalLink, Link2, Lock, MessageCircle, ShieldCheck, Unplug, Wallet, Zap } from 'lucide-react';
import {
  Badge, Button, confirmDialog, Input, PageHero, PageShell, Segmented, Skeleton, Switch, heroButton,
} from '@/design-system/components';
import { BrandLogo, brandForPayment } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, paymentsApi, type PayGatewayAccount } from '../api/online-orders.api';
import { whenText } from '../lib/labels';
import { GuideButton } from '../components/guides/Guide';
import { paymentGuide } from '../components/guides/paymentGuides';

export const PAY_KEY = ['payment-accounts'];

const HOW = [
  { icon: Link2, title: 'Gateway jorein', text: 'Neeche apna gateway ek dafa jorein — pehle Test, phir Live.' },
  { icon: MessageCircle, title: 'Order par link', text: 'Order kholein → Online payment → poori amount ya advance ka link → WhatsApp.' },
  { icon: ShieldCheck, title: 'Paisa pakka', text: 'Customer pay kare → gateway se tasdeeq → order par paisa, courier ka COD utna kam.' },
];

export default function PaymentsPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: PAY_KEY, queryFn: paymentsApi.accounts });
  const list = data ?? [];
  const connected = list.filter((g) => g.connected);
  const live = connected.filter((g) => g.active && g.env === 'live');

  return (
    <PageShell>
      <PageHero
        back="/online-orders" backLabel="Online orders"
        title="Online payments"
        chip={<><CreditCard />{connected.length} jure hue</>}
        meta="Customer se advance ya poori amount online lein — COD ka RTO khatra kam"
        loading={isLoading}
        actions={<Link to="/online-orders/cod" className={heroButton}><Wallet className="h-4 w-4" /><span className="hidden sm:inline">COD hisaab</span></Link>}
        stats={data ? [
          { label: 'Jure gateways', value: String(connected.length), hint: `${list.length} me se` },
          { label: 'Live (asli paisa)', value: String(live.length) },
          { label: 'Test mode', value: String(connected.filter((g) => g.env === 'sandbox').length) },
        ] : [{ label: 'Jure gateways', value: '' }]}
      />

      <ol className="grid gap-3 md:grid-cols-3">
        {HOW.map((h, i) => (
          <li key={h.title} className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><h.icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-[0.8125rem] font-semibold text-slate-900">{i + 1}. {h.title}</span>
              <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-slate-500">{h.text}</span>
            </span>
          </li>
        ))}
      </ol>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}</div>
      ) : error || !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Payments nahi khule</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {data.map((g) => <GatewayCard key={g.code} g={g} />)}
        </div>
      )}
    </PageShell>
  );
}

function GatewayCard({ g }: { g: PayGatewayAccount }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(!g.connected);
  const [env, setEnv] = useState<'sandbox' | 'live'>(g.env ?? 'sandbox');
  const [vals, setVals] = useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: PAY_KEY });

  const connect = useMutation({
    mutationFn: () => paymentsApi.connect(g.code, { credentials: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.trim()])), env }),
    onSuccess: () => { toast.success(`${g.name} jur gaya (${env === 'live' ? 'Live' : 'Test'})`); setVals({}); setOpen(false); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const active = useMutation({ mutationFn: (v: boolean) => paymentsApi.setActive(g.code, v), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e)) });
  const remove = useMutation({ mutationFn: () => paymentsApi.disconnect(g.code), onSuccess: () => { toast.success(`${g.name} hata diya`); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const missing = g.credentials.some((f) => !f.optional && !(vals[f.key] ?? '').trim());
  const status = !g.connected ? <Badge size="xs" variant="info">Jorna hai</Badge>
    : !g.active ? <Badge size="xs" dot>Band</Badge>
      : g.env === 'live' ? <Badge size="xs" variant="success" dot>Live</Badge> : <Badge size="xs" variant="warning" dot>Test mode</Badge>;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <header className="flex items-start gap-3">
        <BrandLogo name={brandForPayment(g.code)} size={44} title={g.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{g.name}</h2>
            {status}
          </div>
          <p className="mt-0.5 text-[0.75rem] text-slate-500">{g.methods.join(' · ')}</p>
          <p className="text-[0.75rem] text-slate-400">{g.fees}</p>
        </div>
        {g.connected && <Switch size="sm" checked={g.active} onChange={(e) => active.mutate(e.target.checked)} disabled={active.isPending} aria-label={`${g.name} chalu / band`} />}
      </header>

      {g.connected && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-600">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span className="min-w-0">Key <span className="font-mono">{g.maskedKey}</span>{g.connectedAt ? ` · ${whenText(g.connectedAt)} se` : ''}</span>
        </div>
      )}
      {g.connected && g.env === 'sandbox' && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.78125rem] font-medium text-amber-800">
          Test mode — asli paisa nahi katta. Test theek ho to &quot;Nayi key&quot; → Live keys lagayein.
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <Segmented label="Kahan jorna hai" value={env} onChange={setEnv} items={[{ value: 'sandbox', label: 'Test (sandbox)' }, { value: 'live', label: 'Live (asli paisa)' }]} />
          <div className={cn('grid gap-3', g.credentials.length > 1 && 'sm:grid-cols-2')}>
            {g.credentials.map((f) => (
              <Input size="sm" key={f.key} label={f.label} hint={f.help} type={f.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false} value={vals[f.key] ?? ''} placeholder={f.placeholder}
                onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} className="font-mono" />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> Encrypted save · sirf malik / manager</span>
            <Button size="sm" variant="primary" loading={connect.isPending} disabled={missing} onClick={() => connect.mutate()} leftIcon={<Zap className="h-4 w-4" />}>Check karke jorein</Button>
          </div>
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <GuideButton guide={paymentGuide(g)} label="Setup guide" size="xs" variant="ghost" />
        <a href={g.portalUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-slate-600 hover:bg-slate-100">
          {g.name} <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <span className="flex-1" />
        {g.connected && (
          <>
            <Button size="xs" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? 'Rehne dein' : 'Nayi key'}</Button>
            <Button size="xs" variant="critical" loading={remove.isPending} leftIcon={<Unplug className="h-3.5 w-3.5" />}
              onClick={async () => { if ((await confirmDialog({ title: `${g.name} hatayein?`, text: 'Bheje hue links kaam karna band kar denge.', danger: true }))) remove.mutate(); }}>Hatayein</Button>
          </>
        )}
      </footer>
    </section>
  );
}
