/**
 * All staff: everyone who works at the shop, with or without a login. Who is
 * on duty right now, roles, logins not used yet; cards with branch, last
 * login and today's sales; a roles and permissions table; and analytics.
 *
 * Keys: N new person · / search · 1 staff · 2 roles · 3 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownWideNarrow, BarChart3, Clock, Download, Filter, GraduationCap, KeyRound, LogIn, Plus, ShieldCheck, ShoppingBag,
  Store, UserCheck, UserCog, Users, WifiOff,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { peopleApi, type DirectoryPerson } from '../api/people.api';
import { PeopleAnalytics } from '../components/PeopleAnalytics';
import { PersonCard } from '../components/PersonCard';
import { RolesPanel } from '../components/RolesPanel';
import { staffListDoc } from '../components/print';
import { PEOPLE_KEY, ROLES, STATUS, downloadCsv, roleOf, type RoleKey } from '../components/meta';

type Tab = 'staff' | 'roles' | 'analytics';
type StatusFilter = 'current' | 'ACTIVE' | 'DUTY' | 'ON_LEAVE' | 'INACTIVE' | 'LEFT' | 'PENDING' | 'all';
type Sort = 'name' | 'login' | 'sales' | 'joined';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'current', label: 'Maujooda (chhorne wale nahi)' },
  { value: 'ACTIVE', label: 'Kaam par' },
  { value: 'DUTY', label: 'Abhi duty par' },
  { value: 'ON_LEAVE', label: 'Chhutti par' },
  { value: 'PENDING', label: 'Login abhi nahi kiya' },
  { value: 'INACTIVE', label: 'Band' },
  { value: 'LEFT', label: 'Chhor gaye' },
  { value: 'all', label: 'Sab' },
];

function matches(p: DirectoryPerson, s: StatusFilter) {
  switch (s) {
    case 'current': return p.status !== 'LEFT';
    case 'DUTY': return !!p.onDuty;
    case 'PENDING': return !!p.login?.isActive && p.login.neverLoggedIn;
    case 'all': return true;
    default: return p.status === s;
  }
}

export default function StaffPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const canTeam = usePermission(PERMISSIONS.TEAM_VIEW);
  const canAdd = canManage || isOwner;
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const tabParam = params.get('tab');
  const tab: Tab = tabParam === 'roles' || tabParam === 'analytics' ? tabParam : 'staff';
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); if (t === 'staff') n.delete('tab'); else n.set('tab', t); return n; }, { replace: true });

  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [role, setRole] = useState<'' | RoleKey>('');
  const [shopId, setShopId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('current');
  const [sort, setSort] = useState<Sort>('name');
  const [search, setSearch] = useState('');

  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);

  const listQ = useQuery({ queryKey: [PEOPLE_KEY, 'list'], queryFn: peopleApi.list, placeholderData: (p) => p, refetchInterval: 60_000 });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops });
  const people = useMemo(() => listQ.data ?? [], [listQ.data]);
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const seesSales = people.some((p) => p.today);

  const current = people.filter((p) => p.status !== 'LEFT');
  const k = {
    active: people.filter((p) => p.status === 'ACTIVE').length,
    duty: people.filter((p) => p.onDuty).length,
    pending: people.filter((p) => p.login?.isActive && p.login.neverLoggedIn).length,
    noLogin: current.filter((p) => !p.hasLogin).length,
    leave: people.filter((p) => p.status === 'ON_LEAVE').length,
    sales: people.reduce((a, p) => a + (p.today?.sales ?? 0), 0),
    bills: people.reduce((a, p) => a + (p.today?.bills ?? 0), 0),
  };
  const roleCounts = (['MANAGER', 'CASHIER', 'STAFF'] as RoleKey[]).map((r) => [r, current.filter((p) => p.role === r).length] as const).filter(([, n]) => n);

  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = people.filter((p) =>
      matches(p, status)
      && (!role || (p.role ?? 'NO_LOGIN') === role)
      && (!shopId || p.shop?.id === shopId || (shopId === 'none' && !p.shop))
      && (!needle || [p.fullName, p.phone, p.email, p.designation, p.staffNumber, p.department].some((v) => v?.toLowerCase().includes(needle))));
    const by: Record<Sort, (a: DirectoryPerson, b: DirectoryPerson) => number> = {
      name: (a, b) => Number(!!b.onDuty) - Number(!!a.onDuty) || a.fullName.localeCompare(b.fullName),
      login: (a, b) => (b.login?.lastLoginAt ?? '').localeCompare(a.login?.lastLoginAt ?? ''),
      sales: (a, b) => (b.today?.sales ?? 0) - (a.today?.sales ?? 0),
      joined: (a, b) => (b.joinDate ?? '').localeCompare(a.joinDate ?? ''),
    };
    return [...list].sort(by[sort]);
  }, [people, status, role, shopId, needle, sort]);

  const filtered = !!role || !!shopId || status !== 'current' || !!needle;
  const clear = () => { setRole(''); setShopId(''); setStatus('current'); setSearch(''); };
  const shopName = shopId === 'none' ? 'Sab branches wale' : shops.find((s) => s.id === shopId)?.name;
  const filterText = [role && ROLES[role].label, shopName, status !== 'current' && STATUS_FILTERS.find((s) => s.value === status)?.label, needle && `"${search.trim()}"`].filter(Boolean).join(' · ');
  const period = resolveRange(range, startHour);

  const exportCsv = () => downloadCsv(`staff-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Naam', 'Staff no.', 'Role', 'Kaam', 'Branch', 'Phone', 'Email', 'Haal', 'Joining', 'Aakhri login', ...(seesSales ? ['Aaj bikri', 'Aaj bill'] : [])],
    ...rows.map((p) => [
      p.fullName, p.staffNumber, roleOf(p.role).label, p.designation, p.shop?.name ?? 'Sab branches', p.phone, p.email, STATUS[p.status].label,
      p.joinDate?.slice(0, 10), p.login ? (p.login.lastLoginAt ?? 'Kabhi nahi') : '', ...(seesSales ? [p.today?.sales ?? 0, p.today?.bills ?? 0] : []),
    ]),
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canAdd) { e.preventDefault(); navigate('/staff/new'); }
      if (e.key === '1') setTab('staff');
      if (e.key === '2') setTab('roles');
      if (e.key === '3') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('staff'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // re-bound each render so setTab sees the current params

  const show = (s: StatusFilter, r: '' | RoleKey = '') => { setTab('staff'); setStatus(s); setRole(r); };

  return (
    <PageShell>
      <PageHero
        title="Staff"
        chip={<><Users /> Team</>}
        meta="Har banda ek jagah — login wale bhi, bina login wale bhi"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => staffListDoc(rows, filterText)} disabled={tab !== 'staff' || !rows.length} /></span>
          <button type="button" onClick={exportCsv} disabled={tab !== 'staff' || !rows.length} className={heroButton}><Download className="h-4 w-4" /> CSV</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => navigate('/staff/new')} title="Naya banda (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya banda</button>}
        </>}
        stats={listQ.data ? [
          { label: 'Kaam par', value: String(k.active), hint: `${current.length} me se` },
          { label: 'Abhi duty par', value: String(k.duty) },
          ...(seesSales ? [{ label: 'Aaj staff ki bikri', value: formatPKR(k.sales), hint: `${k.bills} bill` }] : []),
        ] : [{ label: 'Kaam par', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!listQ.data ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={UserCheck} color="#16a34a" label="Kaam par" value={k.active} hint={k.leave ? `${k.leave} chhutti par` : 'Koi chhutti par nahi'}
            onClick={() => show('ACTIVE')} active={tab === 'staff' && status === 'ACTIVE' && !role} />
          <KpiCard icon={Clock} color="#0891b2" label="Abhi duty par" value={k.duty} hint={k.duty ? 'Galla khula ya haazri lagi' : 'Abhi koi duty par nahi'}
            onClick={() => show('DUTY')} active={tab === 'staff' && status === 'DUTY'} />
          <KpiCard icon={UserCog} color="#7c3aed" label="Roles" value={roleCounts.length ? roleCounts.map(([r, n]) => `${n} ${ROLES[r].label}`).join(' · ') : '—'}
            hint="Role aur ijazat dekhein" onClick={() => setTab('roles')} active={tab === 'roles'} />
          <KpiCard icon={LogIn} color="#0284c7" label="Login abhi nahi kiya" value={k.pending} hint={k.pending ? 'Login bana, magar istemal nahi hua' : 'Sab ne login kar liya'}
            onClick={() => show('PENDING')} active={tab === 'staff' && status === 'PENDING'} />
          {seesSales
            ? <KpiCard icon={ShoppingBag} color="#d97706" label="Aaj ki bikri (staff)" value={formatPKR(k.sales)} hint={`${k.bills} bill`} onClick={() => { setTab('staff'); setSort('sales'); }} active={tab === 'staff' && sort === 'sales'} />
            : <KpiCard icon={KeyRound} color="#64748b" label="Bina login" value={k.noLogin} hint="Sirf tankhwah aur haazri" onClick={() => show('current', 'NO_LOGIN')} active={tab === 'staff' && role === 'NO_LOGIN'} />}
        </>}
      </KpiRow>

      {tab === 'roles' ? null : (
        <FilterBar
          search={tab === 'staff'
            ? <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, email, kaam ya staff no.…" label="Dhoondein" />
            : <p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Bikri, haazri aur login isi muddat ke hain</p>}
          chips={tab === 'staff' && filtered ? <>
            {role && <FilterChip onRemove={() => setRole('')}>{ROLES[role].label}</FilterChip>}
            {shopId && <FilterChip onRemove={() => setShopId('')}>{shopName ?? 'Branch'}</FilterChip>}
            {status !== 'current' && <FilterChip onRemove={() => setStatus('current')}>{STATUS_FILTERS.find((s) => s.value === status)?.label}</FilterChip>}
            {needle && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          {tab === 'analytics' && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />}
          {tab === 'staff' && <>
            <FilterMenu icon={UserCog} label="Role" value={role} active={!!role} onChange={setRole}
              options={[{ value: '' as const, label: 'Sab roles' }, ...(Object.keys(ROLES) as RoleKey[]).map((r) => ({ value: r, label: ROLES[r].label, icon: ROLES[r].icon, color: ROLES[r].color }))]} />
            {allShops && shops.length > 1 && (
              <FilterMenu icon={Store} label="Branch" value={shopId} active={!!shopId} onChange={setShopId}
                options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name })), { value: 'none', label: 'Kisi ek branch ke nahi' }]} />
            )}
            <FilterMenu icon={Filter} label="Haal" value={status} active={status !== 'current'} onChange={setStatus} align="right" options={STATUS_FILTERS} />
            <FilterMenu icon={ArrowDownWideNarrow} label={{ name: 'Naam', login: 'Aakhri login', sales: 'Aaj ki bikri', joined: 'Naye pehle' }[sort]} value={sort} onChange={setSort} align="right"
              options={[
                { value: 'name', label: 'Duty wale pehle, phir naam' }, { value: 'joined', label: 'Naye pehle' },
                ...(canTeam ? [{ value: 'login' as Sort, label: 'Aakhri login' }] : []),
                ...(seesSales ? [{ value: 'sales' as Sort, label: 'Aaj ki bikri' }] : []),
              ]} />
          </>}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canAdd && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> dhoondein · <Kbd>1</Kbd>-<Kbd>3</Kbd> tabs</>}
        tabs={[
          { id: 'staff', label: 'Staff', icon: Users, count: listQ.data ? rows.length : null },
          { id: 'roles', label: 'Roles aur ijazat', icon: ShieldCheck },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        <PeopleAnalytics period={period} />
      ) : tab === 'roles' ? (
        listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : <RolesPanel people={people} canSeeLogins={canTeam} onRole={(r) => show('current', r)} />
      ) : listQ.isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</ul>
      ) : listQ.isError && !listQ.data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <WifiOff className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Staff load nahi hua</p>
          <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
        </div>
      ) : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi nahi' : 'Abhi koi staff nahi'}</p>
          <p className="mt-1 text-sm text-slate-500">Cashier, manager ya helper — sab ko yahan jorein. Login dena marzi hai.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {canAdd && <Button onClick={() => navigate('/staff/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya banda</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((p) => <PersonCard key={p.id} p={p} />)}
        </ul>
      )}

      {guide.isOpen && (
        <PageGuide title="Staff — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Naya banda', text: '"Naya banda" dabayein: naam, phone, kaam aur tankhwah. App chalana hai to "Login dein" on karein — role chunein, ijazat khud lag jati hain, aur login ki parchi chhap lein.' },
            { icon: Clock, color: '#0891b2', title: 'Abhi duty par', text: 'Jis ka galla (shift) khula hai ya aaj haazri lagi aur abhi chhutti nahi hui — hara nishan. Card par kab se duty par hai woh bhi likha hai.' },
            { icon: ShieldCheck, color: '#7c3aed', title: 'Roles aur ijazat', text: 'Table me saaf likha hai ke Manager, Cashier aur Staff ko shuru me kya milta hai. Kisi ki ijazat role se alag ho to neeche list me nazar aata hai.' },
            { icon: LogIn, color: '#0284c7', title: 'Login abhi nahi kiya', text: 'Login bana diya magar banda ne abhi tak khola nahi. Profile se naya password de kar parchi ya WhatsApp par bhej dein.' },
            { icon: BarChart3, color: '#d97706', title: 'Analytics', text: 'Kis ne kitna becha, haazri, kitne aaye aur gaye, aur login ki ginti — muddat chun kar.' },
          ]}
          tips={[
            'Card par click karein — poori profile: ijazat, branch, haazri, tankhwah, login aur devices.',
            'Jis ki bikri ho chuki ho us ka login kabhi mitta nahi, sirf band hota hai — hisaab mehfooz rehta hai.',
            'Login, ijazat aur password sirf malik badal sakta hai.',
            'Bina login wale (helper, driver) bhi yahan rakhein — tankhwah aur haazri unhi se chalti hai.',
          ]}
          shortcuts={[['N', 'naya banda'], ['/', 'dhoondein'], ['1', 'staff'], ['2', 'roles'], ['3', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
