import { Alert, Badge, Button, Card, confirmDialog, EmptyState, Field, Input, PageHero, PageShell, Segmented, Switch, Table, TBody, Td, Tr } from '@/design-system/components';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, KeyRound, Plus, RefreshCw, Send, Trash2, Webhook, Zap } from 'lucide-react';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { whenText } from '@integrations/online-orders/lib/labels';
import { cn } from '@core/lib/cn';
import { API_BASE, developerApi, type DeveloperOverview, type WebhookRow } from './developer.api';

/* ═════════════════════════════════════════════════════════════
   DEVELOPER — Nafaa ko kisi bhi software se jorein: Zapier, Make,
   Google Sheets, apna ERP / app. API key se data parhein, webhook se
   har nayi sale / order / customer ki turant khabar.
   ═════════════════════════════════════════════════════════════ */

const KEY = ['developer'];

const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success('Copy ho gaya'), () => toast.error('Copy nahi hua'));

export default function DeveloperPage() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: developerApi.overview, refetchInterval: 30_000 });
  const [secret, setSecret] = useState<{ title: string; value: string } | null>(null);

  return (
    <PageShell>
      <PageHero back="/settings" backLabel="Settings" title="API & Webhooks"
        subtitle="Nafaa ko Zapier, Make, Google Sheets ya apne software se jorein — bina kisi developer ke intezar ke." />
      {secret && (
        <Alert tone="warning" title={secret.title}
          action={<Button size="xs" onClick={() => setSecret(null)}>Likh liya</Button>}>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 font-mono text-[0.78125rem] text-slate-900 dark:bg-ink-900 dark:text-ink-white">{secret.value}</code>
            <Button size="xs" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(secret.value)}>Copy</Button>
          </div>
          <p className="mt-1 text-[0.78125rem]">Ye sirf abhi dikh raha hai — dobara nahi dikhega. Kho jaye to nayi bana lein.</p>
        </Alert>
      )}

      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-ink-800" />
        : error || !data ? <Card><EmptyState title="Safha nahi khula" description={apiErrorMessage(error)} /></Card>
        : (
          <>
            <QuickStart />
            <KeysCard data={data} onSecret={setSecret} />
            <HooksCard data={data} onSecret={setSecret} />
            <LogCard data={data} />
            <DocsCard />
          </>
        )}
    </PageShell>
  );
}

