/**
 * Meta delivered-order events (Conversions API) with the shop's own pixel:
 * the setup steps, the settings, a test send and the event log with retry.
 * Wording stays plain: the access token is "Meta se milne wala code".
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, PauseCircle, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import { Alert, Button, Segmented, Skeleton, Switch } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';
import { apiError } from '../api/growth.api';
import { MARKETING_KEY, marketingApi, type CapiEvent } from '../api/marketing.api';
import { rs } from '../ads/meta';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';

const STATUS: Record<CapiEvent['status'], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  SENT: { label: tr('Chala gaya'), cls: 'bg-success-50 text-success-700', icon: CheckCircle2 },
  PENDING: { label: tr('Line me'), cls: 'bg-amber-50 text-amber-700', icon: Clock },
  FAILED: { label: tr('Nahi gaya'), cls: 'bg-rose-50 text-rose-700', icon: XCircle },
  SKIPPED: { label: tr('Chhor diya'), cls: 'bg-slate-100 text-slate-600', icon: PauseCircle },
};

export function CapiPanel({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [MARKETING_KEY, 'capi'], queryFn: marketingApi.capi });
  const [status, setStatus] = useState<'' | CapiEvent['status']>('');
  const [page, setPage] = useState(1);
  const eventsQ = useQuery({ queryKey: [MARKETING_KEY, 'capi-events', status, page], queryFn: () => marketingApi.capiEvents({ status: status || undefined, page }), placeholderData: (p) => p });
  const s = q.data;
  const [pixelId, setPixelId] = useState('');
  const [token, setToken] = useState('');
  const [testCode, setTestCode] = useState('');
  useEffect(() => { if (s) { setPixelId(s.pixelId ?? ''); setTestCode(s.testCode ?? ''); } }, [s]);
  const refresh = () => qc.invalidateQueries({ queryKey: [MARKETING_KEY] });

  const save = useMutation({
    mutationFn: (b: Parameters<typeof marketingApi.saveCapi>[0]) => marketingApi.saveCapi(b),
    onSuccess: () => { toast.success(tr('Save ho gaya')); setToken(''); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  const test = useMutation({
    mutationFn: marketingApi.testCapi,
    onSuccess: (r) => {
      if (r.dryRun) toast.info(tr('Test mode me hai — Meta ko kuch nahi bheja gaya'));
      else if (r.ok) toast.success(tr('Test event chala gaya — Events Manager → Test events me dekhein'));
      else toast.error(r.message ?? tr('Test event nahi gaya'));
      refresh();
    },
    onError: (e) => toast.error(apiError(e, tr('Test nahi hua'))),
  });
  const retry = useMutation({
    mutationFn: (id: string) => marketingApi.retryCapi(id),
    onSuccess: () => { toast.success(tr('Dobara bheja')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi bheja'))),
  });

  if (!s) return <Skeleton className="h-96 rounded-3xl" />;
  const ready = !!s.pixelId && s.hasToken;

  return (
    <div className="space-y-4">
      {s.paused && <Alert tone="warning" title={tr('Abhi ruka hua hai')}>{tr('Nafaa ne Meta ko events bhejna thori der ke liye roka hai. Events line me hain aur baad me chale jayenge.')}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-start gap-3">
            <BrandLogo name="meta" size={36} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{tr('Meta ko delivered orders batayein')}</p>
              <p className="mt-0.5 text-[0.8125rem] text-slate-600">{tr('Jab order deliver hota hai, Nafaa aap ke pixel par Purchase bhejta hai. Meta phir wo log dhoondta hai jo sach me maal lete hain, sirf order karke wapas nahi karte.')}</p>
            </div>
            <Switch checked={s.enabled} disabled={!canManage || save.isPending || (!s.enabled && !ready)} onChange={(e) => save.mutate({ enabled: e.target.checked })} aria-label={tr('Meta events on karein')} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="capi-pixel" className={labelCls}>{tr('Pixel ID')}</label>
              <input id="capi-pixel" inputMode="numeric" value={pixelId} onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ''))} disabled={!canManage} placeholder="123456789012345" className={cn(inputCls, 'tabular-nums')} />
            </div>
            <div>
              <label htmlFor="capi-token" className={labelCls}>{tr('Meta se milne wala code')}</label>
              <input id="capi-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value.trim())} disabled={!canManage}
                placeholder={s.hasToken ? tr('Laga hua hai (…{{end}})', { end: s.tokenEnd ?? '' }) : tr('Yahan paste karein')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="capi-test" className={labelCls}>{tr('Test code (sirf check karne ke liye)')}</label>
              <input id="capi-test" value={testCode} onChange={(e) => setTestCode(e.target.value.trim())} disabled={!canManage} placeholder="TEST12345" className={inputCls} />
            </div>
            <div>
              <p className={labelCls}>{tr('Event ka naam')}</p>
              <Segmented value={s.eventName} onChange={(v) => save.mutate({ eventName: v })} label={tr('Event ka naam')}
                items={[{ value: 'Purchase', label: 'Purchase' }, { value: 'OrderDelivered', label: 'OrderDelivered' }]} />
            </div>
          </div>
          <p className="text-[0.75rem] text-slate-500">{tr('Agar website ka pixel order par pehle se Purchase bhejta hai to "OrderDelivered" chunein, taake ek order do baar na gina jaye.')}</p>
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700">
            <input type="checkbox" checked={s.sendCheckouts} disabled={!canManage} onChange={(e) => save.mutate({ sendCheckouts: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            {tr('Chhode hue checkout bhi bhejein (InitiateCheckout)')}
          </label>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button loading={save.isPending} onClick={() => save.mutate({ pixelId: pixelId || null, testCode: testCode || null, ...(token && { token }) })}>{tr('Save')}</Button>
              <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} loading={test.isPending} disabled={!ready} onClick={() => test.mutate()}>{tr('Test bhejein')}</Button>
              {s.hasToken && <Button variant="ghost" onClick={() => save.mutate({ token: null, enabled: false })}>{tr('Code hatayein')}</Button>}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 text-center">
            {([['sent', tr('Chale gaye')], ['pending', tr('Line me')], ['failed', tr('Nahi gaye')], ['skipped', tr('Chhor diye')]] as const).map(([k, l]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-2 py-2">
                <p className="text-lg font-bold tabular-nums text-slate-900">{s.last7[k]}</p>
                <p className="text-[0.6875rem] text-slate-500">{l} · {tr('7 din')}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-brand-600" /> {tr('Code kaise milega (5 minute)')}</p>
          <ol className="mt-3 list-decimal space-y-2 ps-5 text-[0.8125rem] text-slate-700">
            <li>{tr('business.facebook.com par Events Manager kholein.')}</li>
            <li>{tr('Apna pixel (dataset) chunein — us ka number Pixel ID hai.')}</li>
            <li>{tr('Settings → Conversions API → "Generate access token" dabayein.')}</li>
            <li>{tr('Jo lamba code mile wo yahan "Meta se milne wala code" me paste karein aur Save karein.')}</li>
            <li>{tr('Check karne ke liye: Test events tab se test code copy karein, yahan daal kar "Test bhejein".')}</li>
            <li>{tr('Sab theek ho to test code mita dein aur upar wala switch on karein.')}</li>
          </ol>
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
            {tr('Customer ka phone, email aur shehar Meta ke qaide ke mutabiq chhupa kar (hash) bheja jata hai. Sirf on karne ke baad deliver hone wale orders jate hain, 7 din tak purane.')}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <p className="font-semibold text-slate-900">{tr('Bheje gaye events')}</p>
          <Segmented value={status} onChange={(v) => { setStatus(v); setPage(1); }} label={tr('Status')}
            items={[{ value: '', label: tr('Sab') }, { value: 'SENT', label: STATUS.SENT.label }, { value: 'PENDING', label: STATUS.PENDING.label }, { value: 'FAILED', label: STATUS.FAILED.label }, { value: 'SKIPPED', label: STATUS.SKIPPED.label }]} />
        </div>
        {!eventsQ.data ? <Skeleton className="m-4 h-24 rounded-xl" /> : !eventsQ.data.items.length ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">{tr('Abhi koi event nahi. On karne ke baad jo order deliver hoga wo yahan dikhega.')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eventsQ.data.items.map((e) => {
              const st = STATUS[e.status];
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem]">
                  <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', st.cls)}><st.icon className="h-3.5 w-3.5" /> {st.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {e.eventName}{e.order ? ` · #${e.order.number} · ${e.order.customer}` : ''}{e.test ? ` · ${tr('test')}` : ''}
                    </p>
                    <p className="truncate text-[0.6875rem] text-slate-500">
                      {[new Date(e.sentAt ?? e.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
                        e.value != null ? rs(e.value) : null, e.attempts > 1 ? tr('{{count}} koshishein', { count: e.attempts }) : null, e.lastError].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {canManage && (e.status === 'FAILED' || e.status === 'SKIPPED') && e.eventName !== 'Test' && (
                    <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} disabled={retry.isPending} onClick={() => retry.mutate(e.id)}>{tr('Dobara')}</Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(eventsQ.data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
            <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: eventsQ.data!.pages })}</span>
            <Button variant="secondary" size="sm" disabled={page >= eventsQ.data!.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
