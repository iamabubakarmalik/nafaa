/**
 * The shop's service rate list: every service with its visit and work
 * charge, time, warranty and how often it is done. Each service also sells
 * at the counter (POS) as a service line without stock.
 *
 * Keys: N new service · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Briefcase, Clock, Download, Filter, GraduationCap, ListChecks, Package, Plus, Power, ShieldCheck, ShoppingCart, Star, Tag, Wrench, Zap } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, TBody, THead, Table, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { catalogApi, type ServiceCatalogItem } from '../api/catalog.api';
import { CATALOG_KEY, CATEGORIES, apiError, categoryOf } from '../components/meta';

type Show = 'active' | 'off' | 'all';
const price = (s: ServiceCatalogItem) => s.baseCharge || s.hourlyRate || 0;

export default function CatalogPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canDelete = usePermission(PERMISSIONS.PRODUCTS_DELETE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [show, setShow] = useState<Show>('active');

  const listQ = useQuery({ queryKey: [CATALOG_KEY, 'all'], queryFn: () => catalogApi.list() });
  const all = listQ.data ?? [];
  const rows = useMemo(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((s) => (show === 'all' || (show === 'active' ? s.isActive : !s.isActive)) && (!category || s.category === category)
      && words.every((w) => `${s.name} ${s.code ?? ''} ${categoryOf(s.category)}`.toLowerCase().includes(w)));
  }, [all, search, category, show]);
  const active = all.filter((s) => s.isActive);
  const top = [...active].sort((a, b) => b.totalJobs - a.totalJobs)[0];
  const avg = active.length ? active.reduce((t, s) => t + price(s) + s.visitCharge, 0) / active.length : 0;

  const toggle = useMutation({
    mutationFn: (s: ServiceCatalogItem) => (s.isActive ? catalogApi.remove(s.id) : catalogApi.update(s.id, { name: s.name, isActive: true })),
    onSuccess: (_r, s) => { toast.success(s.isActive ? `${s.name} band — counter par nahi dikhegi` : `${s.name} chaalu`); [CATALOG_KEY, 'products-catalog', 'products-for-pos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const sync = useMutation({
    mutationFn: () => catalogApi.syncProducts(),
    onSuccess: (r) => { toast.success(r.created ? `${r.created} services counter par aa gayin` : 'Sab services pehle se counter par hain'); qc.invalidateQueries({ queryKey: ['products-for-pos'] }); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canCreate) { e.preventDefault(); navigate('/services-biz-services/new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCreate, navigate]);

  const printDoc = (): PrintDoc => ({
    title: 'Rate list',
    subtitle: `${rows.length} services`,
    sections: [{
      kind: 'table',
      columns: [{ label: 'Service' }, { label: 'Kis tarah', wideOnly: true }, { label: 'Visit', align: 'right' }, { label: 'Kaam', align: 'right' }, { label: 'Waqt', wideOnly: true }, { label: 'Warranty', wideOnly: true }],
      rows: rows.map((s) => [s.name, categoryOf(s.category), sales(s.visitCharge), sales(price(s)), `${s.estimatedDurationMin} min`, s.warrantyDays ? `${s.warrantyDays} din` : '—']),
    }],
  });
  const exportCsv = () => downloadCsv('rate-list.csv', [
    ['Service', 'Code', 'Kis tarah', 'Visit', 'Kaam', 'Ghanta rate', 'Kam se kam', 'Zyada se zyada', 'Emergency', 'Waqt (min)', 'Warranty (din)', 'Jobs', 'Kamai', 'Chaalu'],
    ...rows.map((s) => [s.name, s.code ?? '', categoryOf(s.category), s.visitCharge, s.baseCharge, s.hourlyRate, s.minCharge, s.maxCharge ?? '', s.emergencyCharge, s.estimatedDurationMin, s.warrantyDays, s.totalJobs, s.totalRevenue, s.isActive ? 'Haan' : 'Nahi']),
  ]);

  const filtered = !!search.trim() || !!category || show !== 'active';
  const clear = () => { setSearch(''); setCategory(''); setShow('active'); };

  return (
    <PageShell>
      <PageHero
        title="Service Catalog"
        chip={<><Tag /> Rate list</>}
        meta="Har kaam ka rate, waqt aur warranty — job aur counter dono isi se bharte hain"
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          {canCreate && <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} title="Purani services counter par laayein" className={heroButton}><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Counter se jorein</span></button>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <Link to="/services-biz-services/new" title="Nayi service (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi service</Link>}
        </>}
        stats={[
          { label: 'Chaalu services', value: active.length },
          { label: 'Sab se zyada', value: top?.name ?? '—', hint: top ? `${top.totalJobs} jobs` : undefined },
          { label: 'Ausat rate', value: sales(avg) },
        ]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Wrench} color="#0284c7" label="Chaalu" value={active.length} hint={`${all.length - active.length} band`} onClick={() => setShow('active')} active={show === 'active'} />
          <KpiCard icon={Star} color="#f59e0b" label="Popular" value={active.filter((s) => s.isPopular || s.isFeatured).length} hint="Job form me upar" />
          <KpiCard icon={Zap} color="#e11d48" label="Emergency" value={active.filter((s) => s.isEmergency).length} hint="Foran wale kaam" />
          <KpiCard icon={ShieldCheck} color="#16a34a" label="Warranty wali" value={active.filter((s) => s.warrantyDays > 0).length} hint="Bill par warranty" />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Service ka naam ya code…" label="Search" />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {category && <FilterChip onRemove={() => setCategory('')}>{categoryOf(category)}</FilterChip>}
          {show !== 'active' && <FilterChip onRemove={() => setShow('active')}>{show === 'off' ? 'Band' : 'Sab'}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={Filter} label={category ? categoryOf(category) : 'Kis tarah ka kaam'} value={category} active={!!category} onChange={setCategory}
          options={[{ value: '', label: 'Sab' }, ...CATEGORIES.map((c) => ({ value: c, label: categoryOf(c) }))]} />
        <FilterMenu icon={Power} label={show === 'active' ? 'Chaalu' : show === 'off' ? 'Band' : 'Sab'} value={show} active={show !== 'active'} onChange={setShow}
          options={[{ value: 'active' as Show, label: 'Chaalu' }, { value: 'off' as Show, label: 'Band' }, { value: 'all' as Show, label: 'Sab' }]} />
      </FilterBar>

      <ViewTabs value="list" onChange={() => undefined} hint={<>{canCreate && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search</>}
        tabs={[{ id: 'list', label: 'Services', icon: ListChecks, count: rows.length }]} />

      {listQ.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi service nahi' : 'Abhi rate list khali hai'}</p>
          <p className="mt-1 text-sm text-slate-500">AC service, gas refill, wiring, plumbing — har kaam ka rate likhein, job form khud bharega.</p>
          <div className="mt-4 flex justify-center gap-2">
            {canCreate && <Button onClick={() => navigate('/services-biz-services/new')} leftIcon={<Plus className="h-4 w-4" />}>Nayi service</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Table minWidth="48rem">
            <THead><Tr><Th>Service</Th><Th align="right">Visit</Th><Th align="right">Kaam</Th><Th>Waqt</Th><Th>Warranty</Th><Th align="right">Jobs</Th><Th align="right" /></Tr></THead>
            <TBody>
              {rows.map((s) => (
                <Tr key={s.id} className={cn(!s.isActive && 'opacity-60')}>
                  <Td>
                    <Link to={`/services-biz-services/${s.id}`} className="font-semibold text-slate-900 hover:text-brand-700 hover:underline">{s.name}</Link>
                    <span className="mt-0.5 flex flex-wrap gap-1 text-[0.75rem] text-slate-500">
                      {categoryOf(s.category)}{s.code && <span className="font-mono">· {s.code}</span>}
                      {(s.isPopular || s.isFeatured) && <span className="rounded bg-amber-50 px-1 text-amber-700">Popular</span>}
                      {s.isEmergency && <span className="rounded bg-rose-50 px-1 text-rose-700">Emergency</span>}
                      {s.requiresQuote && <span className="rounded bg-blue-50 px-1 text-blue-700">Quote pehle</span>}
                    </span>
                  </Td>
                  <Td align="right" className="tabular-nums">{s.visitCharge ? sales(s.visitCharge) : '—'}</Td>
                  <Td align="right" className="font-semibold tabular-nums text-slate-900">{s.baseCharge ? sales(s.baseCharge) : s.hourlyRate ? `${sales(s.hourlyRate)}/ghanta` : 'Andaze se'}</Td>
                  <Td><span className="inline-flex items-center gap-1 text-slate-600"><Clock className="h-3.5 w-3.5" />{s.estimatedDurationMin} min</span></Td>
                  <Td>{s.warrantyDays ? <span className="text-emerald-700">{s.warrantyDays} din</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td align="right" className="tabular-nums">{s.totalJobs}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/services-biz/jobs/new?service=${s.id}`} title="Is service ki job" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-700 hover:bg-sky-50"><Briefcase className="h-4 w-4" /></Link>
                      {canEdit && <Link to={`/services-biz-services/${s.id}/edit`} className="inline-flex h-8 items-center rounded-lg px-2 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100">Badlein</Link>}
                      {(s.isActive ? canDelete : canEdit) && (
                        <button type="button" onClick={() => toggle.mutate(s)} disabled={toggle.isPending} className={cn('inline-flex h-8 items-center rounded-lg px-2 text-[0.8125rem] font-medium', s.isActive ? 'text-rose-700 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50')}>
                          {s.isActive ? 'Band' : 'Chaalu'}
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Rate list — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Service jorein', text: 'Naam, visit charge (ghar jaane ka) aur kaam ka rate. Rate pakka na ho to "Kam se kam / zyada se zyada" likhein.' },
            { icon: Briefcase, color: '#7c3aed', title: 'Job me', text: 'Job form me service chunte hi charges, waqt aur warranty khud bhar jate hain.' },
            { icon: ShoppingCart, color: '#16a34a', title: 'Counter par', text: 'Har service POS par bhi bikti hai (stock ke baghair). Purani services counter par na dikhein to "Counter se jorein" dabayein.' },
            { icon: Power, color: '#e11d48', title: 'Band karna', text: 'Band ki hui service nayi job aur counter par nahi aati; purani jobs aur bill wese hi rehte hain.' },
          ]}
          shortcuts={[['N', 'nayi service'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
