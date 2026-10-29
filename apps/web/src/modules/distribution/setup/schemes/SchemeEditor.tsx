/**
 * Create or edit a trade scheme. The form changes with the type (free goods,
 * percent, rupees per pack, slabs); below it come the items, brands,
 * categories and price lists it is limited to, the dates, the company that
 * pays for it, and on/off. The plain-language rule updates as you type and
 * the test box on the side runs the saved schemes on a sample order.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import { Alert, Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { DIST_KEY, distError, distSetupApi, type SaveScheme, type SchemeRow, type SchemeSlab, type SchemeType } from '../../api/distribution.api';
import { PRICE_LISTS_KEY, PickChips, SCHEMES_KEY, num } from '../shared';
import { ProductSearch, type PickedProduct } from '../ProductSearch';
import { SCHEME_TYPE, isoToDayKey, schemeRuleText } from './schemeMeta';
import { SchemePreviewBox } from './SchemePreviewBox';

const PACKS = ['Carton', 'Box', 'Dozen', 'Pack', 'Bag', 'Bundle'];
const EMPTY_SLAB = { minQty: '', percent: '', amountPerUnit: '', freeQty: '' };

interface Draft {
  name: string; type: SchemeType; supplierId: string;
  products: PickedProduct[]; brandIds: string[]; categoryIds: string[]; priceListIds: string[];
  buyQty: string; buyUnitName: string; freeQty: string; freeProduct: PickedProduct | null; value: string;
  slabs: Array<{ minQty: string; percent: string; amountPerUnit: string; freeQty: string }>;
  minOrderValue: string; startsAt: string; endsAt: string; isClaimable: boolean; isActive: boolean; note: string;
}

const fromScheme = (s: SchemeRow | null): Draft => ({
  name: s?.name ?? '', type: s?.type ?? 'FREE_QTY', supplierId: s?.supplierId ?? '',
  products: (s?.productIds ?? []).map((id, i) => ({ id, name: s?.productNames[i] ?? 'Item' })),
  brandIds: s?.brandIds ?? [], categoryIds: s?.categoryIds ?? [], priceListIds: s?.priceListIds ?? [],
  buyQty: s?.buyQty ? String(s.buyQty) : '', buyUnitName: s ? s.buyUnitName ?? '' : 'Carton', freeQty: s?.freeQty ? String(s.freeQty) : '',
  freeProduct: s?.freeProductId ? { id: s.freeProductId, name: s.freeProductName ?? 'Item' } : null, value: s?.value ? String(s.value) : '',
  slabs: (s?.slabs ?? []).map((x) => ({ minQty: String(x.minQty), percent: x.percent ? String(x.percent) : '', amountPerUnit: x.amountPerUnit ? String(x.amountPerUnit) : '', freeQty: x.freeQty ? String(x.freeQty) : '' })),
  minOrderValue: s?.minOrderValue ? String(s.minOrderValue) : '', startsAt: isoToDayKey(s?.startsAt), endsAt: isoToDayKey(s?.endsAt),
  isClaimable: s?.isClaimable ?? false, isActive: s?.isActive ?? true, note: s?.note ?? '',
});

function toBody(d: Draft): SaveScheme {
  const slabs: SchemeSlab[] = d.slabs.map((x) => ({
    minQty: num(x.minQty) ?? 0, ...(num(x.percent) ? { percent: num(x.percent)! } : {}),
    ...(num(x.amountPerUnit) ? { amountPerUnit: num(x.amountPerUnit)! } : {}), ...(num(x.freeQty) ? { freeQty: num(x.freeQty)! } : {}),
  })).filter((x) => x.minQty > 0);
  return {
    name: d.name.trim(), type: d.type, supplierId: d.supplierId || null,
    productIds: d.products.map((p) => p.id), brandIds: d.brandIds, categoryIds: d.categoryIds, priceListIds: d.priceListIds,
    buyQty: num(d.buyQty) ?? 0, buyUnitName: d.buyUnitName.trim() || null,
    freeQty: d.type === 'FREE_QTY' ? num(d.freeQty) ?? 0 : 0, freeProductId: d.type === 'FREE_QTY' ? d.freeProduct?.id ?? null : null,
    value: d.type === 'PERCENT_OFF' || d.type === 'AMOUNT_PER_UNIT' ? num(d.value) ?? 0 : 0,
    slabs: d.type === 'SLAB' ? slabs : [],
    minOrderValue: num(d.minOrderValue), startsAt: d.startsAt || null, endsAt: d.endsAt || null,
    isClaimable: d.isClaimable, isActive: d.isActive, note: d.note.trim() || undefined,
  };
}

function problem(d: Draft): string | null {
  if (!d.name.trim()) return 'Scheme ka naam likhein';
  if (d.type === 'FREE_QTY' && (!(num(d.buyQty)! > 0) || !(num(d.freeQty)! > 0))) return 'Kitne par kitna free — dono likhein';
  if (d.type === 'PERCENT_OFF' && !((num(d.value) ?? 0) > 0 && (num(d.value) ?? 0) <= 100)) return 'Discount % (1 se 100) likhein';
  if (d.type === 'AMOUNT_PER_UNIT' && !((num(d.value) ?? 0) > 0)) return 'Har pack par kitne rupay kam — likhein';
  if (d.type === 'SLAB' && !d.slabs.some((x) => (num(x.minQty) ?? 0) > 0 && ((num(x.percent) ?? 0) > 0 || (num(x.amountPerUnit) ?? 0) > 0 || (num(x.freeQty) ?? 0) > 0))) return 'Kam az kam ek slab poora likhein';
  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) return 'Khatam ki date shuru se pehle hai';
  return null;
}

export function SchemeEditor({ scheme, onClose }: { scheme: SchemeRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(() => fromScheme(scheme));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const brandsQ = useQuery({ queryKey: ['brands', 'all'], queryFn: () => brandsApi.list(), staleTime: 5 * 60_000 });
  const catsQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const listsQ = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists });
  const suppliersQ = useQuery({ queryKey: ['suppliers', 'dist-principals'], queryFn: () => suppliersApi.list({ limit: 200, status: 'active', sort: 'name' }), staleTime: 5 * 60_000 });
  const err = problem(d);
  const dirty = useMemo(() => JSON.stringify(toBody(d)) !== JSON.stringify(toBody(fromScheme(scheme))), [d, scheme]);

  const save = useMutation({
    mutationFn: () => (scheme ? distSetupApi.updateScheme(scheme.id, toBody(d)) : distSetupApi.createScheme(toBody(d))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEMES_KEY });
      qc.invalidateQueries({ queryKey: [DIST_KEY, 'scheme-preview'] });
      toast.success(scheme ? 'Scheme save ho gayi' : 'Scheme ban gayi');
      onClose();
    },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!err) save.mutate(); };

  const unit = d.buyUnitName.trim() || 'pcs';
  const t = SCHEME_TYPE[d.type];
  const setSlab = (i: number, k: keyof Draft['slabs'][number], v: string) => set('slabs', d.slabs.map((x, j) => (j === i ? { ...x, [k]: v.replace(/[^\d.]/g, '') } : x)));

  return (
    <Modal open onClose={onClose} size="xl" closeOnBackdrop={false} title={scheme ? `${scheme.name} — badlein` : 'Nayi scheme'}
      footer={<>
        {tried && err && <p className="mr-auto text-[0.8125rem] font-medium text-amber-800">{err}</p>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action loading={save.isPending} onClick={submit}>{scheme ? 'Save karein' : 'Scheme banayein'}</Button>
      </>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div role="radiogroup" aria-label="Scheme ki type" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(SCHEME_TYPE) as SchemeType[]).map((k) => {
              const m = SCHEME_TYPE[k];
              const on = d.type === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setD((x) => ({ ...x, type: k, slabs: k === 'SLAB' && !x.slabs.length ? [EMPTY_SLAB, EMPTY_SLAB] : x.slabs }))}
                  className={cn('rounded-xl p-2.5 text-left ring-1 transition', on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                  <m.icon className="h-4 w-4" style={{ color: m.color }} />
                  <span className="mt-1 block text-[0.8125rem] font-semibold text-slate-900">{m.label}</span>
                  <span className="block text-[0.6875rem] leading-snug text-slate-500">{m.hint}</span>
                </button>
              );
            })}
          </div>

          <Input label="Naam" required value={d.name} onChange={(e) => set('name', e.target.value)} maxLength={100} placeholder={d.type === 'FREE_QTY' ? '10+1 Carton' : 'November offer'} />

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input size="sm" label="Pack" list="dist-pack-names" value={d.buyUnitName} onChange={(e) => set('buyUnitName', e.target.value)} placeholder="Carton" hint="Khali = khule pcs" />
              {d.type !== 'SLAB' && (
                <Input size="sm" label={d.type === 'FREE_QTY' ? `Kitne ${unit} par` : `Kam az kam ${unit}`} inputMode="decimal" value={d.buyQty}
                  onChange={(e) => set('buyQty', e.target.value.replace(/[^\d.]/g, ''))} placeholder={d.type === 'FREE_QTY' ? '10' : '0 = koi had nahi'} />
              )}
              {d.type === 'FREE_QTY' && (
                <Input size="sm" label={d.freeProduct ? 'Kitne free (khule)' : `Kitne ${unit} free`} inputMode="decimal" value={d.freeQty} onChange={(e) => set('freeQty', e.target.value.replace(/[^\d.]/g, ''))} placeholder="1" />
              )}
              {d.type === 'PERCENT_OFF' && <Input size="sm" label="Discount %" inputMode="decimal" value={d.value} onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))} placeholder="3" />}
              {d.type === 'AMOUNT_PER_UNIT' && <Input size="sm" label={`Rs kam (har ${unit})`} inputMode="decimal" value={d.value} onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))} placeholder="50" />}
            </div>
            <datalist id="dist-pack-names">{PACKS.map((p) => <option key={p} value={p} />)}</datalist>

            {d.type === 'FREE_QTY' && (
              <div className="mt-3">
                <p className="mb-1 text-[0.75rem] font-semibold text-slate-600">Free me kya milega</p>
                {d.freeProduct ? (
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{d.freeProduct.name}</span>
                    <button type="button" aria-label="Wohi item free" onClick={() => set('freeProduct', null)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                  </div>
                ) : <ProductSearch onPick={(p) => set('freeProduct', p)} placeholder="Wohi item (ya doosra item chunein…)" />}
              </div>
            )}

            {d.type === 'SLAB' && (
              <div className="mt-3 space-y-2">
                {d.slabs.map((x, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
                    <Input size="sm" label={i === 0 ? `${unit} se` : undefined} aria-label="Kam az kam" inputMode="decimal" value={x.minQty} onChange={(e) => setSlab(i, 'minQty', e.target.value)} placeholder="5" />
                    <Input size="sm" label={i === 0 ? '%' : undefined} aria-label="Percent" inputMode="decimal" value={x.percent} onChange={(e) => setSlab(i, 'percent', e.target.value)} placeholder="2" />
                    <Input size="sm" label={i === 0 ? `Rs/${unit}` : undefined} aria-label="Rupay per pack" inputMode="decimal" value={x.amountPerUnit} onChange={(e) => setSlab(i, 'amountPerUnit', e.target.value)} />
                    <Input size="sm" label={i === 0 ? 'Free' : undefined} aria-label="Free" inputMode="decimal" value={x.freeQty} onChange={(e) => setSlab(i, 'freeQty', e.target.value)} />
                    <button type="button" aria-label="Slab hatayein" onClick={() => set('slabs', d.slabs.filter((_, j) => j !== i))} className="mb-1 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => set('slabs', [...d.slabs, EMPTY_SLAB])}>Slab</Button>
                <p className="text-[0.6875rem] text-slate-500">Jo sab se bara slab poora ho wohi lagta hai. Free qty seedhi milti hai (har slab par ek baar).</p>
              </div>
            )}
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[0.8125rem] font-semibold ring-1 ring-slate-200" style={{ color: t.color }}>
              {schemeRuleText(toBody(d), d.freeProduct?.name)}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[0.75rem] font-semibold text-slate-600">Items <span className="font-normal text-slate-400">{d.products.length ? `· ${d.products.length} chune` : '· brand / category na ho to sab items'}</span></p>
              {d.products.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {d.products.map((p) => (
                    <span key={p.id} className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 pl-2.5 pr-1 text-[0.75rem] font-semibold text-brand-800 ring-1 ring-brand-100">
                      {p.name}
                      <button type="button" aria-label="Hatayein" onClick={() => set('products', d.products.filter((x) => x.id !== p.id))} className="rounded-full p-0.5 hover:bg-brand-100"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <ProductSearch onPick={(p) => set('products', [...d.products, p])} exclude={d.products.map((p) => p.id)} placeholder="Item jorein…" />
            </div>
            {(brandsQ.data?.length ?? 0) > 0 && (
              <PickChips label="Brand" items={(brandsQ.data ?? []).slice(0, 40).map((b) => ({ value: b.id, label: b.name }))} picked={d.brandIds} onChange={(v) => set('brandIds', v)} />
            )}
            {(catsQ.data?.length ?? 0) > 0 && (
              <PickChips label="Category" items={(catsQ.data ?? []).slice(0, 40).map((c) => ({ value: c.id, label: c.name }))} picked={d.categoryIds} onChange={(v) => set('categoryIds', v)} />
            )}
            {(listsQ.data?.length ?? 0) > 0 && (
              <PickChips label="Sirf in price list wale customers" anyText="sab customers" items={(listsQ.data ?? []).map((l) => ({ value: l.id, label: l.name }))} picked={d.priceListIds} onChange={(v) => set('priceListIds', v)} />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input size="sm" type="date" label="Shuru" value={d.startsAt} onChange={(e) => set('startsAt', e.target.value)} hint="Khali = abhi se" />
            <Input size="sm" type="date" label="Khatam" value={d.endsAt} onChange={(e) => set('endsAt', e.target.value)} hint="Khali = jab tak band na karein" />
            <Input size="sm" label="Order kam az kam (Rs)" inputMode="decimal" value={d.minOrderValue} onChange={(e) => set('minOrderValue', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Koi had nahi" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select size="sm" label="Company (principal)" value={d.supplierId} onChange={(e) => set('supplierId', e.target.value)}
              options={[{ value: '', label: '— Apni scheme —' }, ...(suppliersQ.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))]}
              hint="Jo company scheme ka kharcha deti hai" />
            <div className="space-y-2 pt-1">
              <Switch checked={d.isClaimable} onChange={(e) => set('isClaimable', e.target.checked)} label="Company se claim hoga" description="Report me alag dikhega" />
              <Switch checked={d.isActive} onChange={(e) => set('isActive', e.target.checked)} label="Chalu" />
            </div>
          </div>
          <Textarea label="Note" rows={2} value={d.note} onChange={(e) => set('note', e.target.value)} maxLength={300} />
        </div>

        <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <SchemePreviewBox title="Test karein" initialProduct={d.products[0] ?? null}
            hint="Order par jo chalti schemes lagti hain wohi yahan."
            note={dirty ? 'Yeh test save ki hui schemes par chalta hai — nayi tabdeeli save ke baad nazar aayegi.' : undefined} />
          {d.products.length === 0 && d.brandIds.length === 0 && d.categoryIds.length === 0 && (
            <Alert tone="info">Koi item, brand ya category nahi chuni — scheme har item par lagegi.</Alert>
          )}
        </div>
      </div>
    </Modal>
  );
}
