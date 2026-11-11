/**
 * Website settings. One tab per settings key; each tab saves on its own with
 * history. The selected tab is kept in ?tab=.
 */
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PageHero, PageShell, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Globe, Lightbulb, Save, Settings2, SlidersHorizontal } from 'lucide-react';
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
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'site') as TabKey;
  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({ queryKey: ['cms-settings'], queryFn: () => settingsApi.all() });

  return (
    <PageShell>
      <PageHero
        title="Website settings"
        chip={TABS.find((t) => t.key === tab)?.label}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={[
          { label: 'Site name', value: data?.site?.name ?? '—' },
          { label: 'Languages', value: data?.site?.locales?.join(', ') ?? '—' },
          { label: 'Plans shown', value: data?.pricing ? Object.keys(data.pricing.plans ?? {}).length : '—' },
        ]}
      />
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

      {guide.isOpen && (
        <PageGuide
          title="Website settings"
          description="Names, links, facts and defaults the whole website reads from."
          flowTitle="Changing a setting"
          flow={[
            { label: 'Pick a tab', hint: 'Site, SEO, Pricing…', icon: SlidersHorizontal, color: '#4f46e5' },
            { label: 'Edit fields', hint: 'Checked on save', icon: Settings2, color: '#d97706' },
            { label: 'Save', hint: 'Each tab on its own', icon: Save, color: '#0284c7' },
            { label: 'Live in seconds', hint: 'Site refreshes', icon: Globe, color: '#059669' },
          ]}
          steps={[
            { icon: Save, color: '#0284c7', title: 'Each tab saves alone', text: 'Saving one tab never changes another. Every save is kept in the tab history.' },
            { icon: Settings2, color: '#d97706', title: 'Facts must be true', text: 'Entity facts feed Google and AI search. Leave a field empty if you cannot prove it.' },
            { icon: Globe, color: '#059669', title: 'Pricing display', text: 'Prices come from Plans in the admin. Here you only choose how they are labelled.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