function QuickStart() {
  return (
    <Card title={<span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Aasaan tareeqa — Zapier / Make</span>}>
      <div className="grid gap-4 text-[0.8125rem] text-slate-700 dark:text-ink-200 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-semibold text-slate-900 dark:text-ink-white">Har nayi sale Google Sheet me</div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Zapier me Zap banayein → Trigger: <b>Webhooks by Zapier → Catch Hook</b></li>
            <li>Jo URL mile, neeche <b>Webhook jorein</b> me daalein, event <b>sale.created</b></li>
            <li>"Test bhejein" dabayein → Zapier me Action: <b>Google Sheets → Create row</b></li>
          </ol>
        </div>
        <div>
          <div className="mb-1 font-semibold text-slate-900 dark:text-ink-white">Make.com / n8n / apna server</div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Make me <b>Webhooks → Custom webhook</b> (n8n: Webhook node)</li>
            <li>URL neeche daalein aur events chunein</li>
            <li>Nafaa se data parhna ho (products, stock) to <b>API key</b> banayein</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}

function KeysCard({ data, onSecret }: { data: DeveloperOverview; onSecret: (s: { title: string; value: string }) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const create = useMutation({
    mutationFn: () => developerApi.createKey({ name, scope }),
    onSuccess: (r) => { onSecret({ title: `Nayi API key — ${name}`, value: r.key }); setName(''); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: developerApi.revokeKey,
    onSuccess: () => { toast.success('Key band — ab kaam nahi karegi'); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Card title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> API keys</span>}
      description="Doosra software is key se aap ka data parhta hai. Har software ki alag key — koi ek band karni ho to baqi chalti rahein.">
      <div className="space-y-3">
        {data.keys.length === 0 ? <p className="text-[0.8125rem] text-slate-500">Abhi koi key nahi.</p> : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-ink-800 dark:border-ink-800">
            {data.keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[0.8125rem]">
                <span className="font-semibold text-slate-900 dark:text-ink-white">{k.name}</span>
                <Badge size="xs" variant={k.scope === 'write' ? 'warning' : 'default'}>{k.scope === 'write' ? 'Parhna + likhna' : 'Sirf parhna'}</Badge>
                <code className="font-mono text-[0.75rem] text-slate-500">{k.preview}</code>
                <span className="flex-1" />
                <span className="text-[0.75rem] text-slate-500">{k.lastUsedAt ? `istemal ${whenText(k.lastUsedAt)}` : 'abhi istemal nahi hui'}</span>
                <Button size="xs" variant="critical" loading={revoke.isPending && revoke.variables === k.id}
                  onClick={async () => { if ((await confirmDialog({ title: `"${k.name}" key band karein?`, text: 'Jo software is se jura hai wo ruk jayega.', danger: true }))) revoke.mutate(k.id); }}>Band karein</Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Input size="sm" label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zapier, Mera ERP…" className="w-56" />
          <Segmented value={scope} onChange={setScope} items={[{ value: 'read', label: 'Sirf parhna' }, { value: 'write', label: '+ Customer banana' }]} />
          <Button size="sm" variant="primary" disabled={!name.trim()} loading={create.isPending} leftIcon={<Plus className="h-4 w-4" />} onClick={() => create.mutate()}>Key banayein</Button>
        </div>
      </div>
    </Card>
  );
}

function HooksCard({ data, onSecret }: { data: DeveloperOverview; onSecret: (s: { title: string; value: string }) => void }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['sale.created']);
  const [desc, setDesc] = useState('');
  const [open, setOpen] = useState(data.endpoints.length === 0);

  const create = useMutation({
    mutationFn: () => developerApi.createHook({ url, events, description: desc }),
    onSuccess: (r) => {
      onSecret({ title: 'Webhook signing secret (sirf apne server ke liye — Zapier/Make ko zaroorat nahi)', value: r.secret });
      setUrl(''); setDesc(''); setOpen(false); refresh();
      toast.success('Webhook jur gaya — "Test bhejein" se check karein');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleEv = (t: string) => setEvents((v) => (t === '*' ? ['*'] : v.includes(t) ? v.filter((x) => x !== t) : [...v.filter((x) => x !== '*'), t]));

  return (
    <Card title={<span className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhooks {data.pendingRetries > 0 && <Badge size="xs" variant="warning">{data.pendingRetries} dobara bhejne ki qatar me</Badge>}</span>}
      description="Nafaa me kuch ho to 1 minute ke andar aap ke URL par khabar. Fail ho to Nafaa khud 6 dafa dobara bhejta hai."
      actions={!open ? <Button size="xs" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Webhook jorein</Button> : undefined}>
      <div className="space-y-3">
        {data.endpoints.map((h) => <HookRow key={h.id} h={h} labels={data.events} onSecret={onSecret} />)}
        {open && (
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-3 dark:border-ink-700">
            <Input size="sm" label="URL" hint="https:// wala — Zapier 'Catch Hook', Make 'Custom webhook', ya apna server" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/…" className="font-mono" />
            <Field label="Kaun se waqiat">
              {() => (<div className="flex flex-wrap gap-1.5">
                <EvChip on={events.includes('*')} onClick={() => toggleEv('*')}>Sab</EvChip>
                {data.events.map((e) => <EvChip key={e.type} on={events.includes(e.type)} onClick={() => toggleEv(e.type)} title={e.type}>{e.label}</EvChip>)}
              </div>)}
            </Field>
            <Input size="sm" label="Note (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Sales → Google Sheet" />
            <div className="flex justify-end gap-2">
              {data.endpoints.length > 0 && <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Rehne dein</Button>}
              <Button size="sm" variant="primary" disabled={!url.trim() || !events.length} loading={create.isPending} onClick={() => create.mutate()}>Jorein</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function EvChip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={cn('rounded-full border px-2.5 py-1 text-[0.75rem] font-medium transition',
        on ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-ink-700 dark:text-ink-300')}>
      {children}
    </button>
  );
}

function HookRow({ h, labels, onSecret }: { h: WebhookRow; labels: { type: string; label: string }[]; onSecret: (s: { title: string; value: string }) => void }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const on = useMutation({ mutationFn: (active: boolean) => developerApi.updateHook(h.id, { active }), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e)) });
  const test = useMutation({
    mutationFn: () => developerApi.testHook(h.id),
    onSuccess: (r) => { r.ok ? toast.success(`Pohanch gaya ✓ (${r.status}, ${r.ms}ms)`) : toast.error(`Nahi pohancha: ${r.error}`); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const rotate = useMutation({ mutationFn: () => developerApi.rotateSecret(h.id), onSuccess: (r) => onSecret({ title: 'Naya signing secret', value: r.secret }), onError: (e) => toast.error(apiErrorMessage(e)) });
  const del = useMutation({ mutationFn: () => developerApi.removeHook(h.id), onSuccess: () => { toast.success('Webhook hata diya'); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const evText = h.events.includes('*') ? 'Sab waqiat' : h.events.map((t) => labels.find((l) => l.type === t)?.label ?? t).join(' · ');

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-ink-800">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[0.78125rem] text-slate-900 dark:text-ink-white" title={h.url}>{h.url}</code>
        {h.source === 'api' && <Badge size="xs" variant="info">Zapier/Make ne khud jora</Badge>}
        {h.active ? (h.failCount > 0 ? <Badge size="xs" variant="warning" dot>{h.failCount} fail</Badge> : <Badge size="xs" variant="success" dot>Chal raha</Badge>) : <Badge size="xs" variant="default">Band</Badge>}
        <Switch size="sm" checked={h.active} onChange={(e) => on.mutate(e.target.checked)} disabled={on.isPending} />
      </div>
      <div className="mt-1 text-[0.78125rem] text-slate-600 dark:text-ink-300">{h.description ? `${h.description} — ` : ''}{evText}</div>
      <div className="mt-1 text-[0.75rem] text-slate-500">
        {h.lastSuccessAt && <>Aakhri kamyabi {whenText(h.lastSuccessAt)} · </>}
        {h.lastFailureAt && <span className="text-rose-600">Aakhri ghalti {whenText(h.lastFailureAt)}: {h.lastError}</span>}
        {h.disabledReason && <div className="font-semibold text-rose-600">{h.disabledReason}</div>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="xs" loading={test.isPending} leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => test.mutate()}>Test bhejein</Button>
        <Button size="xs" variant="ghost" loading={rotate.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={async () => { if ((await confirmDialog({ title: 'Naya secret banayein?', text: 'Purane se signature check karne wala server fail hoga.', danger: true }))) rotate.mutate(); }}>Naya secret</Button>
        <Button size="xs" variant="critical" loading={del.isPending} leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={async () => { if ((await confirmDialog({ title: 'Ye webhook hatayein?', danger: true }))) del.mutate(); }}>Hatayein</Button>
      </div>
    </div>
  );
}

function LogCard({ data }: { data: DeveloperOverview }) {
  if (!data.log.length) return null;
  const urlOf = (id: string) => data.endpoints.find((e) => e.id === id)?.url ?? '(hata diya)';
  return (
    <Card title="Aakhri bheje gaye" description="Pichle 50 — kya gaya, kya pohancha." flush>
      <div className="max-h-80 overflow-y-auto">
        <Table className="[&_table]:text-[0.78125rem]">
          <TBody className="divide-y divide-slate-100 dark:divide-ink-800">
            {data.log.map((l, i) => (
              <Tr key={i}>
                <Td className="whitespace-nowrap px-4 py-1.5 text-slate-500">{whenText(l.at)}</Td>
                <Td className="px-2 py-1.5 font-mono">{l.type}</Td>
                <Td className="max-w-[13.75rem] truncate px-2 py-1.5 text-slate-500" title={urlOf(l.endpointId)}>{urlOf(l.endpointId)}</Td>
                <Td className="px-2 py-1.5">{l.attempt > 1 && <span className="text-slate-500">#{l.attempt} </span>}</Td>
                <Td className="whitespace-nowrap px-4 py-1.5 text-right">
                  {l.ok ? <Badge size="xs" variant="success">{l.status} · {l.ms}ms</Badge> : <Badge size="xs" variant="danger">{l.error ?? l.status}</Badge>}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}

const ENDPOINTS: Array<[string, string, string]> = [
  ['GET', '/v1/me', 'Key kis business ki hai, branches'],
  ['GET', '/v1/products', '?search= &updated_since= &shop_id= &page= &limit=(≤100)'],
  ['GET', '/v1/products/{id | sku | barcode}', 'Ek product + har branch ka stock'],
  ['GET', '/v1/stock', '?shop_id= &updated_since= — sirf badla hua stock'],
  ['GET', '/v1/sales', '?from= &to= &updated_since= &status= — items ke saath'],
  ['GET', '/v1/sales/{id | sale number}', 'Ek bill'],
  ['GET', '/v1/customers', '?search= &phone= &updated_since='],
  ['POST', '/v1/customers', '{ name, phone, email, city, address } — write key; same phone ho to wahi wapas'],
  ['GET', '/v1/orders', 'Online orders ?status= &from= &to='],
  ['POST', '/v1/webhooks', '{ url, events: [...] } — Zapier/Make subscribe'],
  ['DELETE', '/v1/webhooks/{id}', 'Unsubscribe'],
  ['GET', '/v1/webhooks/sample/{event}', 'Asli misaal (sample data)'],
];

function DocsCard() {
  const curl = `curl ${API_BASE}/v1/sales?limit=5 \\\n  -H "Authorization: Bearer nfk_…"`;
  const verify = `// Node.js — webhook sach me Nafaa se aaya?
const crypto = require('crypto');
const [t, v1] = req.headers['x-nafaa-signature'].match(/t=(\\d+),v1=(\\w+)/).slice(1);
const expected = crypto.createHmac('sha256', process.env.NAFAA_WEBHOOK_SECRET)
  .update(t + '.' + rawBody).digest('hex');
if (expected !== v1 || Date.now() / 1000 - t > 300) return res.status(401).end();
// event.id se check karein ke pehle to nahi aaya (dobara aa sakta hai)`;
  return (
    <Card title="Developer ke liye" description={`Base URL: ${API_BASE}/v1 · JSON · 120 request / minute`}>
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <Table className="[&_table]:text-[0.78125rem]">
            <TBody className="divide-y divide-slate-100 dark:divide-ink-800">
              {ENDPOINTS.map(([m, p, d]) => (
                <Tr key={m + p}>
                  <Td className="py-1.5 pr-2 font-mono font-semibold text-brand-700">{m}</Td>
                  <Td className="whitespace-nowrap py-1.5 pr-3 font-mono text-slate-900 dark:text-ink-white">{p}</Td>
                  <Td className="py-1.5 text-slate-600 dark:text-ink-300">{d}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
        <Code title="Pehli request" text={curl} />
        <Code title="Webhook signature check" text={verify} />
        <p className="text-[0.78125rem] text-slate-500">
          Har webhook: <code>{'{ id, type, createdAt, data }'}</code> · headers <code>X-Nafaa-Event</code>, <code>X-Nafaa-Delivery</code>, <code>X-Nafaa-Signature</code>.
          2xx jawab = pohanch gaya. 410 = Zapier/Make subscription khud hat jati hai. Cost price aur profit API se kabhi bahar nahi jata.
        </p>
      </div>
    </Card>
  );
}

function Code({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[0.75rem] font-semibold text-slate-600 dark:text-ink-300">
        {title} <button type="button" onClick={() => copy(text)} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Copy className="h-3 w-3" /> Copy</button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[0.75rem] leading-relaxed text-slate-100">{text}</pre>
    </div>
  );
}
