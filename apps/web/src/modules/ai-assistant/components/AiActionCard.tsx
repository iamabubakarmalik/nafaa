/**
 * A change the assistant proposes (sale, expense, price, stock, customer,
 * khata payment, purchase draft). Nothing is written until the user presses
 * Confirm; the proposal is single use and expires after a few minutes.
 *
 * Fields and line quantities can be edited first. Line totals are worked
 * out here for display only; the server checks and prices everything again.
 * Changed values go back as `fields` (`qty:<productId>` for line quantities).
 * After confirm, cancel or expiry the card turns read-only with the outcome.
 * Enter anywhere in the card confirms.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Loader2, WifiOff, XCircle } from 'lucide-react';
import { Button } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { aiApi, type AiActionProposal, type AiLink } from '../api';
import { isPushLayout, useAiStore, type ActionOutcome } from '../store';

const money = (n: number) => formatPKR(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const qtyText = (n: number) => Number(n.toFixed(3)).toLocaleString('en-PK');
const input = 'h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500';

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/** Seconds until expiry, ticking once a second while the card is open. */
function useSecondsLeft(expiresAt: string, active: boolean) {
  const end = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return Math.max(0, Math.floor((end - now) / 1000));
}

/** Opens an app page, with router state when given; steps the panel aside if it covers the page. */
export function useOpenLink() {
  const navigate = useNavigate();
  const setOpen = useAiStore((s) => s.setOpen);
  return (l: { to: string; state?: Record<string, unknown> }) => {
    if (!isPushLayout() && useAiStore.getState().open) setOpen(false);
    navigate(l.to, l.state ? { state: l.state } : undefined);
  };
}

