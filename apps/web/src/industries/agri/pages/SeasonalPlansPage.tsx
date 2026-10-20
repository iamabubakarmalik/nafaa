/**
 * Crop calendar: when each crop is sown and harvested, what it needs per
 * acre and the spray / fertilizer days after sowing. Stock on hand is
 * shown as the acres it covers, so the shop orders before the sowing rush.
 * Switching a plan off keeps it on record.
 */

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarDays, CalendarRange, CheckCircle2, GraduationCap, Layers, Package, Pencil, Plus, Power, Sprout, Tractor, Wheat, X,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useProductCatalog, type PosItem } from '@modules/pos/engine';
import { seasonalPlansApi, type PlanInput, type SeasonalPlan } from '../api/seasonal-plans.api';
import { ProductPick } from '../components/ProductPick';
import { usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { CROPS, SEASON_LABEL, dayPhrase, errorText, qty, seasonLabel, shortDate, isoDay } from '../lib/meta';

type View = 'now' | 'all' | 'calendar' | 'off';
const KEY = 'seasonal-plans-all';
const DAY = 86_400_000;
const SOON_DAYS = 45;
const SEASONS = ['RABI', 'KHARIF', 'ZAID'];
const SEASON_OPTIONS: Array<FilterOption<string>> = [{ value: '', label: 'Har season' }, ...SEASONS.map((v) => ({ value: v, label: SEASON_LABEL[v] }))];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface PlanProduct { productId?: string; name: string; perAcre: number; unit: string }
interface PlanStep { day: number; what: string }

function planProducts(v: unknown): PlanProduct[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? { name: x, perAcre: 0, unit: '' } : {
    productId: (x as PlanProduct).productId, name: String((x as PlanProduct).name ?? ''), perAcre: Number((x as PlanProduct).perAcre) || 0, unit: String((x as PlanProduct).unit ?? ''),
  })).filter((p) => p.name);
}
function planSteps(v: unknown): PlanStep[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? { day: 0, what: x } : { day: Number((x as PlanStep).day) || 0, what: String((x as PlanStep).what ?? '') }))
    .filter((s) => s.what).sort((a, b) => a.day - b.day);
}

const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const local = (iso: string) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d; };

/**
 * The plan's sowing window in the coming cycle: its month and day moved to
 * this year (or next, once this year's window is over), so last year's
 * plan keeps working.
 */
function cycle(p: SeasonalPlan) {
  const s = local(p.sowingStart);
  const len = local(p.sowingEnd).getTime() - s.getTime();
  const harvestAt = local(p.harvestStart).getTime() - s.getTime();
  const t = today();
  let start = new Date(t.getFullYear(), s.getMonth(), s.getDate());
  if (start.getTime() + len < t.getTime()) start = new Date(t.getFullYear() + 1, s.getMonth(), s.getDate());
  if (start.getTime() - t.getTime() > 300 * DAY) {
    const prev = new Date(t.getFullYear() - 1, s.getMonth(), s.getDate());
    if (prev.getTime() + len >= t.getTime()) start = prev;
  }
  const end = new Date(start.getTime() + len);
  const toSow = Math.round((start.getTime() - t.getTime()) / DAY);
  return { start, end, harvest: new Date(start.getTime() + harvestAt), toSow, now: toSow <= 0 && end >= t, soon: toSow > 0 && toSow <= SOON_DAYS };
}

interface Readiness { lines: Array<PlanProduct & { stock: number | null; acres: number | null }>; short: number }
function readiness(p: SeasonalPlan, stockBy: Map<string, PosItem>): Readiness {
  const lines = planProducts(p.recommendedProducts).map((x) => {
    const item = x.productId ? stockBy.get(x.productId) : undefined;
    const stock = item ? item.stock : null;
    return { ...x, unit: x.unit || item?.unit || '', stock, acres: stock !== null && x.perAcre > 0 ? Math.floor(stock / x.perAcre) : null };
  });
  return { lines, short: lines.filter((l) => l.stock !== null && l.stock <= 0).length };
}

