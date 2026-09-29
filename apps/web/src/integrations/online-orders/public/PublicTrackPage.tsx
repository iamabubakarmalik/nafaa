import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Copy, ExternalLink, Loader2, Search, XCircle } from 'lucide-react';
import { publicFetch } from './publicApi';
import { Shell, type Catalog } from './PublicOrderPage';

/* ═════════════════════════════════════════════════════════════
   CUSTOMER: "mera order kahan hai" — order # + phone ke aakhri 4.
   Sirf status dikhta hai (address / items nahi).
   ═════════════════════════════════════════════════════════════ */

interface Track {
  status: string; label: string; total: number; paid: boolean;
  steps: { key: string; label: string; at: string | null }[];
  closed: { label: string; at: string | null } | null;
  courier: { name: string; trackingNumber: string; site: string | null } | null;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

export default function PublicTrackPage() {
  const { key = '' } = useParams();
  const [params] = useSearchParams();
  const embed = params.get('embed') === '1';
  const [no, setNo] = useState(params.get('no') ?? '');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<Track | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shop, setShop] = useState<Pick<Catalog, 'shop' | 'logoUrl' | 'accent'> | null>(null);

  useEffect(() => {
    publicFetch<Catalog>(`/integrations/website/v1/form/${encodeURIComponent(key)}`).then((c) => { setShop(c); document.title = `${c.shop} — Order ka haal`; }).catch(() => null);
  }, [key]);

  const check = async () => {
    setErr(null); setData(null);
    if (!no.trim() || phone.replace(/\D/g, '').length < 4) return setErr('Order # aur phone ke aakhri 4 hindse likhein');
    setBusy(true);
    try {
      const q = new URLSearchParams({ no: no.trim(), phone: phone.replace(/\D/g, '').slice(-4) });
      setData(await publicFetch<Track>(`/integrations/website/v1/form/${encodeURIComponent(key)}/track?${q}`));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const accent = shop?.accent ?? '#059669';
  const reached = data ? data.steps.filter((s) => s.at).length : 0;

  return (
    <Shell embed={embed} onClose={() => window.parent?.postMessage('nafaa:close', '*')} title={shop?.shop ?? 'Order ka haal'} logo={shop?.logoUrl} accent={accent}
      right={<Link to={`/order/${key}${embed ? '?embed=1' : ''}`} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Shopping</Link>}>
      <div className="space-y-4 p-4 pb-16">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-bold text-slate-900">Mera order kahan hai?</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input value={no} onChange={(e) => setNo(e.target.value.toUpperCase())} placeholder="Order # (jaise NF1A2B3C4D)"
              className="rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-[15px] uppercase outline-none focus:border-slate-500" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone ke aakhri 4" inputMode="numeric" maxLength={11}
              onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-slate-500" />
            <button onClick={check} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: accent }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Dekhein
            </button>
          </div>
          {err && <p className="mt-2 text-sm font-semibold text-rose-600">{err}</p>}
        </div>

        {data && (
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2">
              {data.closed ? <XCircle className="h-6 w-6 text-rose-500" /> : <CheckCircle2 className="h-6 w-6" style={{ color: accent }} />}
              <div className="text-lg font-bold text-slate-900">{data.label}</div>
            </div>
            <div className="mt-1 text-sm text-slate-500">Total Rs {Math.round(data.total).toLocaleString('en-PK')} · {data.paid ? 'Paisa mil gaya' : 'Cash on delivery'}</div>

            {!data.closed && (
              <ol className="mt-5 space-y-3">
                {data.steps.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-3">
                    {s.at ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: accent }} /> : <Circle className={`h-5 w-5 shrink-0 ${i === reached ? 'text-slate-400' : 'text-slate-200'}`} />}
                    <div className={`flex-1 text-sm font-semibold ${s.at ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</div>
                    <div className="text-xs text-slate-400">{when(s.at)}</div>
                  </li>
                ))}
              </ol>
            )}

            {data.courier && (
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm">
                <div className="text-xs font-semibold text-slate-500">{data.courier.name} · tracking number</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900">{data.courier.trackingNumber}</span>
                  <button onClick={() => navigator.clipboard?.writeText(data.courier!.trackingNumber)} className="rounded p-1 text-slate-500 hover:bg-white" aria-label="Copy"><Copy className="h-4 w-4" /></button>
                  {data.courier.site && (
                    <a href={data.courier.site} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
                      {data.courier.name} par dekhein <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
