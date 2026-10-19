/**
 * Kitchen stations: grill, tandoor, karahi, chinese, bar. Each station takes
 * whole menu categories, so every dish's KOT goes to the station (and its
 * printer or screen) of its category. Categories on no station go to the
 * first station, so no order is lost; the page shows them so they can be
 * placed. A station is switched off, not deleted, so old KOTs keep its name.
 *
 * Keys: N new station · G guide · Ctrl+S save in the form.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Flame, FolderTree, GraduationCap, Monitor, Pencil, Plus, Printer, Trash2, UtensilsCrossed } from 'lucide-react';
import { Button, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide, type GuideStep } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { stationsApi, type StationInput, type StationRouting } from '../api/stations.api';

type Station = StationRouting['stations'][number];
const KEY = 'restaurant-station-routing';
const PRESETS = [
  { name: 'Grill / BBQ', code: 'BBQ' }, { name: 'Tandoor', code: 'TND' }, { name: 'Karahi', code: 'KRH' },
  { name: 'Chinese', code: 'CHN' }, { name: 'Fast food', code: 'FF' }, { name: 'Bar / Drinks', code: 'BAR' }, { name: 'Dessert', code: 'DST' },
];
const errText = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

export default function StationsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.RESTAURANT_KITCHEN_MANAGE);
  const [editing, setEditing] = useState<Station | StationInput | null>(null);
  const [removing, setRemoving] = useState<Station | null>(null);

  const q = useQuery({ queryKey: [KEY], queryFn: () => stationsApi.routing() });
  const data = q.data;
  const refresh = () => [KEY, 'restaurant-stations'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const place = useMutation({
    mutationFn: ({ station, categoryId }: { station: Station; categoryId: string }) => stationsApi.update(station.id, { categoryIds: [...station.categoryIds, categoryId] }),
    onSuccess: (s) => { toast.success(`${s.name} par laga di`); refresh(); },
    onError: (e) => toast.error(errText(e, 'Nahi lagi')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => stationsApi.remove(id),
    onSuccess: () => { toast.success('Station band — is ki categories ab pehle station par jayengi'); setRemoving(null); refresh(); },
    onError: (e) => toast.error(errText(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key.toLowerCase() === 'n' && canManage) { e.preventDefault(); setEditing({ name: '', code: '', printerName: '', categoryIds: [] }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const stations = data?.stations ?? [];
  const categories = data?.categories ?? [];
  // Categories without dishes (raw material) need no station.
  const menuCats = categories.filter((c) => c.dishes > 0 || c.stationId);
  const loose = menuCats.filter((c) => !c.stationId);
  const looseDishes = loose.reduce((s, c) => s + c.dishes, 0) + (data?.uncategorisedDishes ?? 0);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <PageShell>
      {guide.isOpen && <PageGuide title="Kitchen stations — aasaan tareeqa" steps={GUIDE} onClose={guide.close}
        tips={['Chhoti kitchen me ek hi station kaafi hai — sab KOT wahin.', 'Printer ka naam wohi likhein jo computer me printer ka naam hai, taake us station ki parchi wahin nikle.']}
        shortcuts={[['N', 'naya station'], ['G', 'guide']]} />}
      {editing && <StationForm initial={editing} stations={stations} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {removing && (
        <Modal open size="sm" onClose={() => setRemoving(null)} title={`"${removing.name}" band karein?`}
          footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>Rehne dein</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(removing.id)}>Band karein</Button></>}>
          <p className="text-[0.875rem] text-slate-600">Is ki {removing.categoryIds.length} category kisi station par nahi rahengi aur un ke KOT pehle station par jayenge. Purane KOT par station ka naam rahega.</p>
        </Modal>
      )}

      <PageHero title="Kitchen stations" chip={<><Flame />{stations.length} station</>} meta="Kaunsi dish kis kitchen / printer par" busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing({ name: '', code: '', printerName: '', categoryIds: [] })} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya station</button>}
        </>}
        stats={[
          { label: 'Stations', value: String(stations.length) },
          { label: 'Menu category station par', value: `${menuCats.length - loose.length} / ${menuCats.length}` },
          { label: 'Bina station dishes', value: String(looseDishes), hint: data?.fallback ? `→ ${data.fallback.name}` : undefined },
        ]} />

      <KpiRow cols={3}>
        {q.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Printer} color="#2563eb" label="Printer wale" value={String(stations.filter((s) => s.printerName).length)} hint="Apni parchi nikalti hai" />
            <KpiCard icon={FolderTree} color="#d97706" label="Category bina station" value={String(loose.length)} hint={loose.length ? 'Neeche lagayein' : 'Sab lagi hain'} />
            <KpiCard icon={UtensilsCrossed} color="#16a34a" label="Dishes station par" value={String(stations.reduce((s, x) => s + x.dishes, 0))} />
          </>
        )}
      </KpiRow>

      {!q.isLoading && !stations.length && (
        <div className="rounded-3xl bg-white p-6 text-center ring-1 ring-slate-200/80">
          <Flame className="mx-auto h-8 w-8 text-orange-500" />
          <p className="mt-2 font-semibold text-slate-900">Abhi koi station nahi</p>
          <p className="mx-auto mt-1 max-w-lg text-[0.875rem] text-slate-500">Station ke bagair saare KOT ek jagah jate hain. BBQ, tandoor aur chinese alag hon to har ek ka station banayein aur us ki categories lagayein.</p>
          {canManage && <div className="mt-4 flex flex-wrap justify-center gap-2">{PRESETS.map((p) => <Button key={p.code} size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...p, printerName: '', categoryIds: [] })}>{p.name}</Button>)}</div>}
        </div>
      )}

      {loose.length > 0 && stations.length > 0 && (
        <section className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" />{loose.length} category kisi station par nahi — in ke KOT {data?.fallback?.name ?? 'pehle station'} par ja rahe hain</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {loose.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-amber-200">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-900">{c.name} <span className="text-slate-500">· {c.dishes} dish</span></span>
                {canManage && (
                  <select aria-label={`${c.name} ka station`} defaultValue="" disabled={place.isPending}
                    onChange={(e) => { const s = stations.find((x) => x.id === e.target.value); if (s) place.mutate({ station: s, categoryId: c.id }); }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.75rem]">
                    <option value="" disabled>Station…</option>
                    {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {q.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stations.map((s, idx) => (
            <article key={s.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <header className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[0.75rem] font-bold text-orange-700">{s.code || s.name.slice(0, 3).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[1rem] font-bold text-slate-900">{s.name}</h3>
                  <p className="flex items-center gap-1 text-[0.75rem] text-slate-500">
                    {s.printerName ? <><Printer className="h-3.5 w-3.5" />{s.printerName}</> : <><Monitor className="h-3.5 w-3.5" />Kitchen screen</>}
                    {idx === 0 && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-600">Bina station wale bhi yahan</span>}
                  </p>
                </div>
              </header>
              <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                {s.categoryIds.map((id) => {
                  const c = catById.get(id);
                  return <span key={id} className="rounded-md px-2 py-0.5 text-[0.75rem] font-semibold" style={{ backgroundColor: `${c?.color ?? '#94a3b8'}1a`, color: c?.color ?? '#475569' }}>{c?.name ?? 'Category hat gayi'}</span>;
                })}
                {!s.categoryIds.length && <span className="text-[0.8125rem] text-slate-500">Koi category nahi</span>}
              </div>
              <p className="mt-3 text-[0.75rem] text-slate-500">{s.dishes} dish is station par</p>
              {canManage && (
                <footer className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(s)}>Badlein</Button>
                  <button type="button" onClick={() => setRemoving(s)} aria-label="Band karein" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}

      {stations.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-slate-500">
          Order → KOT → har station ki apni parchi / screen. <Link to="/restaurant/kot" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Kitchen screen<ArrowRight className="h-3.5 w-3.5" /></Link>
        </p>
      )}
    </PageShell>
  );
}

function StationForm({ initial, stations, categories, onClose, onSaved }: {
  initial: Station | StationInput; stations: Station[]; categories: StationRouting['categories']; onClose: () => void; onSaved: () => void;
}) {
  const id = 'id' in initial ? initial.id : null;
  const [f, setF] = useState({ name: initial.name ?? '', code: initial.code ?? '', printerName: initial.printerName ?? '', categoryIds: initial.categoryIds ?? [] });
  const [tried, setTried] = useState(false);
  const owner = new Map<string, string>();
  for (const s of stations) if (s.id !== id) for (const c of s.categoryIds) owner.set(c, s.name);
  const dup = stations.some((s) => s.id !== id && s.name.trim().toLowerCase() === f.name.trim().toLowerCase());
  const problem = !f.name.trim() ? 'Station ka naam likhein' : dup ? 'Is naam ka station pehle se hai' : null;

  const save = useMutation({
    mutationFn: () => {
      const body = { name: f.name.trim(), code: f.code.trim().toUpperCase(), printerName: f.printerName.trim(), categoryIds: f.categoryIds };
      return id ? stationsApi.update(id, body) : stationsApi.create(body);
    },
    onSuccess: () => { toast.success(id ? 'Station save' : 'Station ban gaya'); onSaved(); },
    onError: (e) => toast.error(errText(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!problem && !save.isPending) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const flip = (c: string) => setF((x) => ({ ...x, categoryIds: x.categoryIds.includes(c) ? x.categoryIds.filter((y) => y !== c) : [...x.categoryIds, c] }));

  return (
    <Modal open onClose={onClose} size="lg" title={id ? `${initial.name} badlein` : 'Naya station'} description="Station ki categories ke saare KOT isi par jayenge"
      footer={<>
        {tried && problem ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problem}</p> : <span className="mr-auto hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit}>{id ? 'Save karein' : 'Station banayein'}</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Naam" required autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value.slice(0, 40) })} placeholder="Grill / BBQ" error={tried && problem && !f.name.trim() ? problem : dup ? 'Pehle se hai' : undefined} wrapperClassName="sm:col-span-2" />
          <Input label="Chhota code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.slice(0, 8).toUpperCase() })} placeholder="BBQ" hint="KOT par chhapta hai" />
        </div>
        <Input label="Printer ka naam" value={f.printerName} onChange={(e) => setF({ ...f, printerName: e.target.value.slice(0, 80) })} placeholder="Maslan: KITCHEN-80" leftIcon={<Printer className="h-4 w-4" />}
          hint="Khali = kitchen screen par dikhega. Computer me printer ka jo naam hai wohi likhein." />
        {!id && <div className="flex flex-wrap gap-1.5">{PRESETS.filter((p) => !stations.some((s) => s.name.toLowerCase() === p.name.toLowerCase())).map((p) => (
          <button key={p.code} type="button" onClick={() => setF({ ...f, name: p.name, code: p.code })} className="h-7 rounded-full bg-slate-100 px-2.5 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{p.name}</button>
        ))}</div>}
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Categories <span className="font-normal text-slate-500">· ek category ek hi station par</span></span>
          {!categories.length ? <p className="text-[0.8125rem] text-slate-500">Pehle menu ki categories banayein (BBQ, Karahi, Drinks).</p> : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {categories.map((c) => {
                const other = owner.get(c.id);
                const on = f.categoryIds.includes(c.id);
                return (
                  <li key={c.id}>
                    <label className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-[0.8125rem]', other ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' : on ? 'cursor-pointer border-brand-400 bg-brand-50/60' : 'cursor-pointer border-slate-200 hover:bg-slate-50')}>
                      <input type="checkbox" checked={on} disabled={!!other} onChange={() => flip(c.id)} className="h-4 w-4 rounded border-slate-300" />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      <span className="text-[0.6875rem]">{other ? other : `${c.dishes} dish`}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

const GUIDE: GuideStep[] = [
  { icon: Flame, color: '#ea580c', title: 'Station banayein', text: 'Har alag kitchen counter ka station: BBQ, tandoor, chinese, drinks. Chhoti kitchen me ek hi kaafi hai.' },
  { icon: FolderTree, color: '#d97706', title: 'Categories lagayein', text: 'Station par menu ki categories lagayein — us category ki har dish ka KOT wahin jata hai. Nayi dish khud sahi station par jati hai.' },
  { icon: Printer, color: '#2563eb', title: 'Printer ya screen', text: 'Printer ka naam likhein to parchi wahin nikalti hai; khali ho to kitchen screen par dikhta hai.' },
  { icon: AlertTriangle, color: '#e11d48', title: 'Bina station', text: 'Jo category kisi station par nahi, us ke KOT pehle station par jate hain — order kabhi gum nahi hota. Peeli patti se jaldi laga dein.' },
];
