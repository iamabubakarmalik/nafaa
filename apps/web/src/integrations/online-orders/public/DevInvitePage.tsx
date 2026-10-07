import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, Send, Terminal } from 'lucide-react';
import { CodeBlock } from '@integrations/_core/components/CodeBlock';
import { CopyField } from '../components/website/CopyField';
import { snippets } from '../lib/snippets';
import { docsUrl } from '../lib/docs';
import { publicFetch } from './publicApi';

/* ═════════════════════════════════════════════════════════════
   DEVELOPER SETUP — dukandar ne WhatsApp par ye link bheja. Yahan
   sab kuch hai: keys, tayyar code, test button, aur live haal —
   pehla order aate hi ✅ (dukandar ke Nafaa me bhi).
   ═════════════════════════════════════════════════════════════ */

interface Info {
  business: string | null; channel: string; apiKey: string; secret: string;
  urls: { base: string; orders: string; products: string; stock: string; verify: string };
  connected: boolean; lastOrder: { at: string; number: string | null; test: boolean } | null;
  branches?: Array<{ id: string; name: string; ordersUrl: string }>;
  platform?: string;
}

export default function DevInvitePage() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<'php' | 'node' | 'python' | 'curl' | 'json'>('php');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => publicFetch<Info>(`/integrations/website/v1/dev/${encodeURIComponent(token)}`)
      .then((d) => { if (alive) { setInfo(d); setErr(null); } })
      .catch((e) => { if (alive) setErr(e.message); });
    load();
    const t = setInterval(load, 5000); // live: pehla order aaya?
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  const test = async () => {
    setTesting(true); setTestMsg(null);
    try {
      const r = await publicFetch<{ message: string }>(`/integrations/website/v1/dev/${encodeURIComponent(token)}/test`, { method: 'POST' });
      setTestMsg(r.message);
    } catch (e: any) {
      setTestMsg(e.message);
    } finally {
      setTesting(false);
    }
  };

  if (err && !info) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6"><div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><p className="font-semibold text-slate-800">{err}</p></div></div>;
  }
  if (!info) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>;

  const code = snippets(info.urls.orders, info.apiKey, info.secret);
  const live = !!info.lastOrder && !info.lastOrder.test;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-emerald-700"><Terminal className="h-4 w-4" /> Developer setup · Nafaa POS</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{info.business ?? info.channel} ki website ko Nafaa se jorein</h1>
          <p className="mt-1 text-sm text-slate-600">Website par order confirm hote hi (server se) neeche wala ek POST bhejein. Bas — order Nafaa me aa jayega, ghanti bajegi, bill aur stock khud.</p>
          <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${live ? 'bg-emerald-50 text-emerald-800' : info.lastOrder ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`}>
            {live ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {live ? `Jur gaya ✅ — aakhri order #${info.lastOrder!.number ?? ''} aa chuka` : info.lastOrder ? 'Test order aa gaya — ab website ka asli order bhejein' : 'Intezar: pehla order abhi nahi aaya (ye safha khud update hota hai)'}
          </div>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">1. Keys</h2>
          <p className="mt-0.5 text-sm text-slate-600">Sirf server par rakhein (.env) — browser ke JavaScript me kabhi nahi.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <CopyField label="Orders URL (POST)" value={info.urls.orders} />
            <CopyField label="Header: X-Nafaa-Key" value={info.apiKey} secret />
          </div>
          <div className="mt-3"><CopyField label="Signature secret (optional)" value={info.secret} secret hint="HMAC-SHA256(raw body, secret) → header X-Nafaa-Signature: sha256=<hex>" /></div>
        </section>

        {!!info.branches?.length && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Kai branches — har branch ka URL</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Har branch ka order usi branch ke URL par bhejein — bill aur stock usi branch ka. Key sab ki ek hi.
              {info.platform === 'indolj' && <> Indolj: har branch ki General POS settings me <b>Call Back URL</b> aur <b>Cancel Call Back URL</b> dono yahi, <b>Token</b> = upar wali key.</>}
            </p>
            <div className="mt-3 space-y-2">
              {info.branches.map((b) => <CopyField key={b.id} label={b.name} value={b.ordersUrl} />)}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">2. Code (copy karein)</h2>
          <div className="mb-2 mt-3 flex flex-wrap gap-1">
            {(['php', 'node', 'python', 'curl', 'json'] as const).map((k) => (
              <button key={k} onClick={() => setLang(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${lang === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {k === 'node' ? 'Node.js' : k === 'json' ? 'JSON format' : k.toUpperCase()}
              </button>
            ))}
          </div>
          <CodeBlock code={code[lang]} />
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">3. Check karein</h2>
          <p className="mt-0.5 text-sm text-slate-600">Pehle ye test order bhejein — dukandar ke Nafaa me ghanti bajegi. Phir website se ek asli order karke dekhein.</p>
          <button onClick={test} disabled={testing} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test order bhejo
          </button>
          {testMsg && <p className="mt-2 text-sm font-semibold text-slate-700">{testMsg}</p>}
        </section>

        <section className="rounded-2xl bg-white p-6 text-sm text-slate-700 shadow-sm">
          <h2 className="font-bold text-slate-900">Aur (optional)</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><code className="text-[12.5px]">GET {info.urls.products}?page=1&amp;limit=100</code> — Nafaa ke products + asli stock (website par dikhane ke liye)</li>
            <li><code className="text-[12.5px]">GET {info.urls.stock}?skus=SKU1,SKU2</code> — sirf stock</li>
            <li><code className="text-[12.5px]">POST {info.urls.base}/orders/&#123;orderId&#125;/status</code> — customer ne cancel kiya: <code>{'{"status":"cancelled"}'}</code></li>
            <li><code className="text-[12.5px]">GET {info.urls.verify}</code> — key check</li>
          </ul>
          <p className="mt-3 text-sm">
            Poori reference (saare fields, errors, status webhook, signature):{' '}
            <a href={docsUrl('api')} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">Developer API guide</a>
          </p>
          <p className="mt-3 text-xs text-slate-500">Ye link 7 din chalega. Dukandar "Nayi key" banaye to ye link khud band ho jata hai.</p>
        </section>
      </div>
    </div>
  );
}