function planDoc(p: SeasonalPlan, r: Readiness): PrintDoc {
  const steps = planSteps(p.applicationSchedule);
  return {
    title: `${p.cropName} — ${seasonLabel(p.season)} ${p.year}`,
    meta: [['Bijai', `${shortDate(p.sowingStart)} – ${shortDate(p.sowingEnd)}`], ['Katai', `${shortDate(p.harvestStart)} – ${shortDate(p.harvestEnd)}`]],
    sections: [
      ...(r.lines.length ? [{ kind: 'table' as const, title: 'Fi acre maal', columns: [{ label: 'Cheez' }, { label: 'Fi acre', align: 'right' as const }], rows: r.lines.map((l) => [l.name, l.perAcre ? `${qty(l.perAcre)} ${l.unit}` : '—']) }] : []),
      ...(steps.length ? [{ kind: 'table' as const, title: 'Bijai ke baad', columns: [{ label: 'Din', align: 'right' as const }, { label: 'Kya karna hai' }], rows: steps.map((s) => [String(s.day), s.what]) }] : []),
    ],
    footer: 'Spray ke waqt mask aur dastane pehnein.',
  };
}

export default function SeasonalPlansPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.AGRI_ORDERS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('now');
  const [season, setSeason] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SeasonalPlan | null>(null);
  const [form, setForm] = useState<SeasonalPlan | 'new' | null>(null);
  const { data = [], isLoading, isFetching } = useQuery({ queryKey: [KEY, 'with-off'], queryFn: () => seasonalPlansApi.list({}) });
  const { items } = useProductCatalog();
  const stockBy = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  usePageKeys(searchRef, canManage ? { n: () => setForm('new') } : {});

  const term = search.trim().toLowerCase();
  const rows = useMemo(() => data
    .filter((p) => (!season || p.season === season) && (!term || p.cropName.toLowerCase().includes(term)))
    .map((p) => ({ p, w: cycle(p), r: readiness(p, stockBy) })), [data, season, term, stockBy]);
  const active = rows.filter((x) => x.p.isActive);
  const sowingNow = active.filter((x) => x.w.now);
  const sowingSoon = active.filter((x) => x.w.soon).sort((a, b) => a.w.toSow - b.w.toSow);
  const harvestNow = active.filter((x) => { const t = today(); const h = x.w.harvest; return h <= t && t.getTime() - h.getTime() < 45 * DAY; });
  const risky = [...sowingNow, ...sowingSoon].filter((x) => x.r.short > 0 || x.r.lines.length === 0);
  const off = rows.filter((x) => !x.p.isActive);

  const toggle = useMutation({
    mutationFn: (p: SeasonalPlan) => (p.isActive ? seasonalPlansApi.remove(p.id) : seasonalPlansApi.update(p.id, { isActive: true })),
    onSuccess: (_r, p) => { toast.success(p.isActive ? 'Plan band — record mehfooz hai' : 'Plan dobara chalu'); setOpen(null); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e) => toast.error(errorText(e, 'Nahi badla')),
  });

  const listDoc = (): PrintDoc => ({
    title: 'Fasal calendar',
    sections: [{ kind: 'table', columns: [{ label: 'Fasal' }, { label: 'Season' }, { label: 'Bijai' }, { label: 'Katai', wideOnly: true }], rows: active.map(({ p }) => [p.cropName, `${seasonLabel(p.season)} ${p.year}`, `${shortDate(p.sowingStart)} – ${shortDate(p.sowingEnd)}`, `${shortDate(p.harvestStart)} – ${shortDate(p.harvestEnd)}`]) }],
  });

  const chips = (search.trim() || season) ? (
    <>
      {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
      {season && <FilterChip onRemove={() => setSeason('')}>{SEASON_LABEL[season]}</FilterChip>}
    </>
  ) : undefined;

  const card = (x: (typeof rows)[number]) => <PlanCard key={x.p.id} plan={x.p} w={x.w} r={x.r} onOpen={() => setOpen(x.p)} />;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Fasal calendar — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Plan banayein', text: 'Fasal, season, bijai aur katai ki dates likhein — jaise Gandum: 1 Nov se 15 Dec bijai.' },
            { icon: Package, color: '#16a34a', title: 'Fi acre maal', text: 'Har fasal ko kya chahiye — DAP 1 bori, Urea 2 bori fi acre. Stock se pata chalta hai kitne acre ka maal hai.' },
            { icon: Sprout, color: '#d97706', title: 'Bijai qareeb', text: `${SOON_DAYS} din pehle fasal "Bijai qareeb" me aati hai. Maal kam ho to company ko order dein.` },
            { icon: Power, color: '#64748b', title: 'Band karein', text: 'Purana plan band karein — record mehfooz rehta hai, zaroorat ho to dobara chalu karein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya plan'], ['G', 'guide']]} />
      )}

      <PageHero title="Fasal calendar" chip={`${active.length} fasal`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Bijai se pehle maal tayyar — fi acre hisaab"
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={listDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya plan</button>}
        </>}
        stats={[
          { label: 'Bijai abhi', value: sowingNow.length },
          { label: `Bijai ${SOON_DAYS} din me`, value: sowingSoon.length },
          { label: 'Maal kam', value: risky.length },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Sprout} color="#16a34a" label="Bijai abhi" value={sowingNow.length} onClick={() => setView('now')} active={view === 'now'} />
            <KpiCard icon={CalendarDays} color="#2563eb" label="Bijai qareeb" value={sowingSoon.length} onClick={() => setView('now')} />
            <KpiCard icon={Wheat} color="#d97706" label="Katai chal rahi" value={harvestNow.length} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Maal kam" value={risky.length} onClick={() => setView('now')} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Fasal ka naam…" />}
        chips={chips} onClear={() => { setSearch(''); setSeason(''); }}>
        <FilterMenu icon={CalendarDays} label={season ? SEASON_LABEL[season] : 'Season'} value={season} options={SEASON_OPTIONS} onChange={setSeason} active={!!season} align="right" />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} tabs={[
        { id: 'now', label: 'Abhi aur qareeb', icon: Sprout, count: sowingNow.length + sowingSoon.length },
        { id: 'all', label: 'Sab plans', icon: Layers, count: active.length },
        { id: 'calendar', label: 'Saal ka calendar', icon: CalendarRange },
        { id: 'off', label: 'Band', icon: Power, count: off.length },
      ]} />

      {isLoading ? <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
        : view === 'now' ? (
          sowingNow.length + sowingSoon.length === 0
            ? <Empty canManage={canManage} onNew={() => setForm('new')} text={active.length ? `Agle ${SOON_DAYS} din me kisi fasal ki bijai nahi` : 'Abhi koi plan nahi'} />
            : (
              <div className="space-y-5">
                {sowingNow.length > 0 && <Group title="Bijai abhi chal rahi" items={sowingNow.map(card)} />}
                {sowingSoon.length > 0 && <Group title={`Bijai ${SOON_DAYS} din me`} items={sowingSoon.map(card)} />}
              </div>
            )
        ) : view === 'calendar' ? <YearCalendar rows={active} onOpen={setOpen} />
          : (
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {(view === 'off' ? off : active).length === 0 ? <Empty canManage={canManage && view === 'all'} onNew={() => setForm('new')} text={view === 'off' ? 'Koi band plan nahi' : 'Abhi koi plan nahi'} /> : (
                <Table minWidth="48rem">
                  <THead><Tr><Th>Fasal</Th><Th>Bijai</Th><Th>Katai</Th><Th>Maal</Th><Th>Agli bijai</Th></Tr></THead>
                  <TBody>{(view === 'off' ? off : active).map(({ p, w, r }) => (
                    <Tr key={p.id} interactive onClick={() => setOpen(p)}>
                      <Td><p className="font-semibold text-slate-900">{p.cropName}</p><p className="text-[0.75rem] text-slate-500">{seasonLabel(p.season)} {p.year}</p></Td>
                      <Td className="text-[0.8125rem] text-slate-600">{shortDate(p.sowingStart)} – {shortDate(p.sowingEnd)}</Td>
                      <Td className="text-[0.8125rem] text-slate-600">{shortDate(p.harvestStart)} – {shortDate(p.harvestEnd)}</Td>
                      <Td className="text-[0.8125rem]">{r.lines.length ? <span className={r.short ? 'font-semibold text-rose-700' : 'text-slate-600'}>{r.lines.length} cheez{r.short ? ` · ${r.short} khatam` : ''}</span> : <span className="text-slate-400">—</span>}</Td>
                      <Td className="text-[0.8125rem] text-slate-600">{w.now ? <span className="font-semibold text-emerald-700">Abhi</span> : dayPhrase(w.toSow)}</Td>
                    </Tr>
                  ))}</TBody>
                </Table>
              )}
            </section>
          )}

      {open && !form && (() => {
        const x = rows.find((y) => y.p.id === open.id) ?? { p: open, w: cycle(open), r: readiness(open, stockBy) };
        return (
          <Modal open onClose={() => setOpen(null)} size="lg" title={`${x.p.cropName} — ${seasonLabel(x.p.season)} ${x.p.year}`}
            description={x.p.isActive ? (x.w.now ? 'Bijai abhi chal rahi hai' : `Agli bijai ${dayPhrase(x.w.toSow)}`) : 'Band plan'}
            footer={<>
              <span className="mr-auto"><PrintButton doc={() => planDoc(x.p, x.r)} label="Print" /></span>
              {canManage && <Button variant="ghost" loading={toggle.isPending} onClick={() => toggle.mutate(x.p)} leftIcon={<Power className="h-4 w-4" />}>{x.p.isActive ? 'Band karein' : 'Dobara chalu'}</Button>}
              {canManage && <Button variant="secondary" onClick={() => setForm(x.p)} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>}
            </>}>
            <PlanDetail plan={x.p} r={x.r} />
          </Modal>
        );
      })()}
      {form && <PlanForm editing={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); setOpen(null); qc.invalidateQueries({ queryKey: [KEY] }); }} />}
    </PageShell>
  );
}

