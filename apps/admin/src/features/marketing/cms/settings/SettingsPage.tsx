/**
 * Website → Settings (ARCH 13 screen 9). One tab per settings key; each tab
 * saves on its own with history. The selected tab is kept in ?tab=.
 */
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../_shared/components/PageHeader';
import { errorMessage } from '../dashboard/shared/cms-http';
import { Spinner, Tabs } from '../dashboard/shared/ui';
import { EntitySettingsTab } from './EntitySettingsTab';
import { AnalyticsSettingsTab, IndustryGroupsTab, SeoSettingsTab } from './MoreSettingsTabs';
import { PricingSettingsTab } from './PricingSettingsTab';
import { settingsApi } from './settings.api';
import { SiteSettingsTab } from './SiteSettingsTab';

const TABS = [
  { key: 'site', label: 'Site' },
  { key: 'entity', label: 'Entity facts' },
  { key: 'pricing', label: 'Pricing display' },
  { key: 'seo', label: 'SEO defaults' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'industry-groups', label: 'Industry groups' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'site') as TabKey;
  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({ queryKey: ['cms-settings'], queryFn: () => settingsApi.all() });

  return (
    <div className="space-y-6">
      <PageHeader title="Website settings" subtitle="Har tab alag save hota hai. Badlaav kuch second me site par aa jate hain." />
      <Tabs tabs={TABS} value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{errorMessage(error)}</p>
      ) : (
        // `key` remounts the form after a save so it shows the stored value.
        <div key={`${tab}-${dataUpdatedAt}`}>
          {tab === 'site' && <SiteSettingsTab value={data?.site ?? null} />}
          {tab === 'entity' && <EntitySettingsTab value={data?.entity ?? null} />}
          {tab === 'pricing' && <PricingSettingsTab value={data?.pricing ?? null} />}
          {tab === 'seo' && <SeoSettingsTab value={data?.seo ?? null} />}
          {tab === 'analytics' && <AnalyticsSettingsTab value={data?.analytics ?? null} />}
          {tab === 'industry-groups' && <IndustryGroupsTab value={data?.industryGroups ?? null} />}
        </div>
      )}
    </div>
  );
}
