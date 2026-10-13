/**
 * Freshness batch dialogs: record pieces sold, sold cheap or thrown away
 * (optionally also reported as damage so the stock comes down after
 * approval), and add a batch by hand.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { damageApi } from '@modules/inventory/damage/api/damage.api';
import { freshnessApi, type FreshnessLog } from '../../api/freshness.api';
import { FRESH_KEY, apiError, fmtQty } from '../meta';

export type BatchAction = 'sale' | 'discount' | 'discard';

const REASONS = ['Waqt guzar gaya', 'Bika nahi', 'Jal gaya', 'Toot gaya', 'Fungus / kharab'];
const DAMAGE_PREF = 'nafaa.bakery.discard-damage';

export function BatchActionModal({ log, mode, onClose }: { log: FreshnessLog; mode: BatchAction; onClose: () => void }) {
  const qc = useQueryClient();
  const max = Number(log.currentQty) || 0;
  const [qty, setQty] = useState(String(max));
  const [reason, setReason] = useState('');
  // On by default: without a damage report the thrown pieces stay in stock and the loss never reaches profit.
  const [damage, setDamage] = useState(() => { try { return localStorage.getItem(DAMAGE_PREF) !== '0'; } catch { return true; } });
  const n = Math.round(Number(qty) || 0);
  const meta = {
    sale: { title: 'Kitne bik gaye?', btn: 'Bikri likhein', icon: CheckCircle2, variant: 'success' as const },
    discount: { title: 'Kitne sasta becha?', btn: 'Likhein', icon: Tag, variant: 'primary' as const },
    discard: { title: 'Kitne phenke?', btn: 'Zaya likhein', icon: Trash2, variant: 'danger' as const },
  }[mode];

  const save = useMutation({
    mutationFn: async () => {
      if (mode === 'sale') return { log: await freshnessApi.sale(log.id, n) };
      if (mode === 'discount') return { log: await freshnessApi.discount(log.id, n) };
      const why = reason.trim() || 'Waqt guzar gaya';
      const updated = await freshnessApi.discard(log.id, n, why);
      let damaged = false;
      if (damage) {
        try {
          await damageApi.create({ productId: log.productId, quantity: n, reason: why, reasonCode: /guzar|expire/i.test(why) ? 'EXPIRY' : 'SPOILAGE', notes: `Bakery batch ${log.batchNumber ?? log.id}` });
          damaged = true;
        } catch (e) {
          toast.warning(`Zaya likh diya, magar damage report nahi bani: ${apiError(e, 'masla')}`);
        }
      }
      return { log: updated, damaged };
    },
    onSuccess: (r) => {
      toast.success(mode === 'discard' ? `${n} zaya likh diye${'damaged' in r && r.damaged ? ' — damage report manzoori ke liye gayi' : ''}` : 'Darj ho gaya');
      qc.invalidateQueries({ queryKey: [FRESH_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Nahi ho saka')),
  });
  const bad = n <= 0 || n > max;

  return (
    <Modal open onClose={onClose} size="sm" title={meta.title} description={`${log.productName}${log.batchNumber ? ` · ${log.batchNumber}` : ''} · ${fmtQty(max)} para hai`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant={meta.variant} disabled={bad} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<meta.icon className="h-4 w-4" />}>{meta.btn}</Button></>}>
      <div className="space-y-3">
        <Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} size="lg" className="text-center text-2xl font-bold tabular-nums" data-autofocus error={n > max ? `Sirf ${fmtQty(max)} para hai` : undefined} />
        <div className="flex flex-wrap gap-1.5">{[max, Math.floor(max / 2), 1].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v, i) => <Button key={v} size="sm" variant="secondary" onClick={() => setQty(String(v))}>{i === 0 ? 'Sab' : fmtQty(v)}</Button>)}</div>
        {mode === 'discard' && (
          <>
            <Input label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Waqt guzar gaya, jal gaya…" hint="Zaya ke record me isi se pata chalta hai kyun phenkna para" />
            <div className="flex flex-wrap gap-1.5">{REASONS.map((r) => <Button key={r} size="xs" variant={reason === r ? 'primary' : 'secondary'} onClick={() => setReason(r)}>{r}</Button>)}</div>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <Switch checked={damage} onChange={(e) => { setDamage(e.target.checked); try { localStorage.setItem(DAMAGE_PREF, e.target.checked ? '1' : '0'); } catch { /* storage blocked */ } }}
                label="Stock se bhi ghatayein" description="Damage report banegi; manager manzoor kare to stock kam hoga aur munafa me nuqsaan ginega" />
            </div>
          </>
        )}
        {mode === 'discount' && <p className="text-[0.75rem] text-slate-500">Sirf ginti hai — rate POS par khud kam karein. Sasta becha maal phenka nahi gaya, is liye yeh bacha hua paisa hai.</p>}
        {mode === 'sale' && <p className="text-[0.75rem] text-slate-500">POS ki bikri batch se khud nahi ghatti — din ke aakhir me yahan ginti theek karein.</p>}
      </div>
    </Modal>
  );
}

interface ProductLite { id: string; name: string; isActive?: boolean }

export function NewBatchModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [product, setProduct] = useState<ProductLite | null>(null);
  const [term, setTerm] = useState('');
  const [qty, setQty] = useState('');
  const [hours, setHours] = useState(24);
  const [batch, setBatch] = useState('');
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 60_000 });
  const t = term.trim().toLowerCase();
  const options = useMemo(() => ((productsQ.data?.items ?? []) as ProductLite[]).filter((p) => p.isActive !== false && (!t || p.name.toLowerCase().includes(t))).slice(0, 12), [productsQ.data, t]);
  const save = useMutation({
    mutationFn: () => {
      const now = new Date();
      const best = new Date(now.getTime() + hours * 3_600_000);
      return freshnessApi.create({ productId: product!.id, productName: product!.name, batchNumber: batch.trim() || undefined, productionDate: now.toISOString(), bestBefore: best.toISOString(), expiryDate: best.toISOString(), initialQty: Number(qty), currentQty: Number(qty) });
    },
    onSuccess: () => { toast.success('Batch jur gaya'); qc.invalidateQueries({ queryKey: [FRESH_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi ho saka')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Naya batch" description="Jo maal bana aur shelf par rakha — kab tak theek rahega"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!product || !(Number(qty) > 0)} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Plus className="h-4 w-4" />}>Batch jorein</Button></>}>
      <div className="space-y-3">
        {product ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-100">
            <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-slate-900">{product.name}</span>
            <button type="button" onClick={() => setProduct(null)} aria-label="Badlein" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div>
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Kaunsi cheez…" leftIcon={<Search className="h-4 w-4" />} data-autofocus />
            <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {options.map((p) => <button key={p.id} type="button" onClick={() => setProduct(p)} className="inline-flex h-8 items-center rounded-lg bg-white px-2.5 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400">{p.name}</button>)}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Kitne banaye" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
          <Input label="Batch / naam" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Subah wala" hint="Marzi hai" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kab tak theek</span>
          <div className="flex flex-wrap gap-1.5">{[6, 12, 24, 48, 72, 168].map((h) => <Button key={h} size="sm" variant={hours === h ? 'primary' : 'secondary'} onClick={() => setHours(h)}>{h < 24 ? `${h} ghante` : `${h / 24} din`}</Button>)}</div>
        </div>
      </div>
    </Modal>
  );
}
