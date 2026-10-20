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
import { AlertTriangle, ArrowLeft, CalendarClock, Gift, Package, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { toyGiftPacksApi, type GiftPackBody } from '../api/gift-packs.api';
import { AGE_GROUPS, GENDERS, KEYS, OCCASIONS, apiError } from '../lib/meta';
import { useDebounced, useSaveKey } from '../components/ui';

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
    if (!d.name.trim()) out.push('Pack ka naam likhein');
    if (d.lines.length < 2) out.push('Kam se kam 2 khilone chunein');
    if (d.lines.some((l) => !(l.quantity >= 1) || !Number.isInteger(l.quantity))) out.push('Har khilone ki quantity poori ginti me, kam se kam 1');
    if (d.lines.some((l) => l.hasVariants && !l.variantId)) out.push('Rang / model wale khilone ka rang chunein');
    if (!(price > 0)) out.push('Pack ki qeemat likhein');
    if (d.validFrom && d.validUntil && d.validUntil < d.validFrom) out.push('Khatam ki tareekh shuru se pehle hai');
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
      toast.success(editing ? 'Pack save ho gaya' : 'Pack ban gaya — counter ke Combos tab me hai');
      navigate('/toystore/gift-packs');
    },
    onError: (e) => toast.error(apiError(e, (e as Error).message || 'Save nahi hua')),
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
  if (editing && !packQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye pack nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/toystore/gift-packs')}>Gift packs par wapas</Button></div></PageShell>;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${packQ.data?.name} — badlein` : 'Naya gift pack'}</h1>
          <p className="text-[0.8125rem] text-white/75">Khilone chunein, pack ki qeemat rakhein — counter par ek tap me bikta hai</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Gift}>Pack</T>}>
            <div className="space-y-3">
              <Input label="Naam" required value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Eid box larkon ke liye" maxLength={100} hint="Counter aur receipt par yahi naam aata hai" />
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Mauqa</span>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASIONS.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set({ occasion: d.occasion === v ? '' : v })}
                      className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', d.occasion === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Umar" value={d.targetAgeGroup} onChange={(e) => set({ targetAgeGroup: e.target.value })} options={[{ value: '', label: 'Har umar' }, ...AGE_GROUPS.map(([v, l]) => ({ value: v, label: l }))]} hint="Gift finder isi se pack dikhata hai" />
                <Select label="Kis ke liye" value={d.targetGender} onChange={(e) => set({ targetGender: e.target.value })} options={[{ value: '', label: 'Sab' }, ...GENDERS.map(([v, l]) => ({ value: v, label: l }))]} />
              </div>
              <Textarea label="Tafseel" value={d.description} onChange={(e) => set({ description: e.target.value })} rows={2} maxLength={500} placeholder="Car, ball aur chocolate — wrap ke saath" hint="Marzi hai" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Package}>Khilone</T>} description="Har khilona pack bikne par stock se nikalta hai">
            <div className="relative">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Khilone ka naam ya barcode likhein" leftIcon={<Search className="h-4 w-4" />} aria-label="Khilona dhoondein" />
              {term.length >= 2 && (
                <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                  {(found.data?.items ?? []).length === 0
                    ? <li className="px-3 py-2.5 text-[0.8125rem] text-slate-500">{found.isFetching ? 'Dhoond rahe hain…' : 'Kuch nahi mila'}</li>
                    : (found.data?.items ?? []).map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => add(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                          <Plus className="h-4 w-4 text-brand-600" />
                          <span className="min-w-0 flex-1 truncate text-[0.875rem]">{p.name}{p.hasVariants ? ' (rang / model)' : ''}</span>
                          <span className="text-[0.75rem] tabular-nums text-slate-500">Stock {p.stock}</span>
                          <span className="text-[0.8125rem] font-semibold tabular-nums">{formatPKR(p.price)}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {d.lines.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500">Upar se kam se kam 2 khilone chunein.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {d.lines.map((l) => (
                  <li key={l.key} className="grid grid-cols-[1fr_auto] gap-2 p-3 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-end">
                    <div className="min-w-0">
                      <p className="truncate text-[0.875rem] font-medium text-slate-900">{l.name}</p>
                      <p className={cn('text-[0.75rem]', l.stock < l.quantity ? 'text-rose-600' : 'text-slate-500')}>Stock {l.stock}</p>
                      {l.hasVariants && <VariantSelect productId={l.productId} value={l.variantId} onChange={(variantId, stock, rate) => setLine(l.key, { variantId, stock: stock ?? l.stock, unitPrice: rate ?? l.unitPrice })} />}
                    </div>
                    <Input label="Qty" inputMode="numeric" value={String(l.quantity)} onChange={(e) => setLine(l.key, { quantity: Number(e.target.value.replace(/\D/g, '')) || 0 })} className="text-right tabular-nums" />
                    <Input label="Rate (Rs)" inputMode="decimal" value={String(l.unitPrice)} onChange={(e) => setLine(l.key, { unitPrice: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className="text-right tabular-nums" hint="Asal rate" />
                    <button type="button" onClick={() => set({ lines: d.lines.filter((x) => x.key !== l.key) })} aria-label="Hatayein" className="flex h-10 w-10 items-center justify-center self-end rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title="Qeemat">
            <Input label="Pack ki qeemat (Rs)" required inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, '') })}
              placeholder={original ? String(Math.round(original * 0.9)) : '0'} className="text-right text-lg font-semibold tabular-nums"
              hint={original ? `Alag alag ${formatPKR(original)} — 10% kam: ${formatPKR(Math.round(original * 0.9))}` : 'Khilone chunne ke baad'} />
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[0.8125rem]">
              <div><dt className="text-slate-500">Alag alag</dt><dd className="font-semibold tabular-nums">{formatPKR(original)}</dd></div>
              <div><dt className="text-slate-500">Bachat</dt><dd className="font-semibold tabular-nums text-emerald-700">{formatPKR(savings)}</dd></div>
              <div><dt className="text-slate-500">Stock se</dt><dd className={cn('font-semibold tabular-nums', packs === 0 && d.lines.length ? 'text-rose-600' : '')}>{packs} pack</dd></div>
            </dl>
            {price > original && original > 0 && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">Pack alag alag se mehnga hai — customer alag le lega.</p>}
          </Card>

          <Card className="rounded-2xl" title={<T icon={CalendarClock}>Kab tak</T>} description="Khali chhorein to hamesha counter par">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Shuru" type="date" value={d.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
              <Input label="Khatam" type="date" value={d.validUntil} min={d.validFrom || undefined} onChange={(e) => set({ validUntil: e.target.value })} hint="Is din ke baad counter se hat jata hai" />
            </div>
            <div className="mt-3 space-y-3">
              <Switch checked={d.isSeasonal} onChange={(e) => set({ isSeasonal: e.target.checked })} label="Season ka pack" description="Eid, saalgirah ka season — packs page par alag tab" />
              {d.isSeasonal && <Input label="Season" value={d.seasonName} onChange={(e) => set({ seasonName: e.target.value })} placeholder="Eid ul Fitr 2027" />}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Settings2}>Aur</T>}>
            <div className="space-y-3">
              <Switch checked={d.isActive} onChange={(e) => set({ isActive: e.target.checked })} label="Counter par chalu" />
              <Switch checked={d.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} label="Upar dikhayein" description="Combos tab me sab se pehle" />
              <Switch checked={d.isGiftWrapped} onChange={(e) => set({ isGiftWrapped: e.target.checked })} label="Wrap ke saath" description="Pack ki qeemat me wrap shamil hai" />
              <Switch checked={d.includesCard} onChange={(e) => set({ includesCard: e.target.checked })} label="Card ke saath" />
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (d.name || d.lines.length || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{d.lines.length} khilone · {formatPKR(price)}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Pack banayein'}</Button>
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
    <Select size="sm" aria-label="Rang / model" value={value} error={!value ? 'Rang chunein' : undefined}
      onChange={(e) => { const v = active.find((x) => x.id === e.target.value); onChange(e.target.value, v ? Number(v.stock) : undefined, v?.price != null ? Number(v.price) : undefined); }}
      options={[{ value: '', label: 'Rang / model chunein' }, ...active.map((v) => ({ value: v.id, label: `${v.name} (${v.stock})` }))]} />
  );
}
