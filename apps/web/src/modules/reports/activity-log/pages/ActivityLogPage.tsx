/**
 * Activity log: who changed what and when, as plain sentences grouped by
 * business day. Filter by period, person, action, record type, branch and
 * text; open the record a line is about; see who does the most; export the
 * whole filtered log to CSV or print.
 *
 * Keys: / search · 1 list · 2 people · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, Building2, ChevronDown, Download, FileText, GraduationCap, History, ListFilter, MonitorSmartphone, MousePointerClick, Search,
  ShieldCheck, Trash2, UserRound, Users,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useCanSwitchShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { ROLE_LABEL } from '@modules/reports/audit/meta';
import { activityLogApi, type ActivityEntry, type ActivityFeed, type ActivityFilters } from '../api/activity-log.api';
import { actionLabel, detailOf, deviceOf, entityLabel, iconOf, kindOf, linkOf, sentence } from '../meta';

type Tab = 'list' | 'people';
const PAGE = 50;
const EXPORT_PAGE = 500;
const EXPORT_MAX = 10_000;

const timeOf = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const stamp = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function ActivityLogPage() {
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const isOwner = useCanSwitchShops();

  const [tab, setTab] = useState<Tab>('list');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [shopId, setShopId] = useState('');
  const [search, setSearch] = useState('');
  const [needle, setNeedle] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setNeedle(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const period = resolveRange(range, startHour);
  const pFrom = period?.from;
  const pTo = period?.to;
  const filters: ActivityFilters = useMemo(() => ({
    ...(pFrom && pTo && { from: pFrom, to: pTo }),
    ...(userId && { userId }), ...(action && { action }), ...(entity && { entity }), ...(shopId && { shopId }), ...(needle && { search: needle }),
  }), [pFrom, pTo, userId, action, entity, shopId, needle]);

  const q = useInfiniteQuery({
    queryKey: ['activity-log', 'feed', filters],
    queryFn: ({ pageParam }) => activityLogApi.feed(filters, pageParam, PAGE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ActivityFeed) => last.nextCursor ?? undefined,
    placeholderData: (p) => p,
  });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: isOwner, staleTime: 5 * 60_000 });

  const first = q.data?.pages[0];
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const facets = first?.facets;
  const total = first?.total ?? 0;
  const label = period ? rangeLabel(period.from, period.to) : 'Shuru se ab tak';

  const stats = useMemo(() => {
    const count = (test: (a: string) => boolean) => (facets?.actions ?? []).filter((a) => test(a.key)).reduce((s, a) => s + a.count, 0);
    return {
      people: (facets?.users ?? []).filter((u) => u.id !== 'system').length,
      deletes: count((a) => kindOf(a) === 'delete'),
      security: count((a) => kindOf(a) === 'security'),
      pinFailed: count((a) => a === 'PIN_VERIFY_FAILED' || a === 'PIN_RESET_FAILED'),
      top: facets?.users.find((u) => u.id !== 'system'),
    };
  }, [facets]);

  const days = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const e of items) {
      const k = businessDayKey(new Date(e.createdAt), startHour);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [items, startHour]);
  const dayTitle = (key: string) => {
    const today = businessDayKey(new Date(), startHour);
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (key === today) return 'Aaj';
    if (key === businessDayKey(y, startHour)) return 'Kal';
    return new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
  };

  const hasFilters = !!(userId || action || entity || shopId || needle) || range.preset !== 'week';
  const clear = () => { setUserId(''); setAction(''); setEntity(''); setShopId(''); setSearch(''); setRange({ preset: 'week', custom: { from: '', to: '' } }); };

  const fetchAll = async () => {
    const out: ActivityEntry[] = [];
    let cursor: string | undefined;
    do {
      const page = await activityLogApi.feed(filters, cursor, EXPORT_PAGE);
      out.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor && out.length < EXPORT_MAX);
    return out;
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll();
      if (!rows.length) return void toast.error('Is filter me kuch nahi');
      downloadCsv(`activity-log-${period?.from ?? 'all'}-${period?.to ?? ''}.csv`, [
        [`Activity log — ${tenantName ?? ''}`], [`Period: ${label}`], [],
        ['Waqt', 'Kis ne', 'Role', 'Kya kiya', 'Details', 'Record', 'Record id', 'IP', 'Device'],
        ...rows.map((e) => [stamp(e.createdAt), e.user?.fullName ?? 'System', e.user ? ROLE_LABEL[e.user.role] ?? e.user.role : '', sentence(e), detailOf(e),
          e.entityType ? entityLabel(e.entityType) : '', e.entityId ?? '', e.ipAddress ?? '', deviceOf(e.userAgent) ?? '']),
      ]);
      toast.success(`${rows.length} entries CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll();
    return {
      title: 'Activity log',
      subtitle: label,
      meta: [['Entries', String(rows.length)], ...(userId && facets ? [['Banda', facets.users.find((u) => u.id === userId)?.name ?? ''] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Waqt' }, { label: 'Kya hua' }, { label: 'Details', wideOnly: true }],
        rows: rows.map((e) => [stamp(e.createdAt), sentence(e), detailOf(e)]),
      }],
    };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('people');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const userName = (id: string) => facets?.users.find((u) => u.id === id)?.name ?? 'Banda';
  const loading = q.isLoading;

  return (
    <PageShell>
      <PageHero
        title="Activity log"
        chip={<><History />{label}</>}
        meta={tenantName}
        busy={q.isFetching && !q.isLoading && !q.isFetchingNextPage}
        loading={loading}
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting || !total} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!total} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Kul kaam', value: total.toLocaleString('en-PK') },
          { label: 'Log', value: String(stats.people), hint: stats.top ? `sab se zyada: ${stats.top.name}` : undefined },
          { label: 'Mitaye / void', value: String(stats.deletes) },
          { label: 'Security', value: String(stats.security), hint: stats.pinFailed ? `${stats.pinFailed} ghalat PIN` : undefined },
        ]}
      />

      <KpiRow cols={4}>
        {loading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Users} color="#2563eb" label="Sab se zyada kaam" value={stats.top?.name ?? '—'} hint={stats.top ? `${stats.top.count} kaam · dabayein` : undefined}
              onClick={stats.top ? () => setUserId(userId === stats.top!.id ? '' : stats.top!.id) : undefined} active={!!stats.top && userId === stats.top.id} />
            <KpiCard icon={Trash2} color="#e11d48" label="Mitaya gaya" value={String(stats.deletes)} hint="Mitaye, void aur radd" />
            <KpiCard icon={ShieldCheck} color="#7c3aed" label="PIN aur security" value={String(stats.security)} hint={stats.pinFailed ? `${stats.pinFailed} ghalat PIN · dabayein` : 'PIN, logout, download'}
              onClick={stats.pinFailed ? () => setAction(action === 'PIN_VERIFY_FAILED' ? '' : 'PIN_VERIFY_FAILED') : undefined} active={action === 'PIN_VERIFY_FAILED'} />
            <KpiCard icon={FileText} color="#0891b2" label="Record ki type" value={String(facets?.entities.length ?? 0)} hint={facets?.entities[0] ? `zyada: ${entityLabel(facets.entities[0].key)}` : undefined} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Details, naam ya record id…" label="Activity search" />}
        chips={hasFilters ? <>
          {range.preset !== 'week' && <FilterChip onRemove={() => setRange({ preset: 'week', custom: { from: '', to: '' } })}>{label}</FilterChip>}
          {userId && <FilterChip onRemove={() => setUserId('')}>{userName(userId)}</FilterChip>}
          {action && <FilterChip onRemove={() => setAction('')}>{actionLabel(action)}</FilterChip>}
          {entity && <FilterChip onRemove={() => setEntity('')}>{entityLabel(entity)}</FilterChip>}
          {shopId && <FilterChip onRemove={() => setShopId('')}>{shops.find((s) => s.id === shopId)?.name ?? 'Branch'}</FilterChip>}
          {needle && <FilterChip onRemove={() => setSearch('')}>"{needle}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="week" />
        <FilterMenu icon={UserRound} label="Banda" value={userId} active={!!userId} onChange={setUserId} width="w-72"
          options={[{ value: '', label: 'Sab log' }, ...(facets?.users ?? []).map((u) => ({ value: u.id, label: u.name, hint: `${u.role ? `${ROLE_LABEL[u.role] ?? u.role} · ` : ''}${u.count} kaam` }))]} />
        <FilterMenu icon={ListFilter} label="Kaam" value={action} active={!!action} onChange={setAction} width="w-72"
          options={[{ value: '', label: 'Har kaam' }, ...(facets?.actions ?? []).map((a) => ({ value: a.key, label: actionLabel(a.key), hint: `${a.count}` }))]} />
        <FilterMenu icon={FileText} label="Record" value={entity} active={!!entity} onChange={setEntity}
          options={[{ value: '', label: 'Har record' }, ...(facets?.entities ?? []).map((x) => ({ value: x.key, label: entityLabel(x.key), hint: `${x.count}` }))]} />
        {isOwner && shops.length > 1 && (
          <FilterMenu icon={Building2} label="Branch" value={shopId} active={!!shopId} onChange={setShopId} align="right"
            options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name, hint: 'Is branch ke staff ke kaam' }))]} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> <Kbd>2</Kbd> se badlein</>}
        tabs={[{ id: 'list', label: 'Sab kaam', icon: Activity, count: total }, { id: 'people', label: 'Log', icon: Users, count: stats.people }]} />

      {q.isError && !first ? (
        <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Log load nahi hua — internet check karein aur dobara kholein.</p>
      ) : loading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : tab === 'people' ? (
        <PeopleView feed={first!} onPick={(id) => { setUserId(id); setTab('list'); }} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><History className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{hasFilters ? 'Is filter me kuch nahi' : 'Abhi koi activity nahi'}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">{hasFilters ? 'Filter badal kar ya period barha kar dekhein' : 'Branch, staff, settings ya PIN me badlav yahan likhe jate hain'}</p>
          {hasFilters && <Button className="mt-4" variant="secondary" onClick={clear}>Filter hatayein</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {days.map(([key, list]) => (
            <section key={key} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                <h2 className="text-[0.875rem] font-semibold text-slate-900">{dayTitle(key)}</h2>
                <span className="text-[0.75rem] text-slate-500">{list.length} kaam</span>
              </header>
              <ul className="divide-y divide-slate-100">
                {list.map((e) => <EntryRow key={e.id} e={e} expanded={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} onUser={(id) => setUserId(id)} />)}
              </ul>
            </section>
          ))}
          {q.hasNextPage && (
            <button type="button" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}
              className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
              {q.isFetchingNextPage ? 'Aa rahe hain…' : `Aur dikhayein (${items.length} / ${total})`}
            </button>
          )}
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Activity log — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: History, color: '#2563eb', title: 'Kya likha jata hai', text: 'Branch, login, staff, settings, PIN, tankhwah, void bill aur mitaye gaye expenses — kis ne kab kiya.' },
            { icon: ListFilter, color: '#d97706', title: 'Filter', text: 'Period, banda, kaam aur record chunein. Lage filter neeche dikhte hain, X se hat jate hain.' },
            { icon: MousePointerClick, color: '#16a34a', title: 'Details', text: 'Kisi line par click karein: poori baat, IP, device, aur record kholne ka link.' },
            { icon: Users, color: '#7c3aed', title: 'Log', text: '"Log" tab me dekhein kis ne kitne kaam kiye. Naam dabane se sirf us ke kaam aa jate hain.' },
            { icon: ShieldCheck, color: '#e11d48', title: 'Khatre ki baat', text: 'Ghalat PIN, mitaye gaye expenses aur void bill par nazar rakhein. Poori jaanch ke liye Audit report.' },
            { icon: Download, color: '#0891b2', title: 'Export', text: 'CSV ya Print/PDF — is filter ki saari entries aa jati hain.' },
          ]}
          tips={['Din dukaan ke apne waqt par badalta hai.', 'Branch filter us branch ke staff ke kaam dikhata hai.']}
          shortcuts={[['/', 'dhoondein'], ['1', 'sab kaam'], ['2', 'log'], ['G', 'guide']]}
          footer={<Link to="/audit" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Audit report →</Link>}
        />
      )}
    </PageShell>
  );
}

function EntryRow({ e, expanded, onToggle, onUser }: { e: ActivityEntry; expanded: boolean; onToggle: () => void; onUser: (id: string) => void }) {
  const { icon: Icon, color } = iconOf(e);
  const link = linkOf(e);
  const device = deviceOf(e.userAgent);
  const detail = detailOf(e);
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70 sm:px-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.875rem] font-semibold text-slate-900">{sentence(e)}</span>
          <span className={cn('block text-[0.8125rem] text-slate-500', !expanded && 'truncate')}>{detail}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[0.75rem] tabular-nums text-slate-500">{timeOf(e.createdAt)}</span>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', expanded && 'rotate-180')} />
        </span>
      </button>
      {expanded && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-slate-100 bg-slate-50/50 px-4 py-2.5 pl-16 text-[0.75rem] text-slate-600 sm:px-5 sm:pl-[4.25rem]">
          <span>{stamp(e.createdAt)}</span>
          {e.user && (
            <button type="button" onClick={() => onUser(e.user!.id)} className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-brand-700">
              <UserRound className="h-3.5 w-3.5" />{e.user.fullName}{e.user.role ? ` · ${ROLE_LABEL[e.user.role] ?? e.user.role}` : ''}{e.user.assignedShop ? ` · ${e.user.assignedShop.name}` : ''}
            </button>
          )}
          {e.entityType && <span>{entityLabel(e.entityType)}{e.entityId ? <span className="ml-1 font-mono text-[0.6875rem] text-slate-400">{e.entityId.slice(0, 8)}</span> : null}</span>}
          {(e.ipAddress || device) && <span className="inline-flex items-center gap-1"><MonitorSmartphone className="h-3.5 w-3.5" />{[device, e.ipAddress].filter(Boolean).join(' · ')}</span>}
          {link && <Link to={link.to} className="ml-auto font-semibold text-brand-700 hover:underline">{link.label} →</Link>}
        </div>
      )}
    </li>
  );
}

function PeopleView({ feed, onPick }: { feed: ActivityFeed; onPick: (id: string) => void }) {
  const users = feed.facets.users;
  const actions = feed.facets.actions.slice(0, 12);
  const maxU = Math.max(1, ...users.map((u) => u.count));
  const maxA = Math.max(1, ...actions.map((a) => a.count));
  if (!users.length) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Is period me koi activity nahi</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Users className="h-4 w-4 text-brand-600" />Kis ne kitne kaam kiye</h2>
        <p className="mt-0.5 text-[0.8125rem] text-slate-500">Naam dabayein — sirf us ke kaam dikhenge</p>
        <ul className="mt-4 space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => onPick(u.id)} className="group block w-full text-left">
                <span className="flex items-center justify-between gap-3 text-[0.8125rem]">
                  <span className="truncate font-medium text-slate-800 group-hover:text-brand-700">{u.name}{u.role ? <span className="ml-1.5 text-[0.75rem] font-normal text-slate-500">{ROLE_LABEL[u.role] ?? u.role}</span> : null}</span>
                  <span className="tabular-nums text-slate-600">{u.count}</span>
                </span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${(u.count / maxU) * 100}%` }} /></span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Search className="h-4 w-4 text-brand-600" />Kaun se kaam zyada hue</h2>
        <p className="mt-0.5 text-[0.8125rem] text-slate-500">Is period ke sab se aam kaam</p>
        <ul className="mt-4 space-y-2">
          {actions.map((a) => {
            const { icon: Icon, color } = iconOf({ action: a.key, entityType: null });
            return (
              <li key={a.key} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3 text-[0.8125rem]"><span className="truncate text-slate-800">{actionLabel(a.key)}</span><span className="tabular-nums text-slate-600">{a.count}</span></span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${(a.count / maxA) * 100}%`, backgroundColor: color }} /></span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
