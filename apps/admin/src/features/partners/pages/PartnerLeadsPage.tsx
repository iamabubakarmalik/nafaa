/**
 * Partner leads: every shop any partner has added, with its stage from first
 * visit to paid. Search and filters run on the server; CSV exports the whole
 * filtered list.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, BadgeCheck, ClipboardList, Download, Lightbulb, Lock, MapPin, Store, Wallet } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi, type PartnerLead } from '@/api/admin-partners.api';
import { formatDateTime, num } from '@/lib/format';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { LEAD_STAGES, STAGE_LABEL } from '../lib/partner-text';
import { LeadsTable } from '../components/LeadsTable';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'updated', label: 'Recently changed' },
  { value: 'follow_up', label: 'Follow-up date' },
  { value: 'oldest', label: 'Oldest first' },
];
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot', 'Gujranwala'];

export default function PartnerLeadsPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ stage: 'ALL', city: '', partner: '', sort: 'newest' });
  const { stage, city, partner, sort } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    stage: stage === 'ALL' ? undefined : stage,
    city: city || undefined,
    partnerId: partner || undefined,
    sort,
  };
  const leads = useQuery({
    queryKey: ['admin', 'partners', 'leads', 'all', query, list.page, list.limit],
    queryFn: () => adminPartnersApi.leads({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = leads.data?.items ?? [];
  const count = (s: string) => leads.data?.stages.find((x) => x.stage === s)?.count ?? 0;
  const open = count('VISITED') + count('DEMO');

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminPartnersApi.leads({ ...query, page, limit: 100 }));
      downloadCsv<PartnerLead>('partner-leads', all, [
        { label: 'Shop', value: (l) => l.shopName },
        { label: 'Owner', value: (l) => l.ownerName },
        { label: 'Phone', value: (l) => l.phone },
        { label: 'City', value: (l) => l.city },
        { label: 'Category', value: (l) => l.category },
        { label: 'Stage', value: (l) => STAGE_LABEL[l.stage] },
        { label: 'Lost reason', value: (l) => l.lostReason },
        { label: 'Partner', value: (l) => l.partner.fullName },
        { label: 'Partner code', value: (l) => l.partner.code },
        { label: 'Visits', value: (l) => l.visits },
        { label: 'Follow-up', value: (l) => (l.followUpAt ? formatDateTime(l.followUpAt) : '') },
        { label: 'Signed up', value: (l) => (l.signedUpAt ? formatDateTime(l.signedUpAt) : '') },
        { label: 'Paid', value: (l) => (l.paidAt ? formatDateTime(l.paidAt) : '') },
        { label: 'Added', value: (l) => formatDateTime(l.createdAt) },
      ]);
      toast.success(`${num(all.length)} leads exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    stage !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('stage', 'ALL')}>{STAGE_LABEL[stage as keyof typeof STAGE_LABEL]}</FilterChip>,
    city && <FilterChip key="c" onRemove={() => list.setFilter('city', '')}>City: {city}</FilterChip>,
    partner && <FilterChip key="p" onRemove={() => list.setFilter('partner', '')}>{rows[0]?.partner.id === partner ? rows[0].partner.fullName : 'One partner'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Partner leads"
        chip={leads.data ? `${num(leads.data.stages.reduce((n, s) => n + s.count, 0))} leads` : undefined}
        busy={leads.isFetching}
        loading={leads.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span></button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={leads.data ? [
          { label: 'Open (visited or demo)', value: num(open) },
          { label: 'Signed up', value: num(count('SIGNED_UP') + count('ACTIVATED') + count('PAID')), hint: `${num(count('ACTIVATED'))} activated` },
          { label: 'Paid', value: num(count('PAID')) },
          { label: 'Lost', value: num(count('LOST')) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop, owner or phone" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={ClipboardList} label="Stage" value={stage} active={stage !== 'ALL'} onChange={(v) => list.setFilter('stage', v)}
          options={[{ value: 'ALL', label: 'All stages' }, ...LEAD_STAGES.map((s) => ({ value: s, label: `${STAGE_LABEL[s]} (${num(count(s))})` }))]} />
        <FilterMenu icon={MapPin} label="City" value={city || 'ALL'} active={!!city} onChange={(v) => list.setFilter('city', v === 'ALL' ? '' : v)}
          options={[{ value: 'ALL', label: 'All cities' }, ...CITIES.map((c) => ({ value: c, label: c }))]} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={SORTS} align="right" />
      </FilterBar>

      <ListCard loading={leads.isLoading} empty={!rows.length} emptyIcon={<ClipboardList className="h-6 w-6" />} emptyTitle="No leads match" emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={leads.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <LeadsTable rows={rows} />
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Partner leads"
          description="Shops partners are working on. A lead's phone belongs to the partner who added it first, for 30 days."
          flowTitle="A lead's stages"
          flow={[
            { label: 'Visited', icon: MapPin, color: '#64748b' },
            { label: 'Demo', icon: Store, color: '#0284c7' },
            { label: 'Signed up', icon: BadgeCheck, color: '#4f46e5' },
            { label: 'Activated', hint: 'Real sales', icon: ClipboardList, color: '#d97706' },
            { label: 'Paid', icon: Wallet, color: '#059669' },
          ]}
          steps={[
            { icon: ClipboardList, color: '#4f46e5', title: 'Filter', text: 'Narrow by stage and city, or search a shop, owner or phone.' },
            { icon: Lock, color: '#d97706', title: 'Lock', text: 'While a lead is locked, no other partner can add the same phone, and a signup from that phone counts for this partner.' },
            { icon: Store, color: '#059669', title: 'Signed-up shops', text: 'Click the shop name of a signed-up lead to open the shop.' },
          ]}
          tips={['Stages after Signed up are set by Nafaa, not by the partner.', 'A phone that already belongs to a Nafaa shop cannot be added as a lead.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
