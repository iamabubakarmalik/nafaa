import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, Send, Terminal } from 'lucide-react';
import { CodeBlock } from '@integrations/_core/components/CodeBlock';
import { CopyField } from '../components/website/CopyField';
import { snippets } from '../lib/snippets';
import { docsUrl } from '../lib/docs';
import { Alert, Badge, Button, Card, Segmented } from '@/design-system/components';
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
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6"><Card className="max-w-md rounded-2xl text-center"><p className="font-semibold text-slate-800">{err}</p></Card></div>;
  }
  if (!info) return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>;

  const code = snippets(info.urls.orders, info.apiKey, info.secret);
  const live = !!info.lastOrder && !info.lastOrder.test;
  const LANGS = ['php', 'node', 'python', 'curl', 'json'] as const;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="rounded-2xl">
          <Badge variant="brand" size="sm" className="gap-1.5 uppercase tracking-wide"><Terminal className="h-3.5 w-3.5" /> Developer setup · Nafaa POS</Badge>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{info.business ?? info.channel} ki website ko Nafaa se jorein</h1>
          <p className="mt-1 text-sm text-slate-600">Website par order confirm hote hi (server se) neeche wala ek POST bhejein. Bas — order Nafaa me aa jayega, ghanti bajegi, bill aur stock khud.</p>
          <Alert className="mt-4" tone={live ? 'success' : info.lastOrder ? 'info' : 'warning'}
            icon={live ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <Clock className={info.lastOrder ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-amber-600'} />}
            title={live ? `Jur gaya ✅ — aakhri order #${info.lastOrder!.number ?? ''} aa chuka` : info.lastOrder ? 'Test order aa gaya — ab website ka asli order bhejein' : 'Intezar: pehla order abhi nahi aaya (ye safha khud update hota hai)'} />
        </Card>

        <Card className="rounded-2xl" title="1. Keys" description="Sirf server par rakhein (.env) — browser ke JavaScript me kabhi nahi.">
          <div className="grid gap-3 md:grid-cols-2">
            <CopyField label="Orders URL (POST)" value={info.urls.orders} />
            <CopyField label="Header: X-Nafaa-Key" value={info.apiKey} secret />
          </div>
          <div className="mt-3"><CopyField label="Signature secret (optional)" value={info.secret} secret hint="HMAC-SHA256(raw body, secret) → header X-Nafaa-Signature: sha256=<hex>" /></div>
        </Card>

        {!!info.branches?.length && (
          <Card className="rounded-2xl" title="Kai branches — har branch ka URL"
            description={<>
              Har branch ka order usi branch ke URL par bhejein — bill aur stock usi branch ka. Key sab ki ek hi.
              {info.platform === 'indolj' && <> Indolj: har branch ki General POS settings me <b>Call Back URL</b> aur <b>Cancel Call Back URL</b> dono yahi, <b>Token</b> = upar wali key.</>}
            </>}>
            <div className="space-y-2">
              {info.branches.map((b) => <CopyField key={b.id} label={b.name} value={b.ordersUrl} />)}
            </div>
          </Card>
        )}

        <Card className="rounded-2xl" title="2. Code (copy karein)">
          <Segmented className="mb-2" label="Zubaan" value={lang} onChange={setLang}
            items={LANGS.map((k) => ({ value: k, label: k === 'node' ? 'Node.js' : k === 'json' ? 'JSON format' : k.toUpperCase() }))} />
          <CodeBlock code={code[lang]} />
        </Card>

        <Card className="rounded-2xl" title="3. Check karein" description="Pehle ye test order bhejein — dukandar ke Nafaa me ghanti bajegi. Phir website se ek asli order karke dekhein.">
          <Button onClick={test} loading={testing} leftIcon={<Send className="h-4 w-4" />}>Test order bhejo</Button>
          {testMsg && <p className="mt-2 text-sm font-semibold text-slate-700">{testMsg}</p>}
        </Card>

        <Card className="rounded-2xl" title="Aur (optional)">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li><code className="text-[0.78125rem]">GET {info.urls.products}?page=1&amp;limit=100</code> — Nafaa ke products + asli stock (website par dikhane ke liye)</li>
            <li><code className="text-[0.78125rem]">GET {info.urls.stock}?skus=SKU1,SKU2</code> — sirf stock</li>
            <li><code className="text-[0.78125rem]">POST {info.urls.base}/orders/&#123;orderId&#125;/status</code> — customer ne cancel kiya: <code>{'{"status":"cancelled"}'}</code></li>
            <li><code className="text-[0.78125rem]">GET {info.urls.verify}</code> — key check</li>
          </ul>
          <p className="mt-3 text-sm text-slate-700">
            Poori reference (saare fields, errors, status webhook, signature):{' '}
            <a href={docsUrl('api')} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">Developer API guide</a>
          </p>
          <p className="mt-3 text-xs text-slate-500">Ye link 7 din chalega. Dukandar "Nayi key" banaye to ye link khud band ho jata hai.</p>
        </Card>
      </div>
    </div>
  );
}
