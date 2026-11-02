import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Package, Printer, RefreshCw, ShoppingBag, Truck, Zap } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, Select } from '@/design-system/components';
import { apiErrorMessage, darazApi, type OnlineOrderDetail, type WebsiteOverview } from '../../api/online-orders.api';
import { timeAgo, whenText } from '../../lib/labels';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { t } from '@core/i18n';

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
    <Card title={t('Daraz store jorein')} description={t('Daraz ka login khulega — apne Daraz seller account se login karke \'Allow\' dabayein. Bas.')}>
      {st && !st.configured && (
        <div className="mb-3"><Alert tone="warning" title={t('Daraz app abhi server par nahi lagi')}>{t('Nafaa admin Railway par DARAZ_APP_KEY aur DARAZ_APP_SECRET lagaye — phir yahan se jor sakte hain.')}</Alert></div>
      )}
      <ul className="mb-4 space-y-1.5 text-[0.8125rem] text-slate-700">
        <li>{t('✓ Daraz ke naye orders khud Nafaa me — ghanti, bill, stock')}</li>
        <li>{t('✓ Stock Nafaa se Daraz par khud (POS par bika to Daraz par bhi kam)')}</li>
        <li>{t('✓ Products SKU se khud jurte hain')}</li>
        <li>{t('✓ Order par "Ready to ship" aur Daraz ka label — Seller Center jaane ki zaroorat nahi')}</li>
      </ul>
      <div className="grid gap-3 md:grid-cols-2">
        <Input size="sm" label={t('Naam (optional)')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Daraz store')} />
        <Select size="sm" label={t('Stock kis branch se')} value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="">{t('Main branch')}</option>
          {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>
      <Button size="sm" className="mt-4" variant="primary" loading={start.isPending} disabled={st ? !st.configured : false} onClick={() => start.mutate()} leftIcon={<Zap className="h-4 w-4" />}>
        {t('Daraz jorein')}
      </Button>
      <p className="mt-2 text-[0.75rem] text-slate-500">{t('Ek baat: Daraz products ke SellerSku aur Nafaa ke SKU same hon — tab hi stock aur orders sahi product se jurte hain.')}</p>
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
    onSuccess: (r) => { done(); toast.success(r.created ? t('{{created}} naye Daraz order aaye', { created: r.created }) : t('Daraz check ho gaya — {{seen}} order dekhe, koi naya nahi', { seen: r.seen })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const link = useMutation({
    mutationFn: () => darazApi.linkProducts(id),
    onSuccess: (r) => { done(); toast.success(t('{{linked}} product jur gaye', { linked: r.linked }), { description: r.unmatched ? t('{{unmatched}} Daraz SKU ka Nafaa me same SKU nahi mila', { unmatched: r.unmatched }) : t('Sab jur gaye') }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const stock = useMutation({
    mutationFn: () => darazApi.syncStock(id),
    onSuccess: (r) => toast.success(t('{{updated}} product ka stock Daraz par bhej diya', { updated: r.updated })),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!d) return null;
  const expSoon = d.refreshExpiresAt ? Date.parse(d.refreshExpiresAt) - Date.now() < 7 * 86_400_000 : false;

  return (
    <Card className="rounded-3xl border-0 ring-1 ring-slate-200/80" title={<span className="flex items-center gap-2"><BrandLogo name="daraz" size={28} /> {' '}{'Daraz'}{' '} {d.connected && !d.error ? <Badge size="xs" variant="success" dot>{t('Jura hua')}</Badge> : <Badge size="xs" variant="danger" dot>{t('Jorna hai')}</Badge>}</span>}
      description={d.account ? `${d.account}${d.shortCode ? ` · shop ${d.shortCode}` : ''}` : t('Daraz seller account')}
      actions={d.connected ? <Button size="xs" variant="ghost" loading={reconnect.isPending} onClick={() => reconnect.mutate()} leftIcon={<Link2 className="h-3.5 w-3.5" />}>{t('Dobara jorein')}</Button> : undefined}>
      {(!d.connected || d.error) && (
        <div className="mb-3">
          <Alert tone="danger" title={d.connected ? t('Daraz se rabta toot gaya') : t('Daraz abhi jura nahi')} icon={<AlertTriangle className="h-4 w-4" />}
            action={<Button size="xs" variant="primary" loading={reconnect.isPending} disabled={!d.configured} onClick={() => reconnect.mutate()}>{t('Daraz jorein')}</Button>}>
            {d.error ?? (d.configured ? t('Daraz ka login khulega — Allow dabayein.') : t('Server par Daraz app ki keys nahi lagi (DARAZ_APP_KEY / DARAZ_APP_SECRET).'))}
          </Alert>
        </div>
      )}
      {expSoon && d.connected && !d.error && (
        <div className="mb-3"><Alert tone="warning" title={t('Daraz ki permission jald khatam')}>{t('Is hafte "Dobara jorein" dabayein — warna orders aana band ho jayenge.')}</Alert></div>
      )}
      <div className="grid gap-2 text-[0.8125rem] text-slate-600 sm:grid-cols-2">
        <div>{t('Orders check:')}{' '} <b>{d.ordersSyncedAt ? timeAgo(d.ordersSyncedAt) : t('abhi nahi')}</b> <span className="text-slate-400">{t('(har 5 minute)')}</span></div>
        <div>{t('Jura:')}{' '} <b>{d.connectedAt ? whenText(d.connectedAt) : '—'}</b></div>
      </div>
      {d.connected && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="xs" loading={orders.isPending} onClick={() => orders.mutate()} leftIcon={<ShoppingBag className="h-3.5 w-3.5" />}>{t('Abhi orders lao')}</Button>
          <Button size="xs" loading={link.isPending} onClick={() => link.mutate()} leftIcon={<Package className="h-3.5 w-3.5" />}>{t('Products SKU se jorein')}</Button>
          <Button size="xs" loading={stock.isPending} onClick={() => stock.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>{t('Stock Daraz par bhejo')}</Button>
          <a href="https://sellercenter.daraz.pk" target="_blank" rel="noreferrer"><Button size="xs" variant="ghost" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>{t('Seller Center')}</Button></a>
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
    onSuccess: (r) => { onChanged(); toast.success(t('Daraz par Ready to ship ✓'), { description: r.trackingNumber ? t('Tracking {{trackingNumber}}{{value}}', { trackingNumber: r.trackingNumber, value: r.provider ? ` · ${r.provider}` : '' }) : t('Ab label print karein') }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const label = useMutation({ mutationFn: () => darazApi.openLabel(o.id), onError: (e) => toast.error(apiErrorMessage(e, t('Label nahi khula'))) });
  const closed = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);
  if (closed) return null;
  const isRts = !!meta.rtsAt;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-orange-700" />
        <div className="flex-1 text-sm font-bold text-slate-900">{t('Daraz delivery')}</div>
        {isRts && <Badge size="xs" variant="success"><CheckCircle2 className="h-3.5 w-3.5" /> {' '}{t('Ready to ship')}</Badge>}
      </div>
      <p className="mt-1 text-xs text-slate-600">
        {!o.nafaaSaleId ? t('Pehle Accept karein (bill + stock), phir Daraz par ready to ship.')
          : isRts ? t('Daraz ka rider parcel uthayega{{value}}. Label print karke parcel par lagayein.', { value: meta.trackingNumber ? t(' · tracking {{trackingNumber}}', { trackingNumber: meta.trackingNumber }) : '' })
            : t('Pack karke "Ready to ship" dabayein — Daraz ko khabar, tracking number aur label yahin.')}
      </p>
      {o.nafaaSaleId && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!isRts && <Button size="xs" variant="primary" loading={rts.isPending} onClick={() => rts.mutate()} leftIcon={<Zap className="h-3.5 w-3.5" />}>{t('Daraz: Ready to ship')}</Button>}
          <Button size="xs" variant="outline" loading={label.isPending} disabled={!isRts} onClick={() => label.mutate()} leftIcon={<Printer className="h-3.5 w-3.5" />}>{t('Daraz label')}</Button>
        </div>
      )}
    </Card>
  );
}
