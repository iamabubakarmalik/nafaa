import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Copy, ExternalLink, Loader2, Search, XCircle } from 'lucide-react';
import { Button, Card, IconButton, Input } from '@/design-system/components';
import { cn } from '@core/lib/cn';
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
        <Card className="rounded-2xl" title="Mera order kahan hai?">
          <div className="grid gap-2 sm:grid-cols-[1fr_8.75rem_auto]">
            <Input size="lg" value={no} onChange={(e) => setNo(e.target.value.toUpperCase())} placeholder="Order # (jaise NF1A2B3C4D)" aria-label="Order number"
              className="font-mono uppercase" />
            <Input size="lg" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone ke aakhri 4" aria-label="Phone ke aakhri 4" inputMode="numeric" maxLength={11}
              onKeyDown={(e) => { if (e.key === 'Enter') check(); }} />
            <Button size="lg" onClick={check} disabled={busy} className="text-white" style={{ background: accent }}
              leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}>
              Dekhein
            </Button>
          </div>
          {err && <p className="mt-2 text-sm font-semibold text-rose-600">{err}</p>}
        </Card>

        {data && (
          <Card className="rounded-2xl">
            <div className="flex items-center gap-2">
              {data.closed ? <XCircle className="h-6 w-6 text-rose-500" /> : <CheckCircle2 className="h-6 w-6" style={{ color: accent }} />}
              <div className="text-lg font-bold text-slate-900">{data.label}</div>
            </div>
            <div className="mt-1 text-sm text-slate-500">Total <span className="tabular-nums">Rs {Math.round(data.total).toLocaleString('en-PK')}</span> · {data.paid ? <span className="font-semibold text-success-700">Paisa mil gaya</span> : 'Cash on delivery'}</div>

            {!data.closed && (
              <ol className="mt-5 space-y-3">
                {data.steps.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-3">
                    {s.at ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: accent }} /> : <Circle className={cn('h-5 w-5 shrink-0', i === reached ? 'text-slate-400' : 'text-slate-300')} />}
                    <div className={cn('flex-1 text-sm font-semibold', s.at ? 'text-slate-900' : 'text-slate-400')}>{s.label}</div>
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
                  <IconButton size="sm" label="Copy" onClick={() => navigator.clipboard?.writeText(data.courier!.trackingNumber)}><Copy className="h-4 w-4" /></IconButton>
                  {data.courier.site && (
                    <a href={data.courier.site} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
                      {data.courier.name} par dekhein <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Shell>
  );
}
