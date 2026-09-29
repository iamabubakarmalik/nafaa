import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Code2, ExternalLink, Link2, MessageCircle, MousePointerClick, Package, Search, Send, Users } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { Badge, Btn, Card, EmptyState, Segmented, SettingRow, Toggle, inputCls } from '../ui/kit';
import { CopyField } from './CopyField';
import { ConnectGuide } from './ConnectGuides';
import { cn } from '@core/lib/cn';

type Way = 'form' | 'developer' | 'code';

/**
 * Apni banayi website ko jorne ke 3 raaste — dukandar ko key / code ka
 * pata na ho tab bhi:
 *  1) Code ke bina: order form link + ek line ka "Order karein" button
 *  2) Developer ko WhatsApp par link — us me sab (keys, code, test)
 *  3) Khud code — keys + tayyar snippets
 */
export function CustomConnect({ channelId, data, onChange }: { channelId: string; data: WebsiteOverview; onChange: (d: WebsiteOverview) => void }) {
  const [way, setWay] = useState<Way>('form');
  const shopName = useAuthStore((s) => s.tenant?.name) ?? 'Meri dukaan';
  const i = data.integration!;
  const connected = !!(i.webhookVerified || data.stats?.lastOrderAt);

  return (
    <div className="space-y-4">
      <Card title="Website kaise jorein?" description="Jo aasaan lage chunein — teeno me orders isi channel me aate hain (ghanti, bill, stock khud).">
        {connected && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Website se orders aa rahe hain
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <WayCard active={way === 'form'} onClick={() => setWay('form')} icon={<MousePointerClick className="h-5 w-5" />}
            title="Code ke bina" badge="Sab se aasaan" desc="Order form ka link + ek line ka 'Order karein' button. Instagram / WhatsApp par bhi." />
          <WayCard active={way === 'developer'} onClick={() => setWay('developer')} icon={<Users className="h-5 w-5" />}
            title="Developer ko bhejein" desc="WhatsApp par ek link — us me keys, code aur test. Jurte hi yahan ✅." />
          <WayCard active={way === 'code'} onClick={() => setWay('code')} icon={<Code2 className="h-5 w-5" />}
            title="Khud code likhna hai" desc="Keys aur PHP / Node / Python ka tayyar code." />
        </div>
      </Card>

      {way === 'form' && <FormWay channelId={channelId} />}
      {way === 'developer' && <DeveloperWay channelId={channelId} data={data} />}
      {way === 'code' && (
        <Card title="Khud code likhein">
          <ConnectGuide platform="custom" overview={data} shopName={shopName} channelId={channelId} onChange={onChange} />
        </Card>
      )}
    </div>
  );
}

function WayCard({ active, onClick, icon, title, desc, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; badge?: string }) {
  return (
    <button onClick={onClick}
      className={cn('rounded-xl border p-4 text-left transition',
        active ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 dark:bg-emerald-500/10' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700')}>
      <div className="flex items-center gap-2">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{icon}</span>
        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</span>
      </div>
      {badge && <Badge tone="success" className="mt-2">{badge}</Badge>}
      <p className="mt-2 text-[12.5px] text-slate-600 dark:text-slate-300">{desc}</p>
    </button>
  );
}

/* ─── 1. Order form + Buy button ─── */

function FormWay({ channelId }: { channelId: string }) {
  const qc = useQueryClient();
  const { data: f, isLoading, error, refetch } = useQuery({ queryKey: ['channel-form', channelId], queryFn: () => onlineOrdersApi.channelForm(channelId), retry: 1 });
  const [fee, setFee] = useState<string | null>(null);
  const [free, setFree] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: Parameters<typeof onlineOrdersApi.updateChannelForm>[1]) => onlineOrdersApi.updateChannelForm(channelId, body),
    onSuccess: (d, body) => {
      qc.setQueryData(['channel-form', channelId], d);
      if (body.enabled === true) toast.success('Order form chalu ✓ — link share karein');
      else if (body.regenerate) toast.success('Naya link ban gaya — purana band');
      else toast.success('Save ho gaya');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (error) {
    return (
      <Card title="Order form abhi nahi khula">
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          {(error as any)?.response?.status === 404
            ? 'Server par naya update abhi pahuncha nahi (deploy chal raha hai). Thori der baad dobara try karein.'
            : apiErrorMessage(error)}
        </p>
        <Btn className="mt-3" size="sm" onClick={() => refetch()}>Dobara try karein</Btn>
      </Card>
    );
  }
  if (isLoading || !f) return <Card><div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></Card>;

  if (!f.enabled) {
    return (
      <Card title="Order form — code ke bina">
        <ul className="space-y-1.5 text-[13px] text-slate-700 dark:text-slate-200">
          <li>✓ Nafaa aap ke products ka ek saaf order form banata hai (qeemat aur stock Nafaa se)</li>
          <li>✓ Link Instagram bio, WhatsApp, Facebook ya website par lagayein</li>
          <li>✓ Website par sirf ek line paste karein — har product par "Order karein" button</li>
          <li>✓ Customer ka order seedha yahan — COD, ghanti, bill, courier sab</li>
        </ul>
        <Btn className="mt-4" variant="primary" loading={save.isPending} onClick={() => save.mutate({ enabled: true })} icon={<MousePointerClick className="h-4 w-4" />}>
          Order form chalu karein
        </Btn>
      </Card>
    );
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`Hamari dukaan se order karein 👇\n${f.formUrl}`)}`;
  const floating = f.embedCode?.replace(' defer></script>', ' data-floating="1" defer></script>') ?? '';
  return (
    <>
      <Card title="1 · Order form ka link" description="Ye link kahin bhi share karein — customer kholega, cheez chunega, order ho jayega."
        actions={<Toggle checked={f.enabled} onChange={(v) => save.mutate({ enabled: v })} />}>
        <CopyField label="Order form" value={f.formUrl ?? ''} />
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={f.formUrl ?? '#'} target="_blank" rel="noreferrer"><Btn icon={<ExternalLink className="h-4 w-4" />}>Khol kar dekhein</Btn></a>
          <a href={wa} target="_blank" rel="noreferrer"><Btn icon={<MessageCircle className="h-4 w-4" />}>WhatsApp par share</Btn></a>
          <Btn variant="plain" onClick={() => { if (confirm('Naya link banayein? Purana link foran band ho jayega.')) save.mutate({ regenerate: true }); }} icon={<Link2 className="h-4 w-4" />}>Naya link</Btn>
        </div>
      </Card>

      <Card title="2 · Website par button (ek line)" description="Website ke HTML me (</body> se pehle) ye ek line paste karein. WordPress, Wix, Blogger, apni website — sab par chalta hai.">
        <CopyField label="Ye line paste karein" value={f.embedCode ?? ''} />
        <p className="mt-3 text-[12.5px] text-slate-600 dark:text-slate-300">Phir kisi bhi button par <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">data-nafaa-buy="SKU"</code> likh dein — click par wahi product seedha checkout me:</p>
        <div className="mt-2"><CopyField label="Button (SKU apna daalein)" value={f.buttonCode} /></div>
        <details className="mt-3 text-[12.5px] text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer font-semibold">Button banana nahi aata? Kone me khud "Order karein" button</summary>
          <div className="mt-2"><CopyField label="Ye line paste karein (floating button)" value={floating} /></div>
        </details>
      </Card>

      <FormProducts channelId={channelId} selected={f.productIds} onSave={(ids) => save.mutate({ productIds: ids })} saving={save.isPending} />

      <Card title="Form ki settings">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <SettingRow title="Delivery charges (Rs)" help="Har order par — 0 = free delivery"
            control={<input type="number" min={0} value={fee ?? String(f.deliveryFee)} onChange={(e) => setFee(e.target.value)}
              onBlur={() => fee !== null && Number(fee) !== f.deliveryFee && save.mutate({ deliveryFee: Number(fee) })} className={cn(inputCls, 'w-28')} />} />
          <SettingRow title="Itne se upar delivery free (Rs)" help="Khali = kabhi free nahi"
            control={<input type="number" min={0} value={free ?? (f.freeAbove ? String(f.freeAbove) : '')} onChange={(e) => setFree(e.target.value)} placeholder="—"
              onBlur={() => free !== null && save.mutate({ freeAbove: free ? Number(free) : null })} className={cn(inputCls, 'w-28')} />} />
          <SettingRow title="Sirf stock wali cheezein dikhayein" help="Khatam hui cheez form me nahi aayegi"
            control={<Toggle checked={f.onlyInStock} onChange={(v) => save.mutate({ onlyInStock: v })} />} />
          <SettingRow title="Order ke baad paigham" help="Jaise: 24 ghante me call karke confirm karenge"
            control={<input value={msg ?? f.message ?? ''} onChange={(e) => setMsg(e.target.value)} maxLength={300} placeholder="(default)"
              onBlur={() => msg !== null && msg !== (f.message ?? '') && save.mutate({ message: msg || null })} className={cn(inputCls, 'w-64')} />} />
        </div>
      </Card>
    </>
  );
}

/** Form par kaunse products — sab, ya sirf chune hue */
function FormProducts({ selected, onSave, saving }: { channelId: string; selected: string[] | null; onSave: (ids: string[]) => void; saving: boolean }) {
  const [mode, setMode] = useState<'all' | 'some'>(selected?.length ? 'some' : 'all');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const picked = new Set(selected ?? []);
  const { data, isFetching } = useQuery({
    queryKey: ['form-products', debounced],
    queryFn: () => productsApi.list({ search: debounced || undefined, limit: 50, isActive: true }),
    enabled: mode === 'some',
  });
  const items = data?.items ?? [];
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const toggle = (id: string) => {
    const n = new Set(picked);
    n.has(id) ? n.delete(id) : n.add(id);
    onSave([...n]);
  };

  return (
    <Card title="Form par kaunse products" description={mode === 'all' ? 'Nafaa ke saare active products (qeemat > 0) form par dikhte hain.' : `${picked.size} product chune — sirf yahi form par dikhenge.`}
      actions={<Segmented value={mode} onChange={(m) => { setMode(m); if (m === 'all' && selected?.length) onSave([]); }}
        items={[{ value: 'all', label: 'Sab products' }, { value: 'some', label: 'Sirf chune hue' }]} />}>
      {mode === 'some' && (
        <>
          {picked.size === 0 && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Abhi koi nahi chuna — jab tak kam az kam ek na chunein, form par saare products dikhte rahenge.</p>}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product dhoondein…" className={cn(inputCls, 'pl-8')} />
          </div>
          <div className="mt-2 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {isFetching && !items.length ? <div className="p-4 text-[13px] text-slate-500">Aa rahe hain…</div>
              : !items.length ? <EmptyState icon={<Package className="h-5 w-5" />} title="Koi product nahi mila" />
              : items.map((p: any) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(p.id)} disabled={saving} onChange={() => toggle(p.id)} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-800 dark:text-slate-100">{p.name}</span>
                  <span className="text-[12px] tabular-nums text-slate-500">Rs {Math.round(Number(p.price) || 0).toLocaleString('en-PK')}</span>
                </label>
              ))}
          </div>
          {picked.size > 0 && <button onClick={() => onSave([])} className="mt-2 text-[12.5px] font-semibold text-rose-600">Sab hatao</button>}
        </>
      )}
    </Card>
  );
}

/* ─── 2. Developer ko link ─── */

function DeveloperWay({ channelId, data }: { channelId: string; data: WebsiteOverview }) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const shop = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const make = useMutation({
    mutationFn: () => onlineOrdersApi.devInvite(channelId),
    onSuccess: (r) => setLink(r),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const i = data.integration!;
  const connected = !!(i.webhookVerified || data.stats?.lastOrderAt);
  const text = link
    ? `Assalam o Alaikum! ${shop} ki website ke orders Nafaa POS me bhejne hain.\nIs link par sab kuch hai (keys, code, test) — 15 minute ka kaam:\n${link.url}`
    : '';

  return (
    <Card title="Developer ko bhejein" description="Aap ko kuch samajhne ki zaroorat nahi — developer link kholega, code lagayega, 'Test' dabayega. Jurte hi yahan ✅.">
      {!link ? (
        <Btn variant="primary" loading={make.isPending} onClick={() => make.mutate()} icon={<Send className="h-4 w-4" />}>Developer ka link banayein</Btn>
      ) : (
        <div className="space-y-3">
          <CopyField label="Developer ka link (7 din)" value={link.url} />
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Btn variant="success" icon={<MessageCircle className="h-4 w-4" />}>WhatsApp par bhejein</Btn></a>
            <Btn onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success('Paigham copy ho gaya'))}>Paigham copy</Btn>
            <a href={link.url} target="_blank" rel="noreferrer"><Btn variant="plain" icon={<ExternalLink className="h-4 w-4" />}>Khud dekhein</Btn></a>
          </div>
          <p className="text-[12px] text-slate-500">Link galat haath lage to "Setup & keys" me "Nayi key" dabayein — link foran band.</p>
        </div>
      )}
      <div className={cn('mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold',
        connected ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300')}>
        {connected ? <><CheckCircle2 className="h-4 w-4" /> Jur gaya — website se orders aa rahe hain</> : 'Abhi website se koi order nahi aaya'}
      </div>
    </Card>
  );
}
