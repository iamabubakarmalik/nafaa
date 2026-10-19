/**
 * Reorder list: items at or below their reorder point (out of stock first),
 * how much to order and from whom, printed as a buying list per supplier.
 * Points are set here or in the item editor's stock step.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, Edit3, GraduationCap, ListChecks, PackageX, Plus, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import type { PosItem } from '@modules/pos/engine';
import { reorderRulesApi, type ReorderRule } from '../api/reorder-rules.api';
import { ItemPick } from '../components/ItemPick';
import { usePageKeys } from '../hooks/usePageKeys';
import { errorText, qty } from '../lib/meta';

type Tab = 'need' | 'out' | 'ok' | 'all';
const SEVERITY: Record<string, { label: string; tone: string }> = {
  OUT_OF_STOCK: { label: 'Khatam', tone: 'bg-rose-600 text-white ring-rose-600' },
  CRITICAL: { label: 'Bohat kam', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  LOW: { label: 'Mangwana hai', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  OK: { label: 'Theek', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};
const ORDER = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2, OK: 3 } as Record<string, number>;

export default function ReorderRulesPage() {
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('need');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ rule?: ReorderRule } | null>(null);
  const [removing, setRemoving] = useState<ReorderRule | null>(null);

  const { data = [], isLoading, isFetching } = useQuery({ queryKey: ['hardware-reorder'], queryFn: () => reorderRulesApi.list({ active: true }) });
  usePageKeys(searchRef, { n: () => setForm({}) });

  const all = useMemo(() => [...data].sort((a, b) => (ORDER[a.severity ?? 'OK'] - ORDER[b.severity ?? 'OK']) || (a.product?.name ?? '').localeCompare(b.product?.name ?? '')), [data]);
  const term = search.trim().toLowerCase();
  const matchTab = (r: ReorderRule) => (tab === 'need' ? r.needsReorder : tab === 'out' ? r.severity === 'OUT_OF_STOCK' : tab === 'ok' ? !r.needsReorder : true);
  const rows = all.filter((r) => matchTab(r) && (!term || [r.product?.name, r.preferredSupplier].some((v) => (v ?? '').toLowerCase().includes(term))));
  const need = all.filter((r) => r.needsReorder);
  const counts = { need: need.length, out: all.filter((r) => r.severity === 'OUT_OF_STOCK').length, ok: all.length - need.length, all: all.length };

  const buyingList = (): PrintDoc => {
    const bySupplier = new Map<string, ReorderRule[]>();
    for (const r of need) bySupplier.set(r.preferredSupplier || 'Supplier tay nahi', [...(bySupplier.get(r.preferredSupplier || 'Supplier tay nahi') ?? []), r]);
    return {
      title: 'Mangwane ki list', subtitle: new Date().toLocaleDateString('en-PK'),
      meta: [['Items', String(need.length)], ['Khatam', String(counts.out)]],
      sections: [...bySupplier.entries()].map(([supplier, list]) => ({
        kind: 'table' as const, title: supplier,
        columns: [{ label: 'Item' }, { label: 'Stock', align: 'right' as const }, { label: 'Mangwayein', align: 'right' as const }],
        rows: list.map((r) => [r.product?.name ?? '—', `${qty(r.currentStock ?? 0)} ${r.product?.unit ?? ''}`, qty(r.reorderQty)]),
      })),
    };
  };
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is list me kuch nahi'); return; }
    downloadCsv('reorder.csv', [['Item', 'Unit', 'Stock', 'Reorder point', 'Kam se kam', 'Mangwana', 'Supplier', 'Haal'],
      ...rows.map((r) => [r.product?.name, r.product?.unit, r.currentStock, r.reorderPoint, r.minStock, r.reorderQty, r.preferredSupplier, SEVERITY[r.severity ?? 'OK'].label])]);
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Reorder — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: RefreshCw, color: '#2563eb', title: 'Point lagayein', text: 'Har zaroori item par likhein kitna reh jaye to mangwana hai aur kitna mangwana hai.' },
            { icon: AlertTriangle, color: '#d97706', title: 'Mangwana hai', text: 'Stock point tak aaye to item yahan aur dashboard par aata hai — khatam wale sab se upar.' },
            { icon: ShoppingCart, color: '#16a34a', title: 'Purchase', text: '"Mangwane ki list" print kar ke supplier ko dein, maal aaye to Purchase banayein — bilty/kiraya bhi us me likhein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya point'], ['G', 'guide']]} />
      )}

      <PageHero title="Reorder" chip={`${counts.need} mangwana hai`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Cement, sarya, pipe — khatam hone se pehle mangwayein"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={buyingList} label="Mangwane ki list" disabled={!need.length} /></span>
          <Link to="/purchases/new" className={heroButton}><ShoppingCart className="h-4 w-4" />Purchase</Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setForm({})} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya point</button>
        </>}
        stats={[{ label: 'Mangwana hai', value: String(counts.need) }, { label: 'Khatam', value: String(counts.out) }, { label: 'Point wale items', value: String(counts.all) }]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={PackageX} color="#e11d48" label="Khatam" value={counts.out} onClick={() => setTab('out')} active={tab === 'out'} />
            <KpiCard icon={AlertTriangle} color="#d97706" label="Mangwana hai" value={counts.need} onClick={() => setTab('need')} active={tab === 'need'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Theek" value={counts.ok} onClick={() => setTab('ok')} active={tab === 'ok'} />
            <KpiCard icon={ListChecks} color="#475569" label="Sab" value={counts.all} onClick={() => setTab('all')} active={tab === 'all'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Item ya supplier…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} tabs={[
        { id: 'need', label: 'Mangwana hai', icon: AlertTriangle, count: counts.need },
        { id: 'out', label: 'Khatam', icon: PackageX, count: counts.out },
        { id: 'ok', label: 'Theek', icon: CheckCircle2, count: counts.ok },
        { id: 'all', label: 'Sab', icon: ListChecks, count: counts.all },
      ]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{tab === 'need' ? 'Abhi kuch mangwana nahi' : 'Is list me kuch nahi'}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">Zaroori items par reorder point lagayein taake waqt par pata chale.</p>
              <button type="button" onClick={() => setForm({})} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya point</button>
            </div>
          ) : (
            <Table minWidth="48rem">
              <THead><Tr><Th>Item</Th><Th align="right">Stock</Th><Th align="right">Point</Th><Th align="right">Mangwana</Th><Th>Supplier</Th><Th>Haal</Th><Th align="right"> </Th></Tr></THead>
              <TBody>
                {rows.map((r) => {
                  const sv = SEVERITY[r.severity ?? 'OK'];
                  return (
                    <Tr key={r.id}>
                      <Td><Link to={`/hardware-products/${r.productId}`} className="font-medium text-slate-900 hover:text-brand-700">{r.product?.name ?? '—'}</Link></Td>
                      <Td align="right" className={cn('font-semibold tabular-nums', r.needsReorder ? 'text-rose-600' : 'text-slate-900')}>{qty(r.currentStock ?? 0)} <span className="font-normal text-slate-500">{r.product?.unit}</span></Td>
                      <Td align="right" className="tabular-nums">{qty(r.reorderPoint)}</Td>
                      <Td align="right" className="tabular-nums">{qty(r.reorderQty)}</Td>
                      <Td className="text-[0.8125rem] text-slate-600">{r.preferredSupplier || '—'}</Td>
                      <Td><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', sv.tone)}>{sv.label}</span></Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <button type="button" title="Badlein" onClick={() => setForm({ rule: r })} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Edit3 className="h-4 w-4" /></button>
                          <button type="button" title="Point hatayein" onClick={() => setRemoving(r)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
      </section>

      {form && <RuleModal rule={form.rule} onClose={() => setForm(null)} />}
      {removing && <RemoveModal rule={removing} onClose={() => setRemoving(null)} />}
    </PageShell>
  );
}

function RuleModal({ rule, onClose }: { rule?: ReorderRule; onClose: () => void }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<{ id: string; name: string; unit: string } | null>(rule ? { id: rule.productId, name: rule.product?.name ?? '', unit: rule.product?.unit ?? '' } : null);
  const [f, setF] = useState({ reorderPoint: rule?.reorderPoint ?? 0, minStock: rule?.minStock ?? 0, reorderQty: rule?.reorderQty ?? 0, preferredSupplier: rule?.preferredSupplier ?? '' });
  const [error, setError] = useState('');
  const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;
  const save = useMutation({
    mutationFn: () => reorderRulesApi.upsert({ productId: item!.id, ...f, preferredSupplier: f.preferredSupplier.trim() || undefined, isActive: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hardware-reorder'] }); qc.invalidateQueries({ queryKey: ['hardware-dashboard'] }); toast.success('Reorder point save'); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (!item) return setError('Item chunein');
    if (!(f.reorderPoint > 0)) return setError('Reorder point 0 se zyada likhein');
    if (f.minStock > f.reorderPoint) return setError('Kam se kam wali had reorder point se bari nahi');
    if (!(f.reorderQty > 0)) return setError('Kitna mangwana hai likhein');
    setError('');
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="md" title={rule ? 'Reorder point badlein' : 'Naya reorder point'}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-3">
        {item ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <span className="font-medium">{item.name}</span>
            {!rule && <button type="button" onClick={() => setItem(null)} className="text-[0.8125rem] font-semibold text-brand-700">Badlein</button>}
          </div>
        ) : <ItemPick onPick={(i: PosItem) => setItem({ id: i.id, name: i.name, unit: i.unit })} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Reorder point" inputMode="decimal" value={f.reorderPoint || ''} onChange={(e) => setF({ ...f, reorderPoint: num(e.target.value) })} hint={item ? `Itna ${item.unit} reh jaye` : undefined} />
          <Input label="Kam se kam" inputMode="decimal" value={f.minStock || ''} onChange={(e) => setF({ ...f, minStock: num(e.target.value) })} hint="Is se neeche laal" />
          <Input label="Kitna mangwana" inputMode="decimal" value={f.reorderQty || ''} onChange={(e) => setF({ ...f, reorderQty: num(e.target.value) })} />
        </div>
        <Input label="Supplier" value={f.preferredSupplier} onChange={(e) => setF({ ...f, preferredSupplier: e.target.value })} placeholder="Naam / phone" />
        {error && <p className="text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

function RemoveModal({ rule, onClose }: { rule: ReorderRule; onClose: () => void }) {
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: () => reorderRulesApi.remove(rule.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hardware-reorder'] }); toast.success('Point hata diya'); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Nahi hata')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Reorder point hatayein?" description={`${rule.product?.name ?? 'Item'} ab reorder list me nahi aayega. Stock par koi asar nahi.`}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button variant="danger" loading={run.isPending} onClick={() => run.mutate()}>Hatayein</Button></>}>
      <p className="text-[0.875rem] text-slate-600">Dobara chahiye ho to naya point laga dein.</p>
    </Modal>
  );
}
