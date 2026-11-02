/**
 * Make or change a gift pack: its toys (with the colour or model for toys
 * that have variants, so the counter takes the right stock), the pack
 * price, the occasion and age, and the dates it shows on the counter.
 *
 * Keys: Ctrl+S save · Esc back.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, Gift, Package, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { toyGiftPacksApi, type GiftPackBody } from '../api/gift-packs.api';
import { AGE_GROUPS, GENDERS, KEYS, OCCASIONS, apiError } from '../lib/meta';
import { useDebounced, useSaveKey } from '../components/ui';
import { t } from '@core/i18n';

interface Line { key: string; productId: string; name: string; hasVariants: boolean; variantId: string; quantity: number; unitPrice: number; stock: number }
interface Draft {
  name: string; description: string; occasion: string; targetAgeGroup: string; targetGender: string; price: string;
  isGiftWrapped: boolean; includesCard: boolean; isActive: boolean; isFeatured: boolean; isSeasonal: boolean; seasonName: string;
  validFrom: string; validUntil: string; lines: Line[];
}

const EMPTY: Draft = {
  name: '', description: '', occasion: 'BIRTHDAY', targetAgeGroup: '', targetGender: '', price: '', isGiftWrapped: true, includesCard: false,
  isActive: true, isFeatured: false, isSeasonal: false, seasonName: '', validFrom: '', validUntil: '', lines: [],
};

let seq = 0;
const key = () => `l${++seq}`;
const dayKey = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) : '');

export default function GiftPackFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lock = useRef(false);
  const [d, setD] = useState<Draft>(EMPTY);
  const [q, setQ] = useState('');
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const setLine = (k: string, patch: Partial<Line>) => set({ lines: d.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) });

  const packQ = useQuery({ queryKey: [KEYS.packs, 'one', id], queryFn: () => toyGiftPacksApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const p = packQ.data;
    if (!p) return;
    setD({
      name: p.name, description: p.description ?? '', occasion: p.occasion ?? '', targetAgeGroup: p.targetAgeGroup ?? '', targetGender: p.targetGender ?? '',
      price: String(p.giftPackPrice), isGiftWrapped: p.isGiftWrapped, includesCard: p.includesCard, isActive: p.isActive, isFeatured: p.isFeatured,
      isSeasonal: p.isSeasonal, seasonName: p.seasonName ?? '', validFrom: dayKey(p.validFrom), validUntil: dayKey(p.validUntil),
      lines: p.items.map((i) => ({
        key: key(), productId: i.productId, name: i.product?.name ?? 'Khilona nahi mila', hasVariants: !!i.product?.hasVariants,
        variantId: i.variantId ?? '', quantity: i.quantity, unitPrice: i.unitPrice, stock: Number(i.product?.stock ?? 0),
      })),
    });
  }, [packQ.data]);

  const term = useDebounced(q.trim(), 250);
  const found = useQuery({
    queryKey: ['toy-pack-search', term],
    queryFn: () => productsApi.list({ search: term, limit: 12, isActive: true }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

  const original = d.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const price = Number(d.price) || 0;
  const savings = Math.max(original - price, 0);
  const packs = d.lines.length ? Math.min(...d.lines.map((l) => (l.quantity > 0 ? Math.floor(l.stock / l.quantity) : 0))) : 0;

  const problems = useMemo(() => {
    const out: string[] = [];
    if (!d.name.trim()) out.push(t('Pack ka naam likhein'));
    if (d.lines.length < 2) out.push(t('Kam se kam 2 khilone chunein'));
    if (d.lines.some((l) => !(l.quantity >= 1) || !Number.isInteger(l.quantity))) out.push(t('Har khilone ki quantity poori ginti me, kam se kam 1'));
    if (d.lines.some((l) => l.hasVariants && !l.variantId)) out.push(t('Rang / model wale khilone ka rang chunein'));
    if (!(price > 0)) out.push(t('Pack ki qeemat likhein'));
    if (d.validFrom && d.validUntil && d.validUntil < d.validFrom) out.push(t('Khatam ki tareekh shuru se pehle hai'));
    return out;
  }, [d, price]);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const body: GiftPackBody = {
        name: d.name.trim(), description: d.description.trim() || undefined, occasion: d.occasion || undefined,
        targetAgeGroup: d.targetAgeGroup || undefined, targetGender: d.targetGender || undefined, giftPackPrice: price,
        items: d.lines.map((l) => ({ productId: l.productId, ...(l.variantId ? { variantId: l.variantId } : {}), quantity: l.quantity, unitPrice: l.unitPrice })),
        isGiftWrapped: d.isGiftWrapped, includesCard: d.includesCard, isActive: d.isActive, isFeatured: d.isFeatured,
        isSeasonal: d.isSeasonal, seasonName: d.isSeasonal ? d.seasonName.trim() || undefined : undefined,
        validFrom: d.validFrom || undefined, validUntil: d.validUntil || undefined,
      };
      return editing ? toyGiftPacksApi.update(id!, body) : toyGiftPacksApi.create(body);
    },
    onSuccess: () => {
      [KEYS.packs, KEYS.posPacks].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? t('Pack save ho gaya') : t('Pack ban gaya — counter ke Combos tab me hai'));
      navigate('/toystore/gift-packs');
    },
    onError: (e) => toast.error(apiError(e, (e as Error).message || t('Save nahi hua'))),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { if (lock.current || save.isPending) return; lock.current = true; save.mutate(); };
  useSaveKey(submit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDialogOpen()) navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const add = (p: { id: string; name: string; price: number; stock: number; hasVariants: boolean }) => {
    const same = d.lines.find((l) => l.productId === p.id && !p.hasVariants);
    if (same) setLine(same.key, { quantity: same.quantity + 1 });
    else set({ lines: [...d.lines, { key: key(), productId: p.id, name: p.name, hasVariants: p.hasVariants, variantId: '', quantity: 1, unitPrice: Number(p.price) || 0, stock: Number(p.stock) || 0 }] });
    setQ('');
  };

  if (editing && packQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !packQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{t('Ye pack nahi mila')}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/toystore/gift-packs')}>{t('Gift packs par wapas')}</Button></div></PageShell>;

  return (
    <PageShell>
      <PageHero
        title={editing ? t('{{name}} — badlein', { name: packQ.data?.name }) : t('Naya gift pack')}
        subtitle={t('Khilone chunein, pack ki qeemat rakhein — counter par ek tap me bikta hai')}
        back={() => navigate(-1)}
        backLabel={t('Wapas (Esc)')}
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{t('save')}</span>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Gift}>{t('Pack')}</T>}>
            <div className="space-y-3">
              <Input label={t('Naam')} required value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('Eid box larkon ke liye')} maxLength={100} hint={t('Counter aur receipt par yahi naam aata hai')} />
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Mauqa')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASIONS.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set({ occasion: d.occasion === v ? '' : v })}
                      className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', d.occasion === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label={t('Umar')} value={d.targetAgeGroup} onChange={(e) => set({ targetAgeGroup: e.target.value })} options={[{ value: '', label: t('Har umar') }, ...AGE_GROUPS.map(([v, l]) => ({ value: v, label: l }))]} hint={t('Gift finder isi se pack dikhata hai')} />
                <Select label={t('Kis ke liye')} value={d.targetGender} onChange={(e) => set({ targetGender: e.target.value })} options={[{ value: '', label: t('Sab') }, ...GENDERS.map(([v, l]) => ({ value: v, label: l }))]} />
              </div>
              <Textarea label={t('Tafseel')} value={d.description} onChange={(e) => set({ description: e.target.value })} rows={2} maxLength={500} placeholder={t('Car, ball aur chocolate — wrap ke saath')} hint={t('Marzi hai')} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Package}>{t('Khilone')}</T>} description={t('Har khilona pack bikne par stock se nikalta hai')}>
            <div className="relative">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Khilone ka naam ya barcode likhein')} leftIcon={<Search className="h-4 w-4" />} aria-label={t('Khilona dhoondein')} />
              {term.length >= 2 && (
                <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                  {(found.data?.items ?? []).length === 0
                    ? <li className="px-3 py-2.5 text-[0.8125rem] text-slate-500">{found.isFetching ? t('Dhoond rahe hain…') : t('Kuch nahi mila')}</li>
                    : (found.data?.items ?? []).map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => add(p)} className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-slate-50">
                          <Plus className="h-4 w-4 text-brand-600" />
                          <span className="min-w-0 flex-1 truncate text-[0.875rem]">{p.name}{p.hasVariants ? t(' (rang / model)') : ''}</span>
                          <span className="text-[0.75rem] tabular-nums text-slate-500">{t('Stock {{stock}}', { stock: p.stock })}</span>
                          <span className="text-[0.8125rem] font-semibold tabular-nums">{formatPKR(p.price)}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {d.lines.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500">{t('Upar se kam se kam 2 khilone chunein.')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {d.lines.map((l) => (
                  <li key={l.key} className="grid grid-cols-[1fr_auto] gap-2 p-3 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-end">
                    <div className="min-w-0">
                      <p className="truncate text-[0.875rem] font-medium text-slate-900">{l.name}</p>
                      <p className={cn('text-[0.75rem]', l.stock < l.quantity ? 'text-rose-600' : 'text-slate-500')}>{t('Stock {{stock}}', { stock: l.stock })}</p>
                      {l.hasVariants && <VariantSelect productId={l.productId} value={l.variantId} onChange={(variantId, stock, rate) => setLine(l.key, { variantId, stock: stock ?? l.stock, unitPrice: rate ?? l.unitPrice })} />}
                    </div>
                    <Input label={t('Qty')} inputMode="numeric" value={String(l.quantity)} onChange={(e) => setLine(l.key, { quantity: Number(e.target.value.replace(/\D/g, '')) || 0 })} className="text-end tabular-nums" />
                    <Input label={t('Rate (Rs)')} inputMode="decimal" value={String(l.unitPrice)} onChange={(e) => setLine(l.key, { unitPrice: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className="text-end tabular-nums" hint={t('Asal rate')} />
                    <button type="button" onClick={() => set({ lines: d.lines.filter((x) => x.key !== l.key) })} aria-label={t('Hatayein')} className="flex h-10 w-10 items-center justify-center self-end rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={t('Qeemat')}>
            <Input label={t('Pack ki qeemat (Rs)')} required inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, '') })}
              placeholder={original ? String(Math.round(original * 0.9)) : '0'} className="text-end text-lg font-semibold tabular-nums"
              hint={original ? t('Alag alag {{original}} — 10% kam: {{formatPKR}}', { original: formatPKR(original), formatPKR: formatPKR(Math.round(original * 0.9)) }) : t('Khilone chunne ke baad')} />
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[0.8125rem]">
              <div><dt className="text-slate-500">{t('Alag alag')}</dt><dd className="font-semibold tabular-nums">{formatPKR(original)}</dd></div>
              <div><dt className="text-slate-500">{t('Bachat')}</dt><dd className="font-semibold tabular-nums text-success-700">{formatPKR(savings)}</dd></div>
              <div><dt className="text-slate-500">{t('Stock se')}</dt><dd className={cn('font-semibold tabular-nums', packs === 0 && d.lines.length ? 'text-rose-600' : '')}>{t('{{packs}} pack', { packs })}</dd></div>
            </dl>
            {price > original && original > 0 && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">{t('Pack alag alag se mehnga hai — customer alag le lega.')}</p>}
          </Card>

          <Card className="rounded-2xl" title={<T icon={CalendarClock}>{t('Kab tak')}</T>} description={t('Khali chhorein to hamesha counter par')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('Shuru')} type="date" value={d.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
              <Input label={t('Khatam')} type="date" value={d.validUntil} min={d.validFrom || undefined} onChange={(e) => set({ validUntil: e.target.value })} hint={t('Is din ke baad counter se hat jata hai')} />
            </div>
            <div className="mt-3 space-y-3">
              <Switch checked={d.isSeasonal} onChange={(e) => set({ isSeasonal: e.target.checked })} label={t('Season ka pack')} description={t('Eid, saalgirah ka season — packs page par alag tab')} />
              {d.isSeasonal && <Input label={t('Season')} value={d.seasonName} onChange={(e) => set({ seasonName: e.target.value })} placeholder={t('Eid ul Fitr 2027')} />}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Settings2}>{t('Aur')}</T>}>
            <div className="space-y-3">
              <Switch checked={d.isActive} onChange={(e) => set({ isActive: e.target.checked })} label={t('Counter par chalu')} />
              <Switch checked={d.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} label={t('Upar dikhayein')} description={t('Combos tab me sab se pehle')} />
              <Switch checked={d.isGiftWrapped} onChange={(e) => set({ isGiftWrapped: e.target.checked })} label={t('Wrap ke saath')} description={t('Pack ki qeemat me wrap shamil hai')} />
              <Switch checked={d.includesCard} onChange={(e) => set({ includesCard: e.target.checked })} label={t('Card ke saath')} />
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (d.name || d.lines.length || editing)
          ? <p className="me-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="me-auto text-[0.8125rem] text-slate-500">{t('{{count}} khilone · {{price}}', { count: d.lines.length, price: formatPKR(price) })}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>{t('Rehne dein')}</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? t('Save karein') : t('Pack banayein')}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof Gift; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

/** Toys with variants name the exact colour or model, so the counter takes the right stock. */
function VariantSelect({ productId, value, onChange }: { productId: string; value: string; onChange: (id: string, stock?: number, price?: number) => void }) {
  const { data: variants = [] } = useQuery({ queryKey: ['toy-pack-variants', productId], queryFn: () => productVariantsApi.list(productId), staleTime: 60_000 });
  const active = variants.filter((v) => v.isActive !== false);
  return (
    <Select size="sm" aria-label={t('Rang / model')} value={value} error={!value ? t('Rang chunein') : undefined}
      onChange={(e) => { const v = active.find((x) => x.id === e.target.value); onChange(e.target.value, v ? Number(v.stock) : undefined, v?.price != null ? Number(v.price) : undefined); }}
      options={[{ value: '', label: t('Rang / model chunein') }, ...active.map((v) => ({ value: v.id, label: `${v.name} (${v.stock})` }))]} />
  );
}
