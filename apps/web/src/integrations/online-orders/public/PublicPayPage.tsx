import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Lock, XCircle } from 'lucide-react';
import { Alert, Button, Card, Input } from '@/design-system/components';
import { publicFetch } from './publicApi';
import { t as tr } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   CUSTOMER KA PAY SAFHA — /pay/:token. Dukaan ne WhatsApp par bheja.
   "Pay karein" → gateway (Safepay…) → wapas yahan, Nafaa ne pakki
   tasdeeq kar li to ✓.
   ═════════════════════════════════════════════════════════════ */

interface Info { shop: string; orderNumber: string; customer: string; amount: number; kind: 'FULL' | 'ADVANCE'; orderTotal: number; provider: string; methods: string[]; collect: ('mobile' | 'cnic')[]; status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'; returnUrl?: string | null }
type Checkout = { kind: 'redirect'; url: string } | { kind: 'form'; action: string; fields: Record<string, string> } | { kind: 'wallet'; status: 'PAID' | 'PENDING' | 'FAILED'; message: string | null };

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

/** Seconds before a paid buyer is taken back to the store's order page. */
const RETURN_AFTER = 6;

/** The store page from the API, used only when it is a plain https (or local dev) address. */
const safeReturn = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname.endsWith('.localhost')))) return u.toString();
  } catch { /* not a url */ }
  return null;
};

