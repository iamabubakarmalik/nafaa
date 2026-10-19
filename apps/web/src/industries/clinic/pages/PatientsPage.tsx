/**
 * Patient directory: server-side search by name, phone, MR number or CNIC,
 * filters for gender, blood group, allergies and panel patients, khata
 * balance per patient, paging and CSV. Patients are never deleted; a record
 * can be switched off and comes back with its history.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUpDown, CalendarPlus, Download, Droplet, GraduationCap, HeartPulse, ShieldPlus, UserPlus, Users, Venus } from 'lucide-react';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  Table, TBody, THead, Td, Th, Tr, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { patientsApi } from '../api/patients.api';
import { ListCard, ListFailed, ListLoading, Pager } from '../components/ListBits';
import { PatientFormModal } from '../components/PatientFormModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { BLOOD_GROUPS, GENDERS, ageOf, apiError, bloodLabel, genderLabel, shortDate } from '../lib/meta';

type Tab = 'active' | 'inactive';
const LIMIT = 30;

export default function PatientsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [blood, setBlood] = useState('');
  const [flag, setFlag] = useState<'' | 'allergies' | 'insurance'>('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canEdit && setAdding(true) });
  useEffect(() => { setPage(1); }, [q, gender, blood, flag, sort, tab]);

  const params = useMemo(() => ({
    search: q || undefined, gender: gender || undefined, bloodGroup: blood || undefined, sort, limit: LIMIT,
    status: tab === 'inactive' ? 'inactive' : undefined, ...(flag === 'allergies' && { allergies: 'yes' }), ...(flag === 'insurance' && { insurance: 'yes' }),
  }), [q, gender, blood, flag, sort, tab]);
  const list = useQuery({ queryKey: ['clinic-patients', 'page', params, page], queryFn: () => patientsApi.page({ ...params, page }), placeholderData: (p) => p });
  const data = list.data;

  const exportCsv = async () => {
    try {
      const all = await patientsApi.page({ ...params, page: 1, limit: 200 });
      if (!all.items.length) { toast.error('Koi mareez nahi'); return; }
      downloadCsv('patients.csv', [
        ['MR', 'Naam', 'Walid/Shohar', 'Phone', 'CNIC', 'Umar', 'Jins', 'Blood group', 'Allergy', 'Visits', 'Aakhri visit', 'Khata', 'Panel'],
        ...all.items.map((p) => [p.mrn, p.fullName, p.fatherOrHusbandName, p.phonePrimary, p.cnic, ageOf(p.dateOfBirth), genderLabel(p.gender), bloodLabel(p.bloodGroup),
          p.allergies.join('; '), p.totalVisits, p.lastVisitAt?.slice(0, 10), p.khataBalance, p.hasInsurance ? p.insuranceProvider || 'Haan' : '']),
      ]);
    } catch (e) { toast.error(apiError(e, 'File nahi bani')); }
  };

  const chips = [
    gender && <FilterChip key="g" onRemove={() => setGender('')}>{genderLabel(gender)}</FilterChip>,
    blood && <FilterChip key="b" onRemove={() => setBlood('')}>{bloodLabel(blood)}</FilterChip>,
    flag && <FilterChip key="f" onRemove={() => setFlag('')}>{flag === 'allergies' ? 'Allergy wale' : 'Panel wale'}</FilterChip>,
    q && <FilterChip key="q" onRemove={() => setSearch('')}>"{q}"</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      {adding && <PatientFormModal patient={null} initialName={search} onClose={() => setAdding(false)} onSaved={(p) => { setAdding(false); qc.invalidateQueries({ queryKey: ['clinic-patients'] }); navigate(`/clinic/patients/${p.id}`); }} />}
      {guide.isOpen && (
        <PageGuide title="Mareez — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserPlus, color: '#2563eb', title: 'Register', text: 'Naam, phone aur umar kaafi hai. MR number khud banta hai; mareez ka khata bhi saath khul jata hai.' },
            { icon: Users, color: '#0891b2', title: 'Dhoondein', text: 'Naam, phone, MR ya CNIC — search server par hota hai, hazaron mareez me bhi foran.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Allergy', text: 'Allergy likhi ho to har visit aur nuskhe par laal nishan aata hai.' },
            { icon: ShieldPlus, color: '#16a34a', title: 'Panel', text: 'Panel / insurance wale mareez ki fees khata me rakhein aur company se wasool karein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya mareez'], ['G', 'guide']]} />
      )}

      <PageHero title="Mareez" chip={<><Users />{data?.summary.all ?? 0}</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading}
        meta="Har mareez ka record, visits aur khata"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><UserPlus className="h-4 w-4" />Naya mareez</button>}
        </>}
        stats={[
          { label: 'Kul mareez', value: String(data?.summary.all ?? 0) },
          { label: 'Is mahine naye', value: String(data?.summary.newThisMonth ?? 0) },
          { label: 'Allergy wale', value: String(data?.summary.withAllergy ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {list.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Users} color="#2563eb" label="Is list me" value={data?.total ?? 0} onClick={() => { setFlag(''); setGender(''); setBlood(''); }} active={!flag && !gender && !blood} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Allergy wale" value={data?.summary.withAllergy ?? 0} onClick={() => setFlag(flag === 'allergies' ? '' : 'allergies')} active={flag === 'allergies'} />
            <KpiCard icon={ShieldPlus} color="#16a34a" label="Panel / insurance" value={data?.summary.withInsurance ?? 0} onClick={() => setFlag(flag === 'insurance' ? '' : 'insurance')} active={flag === 'insurance'} />
            <KpiCard icon={HeartPulse} color="#7c3aed" label="Is mahine naye" value={data?.summary.newThisMonth ?? 0} onClick={() => setSort('new')} active={sort === 'new'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, MR number ya CNIC…" />}
        chips={chips.length ? <>{chips}</> : undefined}
        onClear={() => { setSearch(''); setGender(''); setBlood(''); setFlag(''); }}>
        <FilterMenu icon={Venus} label="Jins" value={gender || 'all'} active={!!gender} onChange={(v) => setGender(v === 'all' ? '' : v)}
          options={[{ value: 'all', label: 'Sab' }, ...GENDERS.map((g) => ({ value: g.value, label: g.label }))]} />
        <FilterMenu icon={Droplet} label="Blood group" value={blood || 'all'} active={!!blood} onChange={(v) => setBlood(v === 'all' ? '' : v)}
          options={[{ value: 'all', label: 'Sab' }, ...BLOOD_GROUPS.map((b) => ({ value: b.value, label: b.label }))]} />
        <FilterMenu icon={ArrowUpDown} label="Sort" value={sort} align="right" onChange={setSort}
          options={[{ value: 'recent', label: 'Haal ki visit pehle' }, { value: 'new', label: 'Naye register pehle' }, { value: 'visits', label: 'Zyada visits' }, { value: 'name', label: 'Naam se' }]} />
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'active', label: 'Chalu' }, { id: 'inactive', label: 'Band' }]} />

      <ListCard>
        {list.isLoading ? <ListLoading /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : !data?.items.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Users className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{chips.length ? 'Is filter me koi mareez nahi' : 'Abhi koi mareez nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Reception par token dete waqt bhi mareez register ho jata hai.</p>
            {canEdit && <Button className="mt-4" onClick={() => setAdding(true)} leftIcon={<UserPlus className="h-4 w-4" />}>Naya mareez</Button>}
          </div>
        ) : (
          <>
            <Table minWidth="56rem">
              <THead><Tr><Th>Mareez</Th><Th>Phone / CNIC</Th><Th>Sehat</Th><Th align="right">Visits</Th><Th align="right">Khata</Th><Th align="right" /></Tr></THead>
              <TBody>
                {data.items.map((p) => (
                  <Tr key={p.id} interactive onClick={() => navigate(`/clinic/patients/${p.id}`)}>
                    <Td>
                      <p className="font-semibold text-slate-900">{p.fullName}<span className="ml-1.5 text-[0.75rem] font-normal text-slate-500">{[ageOf(p.dateOfBirth), genderLabel(p.gender)].filter(Boolean).join(' · ')}</span></p>
                      <p className="text-[0.75rem] text-slate-500">{p.mrn}{p.fatherOrHusbandName && ` · ${p.fatherOrHusbandName}`}</p>
                    </Td>
                    <Td><p>{p.phonePrimary || '—'}</p>{p.cnic && <p className="text-[0.75rem] text-slate-500">{p.cnic}</p>}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.bloodGroup && p.bloodGroup !== 'UNKNOWN' && <Badge size="xs" variant="default">{bloodLabel(p.bloodGroup)}</Badge>}
                        {p.allergies.length > 0 && <Badge size="xs" variant="danger">Allergy: {p.allergies.slice(0, 2).join(', ')}</Badge>}
                        {p.chronicConditions.slice(0, 2).map((c) => <Badge key={c} size="xs" variant="warning">{c}</Badge>)}
                        {p.hasInsurance && <Badge size="xs" variant="info">Panel</Badge>}
                      </div>
                    </Td>
                    <Td align="right"><p className="font-semibold">{p.totalVisits}</p><p className="text-[0.75rem] text-slate-500">{p.lastVisitAt ? shortDate(p.lastVisitAt) : 'Abhi nahi'}</p></Td>
                    <Td align="right" className={p.khataBalance > 0 ? 'font-semibold text-amber-700' : ''}>{p.khataBalance > 0 ? money(p.khataBalance) : '—'}</Td>
                    <Td align="right" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/clinic/appointments/new?patient=${p.id}`} title="Token dein" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><CalendarPlus className="h-4 w-4" />Token</Link>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />
          </>
        )}
      </ListCard>
    </PageShell>
  );
}
