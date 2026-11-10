/**
 * Link a channel product with many SKUs (Daraz, Shopify, WooCommerce) into
 * one Nafaa product, SKU by SKU. Each channel SKU gets a Nafaa variant:
 * prefilled from the API's match (SKU, options or name), a new variant, or
 * left out. A Nafaa product without variants gets them made when the API
 * allows it; otherwise the reason is shown and saving is off. When the two
 * products look like different items (no shared name word, no SKU match),
 * the screen warns and saving needs a "Haan, yehi hai" tick.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Info, Link2, Package } from 'lucide-react';
import { Button, EmptyState, Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type LinkPlan, type LinkPlanRow } from '../../api/online-products.api';
import { refreshOnlineProducts, rs } from './meta';

const NEW = '__new__';
const SKIP = '';

const rowKey = (r: LinkPlanRow) => r.externalVariantId ?? '-';

const matchText = (by: 'sku' | 'options' | 'name') => (by === 'sku' ? t('SKU mila') : by === 'options' ? t('Options mile') : t('Naam mila'));

/** First choice for each SKU: its current link to this product, the API match, else new or skip. */
function initialChoices(plan: LinkPlan, convert: boolean): Record<string, string> {
  const ids = new Set(plan.variants.map((v) => v.id));
  const out: Record<string, string> = {};
  for (const r of plan.rows) {
    if (r.linked?.productId === plan.product.id && r.linked.variantId && ids.has(r.linked.variantId)) out[rowKey(r)] = r.linked.variantId;
    else if (r.linked) out[rowKey(r)] = SKIP;
    else if (r.match && ids.has(r.match.variantId)) out[rowKey(r)] = r.match.variantId;
    else out[rowKey(r)] = convert || plan.product.hasVariants ? NEW : SKIP;
  }
  return out;
}

