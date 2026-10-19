/**
 * Today's rates and the day close of a meat shop. Rates: every meat item's
 * counter rate and restaurant rate in one list, changed together each
 * morning (chicken changes daily). Day close: per item what was there in the
 * morning, what came in (mandi, slaughter, cutting), what was sold, cut,
 * wasted, and what is left with its cost value.
 *
 * Keys: 1 rates · 2 day close · / search · Ctrl+S save rates · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarDays, ClipboardList, FileSpreadsheet, Gauge, GraduationCap, Landmark, Save, Scale, Scissors, Trash2, Undo2,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { meatProductsApi, type DaySheetRow } from '../api/products.api';
import { KEYS, MONEY_KEYS, animalOf, apiError, cutLabel, decimal, kg, todayKey } from '../lib/meta';
import { usePageKeys, useSaveKey } from '../components/ui';

type Tab = 'rates' | 'close';
interface Draft { price: string; wholesale: string }

export default function MeatRatesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const { cost } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('rates');
  const [date, setDate] = useState(todayKey());
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const sheet = useQuery({ queryKey: [KEYS.daySheet, date], queryFn: () => meatProductsApi.daySheet(date), placeholderData: (p) => p, refetchInterval: 120_000 });
  const today = useQuery({ queryKey: [KEYS.daySheet, todayKey()], queryFn: () => meatProductsApi.daySheet(todayKey()), enabled: tab === 'rates' && date !== todayKey() });
  const rateRows = (date === todayKey() ? sheet.data : today.data)?.rows ?? [];
  const term = search.trim().toLowerCase();
  const match = (r: DaySheetRow) => !term || [r.name, animalOf(r.animalType).label, cutLabel(r.cutCategory)].join(' ').toLowerCase().includes(term);
  const rows = useMemo(() => (tab === 'rates' ? rateRows : sheet.data?.rows ?? []).filter(match), [tab, rateRows, sheet.data, term]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = Object.entries(drafts).filter(([id, d]) => {
    const r = rateRows.find((x) => x.productId === id);
    return r && (Number(d.price) !== r.price || (Number(d.wholesale) || 0) !== (r.wholesalePrice ?? 0));
  });
  const bad = changed.some(([, d]) => !(Number(d.price) > 0) || (d.wholesale !== '' && !(Number(d.wholesale) > 0)));

  const save = useMutation({
    mutationFn: async () => {
      let done = 0;
      for (const [id, d] of changed) {
        await productsApi.update(id, { price: Number(d.price), wholesalePrice: d.wholesale === '' ? null : Number(d.wholesale) } as Parameters<typeof productsApi.update>[1]);
        done += 1;
      }
      return done;
    },
    onSuccess: (n) => {
      toast.success(`${n} item ka rate badal gaya — POS par abhi se naya rate`);
      setDrafts({});
      [...MONEY_KEYS, 'pos-products'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => { toast.error(apiError(e, 'Rate save nahi hua')); qc.invalidateQueries({ queryKey: [KEYS.daySheet] }); },
  });
  const trySave = () => { if (tab === 'rates' && canEdit && changed.length && !bad && !save.isPending) save.mutate(); };
  useSaveKey(trySave);
  usePageKeys({ '1': () => setTab('rates'), '2': () => setTab('close'), g: guide.open }, searchRef);

  // Leaving with unsaved rates asks first.
  useEffect(() => {
    if (!changed.length) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const t = sheet.data?.totals;
  const setDraft = (r: DaySheetRow, patch: Partial<Draft>) => setDrafts((all) => ({
    ...all, [r.productId]: { price: all[r.productId]?.price ?? String(r.price), wholesale: all[r.productId]?.wholesale ?? (r.wholesalePrice ? String(r.wholesalePrice) : ''), ...patch },
  }));
  const bump = (pctUp: number) => {
    const next: Record<string, Draft> = { ...drafts };
    for (const r of rows) {
      const d = next[r.productId] ?? { price: String(r.price), wholesale: r.wholesalePrice ? String(r.wholesalePrice) : '' };
      next[r.productId] = { price: String(Math.round((Number(d.price) || r.price) * (1 + pctUp / 100))), wholesale: d.wholesale ? String(Math.round(Number(d.wholesale) * (1 + pctUp / 100))) : '' };
    }
    setDrafts(next);
  };

  const printDoc = async (): Promise<PrintDoc> => (tab === 'rates' ? {
    title: 'Aaj ka rate', subtitle: todayKey(),
    sections: [{ kind: 'table', columns: [{ label: 'Item' }, { label: 'Rate / kg', align: 'right' }, { label: 'Restaurant', align: 'right' }], rows: rows.map((r) => [r.name, formatPKR(Number(drafts[r.productId]?.price ?? r.price)), r.wholesalePrice ? formatPKR(r.wholesalePrice) : '—']) }],
  } : {
    title: 'Din ka hisaab (stock)', subtitle: date,
    meta: t ? [['Bika', kg(t.sold)], ['Waste', kg(t.waste)], ['Bacha', kg(t.closing)]] : [],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Item' }, { label: 'Subah', align: 'right' }, { label: 'Aaya', align: 'right' }, { label: 'Bika', align: 'right' }, { label: 'Cutting', align: 'right', wideOnly: true }, { label: 'Waste', align: 'right' }, { label: 'Bacha', align: 'right' }],
      rows: rows.map((r) => [r.name, kg(r.opening, r.unit), kg(r.bought + r.madeIn + r.returned + r.otherIn, r.unit), kg(r.sold, r.unit), kg(r.cutOut, r.unit), kg(r.waste + r.otherOut, r.unit), kg(r.closing, r.unit)]),
    }],
  });

  const csv = () => downloadCsv(tab === 'rates' ? `rates-${todayKey()}.csv` : `din-ka-hisaab-${date}.csv`, tab === 'rates'
    ? [['Item', 'Janwar', 'Cut', 'Rate', 'Restaurant rate', 'Cost', 'Stock'], ...rows.map((r) => [r.name, animalOf(r.animalType).label, cutLabel(r.cutCategory), r.price, r.wholesalePrice ?? '', r.costPrice, r.now])]
    : [['Item', 'Unit', 'Subah', 'Purchase', 'Zibah / cutting se', 'Return', 'Bika', 'Cutting me gaya', 'Waste', 'Doosra kam', 'Bacha', 'Bache ki cost'], ...rows.map((r) => [r.name, r.unit, r.opening, r.bought, r.madeIn, r.returned, r.sold, r.cutOut, r.waste, r.otherOut, r.closing, r.closingValue])]);

  return (
    <PageShell>
      <PageHero
        title={tab === 'rates' ? 'Aaj ka rate' : 'Din ka hisaab'}
        chip={<><Gauge /> Rate aur bacha maal</>}
        meta="Subah rate badlein, raat ko dekhein kitna bika, kitna waste hua aur kitna bacha"
        busy={sheet.isFetching && !sheet.isLoading}
        loading={sheet.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title="CSV" className={heroIconButton} disabled={!rows.length} onClick={csv}><FileSpreadsheet className="h-4 w-4" /></button>
          <Link to="/stock-adjustments" className={heroButton}><Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Waste likhein</span></Link>
          <Link to="/cash-register" className={heroButton}><Landmark className="h-4 w-4" /><span className="hidden sm:inline">Galla band</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {tab === 'rates' && canEdit && <button type="button" disabled={!changed.length || bad || save.isPending} onClick={trySave} title="Save (Ctrl+S)" className={heroPrimaryButton}><Save className="h-4 w-4" /> {changed.length ? `${changed.length} rate save` : 'Save'}</button>}
        </>}
        stats={t ? [
          { label: 'Aaj bika', value: kg(t.sold) },
          { label: 'Waste', value: kg(t.waste) },
          { label: 'Bacha maal', value: kg(t.closing), hint: cost(t.closingValue) },
        ] : [{ label: 'Items', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Scale} color="#0891b2" label="Aaya (purchase)" value={kg(t.bought)} hint="Mandi / supplier" />
          <KpiCard icon={Scissors} color="#7c3aed" label="Zibah / cutting se" value={kg(t.madeIn)} hint={`${kg(t.cutOut)} cutting me gaya`} />
          <KpiCard icon={ClipboardList} color="#16a34a" label="Bika" value={kg(t.sold)} hint="Bill se" />
          <KpiCard icon={Trash2} color={t.waste > 0 ? '#e11d48' : '#64748b'} label="Waste" value={kg(t.waste)} hint="Kharab / chhichhra" />
          <KpiCard icon={Undo2} color="#d97706" label="Bacha" value={kg(t.closing)} hint={cost(t.closingValue)} onClick={() => setTab('close')} active={tab === 'close'} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Item, janwar ya cut…" label="Search" />}>
        {tab === 'close' ? (
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-600">
            <CalendarDays className="h-4 w-4" />
            <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} className="h-10 rounded-full bg-white px-3.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
        ) : canEdit && (
          <div className="flex flex-wrap gap-1.5">
            {[-5, -2, 2, 5].map((p) => (
              <button key={p} type="button" onClick={() => bump(p)} className="h-10 rounded-full bg-white px-3.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">{p > 0 ? `+${p}%` : `${p}%`} sab par</button>
            ))}
            {changed.length > 0 && <button type="button" onClick={() => setDrafts({})} className="h-10 rounded-full px-3.5 text-[0.8125rem] font-semibold text-rose-700 hover:bg-rose-50">Badlav hatayein</button>}
          </div>
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<>1-2 tabs · / search{canEdit ? ' · Ctrl+S save' : ''}</>}
        tabs={[{ id: 'rates', label: 'Aaj ka rate', icon: Gauge, count: rateRows.length || null }, { id: 'close', label: 'Din ka hisaab', icon: ClipboardList }]} />

      {sheet.isLoading ? <Skeleton className="h-64 rounded-3xl" />
        : sheet.isError ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Load nahi hua</p>
            <Button className="mt-3" variant="secondary" onClick={() => sheet.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Scale className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{term ? 'Is search me koi item nahi' : 'Koi gosht ka item nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Jo item kg me bikte hain ya jin par janwar / cut likha hai, yahan aate hain.</p>
            {!term && <Link to="/meat-products/new" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:underline">Naya item banayein →</Link>}
          </div>
        ) : tab === 'rates' ? (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <Table minWidth="44rem">
              <THead><Tr><Th>Item</Th><Th align="right">Stock</Th><Th align="right">Cost</Th><Th align="right">Rate</Th><Th align="right">Restaurant rate</Th><Th align="right">Profit / kg</Th></Tr></THead>
              <TBody>
                {rows.map((r) => {
                  const d = drafts[r.productId];
                  const price = Number(d?.price ?? r.price) || 0;
                  const margin = price - r.costPrice;
                  const dirty = !!d && (Number(d.price) !== r.price || (Number(d.wholesale) || 0) !== (r.wholesalePrice ?? 0));
                  return (
                    <Tr key={r.productId} className={cn(dirty && 'bg-amber-50/60')}>
                      <Td><span className="block font-medium text-slate-900">{r.name}</span><span className="text-[0.75rem] text-slate-500">{[animalOf(r.animalType).label, cutLabel(r.cutCategory)].filter((x) => x && x !== '—').join(' · ') || r.unit}</span></Td>
                      <Td align="right" className={cn(r.now <= 0 && 'text-rose-600')}>{kg(r.now, r.unit)}</Td>
                      <Td align="right">{cost(r.costPrice)}</Td>
                      <Td align="right">
                        <input inputMode="decimal" disabled={!canEdit} aria-label={`${r.name} rate`} value={d?.price ?? String(r.price)} onChange={(e) => setDraft(r, { price: decimal(e.target.value) })}
                          className={cn('h-10 w-28 rounded-lg bg-slate-100 px-2 text-right font-semibold tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-brand-500', !(price > 0) && 'ring-2 ring-rose-400')} />
                      </Td>
                      <Td align="right">
                        <input inputMode="decimal" disabled={!canEdit} aria-label={`${r.name} restaurant rate`} placeholder="—" value={d?.wholesale ?? (r.wholesalePrice ? String(r.wholesalePrice) : '')} onChange={(e) => setDraft(r, { wholesale: decimal(e.target.value) })}
                          className="h-10 w-28 rounded-lg bg-slate-100 px-2 text-right tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
                      </Td>
                      <Td align="right" className={cn(margin < 0 ? 'font-semibold text-rose-600' : 'text-emerald-700')}>{cost(margin)}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            {changed.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900">
                <span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />{changed.length} rate abhi save nahi hue{bad ? ' — har rate 0 se zyada ho' : ''}</span>
                <Button size="sm" disabled={bad} loading={save.isPending} onClick={trySave} leftIcon={<Save className="h-4 w-4" />}>Save (Ctrl+S)</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <Table minWidth="52rem">
              <THead><Tr><Th>Item</Th><Th align="right">Subah</Th><Th align="right">Aaya</Th><Th align="right">Bika</Th><Th align="right">Cutting me</Th><Th align="right">Waste</Th><Th align="right">Bacha</Th><Th align="right">Bache ki cost</Th></Tr></THead>
              <TBody>
                {rows.map((r) => {
                  const came = r.bought + r.madeIn + r.returned + r.otherIn;
                  return (
                    <Tr key={r.productId}>
                      <Td className="font-medium text-slate-900">{r.name}</Td>
                      <Td align="right">{kg(r.opening, r.unit)}</Td>
                      <Td align="right" title={`Purchase ${r.bought} · zibah/cutting ${r.madeIn} · return ${r.returned} · doosra ${r.otherIn}`}>{came ? kg(came, r.unit) : '—'}</Td>
                      <Td align="right" className="font-semibold text-emerald-700">{r.sold ? kg(r.sold, r.unit) : '—'}</Td>
                      <Td align="right">{r.cutOut ? kg(r.cutOut, r.unit) : '—'}</Td>
                      <Td align="right" className={cn((r.waste + r.otherOut) > 0 && 'text-rose-600')}>{r.waste + r.otherOut ? kg(r.waste + r.otherOut, r.unit) : '—'}</Td>
                      <Td align="right" className={cn('font-semibold', r.closing < 0 ? 'text-rose-600' : 'text-slate-900')}>{kg(r.closing, r.unit)}</Td>
                      <Td align="right">{cost(r.closingValue)}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <p className="border-t border-slate-100 px-4 py-2.5 text-[0.75rem] text-slate-500">Bacha = subah + aaya − bika − cutting − waste. Manfi bacha matlab stock likhe baghair bika — purchase ya zibah darj karein.</p>
          </div>
        )}

      {guide.isOpen && (
        <PageGuide title="Aaj ka rate aur din ka hisaab" onClose={guide.close}
          steps={[
            { icon: Gauge, color: '#16a34a', title: 'Subah rate', text: 'Mandi ka rate dekh kar har item ka rate likhein, ya "+2% sab par" dabayein. Save (Ctrl+S) karte hi POS par naya rate lagta hai.' },
            { icon: Scale, color: '#0891b2', title: 'Restaurant rate', text: 'Hotel aur restaurant ke liye alag rate. POS par wholesale account wala customer chunne se ye khud lagta hai.' },
            { icon: Trash2, color: '#e11d48', title: 'Waste', text: 'Kharab gosht, chhichhra ya sukha maal "Waste likhein" (Stock adjustment → Damage) se nikalein — profit report me nuksan dikhega.' },
            { icon: ClipboardList, color: '#d97706', title: 'Din ka hisaab', text: 'Raat ko dekhein subah kitna tha, kitna aaya, kitna bika aur kitna bacha. Bacha maal kal ke liye stock me rehta hai.' },
            { icon: Landmark, color: '#7c3aed', title: 'Galla band', text: 'Aakhir me Cash register band karein — galle ka cash din ki sale se milta hai.' },
          ]}
          tips={['Rate badalne ke liye "Products edit" ki ijazat chahiye.', 'Pack (pao, 1 kg pack) ka rate product ke andar alag hai — wo yahan se nahi badalta.']}
          shortcuts={[['1', 'aaj ka rate'], ['2', 'din ka hisaab'], ['/', 'dhoondein'], ['Ctrl+S', 'save'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
