/**
 * Sell when out of stock (backorder) for one product: the on/off switch,
 * the most units that may be owed, the expected days and the note for
 * customers, a setting per size and per channel, the units owed now and
 * the accepted orders waiting for stock (oldest first). Used in the
 * Products & stock panel and in the product editor.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Info, PackageOpen, Workflow } from 'lucide-react';
import { Badge, Button, Input, Select, Skeleton, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type BackorderInfo, type BackorderOrder, type BackorderSave } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';

export const BACKORDER_KEY = [ONLINE_PRODUCTS_KEY, 'backorder'] as const;

type Tri = 'inherit' | 'on' | 'off';
const toTri = (v: boolean | null | undefined): Tri => (v === true ? 'on' : v === false ? 'off' : 'inherit');
const fromTri = (v: Tri) => (v === 'on' ? true : v === 'off' ? false : null);
const numOrNull = (v: string) => (v.trim() === '' ? null : Math.max(1, Math.floor(Number(v)) || 1));

const CHANNEL_NOTE: Record<string, () => string> = {
  SHOPIFY: () => t('Shopify par "Continue selling when out of stock" lagta hai. Shopify ka Google channel bhi isi ko maanta hai.'),
  WOOCOMMERCE: () => t('WooCommerce par "Allow backorders (notify customer)" lagta hai.'),
  CUSTOM_WEBSITE: () => t('Website API me availability = backorder aur delivery note jata hai.'),
};

export function BackorderSettings({ productId, canManage, compact = false }: { productId: string; canManage: boolean; compact?: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...BACKORDER_KEY, productId], queryFn: () => onlineProductsApi.backorder(productId), staleTime: 10_000 });
  const d = q.data;
  const [form, setForm] = useState({ max: '', leadDays: '', note: '' });
  useEffect(() => {
    if (d) setForm({ max: d.max ? String(d.max) : '', leadDays: d.leadDays ? String(d.leadDays) : '', note: d.note ?? '' });
  }, [d]);

  const save = useMutation({
    mutationFn: (body: BackorderSave) => onlineProductsApi.saveBackorder(productId, body),
    onSuccess: (next) => {
      qc.setQueryData([...BACKORDER_KEY, productId], next);
      qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY] });
      toast.success(t('Save ho gaya — channels par thori der me lag jayega'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (q.isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!d) return <p className="text-[0.8125rem] text-rose-600">{apiErrorMessage(q.error)}</p>;

  const on = d.backorder === true;
  const sized = d.variants.length > 1 || !!d.variants[0]?.id;
  const owed = d.owed.reduce((n, o) => n + o.owed, 0);
  const dirty = (form.max || '') !== (d.max ? String(d.max) : '') || (form.leadDays || '') !== (d.leadDays ? String(d.leadDays) : '') || form.note.trim() !== (d.note ?? '');
  const busy = save.isPending || !canManage;
  const triOptions = (inherit: string) => [
    { value: 'inherit', label: inherit },
    { value: 'on', label: t('Chalu') },
    { value: 'off', label: t('Band') },
  ];

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-3.5 ring-1', on ? 'bg-sky-50/60 ring-sky-200' : 'bg-white ring-slate-200')}>
        <Switch checked={on} disabled={busy} onChange={(e) => save.mutate({ backorder: e.target.checked })}
          label={<span className="font-semibold">{t('Stock khatam ho to bhi order lein')}</span>}
          description={t('Website / Shopify par product "out of stock" nahi hoga, order aate rahenge. Nafaa ka asli stock sahi rehta hai — minus me jata hai, aur minus = customers ko dena baqi.')} />
        {d.backorder === null && (
          <p className="mt-2 text-[0.75rem] text-slate-500">{t('Abhi set nahi — har channel ki apni setting chal rahi hai. Chalu ya band karein to Nafaa sab channels par laga dega.')}</p>
        )}
        {on && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input size="sm" type="number" min={1} label={t('Zyada se zyada kitne baqi')} value={form.max} disabled={busy}
              onChange={(e) => setForm({ ...form, max: e.target.value })} placeholder={t('Koi had nahi')}
              hint={t('Itne order baqi hon to channel par bikna ruk jayega')} />
            <Input size="sm" type="number" min={1} label={t('Kitne din me aayega')} value={form.leadDays} disabled={busy}
              onChange={(e) => setForm({ ...form, leadDays: e.target.value })} placeholder="7"
              hint={t('Google ko yehi tareekh batate hain (khali = 7 din)')} />
            <Input size="sm" label={t('Customer ke liye note')} value={form.note} disabled={busy} maxLength={120}
              onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('7 din me bhejenge')} />
            {dirty && canManage && (
              <div className="sm:col-span-3">
                <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ max: numOrNull(form.max), leadDays: numOrNull(form.leadDays), note: form.note.trim() || null })}>{t('Save')}</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {(owed > 0 || d.waiting.length > 0) && <OwedBox info={d} owed={owed} />}

      {(sized || d.links.length > 0) && (
        <details className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200" open={!compact && d.links.some((l) => l.backorder !== null)}>
          <summary className="cursor-pointer text-[0.8125rem] font-semibold text-slate-800">{t('Har size / channel ki alag setting')}</summary>
          <div className="mt-3 space-y-2">
            {sized && d.variants.filter((v) => v.id).map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-slate-700">{v.name}
                  <span className={cn('ms-1.5 tabular-nums text-[0.75rem]', v.stock < 0 ? 'text-amber-700' : 'text-slate-400')}>{t('Stock {{qty}}', { qty: v.stock })}</span>
                </span>
                <Select size="sm" wrapperClassName="w-40" value={toTri(v.backorder)} disabled={busy} aria-label={v.name ?? ''}
                  onChange={(e) => save.mutate({ variants: [{ id: v.id!, backorder: fromTri(e.target.value as Tri) }] })}
                  options={triOptions(t('Product jaisa'))} />
              </div>
            ))}
            {d.links.map((l) => (
              <div key={l.mappingId} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] text-slate-700">{l.channel}{l.variantId && sized ? <span className="text-slate-400"> · {d.variants.find((v) => v.id === l.variantId)?.name}</span> : null}</p>
                  <p className="text-[0.71875rem] text-slate-500">{l.supported ? CHANNEL_NOTE[l.type]?.() : t('Daraz 0 stock par order nahi leta — wahan hamesha asli stock jata hai.')}</p>
                </div>
                {l.supported
                  ? <Select size="sm" wrapperClassName="w-40" value={toTri(l.backorder)} disabled={busy} aria-label={l.channel}
                      onChange={(e) => save.mutate({ links: [{ mappingId: l.mappingId, backorder: fromTri(e.target.value as Tri) }] })}
                      options={triOptions(t('Product jaisa'))} />
                  : <Badge size="xs" variant="default">{t('Nahi chalta')}</Badge>}
              </div>
            ))}
          </div>
        </details>
      )}

      <BackorderGuide compact={compact} />
    </div>
  );
}

/** Units owed now and the orders waiting for stock. */
function OwedBox({ info, owed }: { info: BackorderInfo; owed: number }) {
  return (
    <div className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-amber-900">
        <PackageOpen className="h-4 w-4" />{t('Backorder: {{owed}} customers ko dena baqi', { owed })}
      </p>
      {info.owed.length > 1 && <p className="mt-1 text-[0.75rem] text-amber-800">{info.owed.map((o) => `${o.shop} ${o.owed}`).join(' · ')}</p>}
      {info.waiting.length > 0 && <WaitingOrders orders={info.waiting} productId={info.productId} />}
    </div>
  );
}

