/**
 * Visit audit: field visits with their photo, location and the automatic
 * checks that may point to a fake visit. Admins mark each flagged visit OK
 * or Fake. Locations open in Google Maps.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Ban, Camera, Check, Filter, Lightbulb, MapPin, ShieldCheck } from 'lucide-react';
import { DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { num } from '@/lib/format';
import { ListCard, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { FLAG_TEXT } from '../lib/partner-text';
import { VisitsTable } from '../components/VisitsTable';

const REVIEWS = [
  { value: 'ALL', label: 'Any review' },
  { value: 'none', label: 'Not reviewed' },
  { value: 'ok', label: 'Checked OK' },
  { value: 'fake', label: 'Marked fake' },
];

export default function VisitAuditPage() {
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('partners.manage');
  const list = useListParams({ flagged: '1', review: 'none', partner: '', ...PERIOD_DEFAULTS });
  const { flagged, review, partner } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    flagged: flagged === '1' ? '1' : undefined,
    review: review === 'ALL' ? undefined : review,
    partnerId: partner || undefined,
    ...periodQuery(list.filters),
  };
  const visits = useQuery({
    queryKey: ['admin', 'partners', 'visits', 'audit', query, list.page, list.limit],
    queryFn: () => adminPartnersApi.visits({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = visits.data?.items ?? [];
  const stats = visits.data?.stats;
  const period = periodChip(list.filters);

  const chips = [
    flagged !== '1' && <FilterChip key="f" onRemove={() => list.setFilter('flagged', '1')}>All visits</FilterChip>,
    review !== 'none' && <FilterChip key="r" onRemove={() => list.setFilter('review', 'none')}>{REVIEWS.find((r) => r.value === review)?.label}</FilterChip>,
    partner && <FilterChip key="p" onRemove={() => list.setFilter('partner', '')}>{rows[0]?.partner.id === partner ? rows[0].partner.fullName : 'One partner'}</FilterChip>,
    period && <FilterChip key="d" onRemove={() => clearPeriod(list)}>{period}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Visit audit"
        chip={stats ? `${num(stats.flaggedOpen)} to check` : undefined}
        busy={visits.isFetching}
        loading={visits.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={stats ? [
          { label: 'Flagged, not reviewed', value: num(stats.flaggedOpen) },
          { label: 'Marked fake', value: num(stats.fake) },
          { label: 'In this list', value: num(visits.data?.meta.total) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop, partner or code" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={AlertTriangle} label="Show" value={flagged === '1' ? '1' : '0'} active={flagged !== '1'} onChange={(v) => list.setFilter('flagged', v)}
          options={[{ value: '1', label: 'Flagged visits' }, { value: '0', label: 'All visits' }]} />
        <FilterMenu icon={Filter} label="Review" value={review} active={review !== 'none'} onChange={(v) => list.setFilter('review', v)} options={REVIEWS} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
      </FilterBar>

      <ListCard loading={visits.isLoading} empty={!rows.length}
        emptyIcon={<ShieldCheck className="h-6 w-6" />}
        emptyTitle={flagged === '1' && review === 'none' ? 'Nothing to check' : 'No visits match'}
        emptyText={flagged === '1' && review === 'none' ? 'Every flagged visit has been reviewed.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={visits.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <VisitsTable rows={rows} canManage={canManage} />
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Visit audit"
          description="Each field visit is checked when it is saved. A flag does not block the visit; it asks you to look."
          flowTitle="Checking a visit"
          flow={[
            { label: 'Agent logs visit', hint: 'Photo + location', icon: Camera, color: '#4f46e5' },
            { label: 'Checks run', hint: 'Flags if odd', icon: AlertTriangle, color: '#d97706' },
            { label: 'You look', hint: 'Photo and map', icon: MapPin, color: '#0284c7' },
            { label: 'OK or Fake', icon: Check, color: '#059669' },
          ]}
          steps={[
            { icon: MapPin, color: '#0284c7', title: 'Open the map', text: 'The Map link opens the visit location in Google Maps. Compare it with the shop and the photo.' },
            { icon: Check, color: '#059669', title: 'OK', text: 'The visit is real; the flag is cleared from the to-check count.' },
            { icon: Ban, color: '#e11d48', title: 'Fake', text: 'Fake visits do not count towards targets or performance. Talk to the partner, and suspend them if it repeats.' },
          ]}
          tips={Object.values(FLAG_TEXT).map((t) => `Flag: ${t}.`)}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