export default function PublicPayPage() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const checking = params.get('check') === '1';
  const cancelled = params.get('cancelled') === '1';
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ action: string; fields: Record<string, string> } | null>(null);
  const [mobile, setMobile] = useState('');
  const [cnic, setCnic] = useState('');
  const [walletWait, setWalletWait] = useState(false);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => publicFetch<Info>(`/integrations/payments/v2/link/${encodeURIComponent(token)}`)
      .then((d) => { if (alive) { setInfo(d); document.title = `${d.shop} — Payment`; } })
      .catch((e) => { if (alive) setErr(e.message); });
    load();
    // Gateway se wapas aaye — tasdeeq me thora waqt lag sakta hai
    const t = checking || walletMsg ? setInterval(load, 5000) : undefined;
    return () => { alive = false; if (t) clearInterval(t); };
  }, [token, checking, walletMsg]);

  useEffect(() => { if (form) formRef.current?.submit(); }, [form]);

  // Paid on a Nafaa Store order: back to the store's order page after a short pause.
  const back = safeReturn(info?.returnUrl);
  const paid = info?.status === 'PAID';
  const [left, setLeft] = useState(RETURN_AFTER);
  const [stay, setStay] = useState(false);
  useEffect(() => {
    if (!paid || !back || stay) return;
    if (left <= 0) { window.location.assign(back); return; }
    const h = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(h);
  }, [paid, back, stay, left]);

  const wallet = !!info?.collect?.length;
  const pay = async () => {
    setErr(null);
    if (wallet) {
      if (mobile.replace(/\D/g, '').length < 10) return setErr(tr('Apna {{provider}} number likhein (03xxxxxxxxx)', { provider: info!.provider }));
      if (info!.collect.includes('cnic') && cnic.replace(/\D/g, '').length < 6) return setErr(tr('CNIC ke aakhri 6 hindse likhein'));
    }
    setBusy(true);
    if (wallet) setWalletWait(true);
    try {
      const c = await publicFetch<Checkout>(`/integrations/payments/v2/link/${encodeURIComponent(token)}/start`, { method: 'POST', json: wallet ? { mobile, cnic } : {} });
      if (c.kind === 'redirect') window.location.href = c.url;
      else if (c.kind === 'form') setForm({ action: c.action, fields: c.fields });
      else {
        setWalletWait(false); setBusy(false);
        if (c.status === 'PAID') setInfo((i) => (i ? { ...i, status: 'PAID' } : i));
        else if (c.status === 'FAILED') setErr(tr('Payment nahi hui{{value}} — dobara try karein', { value: c.message ? `: ${c.message}` : '' }));
        else setWalletMsg(tr('Phone par approve karne ke baad yahan khud ✓ aa jayega…'));
      }
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
      setWalletWait(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md rounded-3xl p-1 sm:p-2">
        {!info && !err ? (
          <div className="flex justify-center p-10"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>
        ) : !info ? (
          <p className="p-6 text-center font-semibold text-slate-700">{err}</p>
        ) : (
          <>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-500">{info.shop}</div>
              <div className="mt-1 text-3xl font-black tabular-nums text-slate-900">{rs(info.amount)}</div>
              <div className="mt-1 text-sm text-slate-500">
                {tr('Order #{{orderNumber}}{{value}}', { orderNumber: info.orderNumber, value: info.kind === 'ADVANCE' ? tr(' · advance (kul {{orderTotal}}, baqi delivery par)', { orderTotal: rs(info.orderTotal) }) : '' })}
              </div>
            </div>

            {info.status === 'PAID' ? (
              <div className="mt-6 rounded-2xl bg-success-50 p-5 text-center ring-1 ring-success-200">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success-600" />
                <div className="mt-2 text-lg font-bold text-success-900">{tr('Payment ho gayi — shukriya {{customer}}! 🎉', { customer: info.customer })}</div>
                <p className="mt-1 text-sm text-success-800">{tr('{{shop}} ko khabar ho gayi hai.', { shop: info.shop })}</p>
                {back && (
                  <div className="mt-4">
                    <Button size="lg" fullWidth leftIcon={<ArrowLeft className="h-5 w-5" />} onClick={() => window.location.assign(back)}>
                      {tr('Wapas dukaan par')}
                    </Button>
                    {!stay && (
                      <p className="mt-2 text-xs text-success-800">
                        {tr('{{n}} second me khud wapas le jayenge', { n: Math.max(0, left) })}
                        {' · '}
                        <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setStay(true)}>{tr('Yahin rahein')}</button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : info.status === 'EXPIRED' || info.status === 'FAILED' ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-center">
                <XCircle className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">{tr('{{value}} {{shop}} se naya link maangein.', { value: info.status === 'EXPIRED' ? tr('Is link ki period khatam ho gayi.') : tr('Payment nahi hui.'), shop: info.shop })}</p>
              </div>
            ) : (
              <>
                {checking && (
                  <Alert tone="info" className="mt-5" icon={<Loader2 className="h-4 w-4 animate-spin text-blue-600" />} title={tr('Payment ki tasdeeq ho rahi hai…')} />
                )}
                {cancelled && <Alert tone="warning" className="mt-5" title={tr('Payment cancel ho gayi — dobara try kar sakte hain.')} />}
                {wallet && (
                  <div className="mt-5 space-y-2">
                    <Input size="lg" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" aria-label={tr('Mobile number')}
                      placeholder={tr('Apna {{provider}} number (03xxxxxxxxx)', { provider: info.provider })} />
                    {info.collect.includes('cnic') && (
                      <Input size="lg" value={cnic} onChange={(e) => setCnic(e.target.value)} inputMode="numeric" maxLength={15} aria-label={tr('CNIC')}
                        placeholder={tr('CNIC ke aakhri 6 hindse')} />
                    )}
                  </div>
                )}
                {walletWait && (
                  <Alert tone="info" className="mt-4" title={tr('📱 Apne phone par {{provider}} ka message dekhein aur MPIN / approve karein… (1 minute tak)', { provider: info.provider })} />
                )}
                {walletMsg && <Alert tone="info" className="mt-4" title={walletMsg} />}
                <Button size="xl" fullWidth className="mt-6" onClick={pay} disabled={busy}
                  leftIcon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}>
                  {tr('{{amount}} pay karein', { amount: rs(info.amount) })}
                </Button>
                <p className="mt-3 text-center text-xs text-slate-500">{tr('{{value}} — {{provider}} ke zariye', { value: info.methods.join(' · '), provider: info.provider })}</p>
                {err && <p className="mt-3 text-center text-sm font-semibold text-rose-600">{err}</p>}
              </>
            )}
            <p className="mt-6 flex items-center justify-center gap-1 text-[0.6875rem] text-slate-400"><Lock className="h-3 w-3" /> {' '}{tr('Card ki maloomat {{provider}} ke safhe par — Nafaa ya dukaan ke paas nahi aati', { provider: info.provider })}</p>
          </>
        )}
        {form && (
          <form ref={formRef} method="POST" action={form.action} className="hidden">
            {Object.entries(form.fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          </form>
        )}
      </Card>
    </div>
  );
}