export function VariantMapModal({ channelId, externalProductId, productId, onClose, onDone }: {
  channelId: string;
  externalProductId: string;
  productId: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'link-plan', channelId, externalProductId, productId],
    queryFn: () => onlineProductsApi.linkPlan(channelId, externalProductId, productId),
    staleTime: 0,
  });
  const plan = q.data;
  // The Nafaa product has no sizes yet and the channel product has many: its variants would be made.
  const needsConvert = !!plan && !plan.product.hasVariants && plan.rows.length > 1;
  const blocked = needsConvert && !plan!.canConvert;
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [sure, setSure] = useState(false);
  const mismatch = plan?.mismatch ?? null;
  useEffect(() => { if (plan) setChoice(initialChoices(plan, needsConvert && plan.canConvert)); }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const picks = useMemo(() => (plan?.rows ?? [])
    .filter((r) => (choice[rowKey(r)] ?? SKIP) !== SKIP)
    .map((r) => ({ externalVariantId: r.externalVariantId, variantId: choice[rowKey(r)] === NEW ? null : choice[rowKey(r)] })), [plan, choice]);

  // Two channel SKUs on one Nafaa variant would sell the same stock twice.
  const doubled = useMemo(() => {
    const seen = new Map<string, number>();
    for (const p of picks) if (p.variantId) seen.set(p.variantId, (seen.get(p.variantId) ?? 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([id]) => id));
  }, [picks]);

  const save = useMutation({
    mutationFn: () => onlineProductsApi.linkInto(channelId, { externalProductId, productId, variants: picks, ...(mismatch && sure && { confirm: true }) }),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      toast.success(t('{{linked}} jure, {{variantsCreated}} naye variant', { linked: r.linked, variantsCreated: r.variantsCreated }),
        r.held > 0 ? { description: t('{{held}} par Stock milana baqi — Masle me dekhein', { held: r.held }) } : undefined);
      onDone?.();
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const options = (plan?.variants ?? []).map((v) => ({
    value: v.id,
    label: [v.name, v.sku, t('Stock {{qty}}', { qty: v.stock })].filter(Boolean).join(' · '),
  }));

  return (
    <Modal open onClose={onClose} size="xl"
      title={plan ? t('{{title}} → {{name}}', { title: plan.remote.title, name: plan.product.name }) : t('Har SKU jorein')}
      description={t('Channel ke har SKU ke saamne Nafaa ka variant chunein.')}
      footer={<>
        <span className="me-auto text-[0.75rem] text-slate-500">{plan ? t('{{count}} / {{total}} SKU jurenge', { count: picks.length, total: plan.rows.length }) : null}</span>
        <Button variant="ghost" onClick={onClose}>{t('Band karein')}</Button>
        <Button loading={save.isPending} disabled={!plan || blocked || !picks.length || doubled.size > 0 || (!!mismatch && !sure)} onClick={() => save.mutate()} leftIcon={<Link2 className="h-4 w-4" />}>
          {t('Jorein')}
        </Button>
      </>}>
      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : q.isError || !plan ? (
        <EmptyState icon={<Package className="h-5 w-5" />} title={t('SKU list nahi aayi')} description={apiErrorMessage(q.error)}
          action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : (
        <div className="space-y-3">
          {mismatch && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><span className="block font-semibold">{t('Ye do alag cheezen lagti hain')}</span>{t('Channel ke item aur Nafaa ke product ke naam me koi lafz nahi milta aur SKU bhi nahi. Ghalat jor diya to Nafaa is ki qeemat aur Stock channel par bhej dega.')}</span>
              </p>
              <label className="mt-2 flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="h-4 w-4 rounded border-rose-300" />
                {t('Haan, yehi hai — phir bhi jorein')}
              </label>
            </div>
          )}
          {needsConvert && (plan.canConvert ? (
            <p className="flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[0.8125rem] text-brand-900 ring-1 ring-brand-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('Is product ke variants ban jayenge')} — {t('har chuna hua SKU Nafaa me naya variant banega aur us se jur jayega.')}</span>
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{plan.convertBlock ?? t('Is product ke variants nahi ban sakte.')}</span>
            </p>
          ))}
          {doubled.size > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('Do SKU ek hi Nafaa variant par hain. Har variant ek hi SKU se jurta hai.')}</span>
            </p>
          )}
          {!plan.rows.length ? (
            <EmptyState icon={<Package className="h-5 w-5" />} title={t('Channel par is product ke SKU nahi mile')} />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
              {plan.rows.map((r) => {
                const key = rowKey(r);
                const value = choice[key] ?? SKIP;
                const linkedElsewhere = !!r.linked && r.linked.productId !== plan.product.id;
                return (
                  <li key={key} className="grid gap-2 bg-white px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center md:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.84375rem] font-semibold text-slate-900" title={r.title}>{r.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                        {r.sku ? <span className="font-mono">{r.sku}</span> : <span>{t('SKU nahi')}</span>}
                        {r.options.map((o) => (
                          <span key={`${o.name}:${o.value}`} className="rounded-md bg-slate-100 px-1.5 py-px font-semibold text-slate-700 ring-1 ring-slate-200/80">{o.name}: {o.value}</span>
                        ))}
                        <span>· {rs(r.price)}</span>
                        <span>· {r.tracked === false ? t('Ginti nahi') : r.stock === null ? t('Stock track nahi') : t('Channel Stock {{qty}}', { qty: r.stock })}</span>
                      </p>
                      {linkedElsewhere && <p className="mt-0.5 text-[0.71875rem] font-medium text-amber-700">{t('Pehle se kisi aur Nafaa product se jura hai')}</p>}
                      {r.match && value === r.match.variantId && (
                        <span className="mt-1 inline-flex rounded-full bg-success-50 px-1.5 py-px text-[0.6875rem] font-semibold text-success-700">{matchText(r.match.by)}</span>
                      )}
                    </div>
                    <select value={value} disabled={blocked} onChange={(e) => setChoice((c) => ({ ...c, [key]: e.target.value }))}
                      aria-label={t('{{title}} ke liye Nafaa variant', { title: r.title })}
                      className={cn('h-9 w-full rounded-lg border bg-white px-2.5 text-[0.8125rem] text-slate-800 outline-none focus:border-brand-500 disabled:opacity-50',
                        value !== SKIP && value !== NEW && doubled.has(value) ? 'border-amber-400' : 'border-slate-300')}>
                      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      {(plan.product.hasVariants || plan.canConvert) && <option value={NEW}>{t('Naya variant banayein')}</option>}
                      <option value={SKIP}>{t('Na jorein')}</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
