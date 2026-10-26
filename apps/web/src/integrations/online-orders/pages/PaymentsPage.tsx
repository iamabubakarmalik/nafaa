import { Badge, Button, Card, confirmDialog, EmptyState, Input, PageHero, PageShell, Segmented, Switch } from '@/design-system/components';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, ExternalLink, Lock, Unplug, Zap } from 'lucide-react';
import { apiErrorMessage, paymentsApi, type PayGatewayAccount } from '../api/online-orders.api';
import { whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   PAYMENTS — dukaan apna gateway (Safepay…) jorti hai. Phir order par
   "Payment link" (poori raqam ya advance) — customer card / wallet se
   pay kare, paisa seedha dukaan ke account me, order khud "paid".
   ═════════════════════════════════════════════════════════════ */

export const PAY_KEY = ['payment-accounts'];

export default function PaymentsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: PAY_KEY, queryFn: paymentsApi.accounts });
  return (
    <PageShell>
      <PageHero back="/online-orders" backLabel="Online orders" title="Online payments"
        subtitle="Customer se advance ya poori amount online lein — COD ka RTO khatra kam. Paisa seedha aap ke account me." />
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-ink-800" />
        : error || !data ? <Card><EmptyState title="Payments nahi khule" description={apiErrorMessage(error)} /></Card>
        : (
          <>
            <Card title="Kaise kaam karta hai">
              <ol className="grid gap-2 text-[0.8125rem] text-slate-700 dark:text-ink-200 sm:grid-cols-3">
                <li><b>1.</b> Neeche apna gateway jorein (sirf ek dafa)</li>
                <li><b>2.</b> Order par "Payment link" → poori amount ya advance (jaise delivery charges) → WhatsApp</li>
                <li><b>3.</b> Customer pay kare → Nafaa gateway se pakki tasdeeq → order par paisa, courier ka COD utna kam</li>
              </ol>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.map((g) => <GatewayCard key={g.code} g={g} />)}
            </div>
          </>
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
    mutationFn: () => paymentsApi.connect(g.code, { credentials: vals, env }),
    onSuccess: () => { toast.success(`${g.name} jur gaya ✓ (${env === 'live' ? 'Live' : 'Test'})`); setVals({}); setOpen(false); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const active = useMutation({ mutationFn: (v: boolean) => paymentsApi.setActive(g.code, v), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e)) });
  const remove = useMutation({ mutationFn: () => paymentsApi.disconnect(g.code), onSuccess: () => { toast.success(`${g.name} hata diya`); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const missing = g.credentials.some((f) => !f.optional && !(vals[f.key] ?? '').trim());

  return (
    <Card
      title={<span className="flex items-center gap-2"><CreditCard className="h-4 w-4" style={{ color: g.color }} /> {g.name}
        {g.connected ? <Badge size="xs" variant={g.active ? 'success' : 'default'} dot>{g.active ? (g.env === 'live' ? 'Live' : 'Test mode') : 'Band'}</Badge> : <Badge size="xs" variant="info">Jorna hai</Badge>}</span>}
      description={`${g.methods.join(' · ')} — ${g.fees}`}
      actions={g.connected ? <Switch size="sm" checked={g.active} onChange={(e) => active.mutate(e.target.checked)} disabled={active.isPending} /> : undefined}>
      {g.connected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-slate-600 dark:text-ink-300">
          <CheckCircle2 className="h-4 w-4 text-success-600" /> Key <span className="font-mono">{g.maskedKey}</span> · jura {g.connectedAt ? whenText(g.connectedAt) : ''}
          <span className="flex-1" />
          <Button size="xs" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? 'Rehne dein' : 'Nayi key'}</Button>
          <Button size="xs" variant="critical" loading={remove.isPending} leftIcon={<Unplug className="h-3.5 w-3.5" />}
            onClick={async () => { if ((await confirmDialog({ title: `${g.name} hatayein?`, text: 'Purane links kaam karna band kar denge.', danger: true }))) remove.mutate(); }}>Hatayein</Button>
        </div>
      )}
      {g.connected && g.env === 'sandbox' && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.78125rem] font-semibold text-amber-800">
          Test mode — asli paisa nahi katta. Test ho jaye to live keys ke saath "Nayi key" → Live.
        </p>
      )}
      {open && (
        <div className="space-y-3">
          <ol className="space-y-1 rounded-lg bg-slate-50 p-3 text-[0.8125rem] text-slate-700 dark:bg-ink-800/40 dark:text-ink-200">
            {g.steps.map((s, i) => <li key={i}><b>{i + 1}.</b> {s}</li>)}
            <li className="flex flex-wrap gap-3 pt-1">
              <a href={g.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">{g.name} kholein <ExternalLink className="h-3.5 w-3.5" /></a>
              {g.sandboxUrl && <a href={g.sandboxUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">Test (sandbox) account <ExternalLink className="h-3.5 w-3.5" /></a>}
            </li>
          </ol>
          <Segmented value={env} onChange={setEnv} items={[{ value: 'sandbox', label: 'Test (sandbox)' }, { value: 'live', label: 'Live (asli paisa)' }]} />
          <div className={cn('grid gap-3', g.credentials.length > 1 && 'sm:grid-cols-2')}>
            {g.credentials.map((f) => (
              <Input size="sm" key={f.key} label={f.label} hint={f.help} type={f.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false} value={vals[f.key] ?? ''} placeholder={f.placeholder}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} className="font-mono" />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> Keys encrypted · sirf malik / manager</span>
            <Button size="sm" variant="primary" loading={connect.isPending} disabled={missing} onClick={() => connect.mutate()} leftIcon={<Zap className="h-4 w-4" />}>Check karke jorein</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
