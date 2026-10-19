/**
 * Customers' measurements (naap): search by name or phone, see the main
 * numbers at a glance, change or print a card, and start a stitching order
 * from it. One customer can keep several records (own kameez, child's
 * frock); one is the main one new orders pick.
 *
 * Keys: N new · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Pencil, Plus, Printer, Ruler, Scissors, Star, Trash2, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { measurementsApi, type MeasurementProfile } from '../api/measurements.api';
import { EmptyList, LoadFailed, Pager } from '../components/charts';
import { MeasurementModal } from '../components/MeasurementModal';
import { GENDERS, MEASURE_KEY, apiError, dayFull, genderLabel } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { measureLines, printMeasureSlip } from '../components/slips';

export default function MeasurementsPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { customers: canEdit, manage } = useGarmentsCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ profile: MeasurementProfile | null } | null>(null);
  const [removeOn, setRemoveOn] = useState<MeasurementProfile | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [query, gender]);
  const q = { page, limit: 30, search: query || undefined, gender: gender || undefined };
  const listQ = useQuery({ queryKey: [MEASURE_KEY, 'page', q], queryFn: () => measurementsApi.page(q), placeholderData: (p) => p });
  const remove = useMutation({
    mutationFn: (m: MeasurementProfile) => measurementsApi.remove(m.id),
    onSuccess: () => { toast.success('Naap hata diya'); setRemoveOn(null); qc.invalidateQueries({ queryKey: [MEASURE_KEY] }); },
    onError: (e) => toast.error(apiError(e, 'Naap nahi hata')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm({ profile: null }); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const data = listQ.data;
  const rows = data?.items ?? [];
  const filtered = !!query || !!gender;
  return (
    <PageShell>
      <PageHero title="Naap" chip={<><Ruler /> Measurements</>} meta="Har customer ka naap ek jagah — silai order me khud aata hai"
        busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        actions={<>
          <Link to="/garments/tailoring" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Silai orders</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm({ profile: null })} title="Naya naap (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya naap</button>}
        </>}
        stats={[
          { label: 'Naap', value: data?.total ?? '—' },
          { label: 'Customers', value: data?.stats.customers ?? '—' },
          { label: 'Pichle 30 din', value: data?.stats.recent ?? '—', hint: 'naye ya badle' },
        ]}
      />
      <KpiRow cols={3}>
        {!data ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Ruler} color="#7c3aed" label="Kul naap" value={data.total} hint={filtered ? 'Is filter me' : 'Sab'} />
          <KpiCard icon={Users} color="#2563eb" label="Customers" value={data.stats.customers} hint="Jin ka naap save hai" />
          <KpiCard icon={Star} color="#16a34a" label="Pichle 30 din" value={data.stats.recent} hint="Naye ya badle gaye" />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer ka naam ya phone, naap ka naam…" />}
        chips={filtered ? <>
          {gender && <FilterChip onRemove={() => setGender('')}>{genderLabel(gender)}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined} onClear={() => { setSearch(''); setGender(''); }}>
        <FilterMenu icon={Users} label={gender ? genderLabel(gender) : 'Sab'} value={gender} active={!!gender} onChange={setGender}
          options={[{ value: '', label: 'Sab' }, ...GENDERS.map((g) => ({ value: g.value, label: g.label }))]} />
      </FilterBar>
      <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
        : listQ.isError && !data ? <LoadFailed what="Naap" retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={Ruler} title={filtered ? 'Kuch nahi mila' : 'Abhi koi naap nahi'} text="Pehli dafa aane wale customer ka naap save karein — agli dafa sirf naam ya phone se mil jayega.">
              {canEdit && <Button onClick={() => setForm({ profile: null })} leftIcon={<Plus className="h-4 w-4" />}>Naya naap</Button>}
            </EmptyList>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((m) => {
                const lines = measureLines(m);
                return (
                  <article key={m.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{m.customer?.name ?? 'Customer'}</p>
                        <p className="text-[0.75rem] text-slate-500">{m.customer?.phone ?? '—'}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-violet-700 ring-1 ring-violet-200">{m.profileName}{m.isDefault ? ' ★' : ''}</span>
                    </div>
                    <div className="mt-2 flex-1 space-y-0.5 text-[0.8125rem] text-slate-700">{lines.slice(0, 4).map((l) => <p key={l} className="truncate">{l}</p>)}{lines.length > 4 && <p className="text-[0.75rem] text-slate-500">+ aur</p>}</div>
                    <p className="mt-2 text-[0.6875rem] text-slate-400">{m.unit === 'CM' ? 'cm' : 'inch'} · {dayFull(m.measuredAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                      {manage && <Link to={`/garments/tailoring/new?customer=${m.customerId}&naap=${m.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-[0.8125rem] font-semibold text-white hover:bg-brand-700"><Scissors className="h-4 w-4" />Silai order</Link>}
                      <Button size="sm" variant="secondary" onClick={() => printMeasureSlip(m, shopName)} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
                      {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm({ profile: m })} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>}
                      {canEdit && <Button size="sm" variant="ghost" className="ml-auto text-rose-700" onClick={() => setRemoveOn(m)} aria-label="Hatayein"><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {form && <MeasurementModal profile={form.profile} onClose={() => setForm(null)} />}
      {removeOn && (
        <Modal open onClose={() => setRemoveOn(null)} size="sm" title="Naap hatayein?" description={`${removeOn.customer?.name ?? ''} · ${removeOn.profileName}`}
          footer={<><Button variant="secondary" onClick={() => setRemoveOn(null)}>Rehne dein</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(removeOn)}>Haan, hatayein</Button></>}>
          <p className="text-[0.875rem] text-slate-600">List se hat jayega. Purane silai orders me naap ki copy waisi hi rahegi.</p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Naap — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#7c3aed', title: 'Naya naap', text: 'Customer chunein ya naya naam likhein, phir inch ya cm me naap. Jo nahi liya woh khali chhorein.' },
            { icon: Star, color: '#16a34a', title: 'Main naap', text: 'Ek customer ke kai naap ho sakte hain. ★ wala naya silai order me khud chuna jata hai.' },
            { icon: Scissors, color: '#db2777', title: 'Silai order', text: '"Silai order" se isi naap ke saath naya order shuru hota hai.' },
            { icon: Printer, color: '#ea580c', title: 'Print', text: 'Naap ka card karigar ke liye print karein.' },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]} />
      )}
    </PageShell>
  );
}
