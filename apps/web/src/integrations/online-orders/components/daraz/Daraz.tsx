import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Package, Printer, RefreshCw, ShoppingBag, Truck, Zap } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { apiErrorMessage, darazApi, type OnlineOrderDetail, type WebsiteOverview } from '../../api/online-orders.api';
import { timeAgo, whenText } from '../../lib/labels';
import { Badge, Banner, Btn, Card, Field, inputCls } from '../ui/kit';

/* ═════════════════════════════════════════════════════════════
   DARAZ — Shopify jaisa: "Daraz jorein" → Daraz login → Allow.
   Phir orders har 5 minute, stock Nafaa se, products SKU se,
   ready to ship + label order ke andar se.
   ═════════════════════════════════════════════════════════════ */

/** Sales channel jorein → Daraz */
export function DarazConnectCard({ shopList }: { shopList: { id: string; name: string }[] }) {
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');
  const { data: st } = useQuery({ queryKey: ['daraz-status'], queryFn: darazApi.status, staleTime: 60_000 });
  const start = useMutation({
    mutationFn: () => darazApi.start({ displayName: name.trim() || undefined, shopId: shopId || undefined }),
    onSuccess: (r) => { window.location.href = r.authUrl; },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Card title="Daraz store jorein" description="Daraz ka login khulega — apne Daraz seller account se login karke 'Allow' dabayein. Bas.">
      {st && !st.configured && (
        <div className="mb-3"><Banner tone="warning" title="Daraz app abhi server par nahi lagi">Nafaa admin Railway par DARAZ_APP_KEY aur DARAZ_APP_SECRET lagaye — phir yahan se jor sakte hain.</Banner></div>
      )}
      <ul className="mb-4 space-y-1.5 text-[13px] text-slate-700 dark:text-slate-200">
        <li>✓ Daraz ke naye orders khud Nafaa me — ghanti, bill, stock</li>
        <li>✓ Stock Nafaa se Daraz par khud (POS par bika to Daraz par bhi kam)</li>
        <li>✓ Products SKU se khud jurte hain</li>
        <li>✓ Order par "Ready to ship" aur Daraz ka label — Seller Center jaane ki zaroorat nahi</li>
      </ul>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Naam (optional)"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daraz store" className={inputCls} /></Field>
        <Field label="Stock kis branch se">
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={inputCls}>
            <option value="">Main branch</option>
            {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <Btn className="mt-4" variant="primary" loading={start.isPending} disabled={st ? !st.configured : false} onClick={() => start.mutate()} icon={<Zap className="h-4 w-4" />}>
        Daraz jorein
      </Btn>
      <p className="mt-2 text-[12px] text-slate-500">Ek baat: Daraz products ke SellerSku aur Nafaa ke SKU same hon — tab hi stock aur orders sahi product se jurte hain.</p>
    </Card>
  );
}

/** Channel page (Daraz) — haal + controls */
export function DarazChannelCard({ id, data, onChange }: { id: string; data: WebsiteOverview; onChange?: () => void }) {
  const qc = useQueryClient();
  const d = data.integration?.daraz;
  const done = () => { qc.invalidateQueries({ queryKey: ['sales-channel', id] }); qc.invalidateQueries({ queryKey: ['online-orders'] }); onChange?.(); };
  const reconnect = useMutation({
    mutationFn: () => darazApi.start({ channelId: id }),
    onSuccess: (r) => { window.location.href = r.authUrl; },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const orders = useMutation({
    mutationFn: () => darazApi.syncOrders(id),
    onSuccess: (r) => { done(); toast.success(r.created ? `${r.created} naye Daraz order aaye` : `Daraz check ho gaya — ${r.seen} order dekhe, koi naya nahi`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const link = useMutation({
    mutationFn: () => darazApi.linkProducts(id),
    onSuccess: (r) => { done(); toast.success(`${r.linked} product jur gaye`, { description: r.unmatched ? `${r.unmatched} Daraz SKU ka Nafaa me same SKU nahi mila` : 'Sab jur gaye' }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const stock = useMutation({
    mutationFn: () => darazApi.syncStock(id),
    onSuccess: (r) => toast.success(`${r.updated} product ka stock Daraz par bhej diya`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!d) return null;
  const expSoon = d.refreshExpiresAt ? Date.parse(d.refreshExpiresAt) - Date.now() < 7 * 86_400_000 : false;

  return (
    <Card title={<span className="flex items-center gap-2">Daraz {d.connected && !d.error ? <Badge tone="success" dot>Jura hua</Badge> : <Badge tone="critical" dot>Jorna hai</Badge>}</span>}
      description={d.account ? `${d.account}${d.shortCode ? ` · shop ${d.shortCode}` : ''}` : 'Daraz seller account'}
      actions={d.connected ? <Btn size="sm" variant="plain" loading={reconnect.isPending} onClick={() => reconnect.mutate()} icon={<Link2 className="h-3.5 w-3.5" />}>Dobara jorein</Btn> : undefined}>
      {(!d.connected || d.error) && (
        <div className="mb-3">
          <Banner tone="critical" title={d.connected ? 'Daraz se rabta toot gaya' : 'Daraz abhi jura nahi'} icon={<AlertTriangle className="h-4 w-4" />}
            action={<Btn size="sm" variant="primary" loading={reconnect.isPending} disabled={!d.configured} onClick={() => reconnect.mutate()}>Daraz jorein</Btn>}>
            {d.error ?? (d.configured ? 'Daraz ka login khulega — Allow dabayein.' : 'Server par Daraz app ki keys nahi lagi (DARAZ_APP_KEY / DARAZ_APP_SECRET).')}
          </Banner>
        </div>
      )}
      {expSoon && d.connected && !d.error && (
        <div className="mb-3"><Banner tone="warning" title="Daraz ki ijazat jald khatam">Is hafte "Dobara jorein" dabayein — warna orders aana band ho jayenge.</Banner></div>
      )}
      <div className="grid gap-2 text-[13px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div>Orders check: <b>{d.ordersSyncedAt ? timeAgo(d.ordersSyncedAt) : 'abhi nahi'}</b> <span className="text-slate-400">(har 5 minute)</span></div>
        <div>Jura: <b>{d.connectedAt ? whenText(d.connectedAt) : '—'}</b></div>
      </div>
      {d.connected && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn size="sm" loading={orders.isPending} onClick={() => orders.mutate()} icon={<ShoppingBag className="h-3.5 w-3.5" />}>Abhi orders lao</Btn>
          <Btn size="sm" loading={link.isPending} onClick={() => link.mutate()} icon={<Package className="h-3.5 w-3.5" />}>Products SKU se jorein</Btn>
          <Btn size="sm" loading={stock.isPending} onClick={() => stock.mutate()} icon={<RefreshCw className="h-3.5 w-3.5" />}>Stock Daraz par bhejo</Btn>
          <a href="https://sellercenter.daraz.pk" target="_blank" rel="noreferrer"><Btn size="sm" variant="plain" icon={<ExternalLink className="h-3.5 w-3.5" />}>Seller Center</Btn></a>
        </div>
      )}
    </Card>
  );
}

/** Order ke andar (Daraz order) — ready to ship + label */
export function DarazOrderSection({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const meta = (o.metadata as any)?.daraz ?? {};
  const rts = useMutation({
    mutationFn: () => darazApi.readyToShip(o.id),
    onSuccess: (r) => { onChanged(); toast.success('Daraz par Ready to ship ✓', { description: r.trackingNumber ? `Tracking ${r.trackingNumber}${r.provider ? ` · ${r.provider}` : ''}` : 'Ab label print karein' }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const label = useMutation({ mutationFn: () => darazApi.openLabel(o.id), onError: (e) => toast.error(apiErrorMessage(e, 'Label nahi khula')) });
  const closed = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);
  if (closed) return null;
  const isRts = !!meta.rtsAt;

  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-500/30 dark:bg-orange-500/5">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-orange-600" />
        <div className="flex-1 text-sm font-black text-slate-900 dark:text-white">Daraz delivery</div>
        {isRts && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Ready to ship</span>}
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        {!o.nafaaSaleId ? 'Pehle Accept karein (bill + stock), phir Daraz par ready to ship.'
          : isRts ? `Daraz ka rider parcel uthayega${meta.trackingNumber ? ` · tracking ${meta.trackingNumber}` : ''}. Label print karke parcel par lagayein.`
            : 'Pack karke "Ready to ship" dabayein — Daraz ko khabar, tracking number aur label yahin.'}
      </p>
      {o.nafaaSaleId && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!isRts && <Button size="xs" variant="primary" loading={rts.isPending} onClick={() => rts.mutate()} leftIcon={<Zap className="h-3.5 w-3.5" />}>Daraz: Ready to ship</Button>}
          <Button size="xs" variant="outline" loading={label.isPending} disabled={!isRts} onClick={() => label.mutate()} leftIcon={<Printer className="h-3.5 w-3.5" />}>Daraz label</Button>
        </div>
      )}
    </section>
  );
}
