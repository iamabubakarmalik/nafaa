/**
 * Data exports: download whole marketing datasets (subscribers, leads,
 * contact forms, demos, campaigns) as CSV, for one period or everything
 * from the last 90 days when no period is chosen.
 */

import { Calendar, Download, FileText, Megaphone, Users, Mail, MessageSquare, CalendarCheck } from 'lucide-react';
import { Button, Card, DateRangeMenu, FilterBar, PageHero, PageShell } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { exportsApi, type ExportEntity } from '@/api/marketing/marketing-exports.api';
import { useListParams } from '@/ui';
import { PERIOD_DEFAULTS, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, downloadServerCsv } from '../../lib/kit';

const ENTITIES: { key: ExportEntity; label: string; description: string; icon: typeof Mail }[] = [
  { key: 'subscribers', label: 'Newsletter subscribers', description: 'Emails, tags and engagement scores', icon: Mail },
  { key: 'leads', label: 'Marketing leads', description: 'All leads with score and temperature', icon: Users },
  { key: 'contact-forms', label: 'Contact forms', description: 'All submissions with their status', icon: MessageSquare },
  { key: 'demos', label: 'Demo bookings', description: 'Requested and completed demos', icon: CalendarCheck },
  { key: 'campaigns', label: 'Campaigns', description: 'Sent campaigns with open and click stats', icon: Megaphone },
];

export function ExportsPage() {
  const guide = usePageGuide();
  const list = useListParams(PERIOD_DEFAULTS);
  const q = periodQuery(list.filters);
  const chip = periodChip(list.filters);

  return (
    <PageShell>
      <PageHero
        title="Data exports"
        chip={chip ?? 'Last 90 days'}
        actions={<GuideButton onClick={guide.open} />}
        stats={[
          { label: 'Datasets', value: ENTITIES.length },
          { label: 'Period', value: chip ?? 'Last 90 days' },
          { label: 'Format', value: 'CSV' },
        ]}
      />

      <FilterBar>
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Period" />
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ENTITIES.map((e) => (
          <Card key={e.key} title={e.label} description={e.description}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><e.icon className="h-5 w-5" /></span>
              <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => downloadServerCsv(exportsApi.url(e.key, q.from, q.to), `nafaa-${e.key}-${new Date().toISOString().slice(0, 10)}.csv`)}>Download CSV</Button>
            </div>
          </Card>
        ))}
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Data exports"
          description="Take marketing data out of Nafaa to work on it in a spreadsheet."
          flowTitle="Exporting"
          flow={[
            { label: 'Pick a period', hint: 'Optional', icon: Calendar, color: '#4f46e5' },
            { label: 'Choose a dataset', hint: 'Leads, forms…', icon: FileText, color: '#0284c7' },
            { label: 'Download CSV', hint: 'Opens in Excel', icon: Download, color: '#059669' },
          ]}
          steps={[
            { icon: Calendar, color: '#4f46e5', title: 'Period', text: 'Without a period, the last 90 days are exported.' },
            { icon: Download, color: '#059669', title: 'Download', text: 'Each card downloads one file. Names with Urdu letters open correctly in Excel.' },
          ]}
          tips={['Each list page also has its own Export CSV that follows its filters.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
