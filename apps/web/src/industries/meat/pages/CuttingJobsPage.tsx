/**
 * Cutting: a carcass or dressed birds become boneless, qeema, chops and
 * bones. A job is started with the input kg; on completion the input leaves
 * stock and each cut comes in with its share of the cost (by sale value).
 * Waste carries no value. Yield and butcher work are summed per period.
 *
 * Keys: N new job · / search · 1 jobs · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Ban, CheckCircle2, Clock, FileSpreadsheet, GraduationCap, Plus, Scale, Scissors, ShieldCheck, Trash2 } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { cuttingJobsApi, type CuttingJob } from '../api/cutting-jobs.api';
import { ItemPick, PickedChip, useMeatItems } from '../components/pickers';
import { FormRow, ListFrame, Pill, inputBox, usePageKeys, type Tone } from '../components/ui';
import { KEYS, MONEY_KEYS, apiError, dateTime, decimal, kg, pct } from '../lib/meta';
import { t as tr } from '@core/i18n';

type View = 'jobs' | 'analytics';
const STATUS: Record<string, { label: string; tone: Tone }> = { IN_PROGRESS: { label: tr('Chal raha'), tone: 'amber' }, COMPLETED: { label: tr('Mukammal'), tone: 'emerald' }, CANCELLED: { label: tr('Cancel'), tone: 'rose' } };

function StartModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [source, setSource] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [input, setInput] = useState('');
  const [butcher, setButcher] = useState('');
  const [tried, setTried] = useState(false);
  const errors: Record<string, string> = {};
  if (!source) errors.source = tr('Kis item se cutting — chunein (carcass, murgi dressed)');
  if (!(Number(input) > 0)) errors.input = tr('Kitne kg kaatne hain');
  const save = useMutation({
    mutationFn: () => cuttingJobsApi.create({ sourceProductId: source!.id, inputWeightKg: Number(input), butcherName: butcher.trim() || undefined }),
    onSuccess: (j) => { toast.success(tr('{{jobNumber}} shuru — mukammal hone par cuts likhein', { jobNumber: j.jobNumber })); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Kaam shuru nahi hua'))),
  });
  const submit = () => { setTried(true); const f = Object.values(errors)[0]; if (f) { toast.error(f); return; } save.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title={tr('Cutting shuru karein')} description={tr('Stock abhi nahi badalta — mukammal karne par badalta hai')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={submit} leftIcon={<Scissors className="h-4 w-4" />}>{tr('Shuru')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <FormRow label={tr('Kis item se')} error={tried ? errors.source : undefined}>{source ? <PickedChip title={source.name} sub={tr('Stock {{stock}}', { stock: kg(source.stock) })} onClear={() => setSource(null)} /> : <ItemPick autoFocus onPick={(i) => setSource({ id: i.id, name: i.name, stock: i.stock })} placeholder={tr('Murgi dressed, bakra carcass…')} />}</FormRow>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormRow label={tr('Kitne kg')} error={tried ? errors.input : undefined} hint={source && Number(input) > source.stock ? tr('Stock sirf {{stock}} hai', { stock: kg(source.stock) }) : undefined}>
            <input inputMode="decimal" value={input} onChange={(e) => setInput(decimal(e.target.value))} className={cn(inputBox, 'text-end font-semibold')} aria-invalid={!!(tried && errors.input)} />
          </FormRow>
          <FormRow label={tr('Kaarigar (marzi)')}><input value={butcher} onChange={(e) => setButcher(e.target.value)} maxLength={120} className={inputBox} placeholder={tr('Naam')} /></FormRow>
        </div>
      </form>
    </Modal>
  );
}

interface CutLine { id: string; name: string; kg: string }

function CompleteModal({ j, onClose, onDone }: { j: CuttingJob; onClose: () => void; onDone: () => void }) {
  const [cuts, setCuts] = useState<CutLine[]>([]);
  const [waste, setWaste] = useState('');
  const out = cuts.reduce((s, c) => s + (Number(c.kg) || 0), 0);
  const autoWaste = Math.max(j.inputWeightKg - out, 0);
  const wasteKg = waste === '' ? autoWaste : Number(waste) || 0;
  const over = out + wasteKg > j.inputWeightKg + 0.0005;
  const bad = !cuts.length || cuts.some((c) => !(Number(c.kg) > 0)) || over;
  const save = useMutation({
    mutationFn: () => cuttingJobsApi.complete(j.id, { cuts: cuts.map((c) => ({ productId: c.id, kg: Number(c.kg) })), wasteWeightKg: waste === '' ? undefined : Number(waste) }),
    onSuccess: (r) => { toast.success(tr('{{jobNumber}} mukammal — yield {{yieldPct}}', { jobNumber: r.jobNumber, yieldPct: pct(r.yieldPct) })); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Mukammal nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={tr('{{jobNumber}} — kya nikla', { jobNumber: j.jobNumber })} description={tr('{{value}} {{inputWeightKg}} se', { value: j.cutsProduced?.source?.name ?? 'Item', inputWeightKg: kg(j.inputWeightKg) })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="success" disabled={bad} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{tr('Mukammal · {{out}}', { out: kg(out) })}</Button></>}>
      <div className="space-y-3">
        {cuts.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-[0.875rem] ring-1 ring-slate-200">{c.name}</span>
            <input autoFocus={i === cuts.length - 1 && !c.kg} inputMode="decimal" aria-label={tr('{{name}} kg', { name: c.name })} value={c.kg} onChange={(e) => setCuts((cs) => cs.map((x, k) => (k === i ? { ...x, kg: decimal(e.target.value) } : x)))} placeholder="kg"
              className="h-10 w-24 rounded-lg bg-slate-100 px-2 text-end font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
            <button type="button" aria-label={tr('Hatayein')} onClick={() => setCuts((cs) => cs.filter((_, k) => k !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <ItemPick onPick={(i) => setCuts((cs) => [...cs, { id: i.id, name: i.name, kg: '' }])} exclude={[j.cutsProduced?.source?.productId ?? '', ...cuts.map((c) => c.id)]} placeholder={tr('Cut jorein: boneless, qeema, chaanp, haddi…')} />
        <Input label={tr('Waste (kg)')} inputMode="decimal" value={waste} onChange={(e) => setWaste(decimal(e.target.value))} placeholder={tr('{{value}} (khud)', { value: Math.round(autoWaste * 1000) / 1000 })} hint={tr('Phenki hui charbi, chhichhra — khali chhorein to baqi wazan waste')} error={over ? tr('Cuts + waste {{inputWeightKg}} se zyada', { inputWeightKg: kg(j.inputWeightKg) }) : undefined} />
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">{tr('Yield {{pct}} · cost har cut par us ki sale value ke hisaab se lagti hai', { pct: pct(j.inputWeightKg ? (out / j.inputWeightKg) * 100 : null) })}</p>
      </div>
    </Modal>
  );
}

function CancelJob({ j, onClose, onDone }: { j: CuttingJob; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => cuttingJobsApi.cancel(j.id, reason.trim() || undefined),
    onSuccess: () => { toast.success(tr('Kaam cancel')); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Cancel nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('{{jobNumber}} cancel karein?', { jobNumber: j.jobNumber })} description={tr('Stock nahi badla tha, kuch wapas nahi karna')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Ban className="h-4 w-4" />}>{tr('Cancel')}</Button></>}>
      <Input data-autofocus label={tr('Wajah (marzi)')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
    </Modal>
  );
}

export default function CuttingJobsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { cost } = useMasked();
  const { byId } = useMeatItems();
  const canWrite = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('jobs');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'start' } | { kind: 'done' | 'cancel'; j: CuttingJob } | null>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const period = resolveRange(range, startHour);
  const q = { status: status || undefined, search: query || undefined, from: period?.from, to: period?.to };
  const listQ = useQuery({ queryKey: [KEYS.cutting, q], queryFn: () => cuttingJobsApi.list(q), placeholderData: (p) => p });
  const rows = listQ.data ?? [];
  const done = rows.filter((j) => j.status === 'COMPLETED');
  const inKg = done.reduce((s, j) => s + j.inputWeightKg, 0);
  const outKg = done.reduce((s, j) => s + (j.outputWeightKg ?? 0), 0);
  const wasteKg = done.reduce((s, j) => s + (j.wasteWeightKg ?? 0), 0);
  const open = rows.filter((j) => j.status === 'IN_PROGRESS').length;
  const refresh = () => [KEYS.cutting, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  usePageKeys({ n: canWrite ? () => setDialog({ kind: 'start' }) : undefined, '1': () => setView('jobs'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const byCut = done.flatMap((j) => j.cutsProduced?.cuts ?? []).reduce<Record<string, { name: string; kg: number }>>((acc, c) => {
    const r = acc[c.productId] ?? { name: byId.get(c.productId)?.name ?? c.name, kg: 0 };
    r.kg += c.qty; acc[c.productId] = r; return acc;
  }, {});

  const printDoc = (): PrintDoc => ({
    title: 'Cutting ka kaam', subtitle: period ? `${period.from} → ${period.to}` : 'Sab',
    meta: [['Andar', kg(inKg)], ['Cuts', kg(outKg)], ['Waste', kg(wasteKg)]],
    sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Kab' }, { label: 'Item' }, { label: 'Andar', align: 'right' }, { label: 'Cuts', align: 'right' }, { label: 'Waste', align: 'right' }, { label: 'Kaarigar', wideOnly: true }],
      rows: rows.map((j) => [j.jobNumber, dateTime(j.startedAt), j.cutsProduced?.source?.name ?? '', kg(j.inputWeightKg), kg(j.outputWeightKg), kg(j.wasteWeightKg), j.butcherName ?? '']) }],
  });

  return (
    <PageShell>
      <PageHero
        title={tr('Cutting')}
        chip={<><Scissors /> {' '}{tr('Boneless, qeema, chaanp')}</>}
        meta={tr('Carcass ya dressed murgi se cuts banayein — har cut apni cost ke saath stock me')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title={tr('CSV')} className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('cutting.csv', [['#', tr('Kab'), tr('Item'), tr('Andar kg'), tr('Cuts kg'), tr('Waste kg'), tr('Yield %'), tr('Halat'), tr('Kaarigar'), tr('Cuts')], ...rows.map((j) => [j.jobNumber, dateTime(j.startedAt), j.cutsProduced?.source?.name, j.inputWeightKg, j.outputWeightKg, j.wasteWeightKg, j.yieldPct, STATUS[j.status]?.label, j.butcherName, (j.cutsProduced?.cuts ?? []).map((c) => `${c.name} ${c.qty}`).join('; ')])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/meat/slaughter" className={heroButton}><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">{tr('Zibah')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWrite && <button type="button" onClick={() => setDialog({ kind: 'start' })} title={tr('Naya kaam (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Cutting shuru')}</button>}
        </>}
        stats={[{ label: tr('Chal raha'), value: open }, { label: tr('Cuts bane'), value: kg(outKg) }, { label: tr('Yield'), value: pct(inKg ? (outKg / inKg) * 100 : null) }]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label={tr('Chal raha')} value={open} hint={tr('Mukammal karna baqi')} onClick={() => setStatus('IN_PROGRESS')} active={status === 'IN_PROGRESS'} />
          <KpiCard icon={Scale} color="#0891b2" label={tr('Andar gaya')} value={kg(inKg)} hint={tr('{{count}} mukammal', { count: done.length })} />
          <KpiCard icon={Scissors} color="#16a34a" label={tr('Cuts bane')} value={kg(outKg)} hint={tr('Yield {{pct}}', { pct: pct(inKg ? (outKg / inKg) * 100 : null) })} />
          <KpiCard icon={Trash2} color={wasteKg ? '#e11d48' : '#64748b'} label={tr('Waste')} value={kg(wasteKg)} hint={tr('Phenka gaya')} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Kaam #, kaarigar…')} label={tr('Search')} />}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={Clock} label={status ? STATUS[status].label : tr('Sab halat')} value={status} active={!!status} onChange={setStatus}
          options={[{ value: '', label: tr('Sab halat') }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} hint={<>{tr('{{value}}/ search · 1-2 tabs', { value: canWrite ? tr('N naya · ') : '' })}</>}
        tabs={[{ id: 'jobs', label: tr('Kaam'), icon: Scissors, count: rows.length }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {view === 'analytics' ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="font-semibold text-slate-900">{tr('Kaunsa cut kitna bana')}</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {Object.entries(byCut).sort((a, b) => b[1].kg - a[1].kg).map(([id, r]) => (
              <li key={id} className="flex items-center justify-between py-2 text-[0.875rem]"><span>{r.name}</span><span className="font-semibold tabular-nums">{kg(r.kg)} · {pct(outKg ? (r.kg / outKg) * 100 : null)}</span></li>
            ))}
            {!done.length && <li className="py-6 text-center text-sm text-slate-500">{tr('Is period me koi mukammal kaam nahi')}</li>}
          </ul>
        </div>
      ) : (
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !listQ.data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? { icon: Scissors, title: tr('Koi cutting ka kaam nahi'), text: tr('Dressed murgi ya carcass se boneless, qeema banana ho to yahan shuru karein.'), actions: canWrite ? <Button onClick={() => setDialog({ kind: 'start' })} leftIcon={<Plus className="h-4 w-4" />}>{tr('Cutting shuru')}</Button> : undefined } : null}>
          {rows.map((j) => (
            <li key={j.id} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{j.jobNumber}</span>
                    <span className="text-[0.8125rem] text-slate-600">{j.cutsProduced?.source?.name ?? tr('Item nahi likha')} · {kg(j.inputWeightKg)}</span>
                    <Pill tone={STATUS[j.status]?.tone}>{STATUS[j.status]?.label ?? j.status}</Pill>
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">{dateTime(j.startedAt)}{j.butcherName ? ` · ${j.butcherName}` : ''}{j.durationMin ? tr(' · {{durationMin}} min', { durationMin: j.durationMin }) : ''}</p>
                  {!!j.cutsProduced?.cuts?.length && (
                    <p className="mt-1 text-[0.8125rem] text-slate-700">{j.cutsProduced.cuts.map((c) => `${c.name} ${kg(c.qty)} (${cost(c.unitCost)}/kg)`).join(' · ')}</p>
                  )}
                </div>
                {j.status === 'COMPLETED' && <div className="text-end text-[0.8125rem]"><p className="font-semibold">{tr('Yield {{yieldPct}}', { yieldPct: pct(j.yieldPct) })}</p><p className="text-slate-500">{tr('Waste {{wasteWeightKg}}', { wasteWeightKg: kg(j.wasteWeightKg) })}</p></div>}
                {j.status === 'IN_PROGRESS' && canWrite && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="success" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'done', j })}>{tr('Mukammal')}</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'cancel', j })}>{tr('Cancel')}</Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ListFrame>
      )}

      {dialog?.kind === 'start' && <StartModal onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'done' && <CompleteModal j={dialog.j} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'cancel' && <CancelJob j={dialog.j} onClose={() => setDialog(null)} onDone={refresh} />}

      {guide.isOpen && (
        <PageGuide title={tr('Cutting — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#d97706', title: tr('Shuru'), text: tr('Kis item se (murgi dressed, bakra carcass) aur kitne kg kaatne hain. Abhi stock nahi badalta.') },
            { icon: Scissors, color: '#16a34a', title: tr('Mukammal'), text: tr('Har cut ka wazan likhein: boneless, qeema, chaanp, haddi. Andar wala maal stock se nikalta hai, cuts aa jate hain.') },
            { icon: Scale, color: '#0891b2', title: tr('Cost'), text: tr('Kul cost cuts me un ki sale value ke hisaab se lagti hai — boneless par zyada, haddi par kam. Waste ki cost baqi cuts me shamil.') },
          ]}
          tips={[tr('Yield kam aaye to kaarigar se poochein — analytics me har cut ka hissa dikhta hai.'), tr('Cutting ke liye "Stock adjustment" ki ijazat chahiye.')]}
          shortcuts={[['N', tr('naya kaam')], ['/', 'dhoondein'], ['1', 'kaam'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