function Group({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <section>
      <h3 className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">{items}</div>
    </section>
  );
}

function Empty({ text, canManage, onNew }: { text: string; canManage: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200/80">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-50 text-lime-700"><CalendarRange className="h-7 w-7" /></span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{text}</h3>
      <p className="mt-1 text-[0.875rem] text-slate-500">Har fasal ki bijai aur katai ki dates likhein — bijai se pehle yaad dihani milegi.</p>
      {canManage && <Button className="mt-4" onClick={onNew} leftIcon={<Plus className="h-4 w-4" />}>Naya plan</Button>}
    </div>
  );
}

function PlanCard({ plan: p, w, r, onOpen }: { plan: SeasonalPlan; w: ReturnType<typeof cycle>; r: Readiness; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:ring-brand-300">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-50 text-lime-700"><Tractor className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-slate-900">{p.cropName} <span className="font-normal text-slate-500">· {seasonLabel(p.season)}</span></p>
          <p className="text-[0.75rem] text-slate-500">Bijai {w.start.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} – {w.end.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
        </div>
        <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', w.now ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-sky-50 text-sky-800 ring-sky-200')}>{w.now ? 'Abhi' : dayPhrase(w.toSow)}</span>
      </div>
      {r.lines.length === 0 ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-800">Fi acre maal nahi likha — plan kholein aur jorein</p>
      ) : (
        <ul className="mt-3 space-y-1 text-[0.8125rem]">{r.lines.slice(0, 4).map((l) => (
          <li key={l.name} className="flex items-center justify-between gap-2">
            <span className="truncate text-slate-700">{l.name}</span>
            <span className={cn('shrink-0 tabular-nums', l.stock !== null && l.stock <= 0 ? 'font-semibold text-rose-700' : 'text-slate-500')}>
              {l.stock === null ? 'catalog me nahi' : l.stock <= 0 ? 'khatam' : l.acres !== null ? `${l.acres} acre ka` : `${qty(l.stock)} ${l.unit}`}
            </span>
          </li>
        ))}</ul>
      )}
    </button>
  );
}

