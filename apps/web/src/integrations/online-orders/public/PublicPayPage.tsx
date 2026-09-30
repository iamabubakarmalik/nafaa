import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, Lock, XCircle } from 'lucide-react';
import { publicFetch } from './publicApi';

/* ═════════════════════════════════════════════════════════════
   CUSTOMER KA PAY SAFHA — /pay/:token. Dukaan ne WhatsApp par bheja.
   "Pay karein" → gateway (Safepay…) → wapas yahan, Nafaa ne pakki
   tasdeeq kar li to ✓.
   ═════════════════════════════════════════════════════════════ */

interface Info { shop: string; orderNumber: string; customer: string; amount: number; kind: 'FULL' | 'ADVANCE'; orderTotal: number; provider: string; methods: string[]; status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' }
type Checkout = { kind: 'redirect'; url: string } | { kind: 'form'; action: string; fields: Record<string, string> };

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

export default function PublicPayPage() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const checking = params.get('check') === '1';
  const cancelled = params.get('cancelled') === '1';
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ action: string; fields: Record<string, string> } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => publicFetch<Info>(`/integrations/payments/v2/link/${encodeURIComponent(token)}`)
      .then((d) => { if (alive) { setInfo(d); document.title = `${d.shop} — Payment`; } })
      .catch((e) => { if (alive) setErr(e.message); });
    load();
    // Gateway se wapas aaye — tasdeeq me thora waqt lag sakta hai
    const t = checking ? setInterval(load, 5000) : undefined;
    return () => { alive = false; if (t) clearInterval(t); };
  }, [token, checking]);

  useEffect(() => { if (form) formRef.current?.submit(); }, [form]);

  const pay = async () => {
    setBusy(true); setErr(null);
    try {
      const c = await publicFetch<Checkout>(`/integrations/payments/v2/link/${encodeURIComponent(token)}/start`, { method: 'POST' });
      if (c.kind === 'redirect') window.location.href = c.url;
      else setForm({ action: c.action, fields: c.fields });
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">
        {!info && !err ? (
          <div className="flex justify-center p-10"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>
        ) : !info ? (
          <p className="p-6 text-center font-semibold text-slate-700">{err}</p>
        ) : (
          <>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-500">{info.shop}</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{rs(info.amount)}</div>
              <div className="mt-1 text-sm text-slate-500">
                Order #{info.orderNumber}{info.kind === 'ADVANCE' ? ` · advance (kul ${rs(info.orderTotal)}, baqi delivery par)` : ''}
              </div>
            </div>

            {info.status === 'PAID' ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <div className="mt-2 text-lg font-bold text-emerald-900">Payment ho gayi — shukriya {info.customer}! 🎉</div>
                <p className="mt-1 text-sm text-emerald-800">{info.shop} ko khabar ho gayi hai.</p>
              </div>
            ) : info.status === 'EXPIRED' || info.status === 'FAILED' ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-center">
                <XCircle className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">{info.status === 'EXPIRED' ? 'Is link ki muddat khatam ho gayi.' : 'Payment nahi hui.'} {info.shop} se naya link maangein.</p>
              </div>
            ) : (
              <>
                {checking && (
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-800">
                    <Loader2 className="h-4 w-4 animate-spin" /> Payment ki tasdeeq ho rahi hai…
                  </div>
                )}
                {cancelled && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-center text-sm font-semibold text-amber-800">Payment cancel ho gayi — dobara try kar sakte hain.</p>}
                <button onClick={pay} disabled={busy}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-bold text-white disabled:opacity-60">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />} {rs(info.amount)} pay karein
                </button>
                <p className="mt-3 text-center text-xs text-slate-500">{info.methods.join(' · ')} — {info.provider} ke zariye</p>
                {err && <p className="mt-3 text-center text-sm font-semibold text-rose-600">{err}</p>}
              </>
            )}
            <p className="mt-6 flex items-center justify-center gap-1 text-[11px] text-slate-400"><Lock className="h-3 w-3" /> Card ki maloomat {info.provider} ke safhe par — Nafaa ya dukaan ke paas nahi aati</p>
          </>
        )}
        {form && (
          <form ref={formRef} method="POST" action={form.action} className="hidden">
            {Object.entries(form.fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          </form>
        )}
      </div>
    </div>
  );
}
