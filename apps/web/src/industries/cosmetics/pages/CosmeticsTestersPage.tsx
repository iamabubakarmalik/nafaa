/**
 * Testers: a shop opens one piece (a shade of lipstick, a perfume) for
 * customers to try. Opening it takes that piece out of sellable stock
 * through the shared damage record, so stock, cost and the loss report
 * stay right. Lists every tester opened, with its status and cost.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, GraduationCap, Plus, Search, TestTube2 } from 'lucide-react';
import {
  Button, EmptyState, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, THead, Td, Th, Tr,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { damageApi, type DamageStatus } from '@modules/inventory/damage/api/damage.api';
import { COSMETICS_KEYS, TESTER_REASON, apiError, dayOnly } from '../lib/meta';

const STATUS: Record<DamageStatus, { label: string; tone: string }> = {
  REPORTED: { label: 'Manzoori baqi', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { label: 'Stock se nikla', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  WRITTEN_OFF: { label: 'Stock se nikla', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REJECTED: { label: 'Rad', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export default function CosmeticsTestersPage() {
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const list = useQuery({ queryKey: [COSMETICS_KEYS.testers], queryFn: () => damageApi.list({ search: TESTER_REASON, reasonCode: 'OTHER', limit: 100 }) });
  const term = search.trim().toLowerCase();
  const rows = useMemo(() => (list.data?.items ?? []).filter((d) => d.reason.startsWith(TESTER_REASON) && (!term || [d.product.name, d.variant?.name].some((v) => v?.toLowerCase().includes(term)))), [list.data, term]);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonth = rows.filter((d) => new Date(d.createdAt) >= monthStart);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Tester — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: TestTube2, color: '#7c3aed', title: 'Tester kholein', text: 'Jo piece customers ke try karne ke liye khola, yahan likhein — shade bhi chunein.' },
            { icon: Clock, color: '#d97706', title: 'Manzoori', text: 'Malik ya manager Damage page se manzoor karta hai, tab stock se nikalta hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Hisaab', text: 'Tester ki cost nuksan (write-off) report me aati hai — profit sahi rehta hai.' },
          ]}
          shortcuts={[['/', 'search'], ['G', 'guide']]} />
      )}
      {adding && <OpenTesterModal onClose={() => setAdding(false)} />}
      <PageHero title="Testers" chip={<><TestTube2 />{rows.length}</>} loading={list.isLoading} meta="Try karne ke liye khole gaye piece"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />Tester kholein</button>
        </>}
        stats={[
          { label: 'Is mahine testers ki cost', value: money(thisMonth.reduce((a, d) => a + d.costImpact, 0)) },
          { label: 'Is mahine', value: thisMonth.length },
          { label: 'Manzoori baqi', value: rows.filter((d) => d.status === 'REPORTED').length },
        ]} />
      <KpiRow cols={3}>
        {list.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={TestTube2} color="#7c3aed" label="Kul testers" value={rows.length} />
            <KpiCard icon={Clock} color="#d97706" label="Manzoori baqi" value={rows.filter((d) => d.status === 'REPORTED').length} hint="Damage page se manzoor" />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Kul cost" value={money(rows.filter((d) => d.status !== 'REJECTED').reduce((a, d) => a + d.costImpact, 0))} />
          </>
        )}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Product ya shade…" />} />
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {list.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : list.isError ? <EmptyState title="List nahi khuli" action={<Button variant="secondary" onClick={() => void list.refetch()}>Dobara</Button>} />
          : !rows.length ? <EmptyState icon={<TestTube2 className="h-6 w-6" />} title="Abhi koi tester nahi" description="Tester khola ho to yahan likhein — stock aur nuksan sahi rehte hain." action={<Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Tester kholein</Button>} />
          : (
            <Table minWidth="40rem">
              <THead><Tr><Th>Date</Th><Th>Product</Th><Th align="right">Qty</Th><Th align="right">Cost</Th><Th>Halat</Th></Tr></THead>
              <TBody>
                {rows.map((d) => (
                  <Tr key={d.id}>
                    <Td className="whitespace-nowrap">{dayOnly(d.createdAt)}<p className="text-[0.75rem] text-slate-500">{d.damageNumber}</p></Td>
                    <Td><p className="font-medium text-slate-900">{d.product.name}</p>{d.variant && <p className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500">{d.variant.colorHex && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.variant.colorHex }} />}{d.variant.name}</p>}</Td>
                    <Td align="right">{d.quantity}</Td>
                    <Td align="right">{money(d.costImpact)}</Td>
                    <Td><span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1 ${STATUS[d.status].tone}`}>{STATUS[d.status].label}</span></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
      </section>
    </PageShell>
  );
}

function OpenTesterModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState('1');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const found = useQuery({ queryKey: ['cosmetics-tester-search', debounced], queryFn: () => productsApi.list({ search: debounced, limit: 8, isActive: true }), enabled: debounced.length >= 2 && !product });
  const options = useQuery({ queryKey: ['cosmetics-tester-options', product?.id], queryFn: () => damageApi.options(product!.id), enabled: !!product });
  const variants = options.data?.variants ?? [];
  const n = Number(qty) || 0;
  const needsVariant = variants.length > 0 && !variantId;
  const save = useMutation({
    mutationFn: () => damageApi.create({ productId: product!.id, variantId: variantId || undefined, quantity: n, reason: TESTER_REASON, reasonCode: 'OTHER', notes: 'Tester' }),
    onSuccess: (d) => { toast.success(`${d.damageNumber} — tester likh diya`); qc.invalidateQueries({ queryKey: [COSMETICS_KEYS.testers] }); qc.invalidateQueries({ queryKey: ['damage'] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Tester kholein" description="Ye piece bechne wale stock se nikal kar tester ban jayega"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!product || n <= 0 || needsVariant} loading={save.isPending} onClick={() => save.mutate()}>Tester likhein</Button></>}>
      <div className="space-y-3">
        {product ? (
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
            <span className="font-semibold text-slate-900">{product.name}</span>
            <Button size="sm" variant="secondary" onClick={() => { setProduct(null); setVariantId(''); }}>Badlein</Button>
          </div>
        ) : (
          <>
            <Input label="Product" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam, brand ya barcode" leftIcon={<Search className="h-4 w-4" />} />
            {(found.data?.items ?? []).length > 0 && (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
                {found.data!.items.map((p) => (
                  <li key={p.id}><button type="button" onClick={() => setProduct({ id: p.id, name: p.name })} className="flex w-full justify-between px-3 py-2 text-left hover:bg-slate-50"><span className="font-medium">{p.name}</span><span className="text-[0.8125rem] text-slate-500">stock {p.stock}</span></button></li>
                ))}
              </ul>
            )}
          </>
        )}
        {variants.length > 0 && <Select label="Shade" value={variantId} onChange={(e) => setVariantId(e.target.value)} options={[{ value: '', label: 'Shade chunein' }, ...variants.map((v) => ({ value: v.id, label: `${v.name} (stock ${v.branchStock ?? v.stock})` }))]} />}
        <Input label="Kitne piece" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 3))} hint="Aam taur par 1" />
      </div>
    </Modal>
  );
}