function PlanDetail({ plan: p, r }: { plan: SeasonalPlan; r: Readiness }) {
  const steps = planSteps(p.applicationSchedule);
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <div><dt className="text-[0.75rem] text-slate-500">Bijai</dt><dd className="text-[0.875rem] font-medium">{shortDate(p.sowingStart)} – {shortDate(p.sowingEnd)}</dd></div>
        <div><dt className="text-[0.75rem] text-slate-500">Katai</dt><dd className="text-[0.875rem] font-medium">{shortDate(p.harvestStart)} – {shortDate(p.harvestEnd)}</dd></div>
      </dl>
      <div>
        <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Fi acre maal aur stock</h4>
        {r.lines.length === 0 ? <p className="text-[0.8125rem] text-slate-500">Abhi kuch nahi likha</p> : (
          <Table>
            <THead><Tr><Th>Cheez</Th><Th align="right">Fi acre</Th><Th align="right">Stock</Th><Th align="right">Kitne acre ka</Th></Tr></THead>
            <TBody>{r.lines.map((l) => (
              <Tr key={l.name}>
                <Td>{l.name}</Td>
                <Td align="right">{l.perAcre ? `${qty(l.perAcre)} ${l.unit}` : '—'}</Td>
                <Td align="right" className={l.stock !== null && l.stock <= 0 ? 'font-semibold text-rose-700' : ''}>{l.stock === null ? '—' : `${qty(l.stock)} ${l.unit}`}</Td>
                <Td align="right" className="font-semibold">{l.acres ?? '—'}</Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </div>
      {steps.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Bijai ke baad</h4>
          <ol className="space-y-1 text-[0.875rem]">{steps.map((s, i) => (
            <li key={i} className="flex gap-2"><span className="w-16 shrink-0 font-semibold tabular-nums text-lime-700">Din {s.day}</span><span className="text-slate-700">{s.what}</span></li>
          ))}</ol>
        </div>
      )}
    </div>
  );
}

/** Twelve months with each crop's sowing (green) and harvest (amber) bands. */
function YearCalendar({ rows, onOpen }: { rows: Array<{ p: SeasonalPlan }>; onOpen: (p: SeasonalPlan) => void }) {
  if (!rows.length) return <Empty text="Abhi koi plan nahi" canManage={false} onNew={() => undefined} />;
  const pos = (iso: string) => { const d = new Date(iso); return (d.getMonth() + (d.getDate() - 1) / 31) / 12; };
  const pieces = (from: string, to: string) => {
    const a = pos(from); const b = pos(to);
    const wraps = new Date(to).getTime() - new Date(from).getTime() > 0 && b < a;
    return wraps ? [[a, 1], [0, b]] : [[a, Math.max(b, a + 0.01)]];
  };
  const nowAt = pos(new Date().toISOString());
  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="min-w-[40rem]">
        <div className="ml-28 grid grid-cols-12 text-center text-[0.6875rem] font-semibold text-slate-500">{MONTHS.map((m) => <span key={m}>{m}</span>)}</div>
        <ul className="mt-2 space-y-1.5">{rows.map(({ p }) => (
          <li key={p.id} className="flex items-center gap-2">
            <button type="button" onClick={() => onOpen(p)} className="shrink-0 truncate text-left text-[0.8125rem] font-medium text-slate-800 hover:underline" style={{ width: '6.5rem' }}>{p.cropName}</button>
            <div className="relative h-6 flex-1 rounded-md bg-slate-50">
              {pieces(p.sowingStart, p.sowingEnd).map(([a, b], i) => <span key={`s${i}`} className="absolute top-0.5 h-2.5 rounded bg-lime-500" style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }} />)}
              {pieces(p.harvestStart, p.harvestEnd).map(([a, b], i) => <span key={`h${i}`} className="absolute bottom-0.5 h-2.5 rounded bg-amber-400" style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }} />)}
              <span className="absolute inset-y-0 w-px bg-rose-500" style={{ left: `${nowAt * 100}%` }} />
            </div>
          </li>
        ))}</ul>
        <p className="mt-3 flex gap-4 text-[0.75rem] text-slate-500"><span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-lime-500" />Bijai</span><span className="inline-flex items-center gap-1"><span className="h-2 w-4 rounded bg-amber-400" />Katai</span><span className="inline-flex items-center gap-1"><span className="h-3 w-px bg-rose-500" />Aaj</span></p>
      </div>
    </section>
  );
}