/** Accepted orders with units still owed, oldest first: send these first when stock comes. */
export function WaitingOrders({ orders, productId }: { orders: BackorderOrder[]; productId?: string }) {
  return (
    <div className="mt-2">
      <p className="text-[0.75rem] text-amber-800">{t('Stock aane par in orders ko pehle bhejein (purana pehle):')}</p>
      <ul className="mt-1.5 divide-y divide-amber-200/70 overflow-hidden rounded-xl bg-white ring-1 ring-amber-200">
        {orders.slice(0, 20).map((o) => {
          const lines = productId ? o.lines.filter((l) => l.productId === productId) : o.lines;
          const ready = lines.every((l) => l.ready);
          return (
            <li key={o.id} className="flex items-center gap-2 px-3 py-2 text-[0.8125rem]">
              <Link to={`/online-orders?order=${o.id}`} className="font-semibold text-brand-700 hover:underline">#{String(o.number).replace(/^#/, '')}</Link>
              <span className="min-w-0 flex-1 truncate text-slate-600">{o.customer ?? ''} · {lines.map((l) => `${l.name} ×${l.qty}`).join(', ')}</span>
              <span className="shrink-0 text-[0.71875rem] text-slate-400"><Clock className="me-0.5 inline h-3 w-3" />{timeAgo(o.acceptedAt)}</span>
              <Badge size="xs" variant={ready ? 'success' : 'warning'}>{ready ? t('Bhej sakte hain') : t('Stock ka intezar')}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Real stock vs what the customer sees, in plain words. */
export function BackorderGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5 text-[0.78125rem] leading-relaxed text-slate-600 ring-1 ring-slate-200/80">
      <p className="flex items-center gap-1.5 font-semibold text-slate-800"><Info className="h-3.5 w-3.5" />{t('Asli stock aur customer kya dekhta hai')}</p>
      <ul className="mt-1.5 list-disc space-y-1 ps-5">
        <li>{t('Asli stock: jo dukaan me pada hai. Order accept hone par kam hota hai — chalu ho to 0 se neeche (minus) bhi jata hai. Minus = customers ko dena baqi.')}</li>
        <li>{t('Customer dekhta hai: stock ho to "In stock". Khatam aur ye chalu ho to "Order karein — baad me bhejenge". Khatam aur band ho to "Out of stock".')}</li>
        {!compact && <li>{t('Google / Facebook feed: band wale khatam products "out of stock" jate hain (ya feed se nikal jate hain) taake log aa kar wapas na jayein. Chalu wale "backorder" jate hain.')}</li>}
        {!compact && <li>{t('Daraz 0 par nahi bechta — wahan hamesha asli stock jata hai.')}</li>}
      </ul>
      <Link to="/online-store/automation" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
        <Workflow className="h-3.5 w-3.5" />{t('Khatam aur band products website se khud hatayein (Automation)')}
      </Link>
    </div>
  );
}

/** Every order waiting for stock (the Backorder filter on Products & stock). */
export function BackorderWaitingCard() {
  const q = useQuery({ queryKey: [...BACKORDER_KEY, 'waiting'], queryFn: () => onlineProductsApi.waitingBackorders(), staleTime: 30_000 });
  const orders = q.data ?? [];
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80">
      <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900">
        <PackageOpen className="h-4 w-4 text-amber-600" />{t('Stock ka intezar karte orders')}
        {orders.length > 0 && <Badge size="xs" variant="warning">{orders.length}</Badge>}
      </p>
      {q.isLoading ? <Skeleton className="mt-2 h-16 rounded-xl" />
        : orders.length ? <WaitingOrders orders={orders} />
          : <p className="mt-1 text-[0.8125rem] text-slate-500">{t('Koi order intezar me nahi — sab customers ka maal pura hai.')}</p>}
    </div>
  );
}

/**
 * The product editor's "Online: stock khatam hone par" section. Shown only
 * to people who can see online products, and only when a channel is joined;
 * a new product gets it after the first save.
 */
export function ProductBackorderSection({ productId }: { productId?: string }) {
  const canView = usePermission(PERMISSIONS.ONLINE_PRODUCTS_VIEW);
  const canManage = usePermission(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const channels = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'channels'], queryFn: onlineProductsApi.channels, staleTime: 60_000, enabled: canView });
  if (!canView || !channels.data?.channels.length) return null;
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
      <p className="text-[0.875rem] font-semibold text-slate-900">{t('Online: stock khatam hone par')}</p>
      <p className="mb-3 text-[0.75rem] text-slate-500">{t('Website, Shopify aur Google par ye product 0 stock par kaisa dikhe')}</p>
      {productId ? <BackorderSettings productId={productId} canManage={canManage} />
        : <p className="text-[0.8125rem] text-slate-500">{t('Product save karne ke baad yahan "Stock khatam ho to bhi order lein" chalu kar sakte hain.')}</p>}
    </section>
  );
}

/** After stock comes in (purchase received): online orders waiting for these items, to send first. */
export function BackorderArrivedNotice({ productIds }: { productIds: Array<string | null | undefined> }) {
  const canView = usePermission(PERMISSIONS.ONLINE_PRODUCTS_VIEW);
  const ids = [...new Set(productIds.filter((x): x is string => !!x))].slice(0, 200);
  const q = useQuery({
    queryKey: [...BACKORDER_KEY, 'waiting', ids.join(',')],
    queryFn: () => onlineProductsApi.waitingBackorders(ids),
    enabled: canView && ids.length > 0,
    staleTime: 30_000,
  });
  if (!q.data?.length) return null;
  return (
    <div className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-amber-900">
        <PackageOpen className="h-4 w-4" />{t('{{count}} online orders is maal ka intezar kar rahe hain', { count: q.data.length })}
      </p>
      <WaitingOrders orders={q.data} />
    </div>
  );
}
