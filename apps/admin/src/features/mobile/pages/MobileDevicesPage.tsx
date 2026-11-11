/** Every device that checked in from the mobile app, searchable by shop, person or model. Search, filters and paging run on the server. */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, BellOff, BellRing, CalendarClock, Download, Lightbulb, Smartphone, Tag } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminMobileApi, type DeviceQuery, type MobileDeviceRow } from '@/api/admin-mobile.api';
import { formatDate, formatRelative } from '@/lib/format';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { num, Pill } from '@/features/shared/kit';
import { industryLabel, LANGUAGE_LABEL, PLATFORM_LABEL } from '../components/MobileUi';

const ACTIVE = [['ALL', 'Any time'], ['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days']];
const SORTS = [['lastSeen', 'Last seen'], ['firstSeen', 'Newest install'], ['version', 'Version']];

export default function MobileDevicesPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ platform: 'ALL', version: 'ALL', active: 'ALL', sort: 'lastSeen', tenantId: '' });
  const { platform, version, active, sort, tenantId } = list.filters;

  const query: DeviceQuery = {
    q: list.debouncedSearch || undefined,
    platform: platform === 'ALL' ? undefined : platform,
    version: version === 'ALL' ? undefined : version,
    tenantId: tenantId || undefined,
    activeDays: active === 'ALL' ? undefined : Number(active),
    sort: sort as DeviceQuery['sort'],
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-mobile-devices', query, list.page, list.limit],
    queryFn: () => adminMobileApi.devices({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  const { data: targets } = useQuery({ queryKey: ['admin-mobile-targets'], queryFn: adminMobileApi.targets, staleTime: 60_000 });
  const overview = useQuery({ queryKey: ['admin-mobile-overview', 30], queryFn: () => adminMobileApi.overview(30), staleTime: 60_000 });
  const rows = data?.items ?? [];
  const o = overview.data?.totals;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminMobileApi.devices({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<MobileDeviceRow>('devices', all, [
        { label: 'Shop', value: (d) => d.tenant.name }, { label: 'Person', value: (d) => d.user.fullName }, { label: 'Email', value: (d) => d.user.email },
        { label: 'Platform', value: (d) => PLATFORM_LABEL[d.platform] ?? d.platform }, { label: 'Model', value: (d) => d.deviceModel }, { label: 'OS', value: (d) => d.osVersion },
        { label: 'App version', value: (d) => d.appVersion }, { label: 'Language', value: (d) => d.language }, { label: 'Push', value: (d) => (d.hasPush ? 'On' : 'Off') },
        { label: 'Installed', value: (d) => d.firstSeenAt.slice(0, 10) }, { label: 'Last seen', value: (d) => d.lastSeenAt },
      ]);
      toast.success(`${num(all.length)} devices exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    platform !== 'ALL' && <FilterChip key="p" onRemove={() => list.setFilter('platform', 'ALL')}>{PLATFORM_LABEL[platform] ?? platform}</FilterChip>,
    version !== 'ALL' && <FilterChip key="v" onRemove={() => list.setFilter('version', 'ALL')}>Version {version}</FilterChip>,
    active !== 'ALL' && <FilterChip key="a" onRemove={() => list.setFilter('active', 'ALL')}>{ACTIVE.find(([v]) => v === active)?.[1]}</FilterChip>,
    tenantId && <FilterChip key="t" onRemove={() => list.setFilter('tenantId', '')}>{rows[0]?.tenant.name ?? 'One shop'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Devices"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={overview.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={o ? [
          { label: 'All devices', value: num(o.devices) },
          { label: 'Active today', value: num(o.activeToday) },
          { label: 'Active in 30 days', value: num(o.active30d) },
          { label: 'Push reachable', value: num(o.pushReachable30d) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop, person, email or phone model" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Smartphone} label="Platform" value={platform} active={platform !== 'ALL'} onChange={(v) => list.setFilter('platform', v)}
          options={[{ value: 'ALL', label: 'All platforms' }, { value: 'android', label: 'Android' }, { value: 'ios', label: 'iOS' }]} />
        <FilterMenu icon={Tag} label="Version" value={version} active={version !== 'ALL'} onChange={(v) => list.setFilter('version', v)}
          options={[{ value: 'ALL', label: 'All versions' }, ...(targets?.versions ?? []).map((v) => ({ value: v.version, label: `${v.version} (${v.devices})` }))]} />
        <FilterMenu icon={CalendarClock} label="Last seen" value={active} active={active !== 'ALL'} onChange={(v) => list.setFilter('active', v)}
          options={ACTIVE.map(([value, label]) => ({ value, label }))} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} align="right"
          options={SORTS.map(([value, label]) => ({ value, label }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Smartphone className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load devices' : 'No device matches'}
        emptyText={error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="60rem">
          <THead>
            <Tr><Th>Shop</Th><Th>Person</Th><Th>Device</Th><Th>Version</Th><Th>Language</Th><Th>Push</Th><Th>Installed</Th><Th align="right">Last seen</Th></Tr>
          </THead>
          <TBody>
            {rows.map((d) => (
              <Tr key={d.id} interactive onClick={() => navigate(`/mobile/devices/${d.id}`)}>
                <Td>
                  <Link to={`/mobile/devices/${d.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-brand-700">{d.tenant.name}</Link>
                  <div className="text-[0.75rem] text-slate-500">{industryLabel(d.tenant.businessType)}</div>
                </Td>
                <Td><div className="font-medium text-slate-800">{d.user.fullName}</div><div className="text-[0.75rem] text-slate-500">{d.user.role.toLowerCase()}</div></Td>
                <Td><div className="text-slate-800">{d.deviceModel ?? 'Unknown model'}</div><div className="text-[0.75rem] text-slate-500">{PLATFORM_LABEL[d.platform] ?? d.platform} {d.osVersion ?? ''}</div></Td>
                <Td><span className="font-semibold tabular-nums">{d.appVersion}</span>{d.buildNumber && <span className="text-[0.75rem] text-slate-500"> ({d.buildNumber})</span>}</Td>
                <Td>{LANGUAGE_LABEL[d.language ?? 'unknown'] ?? d.language}</Td>
                <Td>{d.hasPush ? <Pill tone="emerald"><BellRing className="h-3 w-3" />On</Pill> : <Pill><BellOff className="h-3 w-3" />Off</Pill>}</Td>
                <Td className="whitespace-nowrap">{formatDate(d.firstSeenAt)}</Td>
                <Td align="right" className="whitespace-nowrap">{formatRelative(d.lastSeenAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Devices"
          description="Every phone and tablet running the new app, with the shop, person, version and when it was last used."
          flowTitle="How a device gets here"
          flow={[
            { label: 'App opens', hint: 'Sends a check-in', icon: Smartphone, color: '#4f46e5' },
            { label: 'Listed here', hint: 'One row per install', icon: Tag, color: '#0284c7' },
            { label: 'Push on?', hint: 'Needs notifications allowed', icon: BellRing, color: '#d97706' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Filter', text: 'Narrow by platform, version and last seen. Filters stay in the address.' },
            { icon: Smartphone, color: '#0d9488', title: 'Open a device', text: 'Click a row to see the app, the person and to stop push or forget the device.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every device that matches, not only this page.' },
          ]}
          tips={['Open a shop from the overview to list only its devices.', 'A removed device comes back the next time the app opens.']}
          shortcuts={[['/', 'Search'], ['↑ ↓', 'Move between rows'], ['Enter', 'Open device'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