interface Draft {
  cropName: string; season: string; year: string; sowingStart: string; sowingEnd: string; harvestStart: string; harvestEnd: string;
  products: Array<{ productId?: string; name: string; perAcre: string; unit: string }>; steps: Array<{ day: string; what: string }>;
}

function PlanForm({ editing, onClose, onSaved }: { editing: SeasonalPlan | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => ({
    cropName: editing?.cropName ?? '', season: editing?.season ?? 'RABI', year: String(editing?.year ?? new Date().getFullYear()),
    sowingStart: isoDay(editing?.sowingStart), sowingEnd: isoDay(editing?.sowingEnd),
    harvestStart: isoDay(editing?.harvestStart), harvestEnd: isoDay(editing?.harvestEnd),
    products: planProducts(editing?.recommendedProducts).map((p) => ({ productId: p.productId, name: p.name, perAcre: p.perAcre ? String(p.perAcre) : '', unit: p.unit })),
    steps: planSteps(editing?.applicationSchedule).map((s) => ({ day: String(s.day), what: s.what })),
  }));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!d.cropName.trim()) e.cropName = 'Fasal ka naam likhein';
    const y = Number(d.year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) e.year = 'Saal sahi likhein';
    for (const k of ['sowingStart', 'sowingEnd', 'harvestStart', 'harvestEnd'] as const) if (!d[k]) e[k] = 'Date chunein';
    if (d.sowingStart && d.sowingEnd && d.sowingEnd < d.sowingStart) e.sowingEnd = 'Shuru se pehle nahi ho sakta';
    if (d.harvestStart && d.harvestEnd && d.harvestEnd < d.harvestStart) e.harvestEnd = 'Shuru se pehle nahi ho sakta';
    if (d.sowingStart && d.harvestStart && d.harvestStart < d.sowingStart) e.harvestStart = 'Katai bijai se pehle nahi ho sakti';
    if (d.products.some((p) => p.perAcre && !(Number(p.perAcre) > 0))) e.products = 'Fi acre miqdaar 0 se zyada likhein';
    if (d.steps.some((s) => s.what.trim() && !(Number(s.day) >= 0))) e.steps = 'Din sahi likhein';
    return e;
  }, [d]);
  const show = (k: string) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const body: PlanInput = {
        cropName: d.cropName.trim(), season: d.season, year: Number(d.year),
        sowingStart: d.sowingStart, sowingEnd: d.sowingEnd, harvestStart: d.harvestStart, harvestEnd: d.harvestEnd,
        recommendedProducts: d.products.map((p) => ({ productId: p.productId, name: p.name, perAcre: Number(p.perAcre) || 0, unit: p.unit })),
        applicationSchedule: d.steps.filter((s) => s.what.trim()).map((s) => ({ day: Number(s.day) || 0, what: s.what.trim() })),
      };
      return editing ? seasonalPlansApi.update(editing.id, body) : seasonalPlansApi.create(body);
    },
    onSuccess: () => { toast.success(editing ? 'Plan badal gaya' : 'Plan ban gaya'); onSaved(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (!save.isPending) save.mutate();
  };
  useSaveKey(submit);

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false} title={editing ? `${editing.cropName} — badlein` : 'Naya fasal plan'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Fasal" required list="agri-plan-crops" value={d.cropName} onChange={(e) => set('cropName', e.target.value)} placeholder="Gandum" error={show('cropName')} hint="Ek season aur saal me ek plan" data-autofocus />
          <datalist id="agri-plan-crops">{CROPS.map((x) => <option key={x} value={x} />)}</datalist>
          <Select label="Season" value={d.season} onChange={(e) => set('season', e.target.value)} options={SEASONS.map((v) => ({ value: v, label: SEASON_LABEL[v] }))} hint="Rabi: Oct–Mar · Kharif: Apr–Sep" />
          <Input label="Saal" inputMode="numeric" value={d.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))} error={show('year')} />
          <Input label="Bijai shuru" type="date" value={d.sowingStart} onChange={(e) => set('sowingStart', e.target.value)} error={show('sowingStart')} />
          <Input label="Bijai khatam" type="date" value={d.sowingEnd} onChange={(e) => set('sowingEnd', e.target.value)} error={show('sowingEnd')} />
          <span className="hidden sm:block" />
          <Input label="Katai shuru" type="date" value={d.harvestStart} onChange={(e) => set('harvestStart', e.target.value)} error={show('harvestStart')} hint="Udhaar ki wapsi isi ke baad" />
          <Input label="Katai khatam" type="date" value={d.harvestEnd} onChange={(e) => set('harvestEnd', e.target.value)} error={show('harvestEnd')} />
        </div>

        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Fi acre maal</span>
          <ProductPick onPick={(i) => { if (!d.products.some((p) => p.productId === i.id)) set('products', [...d.products, { productId: i.id, name: i.name, perAcre: '', unit: i.unit }]); }} />
          {d.products.length > 0 && (
            <ul className="mt-2 space-y-1.5">{d.products.map((p, n) => (
              <li key={p.productId ?? p.name} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-slate-800">{p.name}</span>
                <input inputMode="decimal" value={p.perAcre} placeholder="Fi acre" aria-label={`${p.name} fi acre`}
                  onChange={(e) => set('products', d.products.map((x, i) => (i === n ? { ...x, perAcre: e.target.value.replace(/[^\d.]/g, '') } : x)))}
                  className="h-9 w-24 rounded-lg border border-slate-300 px-2 text-right text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                <span className="w-12 text-[0.75rem] text-slate-500">{p.unit}</span>
                <button type="button" aria-label={`${p.name} hatayein`} onClick={() => set('products', d.products.filter((_, i) => i !== n))} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
              </li>
            ))}</ul>
          )}
          {show('products') ? <p className="mt-1 text-[0.75rem] font-medium text-rose-600">{show('products')}</p> : <p className="mt-1 text-[0.75rem] text-slate-500">Miqdaar product ki unit me — stock se kitne acre ka maal hai, isi se nikalta hai</p>}
        </div>

        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Bijai ke baad kya karna hai</span>
          <ul className="space-y-1.5">{d.steps.map((s, n) => (
            <li key={n} className="flex items-center gap-2">
              <input inputMode="numeric" value={s.day} placeholder="Din" aria-label="Bijai ke kitne din baad"
                onChange={(e) => set('steps', d.steps.map((x, i) => (i === n ? { ...x, day: e.target.value.replace(/\D/g, '') } : x)))}
                className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-right text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              <input value={s.what} placeholder="Pehla paani + Urea 1 bori" aria-label="Kya karna hai"
                onChange={(e) => set('steps', d.steps.map((x, i) => (i === n ? { ...x, what: e.target.value } : x)))}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              <button type="button" aria-label="Line hatayein" onClick={() => set('steps', d.steps.filter((_, i) => i !== n))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </li>
          ))}</ul>
          <Button variant="ghost" size="sm" className="mt-1.5" onClick={() => set('steps', [...d.steps, { day: '', what: '' }])} leftIcon={<Plus className="h-4 w-4" />}>Line jorein</Button>
          {show('steps') && <p className="mt-1 text-[0.75rem] font-medium text-rose-600">{show('steps')}</p>}
        </div>
        {editing && !editing.isActive && <p className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600"><CheckCircle2 className="h-4 w-4" />Ye plan band hai — save ke baad bhi band rahega</p>}
      </div>
    </Modal>
  );
}
