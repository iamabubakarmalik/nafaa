/**
 * Size charts: the S/M/L table (chest, length, waist…) of each garment
 * type, shown to customers who ask "mera size kya hoga". One chart per type
 * can be the default. Ready templates fill a new chart in one tap; rows and
 * columns are edited in place. Charts are switched off, never deleted.
 *
 * Keys: N new · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, Copy, GraduationCap, Pencil, Plus, Printer, Star, Table2, Trash2, X } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterMenu, Input, Modal, PageHero, PageShell, SearchField, Segmented, Select, Skeleton, Switch, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PrintButton, type PrintDoc } from '@core/print';
import { sizeChartsApi, type SizeChart, type SizeChartInput, type SizeRow } from '../api/size-charts.api';
import { EmptyList, LoadFailed } from '../components/charts';
import { GARMENT_TYPES, GENDERS, MEASURE_LABELS, SIZE_CHART_KEY, apiError, garmentLabel, genderLabel, opt } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';

const TEMPLATES: Array<{ name: string; categoryType: string; gender: string; cols: string[]; rows: SizeRow[] }> = [
  { name: 'Gents kameez', categoryType: 'SHALWAR_KAMEEZ', gender: 'MEN', cols: ['chest', 'shoulder', 'kurtaLength', 'sleeveLength'], rows: [
    { size: 'S', chest: 38, shoulder: 17, kurtaLength: 40, sleeveLength: 23 }, { size: 'M', chest: 40, shoulder: 18, kurtaLength: 41, sleeveLength: 24 },
    { size: 'L', chest: 42, shoulder: 19, kurtaLength: 42, sleeveLength: 24.5 }, { size: 'XL', chest: 44, shoulder: 20, kurtaLength: 43, sleeveLength: 25 },
  ] },
  { name: 'Ladies kurti', categoryType: 'KURTA', gender: 'WOMEN', cols: ['bust', 'waist', 'hip', 'kurtaLength'], rows: [
    { size: 'XS', bust: 32, waist: 28, hip: 36, kurtaLength: 38 }, { size: 'S', bust: 34, waist: 30, hip: 38, kurtaLength: 39 },
    { size: 'M', bust: 36, waist: 32, hip: 40, kurtaLength: 40 }, { size: 'L', bust: 38, waist: 34, hip: 42, kurtaLength: 41 },
  ] },
  { name: 'Pant / trouser', categoryType: 'TROUSER', gender: 'MEN', cols: ['waist', 'hip', 'inseam'], rows: [
    { size: '30', waist: 30, hip: 38, inseam: 30 }, { size: '32', waist: 32, hip: 40, inseam: 31 }, { size: '34', waist: 34, hip: 42, inseam: 31 }, { size: '36', waist: 36, hip: 44, inseam: 32 },
  ] },
  { name: 'Bachon ka frock', categoryType: 'FROCK', gender: 'GIRLS', cols: ['chest', 'shirtLength'], rows: [
    { size: '2-3 saal', chest: 22, shirtLength: 18 }, { size: '4-5 saal', chest: 24, shirtLength: 21 }, { size: '6-7 saal', chest: 26, shirtLength: 24 }, { size: '8-9 saal', chest: 28, shirtLength: 27 },
  ] },
];
const COLUMN_CHOICES = Object.keys(MEASURE_LABELS);
const colsOf = (rows: SizeRow[]) => [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== 'size')))];
const label = (k: string) => MEASURE_LABELS[k] ?? k;

export default function SizeChartsPage() {
  const qc = useQueryClient();
  const { catalog: canEdit } = useGarmentsCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [showOff, setShowOff] = useState(false);
  const [form, setForm] = useState<{ chart: SizeChart | null; seed?: (typeof TEMPLATES)[number] } | null>(null);

  const listQ = useQuery({ queryKey: [SIZE_CHART_KEY], queryFn: () => sizeChartsApi.list() });
  const refresh = () => qc.invalidateQueries({ queryKey: [SIZE_CHART_KEY] });
  const off = useMutation({
    mutationFn: (c: SizeChart) => (c.isActive ? sizeChartsApi.remove(c.id) : sizeChartsApi.update(c.id, { ...toInput(c), isActive: true })),
    onSuccess: (c) => { toast.success(c.isActive ? 'Chart chalu' : 'Chart band — products ka link waisa hai'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm({ chart: null }); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const all = listQ.data ?? [];
  const term = search.trim().toLowerCase();
  const rows = all.filter((c) => (showOff || c.isActive) && (!type || c.categoryType === type) && (!term || c.name.toLowerCase().includes(term)));
  return (
    <PageShell>
      <PageHero title="Size charts" chip={<><Table2 /> Sizes</>} meta="Customer ko size batane ke liye — S, M, L ka naap"
        busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm({ chart: null })} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya chart</button>}
        </>}
        stats={[{ label: 'Charts', value: all.filter((c) => c.isActive).length }, { label: 'Products jure', value: all.reduce((s, c) => s + (c.productCount ?? 0), 0) }]}
      />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Chart ka naam…" />}>
        <FilterMenu icon={Table2} label={type ? garmentLabel(type) : 'Har kapra'} value={type} active={!!type} onChange={setType}
          options={[{ value: '', label: 'Har kapra' }, ...GARMENT_TYPES.map((g) => ({ value: g.value, label: g.label }))]} />
        <FilterMenu icon={Archive} label={showOff ? 'Band bhi' : 'Chalu'} value={showOff ? 'all' : 'on'} active={showOff} onChange={(v) => setShowOff(v === 'all')} align="right"
          options={[{ value: 'on', label: 'Sirf chalu' }, { value: 'all', label: 'Band bhi dikhayein' }]} />
      </FilterBar>

      {canEdit && all.length < 3 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="text-[0.8125rem] font-semibold text-slate-800">Tayyar template se shuru karein</p>
          <div className="mt-2 flex flex-wrap gap-2">{TEMPLATES.map((t) => <Button key={t.name} size="sm" variant="secondary" onClick={() => setForm({ chart: null, seed: t })} leftIcon={<Copy className="h-4 w-4" />}>{t.name}</Button>)}</div>
        </div>
      )}

      {listQ.isLoading ? <div className="grid gap-3 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        : listQ.isError ? <LoadFailed what="Charts" retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={Table2} title={all.length ? 'Is filter me koi nahi' : 'Abhi koi size chart nahi'} text="Har tarah ke kapre ka ek chart banayein — customer ko size batana aur online order lena aasaan hota hai.">
              {canEdit && <Button onClick={() => setForm({ chart: null })} leftIcon={<Plus className="h-4 w-4" />}>Naya chart</Button>}
            </EmptyList>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((c) => {
                const cols = colsOf(c.rows);
                return (
                  <article key={c.id} className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !c.isActive && 'opacity-70')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{c.name}{c.isDefault && <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</p>
                        <p className="text-[0.75rem] text-slate-500">{[garmentLabel(c.categoryType), c.gender ? genderLabel(c.gender) : null, c.unit === 'CM' ? 'cm' : 'inch', `${c.productCount ?? 0} products`, !c.isActive ? 'band' : null].filter((x) => x && x !== '—').join(' · ')}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <PrintButton size="sm" doc={() => chartDoc(c)} />
                        {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm({ chart: c })} aria-label="Badlein"><Pencil className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[20rem] text-[0.8125rem]">
                        <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><th className="px-2 py-1.5">Size</th>{cols.map((k) => <th key={k} className="px-2 py-1.5 text-right">{label(k)}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">{c.rows.map((r) => <tr key={String(r.size)}><td className="px-2 py-1.5 font-semibold">{r.size}</td>{cols.map((k) => <td key={k} className="px-2 py-1.5 text-right tabular-nums">{r[k] ?? '—'}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                    {canEdit && <button type="button" onClick={() => off.mutate(c)} className="mt-3 text-[0.75rem] font-semibold text-slate-500 hover:text-slate-800">{c.isActive ? 'Band karein' : 'Chalu karein'}</button>}
                  </article>
                );
              })}
            </div>
          )}

      {form && <ChartForm chart={form.chart} seed={form.seed} onClose={() => setForm(null)} onDone={refresh} />}
      {guide.isOpen && (
        <PageGuide title="Size charts — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Copy, color: '#7c3aed', title: 'Template', text: 'Gents kameez, ladies kurti, pant ya bachon ke frock ka template chunein aur apne naap badal dein.' },
            { icon: Table2, color: '#2563eb', title: 'Sizes aur khane', text: '"Size" jorein ya hatayein; khane (chhati, kamar, lambai) apni marzi se.' },
            { icon: Star, color: '#d97706', title: 'Main chart', text: 'Har tarah ke kapre ka ek main chart ho sakta hai — product banate waqt wahi pehle aata hai.' },
            { icon: Printer, color: '#ea580c', title: 'Print', text: 'Chart print kar ke counter par laga dein.' },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]} />
      )}
    </PageShell>
  );
}

/** The chart as a printable table for the counter wall. */
function chartDoc(c: SizeChart): PrintDoc {
  const cols = colsOf(c.rows);
  return {
    title: `Size chart — ${c.name}`,
    subtitle: [garmentLabel(c.categoryType), c.gender ? genderLabel(c.gender) : '', c.unit === 'CM' ? 'cm' : 'inch'].filter((x) => x && x !== '—').join(' · '),
    sections: [{ kind: 'table', columns: [{ label: 'Size' }, ...cols.map((k) => ({ label: label(k), align: 'right' as const }))], rows: c.rows.map((r) => [String(r.size), ...cols.map((k) => (r[k] === undefined ? '—' : String(r[k])))]) }],
    footer: c.description ?? undefined,
  };
}

