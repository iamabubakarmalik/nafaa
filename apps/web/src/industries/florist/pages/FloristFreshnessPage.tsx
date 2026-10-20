/**
 * Freshness: flowers past or near their fresh-until day. At day end the
 * shop writes wilted stems off as wastage (the shared damage record, which
 * a manager approves and which then reaches stock and the loss report),
 * marks a new delivery of the same flower as arrived (fresh-until starts
 * again from today), or sells them cheaper from the product page.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Clock, Flower2, GraduationCap, Leaf, PackagePlus, RefreshCw, Tag, Trash2, TrendingDown } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Textarea, ViewTabs,
  heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { damageApi } from '@modules/inventory/damage/api/damage.api';
import { floristProductsApi, type FreshnessRow } from '../api/products.api';
import { ConfirmModal, Empty, ListCard, ListLoading, Pill, actionBtn } from '../components/ui';
import { usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { FLORIST_KEYS, categoryLabel, dayKey, daysFromToday, errorText, longDate, numIn, shortDate } from '../lib/meta';

type Tab = 'today' | 'soon' | 'later';
const TABS: Record<Tab, { label: string; hint: string; tone: string }> = {
  today: { label: 'Murjha gaye', hint: 'Fresh ki date guzar gayi', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  soon: { label: '1–2 din', hint: 'Jaldi bechein', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  later: { label: '3–5 din', hint: 'Nazar rakhein', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
};

export default function FloristFreshnessPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [waste, setWaste] = useState<FreshnessRow | null>(null);
  const [arrived, setArrived] = useState<FreshnessRow | null>(null);

  const q = useQuery({ queryKey: [FLORIST_KEYS.freshness], queryFn: () => floristProductsApi.freshnessAlerts(), refetchInterval: 5 * 60_000 });
  const lists: Record<Tab, FreshnessRow[]> = { today: q.data?.witheringToday ?? [], soon: q.data?.witheringSoon ?? [], later: q.data?.witheringLater ?? [] };
  const stockValue = (r: FreshnessRow) => Math.max(r.product?.stock ?? 0, 0) * (r.product?.costPrice ?? 0);
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    const all = lists[tab];
    return t ? all.filter((r) => [r.product?.name, r.flowerType, r.color, categoryLabel(r.categoryType)].filter(Boolean).join(' ').toLowerCase().includes(t)) : all;
  }, [lists, tab, search]);
  const wiltedValue = lists.today.reduce((t, r) => t + stockValue(r), 0);
  usePageKeys(searchRef, { r: () => q.refetch() });

  const refresh = () => [FLORIST_KEYS.freshness, FLORIST_KEYS.profiles, 'products', 'florist-dashboard-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const markArrived = useMutation({
    mutationFn: (r: FreshnessRow) => floristProductsApi.upsert({ productId: r.productId, arrivalDate: dayKey() }),
    onSuccess: () => { refresh(); setArrived(null); toast.success('Naya maal likh diya — fresh ki date aaj se'); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });

  const printList = (): PrintDoc => ({
    title: 'Freshness list', subtitle: longDate(dayKey()),
    meta: [['Murjhaye', String(lists.today.length)], ['Stock ki cost', money(wiltedValue)]],
    sections: (Object.keys(TABS) as Tab[]).filter((k) => lists[k].length).map((k) => ({
      kind: 'table' as const, title: TABS[k].label,
      columns: [{ label: 'Phool' }, { label: 'Stock', align: 'right' as const }, { label: 'Fresh tak' }],
      rows: lists[k].map((r) => [r.product?.name ?? r.flowerType ?? '—', `${r.product?.stock ?? 0} ${r.product?.unit ?? ''}`, shortDate(r.freshUntil)]),
    })),
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Phoolon ki taazgi" onClose={guide.close}
          steps={[
            { icon: Leaf, color: '#16a34a', title: 'Kitne din', text: 'Har phool par "kitne din fresh" likhein. Maal aane ki date se fresh ki aakhri date khud banti hai.' },
            { icon: PackagePlus, color: '#0284c7', title: 'Naya maal', text: 'Mandi se naya maal aaye to "Naya maal aaya" dabayein — date aaj se dobara ginti hai.' },
            { icon: Trash2, color: '#e11d48', title: 'Wastage', text: 'Din ke aakhir me murjhaye phool "Wastage" se likhein. Manager Damage page par manzoor kare to stock kam hota hai aur loss report me aata hai.' },
            { icon: Tag, color: '#d97706', title: 'Sasta', text: '1–2 din wale phool bouquet me lagayein ya rate kam kar ke bechein.' },
          ]}
          shortcuts={[['/', 'search'], ['R', 'refresh'], ['G', 'guide']]} />
      )}

      <PageHero title="Freshness" busy={q.isFetching && !q.isLoading} loading={q.isLoading} meta="Murjhane wale phool — bechein, wastage likhein ya naya maal"
        actions={<>
          <button type="button" onClick={() => q.refetch()} className={heroButton}><RefreshCw className="h-4 w-4" />Refresh</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Murjha gaye', value: String(lists.today.length) },
          { label: '1–2 din', value: String(lists.soon.length) },
          { label: 'Murjhaye stock ki cost', value: money(wiltedValue) },
        ]} />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={AlertTriangle} color="#e11d48" label="Murjha gaye" value={lists.today.length} hint="Wastage likhein" active={tab === 'today'} onClick={() => setTab('today')} />
          <KpiCard icon={Clock} color="#d97706" label="1–2 din" value={lists.soon.length} hint="Pehle bechein" active={tab === 'soon'} onClick={() => setTab('soon')} />
          <KpiCard icon={TrendingDown} color="#0284c7" label="3–5 din" value={lists.later.length} active={tab === 'later'} onClick={() => setTab('later')} />
          <KpiCard icon={Trash2} color="#64748b" label="Murjhaye stock ki cost" value={money(wiltedValue)} hint="Agar sab wastage ho" />
        </>)}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Phool, rang ya naam…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} hint={TABS[tab].hint}
        tabs={(Object.keys(TABS) as Tab[]).map((k) => ({ id: k, label: TABS[k].label, icon: k === 'today' ? AlertTriangle : k === 'soon' ? Clock : TrendingDown, count: lists[k].length }))} />

      <ListCard>
        {q.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={Flower2} title={tab === 'today' ? 'Koi murjhaya phool nahi' : 'Is list me kuch nahi'} text="Phool ki taazgi uske product me likhi hoti hai — maal aane ki date aur kitne din fresh rehta hai." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const left = daysFromToday(r.freshUntil);
              const stock = r.product?.stock ?? 0;
              return (
                <li key={r.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_8rem_9rem_auto] lg:items-center">
                  <div className="min-w-0">
                    <Link to={`/florist-products/${r.productId}`} className="truncate font-semibold text-slate-900 hover:underline">{r.product?.name ?? r.flowerType ?? 'Phool'}</Link>
                    <p className="truncate text-[0.75rem] text-slate-500">{[categoryLabel(r.categoryType), r.flowerType, r.color, r.daysToWither ? `${r.daysToWither} din fresh` : null].filter(Boolean).join(' · ')}</p>
                  </div>
                  <p className="text-[0.8125rem] text-slate-700">{shortDate(r.freshUntil)}
                    <span className="block text-[0.75rem] text-slate-500">{left === null ? '' : left < 0 ? `${-left} din pehle` : left === 0 ? 'Aaj tak' : `${left} din`}</span></p>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{stock} {r.product?.unit ?? ''}<span className="block text-[0.75rem] font-normal text-slate-500">{money(stockValue(r))} cost</span></p>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Pill tone={TABS[tab].tone}>{TABS[tab].label}</Pill>
                    {canEdit && <button type="button" onClick={() => setArrived(r)} className={actionBtn}><PackagePlus className="h-4 w-4" />Naya maal aaya</button>}
                    {stock > 0 && <button type="button" onClick={() => setWaste(r)} className={actionBtn}><Trash2 className="h-4 w-4" />Wastage</button>}
                    {canEdit && <Link to={`/florist-products/${r.productId}/edit`} className={actionBtn}><Tag className="h-4 w-4" />Rate</Link>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ListCard>

      {arrived && <ConfirmModal title="Naya maal aaya?" cta="Haan, aaj aaya" busy={markArrived.isPending} onConfirm={() => markArrived.mutate(arrived)} onClose={() => setArrived(null)}
        text={<>{arrived.product?.name ?? 'Is phool'} ki fresh ki date aaj se {arrived.daysToWither ? `${arrived.daysToWither} din` : ''} ginti hogi. Maal ki quantity Purchase se stock me dalein.</>} />}
      {waste && <WastageModal row={waste} money={money} onClose={() => setWaste(null)} onDone={() => { refresh(); setWaste(null); }} />}
    </PageShell>
  );
}

function WastageModal({ row, money, onClose, onDone }: { row: FreshnessRow; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const stock = Math.max(row.product?.stock ?? 0, 0);
  const [qty, setQty] = useState(String(stock));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const n = numIn(qty) ?? 0;
  const save = useMutation({
    mutationFn: () => damageApi.create({ productId: row.productId, quantity: n, reasonCode: 'SPOILAGE', reason: 'Phool murjha gaye', notes: note.trim() || undefined }),
    onSuccess: (d) => { toast.success(`Wastage ${d.damageNumber} likh di — manager ki manzoori ke baad stock kam hoga`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Wastage save nahi hui')),
  });
  const submit = () => {
    if (!(n > 0)) { setError('Kitne phool — likhein'); return; }
    if (n > stock) { setError(`Stock sirf ${stock} hai`); return; }
    setError('');
    if (!save.isPending) save.mutate();
  };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="sm" title="Wastage likhein" description={row.product?.name ?? undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button variant="danger" loading={save.isPending} onClick={submit}>Wastage likhein</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label={`Kitne (${row.product?.unit ?? 'pcs'})`} inputMode="decimal" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} error={error}
          hint={`Stock ${stock} · loss ${money(n * (row.product?.costPrice ?? 0))} (cost par)`} />
        <Textarea label="Note (marzi)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Garmi se murjha gaye…" />
        <p className="text-[0.75rem] text-slate-500">Damage page par manager manzoor kare to stock kam hota hai aur loss report me aata hai.</p>
      </form>
    </Modal>
  );
}
