import { Badge, Button, Card, confirmDialog, controlClass, EmptyState, Segmented, Switch } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Code2, ExternalLink, Link2, MessageCircle, MousePointerClick, Package, Search, Send, Users } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { apiErrorMessage, onlineOrdersApi, type FormCoupon, type WebsiteOverview } from '../../api/online-orders.api';
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
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[0.8125rem] font-semibold text-brand-800">
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
        active ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-400 dark:border-ink-700')}>
      <div className="flex items-center gap-2">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-300')}>{icon}</span>
        <span className="text-[0.875rem] font-semibold text-slate-900 dark:text-ink-white">{title}</span>
      </div>
      {badge && <Badge size="xs" variant="success" className="mt-2">{badge}</Badge>}
      <p className="mt-2 text-[0.78125rem] text-slate-600 dark:text-ink-300">{desc}</p>
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
        <p className="text-[0.8125rem] text-slate-600 dark:text-ink-300">
          {(error as any)?.response?.status === 404
            ? 'Server par naya update abhi pahuncha nahi (deploy chal raha hai). Thori der baad dobara try karein.'
            : apiErrorMessage(error)}
        </p>
        <Button className="mt-3" size="xs" onClick={() => refetch()}>Dobara try karein</Button>
      </Card>
    );
  }
  if (isLoading || !f) return <Card><div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-ink-800" /></Card>;

  if (!f.enabled) {
    return (
      <Card title="Order form — code ke bina">
        <ul className="space-y-1.5 text-[0.8125rem] text-slate-700 dark:text-ink-200">
          <li>✓ Nafaa aap ke products ka ek saaf order form banata hai (qeemat aur stock Nafaa se)</li>
          <li>✓ Link Instagram bio, WhatsApp, Facebook ya website par lagayein</li>
          <li>✓ Website par sirf ek line paste karein — har product par "Order karein" button</li>
          <li>✓ Customer ka order seedha yahan — COD, ghanti, bill, courier sab</li>
        </ul>
        <Button size="sm" className="mt-4" variant="primary" loading={save.isPending} onClick={() => save.mutate({ enabled: true })} leftIcon={<MousePointerClick className="h-4 w-4" />}>
          Order form chalu karein
        </Button>
      </Card>
    );
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`Hamari dukaan se order karein 👇\n${f.formUrl}`)}`;
  const floating = f.embedCode?.replace(' defer></script>', ' data-floating="1" defer></script>') ?? '';
  return (
    <>
      <Card title="1 · Order form ka link" description="Ye link kahin bhi share karein — customer kholega, cheez chunega, order ho jayega."
        actions={<Switch size="sm" checked={f.enabled} onChange={(e) => save.mutate({ enabled: e.target.checked })} />}>
        <CopyField label="Order form" value={f.formUrl ?? ''} />
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={f.formUrl ?? '#'} target="_blank" rel="noreferrer"><Button size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>Khol kar dekhein</Button></a>
          <a href={wa} target="_blank" rel="noreferrer"><Button size="sm" leftIcon={<MessageCircle className="h-4 w-4" />}>WhatsApp par share</Button></a>
          <Button size="sm" variant="ghost" onClick={async () => { if ((await confirmDialog({ title: 'Naya link banayein?', text: 'Purana link foran band ho jayega.', danger: true }))) save.mutate({ regenerate: true }); }} leftIcon={<Link2 className="h-4 w-4" />}>Naya link</Button>
        </div>
      </Card>

      <Card title="2 · Website par button (ek line)" description="Website ke HTML me (</body> se pehle) ye ek line paste karein. WordPress, Wix, Blogger, apni website — sab par chalta hai.">
        <CopyField label="Ye line paste karein" value={f.embedCode ?? ''} />
        <p className="mt-3 text-[0.78125rem] text-slate-600 dark:text-ink-300">Phir kisi bhi button par <code className="rounded bg-slate-100 px-1 dark:bg-ink-800">data-nafaa-buy="SKU"</code> likh dein — click par wahi product seedha checkout me:</p>
        <div className="mt-2"><CopyField label="Button (SKU apna daalein)" value={f.buttonCode} /></div>
        <details className="mt-3 text-[0.78125rem] text-slate-600 dark:text-ink-300">
          <summary className="cursor-pointer font-semibold">Button banana nahi aata? Kone me khud "Order karein" button</summary>
          <div className="mt-2"><CopyField label="Ye line paste karein (floating button)" value={floating} /></div>
        </details>
      </Card>

      <FormProducts channelId={channelId} selected={f.productIds} onSave={(ids) => save.mutate({ productIds: ids })} saving={save.isPending} />
      <FormCoupons coupons={f.coupons} onSave={(coupons) => save.mutate({ coupons })} saving={save.isPending} />

      <Card title="Form ki settings">
        <div className="divide-y divide-slate-100 dark:divide-ink-800">
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">Delivery charges (Rs)</p><p className="mt-0.5 text-xs text-slate-500">Har order par — 0 = free delivery</p></div>
            <div className="shrink-0"><input type="number" min={0} value={fee ?? String(f.deliveryFee)} onChange={(e) => setFee(e.target.value)}
              onBlur={() => fee !== null && Number(fee) !== f.deliveryFee && save.mutate({ deliveryFee: Number(fee) })} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] w-28')} /></div></div>
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">Itne se upar delivery free (Rs)</p><p className="mt-0.5 text-xs text-slate-500">Khali = kabhi free nahi</p></div>
            <div className="shrink-0"><input type="number" min={0} value={free ?? (f.freeAbove ? String(f.freeAbove) : '')} onChange={(e) => setFree(e.target.value)} placeholder="—"
              onBlur={() => free !== null && save.mutate({ freeAbove: free ? Number(free) : null })} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] w-28')} /></div></div>
          <Switch size="sm" checked={f.onlyInStock} onChange={(e) => save.mutate({ onlyInStock: e.target.checked })} label="Sirf stock wali cheezein dikhayein" description="Khatam hui cheez form me nahi aayegi" className="py-3 first:pt-0 last:pb-0" />
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">Form ka rang</p><p className="mt-0.5 text-xs text-slate-500">Buttons aur qeemat isi rang me</p></div>
            <div className="shrink-0"><input type="color" value={f.accent ?? '#059669'} onChange={(e) => save.mutate({ accent: e.target.value })} className="h-9 w-16 cursor-pointer rounded border border-slate-200" /></div></div>
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">Logo ka link (https)</p><p className="mt-0.5 text-xs text-slate-500">Apna logo kisi bhi jagah upload karke us ka link — khali = Nafaa icon</p></div>
            <div className="shrink-0"><input defaultValue={f.logoUrl ?? ''} onBlur={(e) => e.target.value !== (f.logoUrl ?? '') && save.mutate({ logoUrl: e.target.value.trim() || null })} placeholder="https://…/logo.png" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] w-64')} /></div></div>
          <Switch size="sm" checked={f.showPhone} onChange={(e) => save.mutate({ showPhone: e.target.checked })} label="Form par dukaan ka WhatsApp number" description="Customer sawal pooch sake (Settings me business phone)" className="py-3 first:pt-0 last:pb-0" />
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">Order ke baad message</p><p className="mt-0.5 text-xs text-slate-500">Jaise: 24 ghante me call karke confirm karenge</p></div>
            <div className="shrink-0"><input value={msg ?? f.message ?? ''} onChange={(e) => setMsg(e.target.value)} maxLength={300} placeholder="(default)"
              onBlur={() => msg !== null && msg !== (f.message ?? '') && save.mutate({ message: msg || null })} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] w-64')} /></div></div>
        </div>
      </Card>
    </>
  );
}

/** Discount codes — EID10 (10%), FLAT200 (Rs 200). Hisaab server par. */
function FormCoupons({ coupons, onSave, saving }: { coupons: FormCoupon[]; onSave: (c: FormCoupon[]) => void; saving: boolean }) {
  const [draft, setDraft] = useState({ code: '', type: 'PERCENT' as 'PERCENT' | 'FLAT', value: '', minOrder: '', maxUses: '' });
  const add = () => {
    const code = draft.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3) return toast.error('Code kam az kam 3 harf / number');
    if (!(Number(draft.value) > 0)) return toast.error('Discount likhein');
    onSave([...coupons.filter((c) => c.code !== code), {
      code, type: draft.type, value: Number(draft.value), minOrder: draft.minOrder ? Number(draft.minOrder) : null,
      maxUses: draft.maxUses ? Number(draft.maxUses) : null, uses: 0, active: true,
    }]);
    setDraft({ code: '', type: 'PERCENT', value: '', minOrder: '', maxUses: '' });
  };
  return (
    <Card title="Discount codes" description="Customer checkout par code likhe to discount — hisaab Nafaa server par (koi chalaki nahi).">
      {coupons.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-ink-800 dark:border-ink-800">
          {coupons.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-3 px-3 py-2 text-[0.8125rem]">
              <span className="font-mono font-bold text-slate-900 dark:text-ink-white">{c.code}</span>
              <span className="text-slate-600 dark:text-ink-300">{c.type === 'PERCENT' ? `${c.value}%` : `Rs ${c.value}`}{c.minOrder ? ` · Rs ${c.minOrder}+ par` : ''}</span>
              <span className="text-slate-400">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''} dafa chala</span>
              <span className="flex-1" />
              <Switch size="sm" checked={c.active} disabled={saving} onChange={(e) => onSave(coupons.map((x) => (x.code === c.code ? { ...x, active: e.target.checked } : x)))} />
              <button disabled={saving} onClick={() => onSave(coupons.filter((x) => x.code !== c.code))} className="text-[0.75rem] font-semibold text-rose-600">Hatao</button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_6.875rem_5.625rem_6.875rem_6.25rem_auto]">
        <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="Code (EID10)" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] font-mono uppercase')} maxLength={20} />
        <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as any })} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')}>
          <option value="PERCENT">% off</option>
          <option value="FLAT">Rs off</option>
        </select>
        <input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} type="number" min={1} placeholder={draft.type === 'PERCENT' ? '10' : '200'} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')} />
        <input value={draft.minOrder} onChange={(e) => setDraft({ ...draft, minOrder: e.target.value })} type="number" min={0} placeholder="Kam az kam Rs" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')} />
        <input value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} type="number" min={1} placeholder="Kitni dafa" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')} />
        <Button size="sm" variant="primary" loading={saving} onClick={add}>Jorein</Button>
      </div>
    </Card>
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
          {picked.size === 0 && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[0.78125rem] font-semibold text-amber-800">Abhi koi nahi chuna — jab tak kam az kam ek na chunein, form par saare products dikhte rahenge.</p>}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product search…" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] pl-8')} />
          </div>
          <div className="mt-2 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 dark:divide-ink-800 dark:border-ink-800">
            {isFetching && !items.length ? <div className="p-4 text-[0.8125rem] text-slate-500">Aa rahe hain…</div>
              : !items.length ? <EmptyState icon={<Package className="h-5 w-5" />} title="Koi product nahi mila" />
              : items.map((p: any) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-ink-800/40">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(p.id)} disabled={saving} onChange={() => toggle(p.id)} />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-slate-800 dark:text-ink-100">{p.name}</span>
                  <span className="text-[0.75rem] tabular-nums text-slate-500">Rs {Math.round(Number(p.price) || 0).toLocaleString('en-PK')}</span>
                </label>
              ))}
          </div>
          {picked.size > 0 && <button onClick={() => onSave([])} className="mt-2 text-[0.78125rem] font-semibold text-rose-600">Sab hatao</button>}
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
        <Button size="sm" variant="primary" loading={make.isPending} onClick={() => make.mutate()} leftIcon={<Send className="h-4 w-4" />}>Developer ka link banayein</Button>
      ) : (
        <div className="space-y-3">
          <CopyField label="Developer ka link (7 din)" value={link.url} />
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="success" leftIcon={<MessageCircle className="h-4 w-4" />}>WhatsApp par bhejein</Button></a>
            <Button size="sm" onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success('Message copy ho gaya'))}>Message copy</Button>
            <a href={link.url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" leftIcon={<ExternalLink className="h-4 w-4" />}>Khud dekhein</Button></a>
          </div>
          <p className="text-[0.75rem] text-slate-500">Link galat haath lage to "Setup & keys" me "Nayi key" dabayein — link foran band.</p>
        </div>
      )}
      <div className={cn('mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold',
        connected ? 'bg-success-50 text-success-800' : 'bg-slate-50 text-slate-600 dark:bg-ink-800/50 dark:text-ink-300')}>
        {connected ? <><CheckCircle2 className="h-4 w-4" /> Jur gaya — website se orders aa rahe hain</> : 'Abhi website se koi order nahi aaya'}
      </div>
    </Card>
  );
}