const toInput = (c: SizeChart): SizeChartInput => ({
  name: c.name, categoryType: c.categoryType ?? undefined, gender: c.gender ?? undefined, unit: c.unit, description: c.description ?? undefined, rows: c.rows, isDefault: c.isDefault,
});

function ChartForm({ chart, seed, onClose, onDone }: { chart: SizeChart | null; seed?: (typeof TEMPLATES)[number]; onClose: () => void; onDone: () => void }) {
  const start = chart ? { cols: colsOf(chart.rows), rows: chart.rows } : seed ? { cols: seed.cols, rows: seed.rows } : { cols: ['chest', 'kurtaLength'], rows: [{ size: 'S' }, { size: 'M' }, { size: 'L' }] as SizeRow[] };
  const [name, setName] = useState(chart?.name ?? seed?.name ?? '');
  const [categoryType, setCategoryType] = useState(chart?.categoryType ?? seed?.categoryType ?? '');
  const [gender, setGender] = useState(chart?.gender ?? seed?.gender ?? '');
  const [unit, setUnit] = useState<'INCH' | 'CM'>(chart?.unit ?? 'INCH');
  const [isDefault, setIsDefault] = useState(chart?.isDefault ?? false);
  const [desc, setDesc] = useState(chart?.description ?? '');
  const [cols, setCols] = useState<string[]>(start.cols);
  const [rows, setRows] = useState<Array<Record<string, string>>>(start.rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]))));
  const [addCol, setAddCol] = useState('');

  const sizes = rows.map((r) => (r.size ?? '').trim().toLowerCase()).filter(Boolean);
  const problem = !name.trim() ? 'Naam likhein' : !sizes.length ? 'Kam az kam ek size likhein' : new Set(sizes).size !== sizes.length ? 'Ek size do dafa likha hai' : null;
  const save = useMutation({
    mutationFn: () => {
      const body: SizeChartInput = {
        name: name.trim(), categoryType: categoryType || undefined, gender: gender || undefined, unit, isDefault, description: opt(desc),
        rows: rows.filter((r) => (r.size ?? '').trim()).map((r) => {
          const out: SizeRow = { size: r.size.trim() };
          for (const k of cols) if (r[k] !== undefined && r[k] !== '' && Number.isFinite(Number(r[k]))) out[k] = Number(r[k]);
          return out;
        }),
      };
      return chart ? sizeChartsApi.update(chart.id, body) : sizeChartsApi.create(body);
    },
    onSuccess: (c) => { toast.success(`${c.name} save ho gaya`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="xl" title={chart ? `${chart.name} — badlein` : 'Naya size chart'}
      footer={<>
        {problem && name ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : <p className="mr-auto text-[0.8125rem] text-slate-500">{sizes.length} sizes · {cols.length} khane</p>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()}>Save karein</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Gents kameez" />
          <Select label="Kapra" value={categoryType} onChange={(e) => setCategoryType(e.target.value)} options={[{ value: '', label: '—' }, ...GARMENT_TYPES.map((g) => ({ value: g.value, label: g.label }))]} />
          <Select label="Kis ke liye" value={gender} onChange={(e) => setGender(e.target.value)} options={[{ value: '', label: '—' }, ...GENDERS.map((g) => ({ value: g.value, label: g.label }))]} />
          <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Unit</span><Segmented value={unit} onChange={(v) => setUnit(v as 'INCH' | 'CM')} items={[{ value: 'INCH', label: 'Inch' }, { value: 'CM', label: 'CM' }]} /></div>
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
          <table className="w-full min-w-[28rem] text-[0.8125rem]">
            <thead>
              <tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Size</th>
                {cols.map((k) => <th key={k} className="px-2 py-2"><span className="inline-flex items-center gap-1">{label(k)}<button type="button" onClick={() => setCols(cols.filter((c) => c !== k))} aria-label="Khana hatayein" className="text-slate-400 hover:text-rose-600"><X className="h-3 w-3" /></button></span></th>)}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-2 py-1"><input value={r.size ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} className="h-8 w-20 rounded-md border border-slate-200 px-2 font-semibold" /></td>
                  {cols.map((k) => <td key={k} className="px-2 py-1"><input inputMode="decimal" value={r[k] ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value.replace(/[^\d.]/g, '') } : x)))} className="h-8 w-20 rounded-md border border-slate-200 px-2 text-right tabular-nums" /></td>)}
                  <td><button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Size hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setRows([...rows, { size: '' }])} leftIcon={<Plus className="h-4 w-4" />}>Size</Button>
          <Select size="sm" label="Khana jorein" value={addCol} onChange={(e) => { const k = e.target.value; if (k && !cols.includes(k)) setCols([...cols, k]); setAddCol(''); }}
            options={[{ value: '', label: '— chunein —' }, ...COLUMN_CHOICES.filter((k) => !cols.includes(k)).map((k) => ({ value: k, label: label(k) }))]} />
        </div>
        <Input label="Note" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} placeholder="Naap jism ka hai, kapra 2 inch khula" hint="Print par neeche aata hai" />
        <Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} label="Is kapre ka main chart" description="Is tarah ke kapre ka pehle wala main chart hat jayega" />
      </div>
    </Modal>
  );
}
