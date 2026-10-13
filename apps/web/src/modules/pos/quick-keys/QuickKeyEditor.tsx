/**
 * Add or change one quick key: a product (with variant and pack unit) found
 * by name or scan, or a combo; then label, emoji, colour, group and where it
 * shows. The tile on the right is exactly what the counter will see.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Gift, Package, Search, Trash2, X } from 'lucide-react';
import { Button, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { ProductSearch } from '@modules/inventory/stock-adjustments/components/ProductSearch';
import type { Source, UnitChoice } from '@modules/purchasing/purchases/editor/sources';
import type { ProductCombo } from '@modules/inventory/combos/api/combos.api';
import { PosQuickKeyTile } from '../components';
import { quickKeysApi, type QuickKey, type QuickKeyPayload } from '../api/quick-keys.api';
import { EMOJI_SETS, KEY_COLORS, POS_QK_KEY, QK_KEY } from './meta';

const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';
const hintCls = 'mt-1 text-[0.6875rem] text-slate-500';
const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}

export function QuickKeyEditor({ editing, sources, byCode, sourcesLoading, combos, groups, shop, nextPosition, onClose }: {
  editing: QuickKey | null;
  sources: Source[];
  byCode: Map<string, { source: Source; unit: UnitChoice }>;
  sourcesLoading: boolean;
  combos: ProductCombo[];
  groups: string[];
  /** Active branch; null on the all-branches view. */
  shop: { id: string; name: string } | null;
  nextPosition: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<'product' | 'combo'>(editing?.comboId ? 'combo' : 'product');
  const [source, setSource] = useState<Source | null>(() => (editing?.productId ? sources.find((s) => s.id === editing.productId) ?? null : null));
  const [unitId, setUnitId] = useState<string | null>(editing?.unitId ?? null);
  const [variantId, setVariantId] = useState<string | null>(editing?.variantId ?? null);
  const [comboId, setComboId] = useState<string | null>(editing?.comboId ?? null);
  const [comboQuery, setComboQuery] = useState('');
  const [label, setLabel] = useState(editing?.label ?? '');
  const [labelTouched, setLabelTouched] = useState(!!editing);
  const [icon, setIcon] = useState(editing?.icon ?? '');
  const [color, setColor] = useState(editing?.color ?? '');
  const [group, setGroup] = useState(editing?.group ?? '');
  const [branchOnly, setBranchOnly] = useState(!!editing?.shopId);
  const [personal, setPersonal] = useState(!!editing?.userId);
  const [active, setActive] = useState(editing?.isActive ?? true);

  // Sources load after the editor may open; attach the product once they arrive.
  useEffect(() => {
    if (!source && editing?.productId) setSource(sources.find((s) => s.id === editing.productId) ?? null);
  }, [sources, source, editing]);

  const variantsQ = useQuery({
    queryKey: ['product-variants', source?.id],
    queryFn: () => productVariantsApi.list(source!.id),
    enabled: !!source?.hasVariants,
    staleTime: 60_000,
  });
  const variants = (variantsQ.data ?? []).filter((v) => v.isActive);
  const unit = source?.units.find((u) => u.id === unitId) ?? source?.units[0];
  const variant = variants.find((v) => v.id === variantId);
  const combo = combos.find((c) => c.id === comboId);

  const autoLabel = useMemo(() => {
    if (kind === 'combo') return combo?.name ?? '';
    if (!source) return '';
    return [source.name, variant?.name, unit && unit.rate !== 1 ? unit.name : ''].filter(Boolean).join(' · ');
  }, [kind, combo, source, variant, unit]);
  useEffect(() => { if (!labelTouched) setLabel(autoLabel.slice(0, 40)); }, [autoLabel, labelTouched]);

  const price = kind === 'combo' ? Number(combo?.comboPrice ?? 0)
    : variant && (!unit || unit.rate === 1) ? Number(variant.price ?? 0) : (source?.price ?? 0) * (unit?.rate ?? 1);
  const previewKey = { label: label || 'Naam likhein', icon: icon || undefined, color: color || undefined, productId: kind === 'product' ? 'p' : undefined, comboId: kind === 'combo' ? 'c' : undefined };

  const filteredCombos = combos.filter((c) => !comboQuery.trim() || c.name.toLowerCase().includes(comboQuery.trim().toLowerCase())).slice(0, 30);

  const problems: string[] = [];
  if (kind === 'product' && !source) problems.push('Product chunein');
  if (kind === 'combo' && !comboId) problems.push('Combo chunein');
  if (!label.trim()) problems.push('Naam likhein');
  if (branchOnly && !shop && !editing?.shopId) problems.push('"Sirf is branch" ke liye upar se branch chunein');

  const save = useMutation({
    mutationFn: () => {
      if (problems.length) throw new Error(problems[0]);
      const payload: QuickKeyPayload = {
        productId: kind === 'product' ? source!.id : null,
        variantId: kind === 'product' ? variantId : null,
        unitId: kind === 'product' && unit && unit.rate !== 1 ? unit.id : null,
        comboId: kind === 'combo' ? comboId : null,
        label: label.trim(),
        icon: icon.trim(),
        color: color || null,
        group: group.trim(),
        shopId: branchOnly ? (editing?.shopId && !shop ? editing.shopId : shop?.id ?? null) : null,
        personal,
        isActive: active,
      };
      return editing ? quickKeysApi.update(editing.id, payload) : quickKeysApi.create({ ...payload, position: nextPosition });
    },
    onSuccess: () => {
      toast.success(editing ? 'Quick key update ho gayi' : 'Quick key ban gayi — POS par dikh rahi hai');
      qc.invalidateQueries({ queryKey: [QK_KEY] });
      qc.invalidateQueries({ queryKey: [POS_QK_KEY] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : apiError(e, 'Save nahi hui')),
  });

  const remove = useMutation({
    mutationFn: () => quickKeysApi.remove(editing!.id),
    onSuccess: () => {
      toast.success('Quick key hata di');
      qc.invalidateQueries({ queryKey: [QK_KEY] });
      qc.invalidateQueries({ queryKey: [POS_QK_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Hata nahi saki')),
  });

  return (
    <Modal open onClose={onClose} size="xl" title={editing ? 'Quick key badlein' : 'Nayi quick key'} closeOnBackdrop={false}
      description="Counter par ek tap me bikne wali cheez — product, uski type aur pack, ya combo"
      footer={<>
        {editing && (
          <Button variant="ghost" className="mr-auto text-rose-600" loading={remove.isPending}
            onClick={() => { if (window.confirm(`"${editing.label}" hata dein?`)) remove.mutate(); }} leftIcon={<Trash2 className="h-4 w-4" />}>
            Hatayein
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{editing ? 'Save karein' : 'Key banayein'}</Button>
      </>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Kya bechna hai" className="inline-flex rounded-xl bg-slate-100 p-1">
            {([['product', 'Product', Package], ['combo', 'Combo', Gift]] as const).map(([k, l, I]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold transition', kind === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                <I className="h-4 w-4" />{l}
              </button>
            ))}
          </div>

          {kind === 'product' ? (
            <div className="space-y-3">
              {source ? (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                  <Package className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{source.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">{source.sku ? `${source.sku} · ` : ''}Stock {source.stock} {source.baseUnit}</span>
                  </span>
                  <button type="button" onClick={() => { setSource(null); setUnitId(null); setVariantId(null); }} aria-label="Product badlein" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div>
                  <ProductSearch sources={sources} byCode={byCode} loading={sourcesLoading}
                    onPick={(s, u) => { setSource(s); setUnitId(u.rate !== 1 ? u.id : null); setVariantId(null); }} />
                  <p className={hintCls}>Naam likhein ya barcode scan karein. Carton ka barcode scan karein to key carton ki banegi.</p>
                </div>
              )}

              {source && source.units.length > 1 && (
                <div>
                  <p className={labelCls}>Kis pack me bike?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {source.units.map((u) => (
                      <button key={u.name} type="button" onClick={() => setUnitId(u.rate !== 1 ? u.id : null)}
                        className={cn('rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', (unit?.name === u.name) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                        {u.name}{u.rate !== 1 ? ` (${u.rate})` : ''}
                      </button>
                    ))}
                  </div>
                  <p className={hintCls}>Key dabane par yahi pack bill me jayega — dozen, carton ya khula.</p>
                </div>
              )}

              {source?.hasVariants && (
                <div>
                  <p className={labelCls}>Type (variant)</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setVariantId(null)}
                      className={cn('rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', !variantId ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                      Counter par poochein
                    </button>
                    {variants.map((v) => (
                      <button key={v.id} type="button" onClick={() => setVariantId(v.id)}
                        className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', variantId === v.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                        {v.colorHex && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: v.colorHex }} />}{v.name}
                      </button>
                    ))}
                  </div>
                  <p className={hintCls}>Ek type chunein to seedha wahi bikegi. Warna counter par type poochi jayegi.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={comboQuery} onChange={(e) => setComboQuery(e.target.value)} placeholder="Combo search…" aria-label="Combo search" className={cn(inputCls, 'pl-9')} />
              </div>
              <div className="mt-2 grid max-h-52 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {filteredCombos.map((c) => (
                  <button key={c.id} type="button" onClick={() => setComboId(c.id)}
                    className={cn('rounded-xl px-3 py-2 text-left ring-1 transition', comboId === c.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                    <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{c.name}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{c.items?.length ?? 0} cheezein · Rs {Number(c.comboPrice).toLocaleString('en-PK')}</span>
                  </button>
                ))}
                {!filteredCombos.length && <p className="text-[0.75rem] text-slate-500">Koi chalu combo nahi. Pehle Combos page se banayein.</p>}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qk-label" className={labelCls}>Naam <span className="text-rose-600">*</span></label>
              <input id="qk-label" value={label} maxLength={40} onChange={(e) => { setLabel(e.target.value); setLabelTouched(true); }} placeholder="Maslan: Doodh 1L" className={inputCls} />
              <p className={hintCls}>Chhota rakhein — tile par do line tak dikhta hai. {label.length}/40</p>
            </div>
            <div>
              <label htmlFor="qk-group" className={labelCls}>Group</label>
              <input id="qk-group" value={group} maxLength={40} list="qk-groups" onChange={(e) => setGroup(e.target.value)} placeholder="Maslan: Doodh, Cold drinks" className={inputCls} />
              <datalist id="qk-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
              <p className={hintCls}>POS par keys isi heading ke neeche jamti hain. Khali chhorein to "General".</p>
            </div>
          </div>

          <div>
            <p className={labelCls}>Emoji</p>
            <div className="space-y-1.5">
              {EMOJI_SETS.map((set) => (
                <div key={set.name} className="flex flex-wrap items-center gap-1">
                  <span className="w-20 shrink-0 text-[0.6875rem] text-slate-400">{set.name}</span>
                  {set.emojis.map((e) => (
                    <button key={e} type="button" onClick={() => setIcon(icon === e ? '' : e)} aria-label={e}
                      className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-lg transition', icon === e ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-slate-100')}>{e}</button>
                  ))}
                </div>
              ))}
            </div>
            <p className={hintCls}>Tasveer se cashier jaldi pehchanta hai. Koi na chunein to ⚡ dikhega.</p>
          </div>

          <div>
            <p className={labelCls}>Rang</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setColor('')} aria-label="Koi rang nahi"
                className={cn('h-8 w-8 rounded-full bg-white ring-1 ring-slate-300', !color && 'ring-2 ring-slate-900 ring-offset-2')} />
              {KEY_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
                  className={cn('h-8 w-8 rounded-full transition', color === c && 'ring-2 ring-slate-900 ring-offset-2')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className={hintCls}>Ek group ko ek rang dein — counter par aankh foran dhoond leti hai.</p>
          </div>

          <div className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <Switch size="sm" checked={branchOnly} onChange={(e) => setBranchOnly(e.target.checked)} disabled={!shop && !editing?.shopId}
              label={shop ? `Sirf ${shop.name} me dikhe` : 'Sirf ek branch me dikhe'}
              description={shop ? 'Band ho to har branch ke POS par dikhegi.' : 'Upar se branch chunein, phir yeh on kar sakte hain.'} />
            <Switch size="sm" checked={personal} onChange={(e) => setPersonal(e.target.checked)}
              label="Sirf mere liye" description="On karein to sirf aap ko dikhegi. Band ho to sab cashiers ko." />
            <Switch size="sm" checked={active} onChange={(e) => setActive(e.target.checked)}
              label="Chalu" description="Band karne se POS se chhup jati hai, magar yahan rehti hai." />
          </div>
        </div>

        <aside className="lg:sticky lg:top-0 lg:self-start">
          <p className={labelCls}>Counter par aise dikhegi</p>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="mx-auto w-28">
              <PosQuickKeyTile qk={previewKey} products={kind === 'product' ? [{ id: 'p', price, stock: source?.stock ?? 1 }] : []}
                combos={kind === 'combo' ? [{ id: 'c', comboPrice: price }] : []} onClick={() => undefined} />
            </div>
          </div>
          {problems.length > 0 && <p className="mt-2 text-[0.75rem] text-amber-800">{problems[0]}</p>}
        </aside>
      </div>
    </Modal>
  );
}
