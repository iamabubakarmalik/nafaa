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
import { t as tr } from '@core/i18n';

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
    onSuccess: (_r, s) => { toast.success(s.isActive ? tr('{{name}} band — counter par nahi dikhegi', { name: s.name }) : `${s.name} chaalu`); [CATALOG_KEY, 'products-catalog', 'products-for-pos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const sync = useMutation({
    mutationFn: () => catalogApi.syncProducts(),
    onSuccess: (r) => { toast.success(r.created ? tr('{{created}} services counter par aa gayin', { created: r.created }) : tr('Sab services pehle se counter par hain')); qc.invalidateQueries({ queryKey: ['products-for-pos'] }); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
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
    [tr('Service'), tr('Code'), tr('Kis tarah'), tr('Visit'), tr('Kaam'), tr('Ghanta rate'), tr('Kam se kam'), tr('Zyada se zyada'), tr('Emergency'), tr('Waqt (min)'), tr('Warranty (din)'), tr('Jobs'), tr('Kamai'), tr('Chaalu')],
    ...rows.map((s) => [s.name, s.code ?? '', categoryOf(s.category), s.visitCharge, s.baseCharge, s.hourlyRate, s.minCharge, s.maxCharge ?? '', s.emergencyCharge, s.estimatedDurationMin, s.warrantyDays, s.totalJobs, s.totalRevenue, s.isActive ? tr('Haan') : tr('Nahi')]),
  ]);

  const filtered = !!search.trim() || !!category || show !== 'active';
  const clear = () => { setSearch(''); setCategory(''); setShow('active'); };

  return (
    <PageShell>
      <PageHero
        title={tr('Service Catalog')}
        chip={<><Tag /> {' '}{tr('Rate list')}</>}
        meta={tr('Har kaam ka rate, waqt aur warranty — job aur counter dono isi se bharte hain')}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{tr('CSV')}</span></button>
          {canCreate && <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} title={tr('Purani services counter par laayein')} className={heroButton}><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">{tr('Counter se jorein')}</span></button>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <Link to="/services-biz-services/new" title={tr('Nayi service (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Nayi service')}</Link>}
        </>}
        stats={[
          { label: tr('Chaalu services'), value: active.length },
          { label: tr('Sab se zyada'), value: top?.name ?? '—', hint: top ? tr('{{totalJobs}} jobs', { totalJobs: top.totalJobs }) : undefined },
          { label: tr('Ausat rate'), value: sales(avg) },
        ]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Wrench} color="#0284c7" label={tr('Chaalu')} value={active.length} hint={tr('{{value}} band', { value: all.length - active.length })} onClick={() => setShow('active')} active={show === 'active'} />
          <KpiCard icon={Star} color="#f59e0b" label={tr('Popular')} value={active.filter((s) => s.isPopular || s.isFeatured).length} hint={tr('Job form me upar')} />
          <KpiCard icon={Zap} color="#e11d48" label={tr('Emergency')} value={active.filter((s) => s.isEmergency).length} hint={tr('Foran wale kaam')} />
          <KpiCard icon={ShieldCheck} color="#16a34a" label={tr('Warranty wali')} value={active.filter((s) => s.warrantyDays > 0).length} hint={tr('Bill par warranty')} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Service ka naam ya code…')} label={tr('Search')} />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {category && <FilterChip onRemove={() => setCategory('')}>{categoryOf(category)}</FilterChip>}
          {show !== 'active' && <FilterChip onRemove={() => setShow('active')}>{show === 'off' ? tr('Band') : tr('Sab')}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={Filter} label={category ? categoryOf(category) : tr('Kis tarah ka kaam')} value={category} active={!!category} onChange={setCategory}
          options={[{ value: '', label: tr('Sab') }, ...CATEGORIES.map((c) => ({ value: c, label: categoryOf(c) }))]} />
        <FilterMenu icon={Power} label={show === 'active' ? tr('Chaalu') : show === 'off' ? tr('Band') : tr('Sab')} value={show} active={show !== 'active'} onChange={setShow}
          options={[{ value: 'active' as Show, label: tr('Chaalu') }, { value: 'off' as Show, label: tr('Band') }, { value: 'all' as Show, label: tr('Sab') }]} />
      </FilterBar>

      <ViewTabs value="list" onChange={() => undefined} hint={<>{canCreate && <><Kbd>N</Kbd> {' '}{tr('nayi ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search')}</>}
        tabs={[{ id: 'list', label: tr('Services'), icon: ListChecks, count: rows.length }]} />

      {listQ.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me koi service nahi') : tr('Abhi rate list khali hai')}</p>
          <p className="mt-1 text-sm text-slate-500">{tr('AC service, gas refill, wiring, plumbing — har kaam ka rate likhein, job form khud bharega.')}</p>
          <div className="mt-4 flex justify-center gap-2">
            {canCreate && <Button onClick={() => navigate('/services-biz-services/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Nayi service')}</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Table minWidth="48rem">
            <THead><Tr><Th>{tr('Service')}</Th><Th align="right">{tr('Visit')}</Th><Th align="right">{tr('Kaam')}</Th><Th>{tr('Waqt')}</Th><Th>{tr('Warranty')}</Th><Th align="right">{tr('Jobs')}</Th><Th align="right" /></Tr></THead>
            <TBody>
              {rows.map((s) => (
                <Tr key={s.id} className={cn(!s.isActive && 'opacity-60')}>
                  <Td>
                    <Link to={`/services-biz-services/${s.id}`} className="font-semibold text-slate-900 hover:text-brand-700 hover:underline">{s.name}</Link>
                    <span className="mt-0.5 flex flex-wrap gap-1 text-[0.75rem] text-slate-500">
                      {categoryOf(s.category)}{s.code && <span className="font-mono">· {s.code}</span>}
                      {(s.isPopular || s.isFeatured) && <span className="rounded bg-amber-50 px-1 text-amber-700">{tr('Popular')}</span>}
                      {s.isEmergency && <span className="rounded bg-rose-50 px-1 text-rose-700">{tr('Emergency')}</span>}
                      {s.requiresQuote && <span className="rounded bg-blue-50 px-1 text-blue-700">{tr('Quote pehle')}</span>}
                    </span>
                  </Td>
                  <Td align="right" className="tabular-nums">{s.visitCharge ? sales(s.visitCharge) : '—'}</Td>
                  <Td align="right" className="font-semibold tabular-nums text-slate-900">{s.baseCharge ? sales(s.baseCharge) : s.hourlyRate ? tr('{{hourlyRate}}/ghanta', { hourlyRate: sales(s.hourlyRate) }) : tr('Andaze se')}</Td>
                  <Td><span className="inline-flex items-center gap-1 text-slate-600"><Clock className="h-3.5 w-3.5" />{tr('{{estimatedDurationMin}} min', { estimatedDurationMin: s.estimatedDurationMin })}</span></Td>
                  <Td>{s.warrantyDays ? <span className="text-emerald-700">{tr('{{warrantyDays}} din', { warrantyDays: s.warrantyDays })}</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td align="right" className="tabular-nums">{s.totalJobs}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/services-biz/jobs/new?service=${s.id}`} title={tr('Is service ki job')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-700 hover:bg-sky-50"><Briefcase className="h-4 w-4" /></Link>
                      {canEdit && <Link to={`/services-biz-services/${s.id}/edit`} className="inline-flex h-8 items-center rounded-lg px-2 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100">{tr('Badlein')}</Link>}
                      {(s.isActive ? canDelete : canEdit) && (
                        <button type="button" onClick={() => toggle.mutate(s)} disabled={toggle.isPending} className={cn('inline-flex h-8 items-center rounded-lg px-2 text-[0.8125rem] font-medium', s.isActive ? 'text-rose-700 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50')}>
                          {s.isActive ? tr('Band') : tr('Chaalu')}
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
        <PageGuide title={tr('Rate list — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: tr('Service jorein'), text: tr('Naam, visit charge (ghar jaane ka) aur kaam ka rate. Rate pakka na ho to "Kam se kam / zyada se zyada" likhein.') },
            { icon: Briefcase, color: '#7c3aed', title: tr('Job me'), text: tr('Job form me service chunte hi charges, waqt aur warranty khud bhar jate hain.') },
            { icon: ShoppingCart, color: '#16a34a', title: tr('Counter par'), text: tr('Har service POS par bhi bikti hai (stock ke baghair). Purani services counter par na dikhein to "Counter se jorein" dabayein.') },
            { icon: Power, color: '#e11d48', title: tr('Band karna'), text: tr('Band ki hui service nayi job aur counter par nahi aati; purani jobs aur bill wese hi rehte hain.') },
          ]}
          shortcuts={[['N', tr('nayi service')], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