function Outcome({ outcome, onLink }: { outcome: ActionOutcome; onLink: (l: AiLink) => void }) {
  const icon = outcome.status === 'done'
    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
    : outcome.status === 'cancelled'
      ? <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
      : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />;
  return (
    <div className="space-y-2">
      <p className="flex items-start gap-2 text-[0.8125rem] text-slate-700" role="status">{icon}<span>{outcome.message}</span></p>
      {outcome.links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {outcome.links.map((l) => (
            <button key={`${l.to}:${l.label}`} type="button" onClick={() => onLink(l)}
              className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                l.primary ? 'bg-brand-600 text-brand-fg hover:bg-brand-700' : 'border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100')}>
              {l.label} <ArrowUpRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AiActionCard({ action }: { action: AiActionProposal }) {
  const outcome = useAiStore((s) => s.actionOutcomes[action.id]);
  const setOutcome = useAiStore((s) => s.setActionOutcome);
  const openLink = useOpenLink();
  const online = useOnline();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(action.fields.map((f) => [f.key, f.value == null ? '' : String(f.value)])));
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries((action.lines ?? []).map((l) => [l.productId, String(l.qty)])));
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(action.expiresAt, !outcome);
  const expired = !outcome && secondsLeft <= 0;
  const final: ActionOutcome | null = outcome ?? (expired ? { status: 'expired', message: 'Waqt khatam — ye action ab nahi ho sakta. Dobara poochein.', links: [] } : null);

  const lines = useMemo(() => (action.lines ?? []).map((l) => {
    const q = Number(qty[l.productId]);
    const n = Number.isFinite(q) && q >= 0 ? q : l.qty;
    return { ...l, qty: n, total: Math.round(n * l.price * 100) / 100 };
  }), [action.lines, qty]);

  const totals = useMemo(() => {
    if (!action.totals) return null;
    if (!lines.length) return action.totals;
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    // Keep whatever the server added on top of the lines (discount, fees).
    const extra = action.totals.total - action.totals.subtotal;
    const total = Math.round((subtotal + extra) * 100) / 100;
    const paid = action.totals.paid;
    return { subtotal, total, paid, credit: paid != null ? Math.max(0, Math.round((total - paid) * 100) / 100) : action.totals.credit };
  }, [action.totals, lines]);

  const changed = (): Record<string, string | number> => {
    const out: Record<string, string | number> = {};
    for (const f of action.fields) {
      const v = values[f.key] ?? '';
      const before = f.value == null ? '' : String(f.value);
      if (v === before) continue;
      out[f.key] = f.type === 'number' || f.type === 'money' ? Number(v) : v;
    }
    for (const l of action.lines ?? []) {
      const v = qty[l.productId];
      if (v != null && Number(v) !== l.qty) out[`qty:${l.productId}`] = Number(v);
    }
    return out;
  };

  const confirm = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || final || !online) return;
    const missing = action.fields.find((f) => f.required && !(values[f.key] ?? '').trim());
    if (missing) { setError(`"${missing.label}" zaroori hai`); return; }
    setBusy('confirm');
    setError(null);
    try {
      const res = await aiApi.confirmAction(action.id, changed());
      setOutcome(action.id, { status: res.ok ? 'done' : 'failed', message: res.message, links: res.links ?? [] });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const body = axios.isAxiosError(err) ? (err.response?.data as { message?: string | string[]; error?: { message?: string } } | undefined) : undefined;
      const msg = (Array.isArray(body?.message) ? body?.message.join(', ') : body?.message) || body?.error?.message;
      if (status === 400) setError(msg || 'Kuch ghalat hai — fields check karein');
      else if (status === 410) setOutcome(action.id, { status: 'expired', message: msg || 'Ye action pehle hi ho chuka ya waqt khatam ho gaya.', links: [] });
      else if (status === 403) setOutcome(action.id, { status: 'failed', message: msg || 'Is kaam ki permission aap ke paas nahi.', links: [] });
      else setError(msg || 'Action nahi ho saka — internet check kar ke dobara koshish karein');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (busy || final) return;
    setBusy('cancel');
    try { await aiApi.cancelAction(action.id); } catch { /* the proposal expires on its own */ }
    setOutcome(action.id, { status: 'cancelled', message: 'Cancel kar diya — kuch save nahi hua.', links: [] });
    setBusy(null);
  };

  const readOnly = !!final || busy === 'confirm';
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <form
      onSubmit={confirm}
      aria-label={action.title}
      className={cn('rounded-xl border bg-white p-3 transition focus-within:ring-2 focus-within:ring-brand-500/20',
        final?.status === 'done' ? 'border-emerald-200' : final ? 'border-slate-200' : 'border-brand-200')}
      tabIndex={final ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); void confirm(); } }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[0.875rem] font-semibold text-slate-900">{action.title}</div>
          {action.summary && <div className="text-[0.75rem] text-slate-500">{action.summary}</div>}
        </div>
        {!final && (
          <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums',
            secondsLeft < 60 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')} title="Is waqt ke baad ye action khatam ho jayega">
            <Clock className="h-3 w-3" /> {mm}:{ss}
          </span>
        )}
      </div>

      {final ? (
        <Outcome outcome={final} onLink={openLink} />
      ) : (
        <div className="space-y-2.5">
          {action.warnings.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[0.75rem] text-amber-800">
              {action.warnings.map((w, i) => <li key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{w}</li>)}
            </ul>
          )}

          {action.fields.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {action.fields.map((f) => {
                const id = `af-${action.id}-${f.key}`;
                return (
                  <label key={f.key} htmlFor={id} className="block">
                    <span className="mb-0.5 block text-[0.6875rem] font-medium text-slate-500">{f.label}{f.required && ' *'}</span>
                    {f.type === 'select' ? (
                      <select id={id} className={input} disabled={readOnly} value={values[f.key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                        {!f.required && <option value="">—</option>}
                        {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input id={id} className={cn(input, f.type !== 'text' && 'text-right tabular-nums')} disabled={readOnly}
                        type={f.type === 'text' ? 'text' : 'number'} step="any" min={f.type === 'text' ? undefined : 0}
                        inputMode={f.type === 'text' ? undefined : 'decimal'}
                        value={values[f.key] ?? ''} required={f.required}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[0.75rem]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-1 pr-2 font-medium">Cheez</th>
                    <th className="w-20 py-1 pr-2 text-right font-medium">Qty</th>
                    <th className="py-1 pr-2 text-right font-medium">Rate</th>
                    <th className="py-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.productId} className="border-b border-slate-100 last:border-0">
                      <td className="py-1 pr-2 text-slate-800">
                        {l.name}
                        {l.stock != null && <span className={cn('block text-[0.6875rem]', l.qty > l.stock ? 'text-amber-700' : 'text-slate-400')}>Stock {qtyText(l.stock)} {l.unit}</span>}
                      </td>
                      <td className="py-1 pr-2">
                        <input aria-label={`${l.name} qty`} className={cn(input, 'h-7 text-right tabular-nums')} disabled={readOnly}
                          type="number" step="any" min={0} inputMode="decimal" value={qty[l.productId] ?? ''}
                          onChange={(e) => setQty((q) => ({ ...q, [l.productId]: e.target.value }))} />
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums text-slate-600">{money(l.price)}</td>
                      <td className="py-1 text-right font-medium tabular-nums text-slate-900">{money(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totals && (
            <dl className="space-y-0.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[0.75rem]">
              {totals.subtotal !== totals.total && <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>}
              <div className="flex justify-between font-semibold text-slate-900"><dt>Total</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
              {totals.paid != null && <div className="flex justify-between text-slate-600"><dt>Paid</dt><dd className="tabular-nums">{money(totals.paid)}</dd></div>}
              {totals.credit != null && totals.credit > 0 && <div className="flex justify-between text-amber-700"><dt>Udhaar</dt><dd className="tabular-nums">{money(totals.credit)}</dd></div>}
            </dl>
          )}

          {error && <p className="text-[0.75rem] text-rose-600" role="alert">{error}</p>}
          {!online && (
            <p className="flex items-center gap-1.5 text-[0.75rem] text-amber-700" role="status"><WifiOff className="h-3.5 w-3.5" /> Internet nahi — action abhi nahi ho sakta</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="submit" size="sm" disabled={!online || !!busy} leftIcon={busy === 'confirm' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}>
              {action.confirmLabel || 'Confirm'} <span className="ml-1 hidden text-[0.6875rem] opacity-70 sm:inline">(Enter)</span>
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={!!busy} onClick={cancel}>Cancel</Button>
            {action.alt && (
              <button type="button" onClick={() => openLink(action.alt!)}
                className="ml-auto inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                {action.alt.label} <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
