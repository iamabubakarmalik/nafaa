/**
 * One settings page (store details, counter rules, receipt…). Loads the
 * shop's settings once, shows a skeleton while they load, and locks every
 * control for people who may only view settings. The Settings frame around
 * it supplies the title, the folder sidebar and the search.
 */

import type { ReactNode } from 'react';
import { Eye, Settings as SettingsIcon } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import type { TenantSettings } from '../api/settings.api';
import { useSettings } from '../hooks/useSettings';
import { BusinessProfileSection } from '../sections/BusinessProfileSection';
import { BusinessConfigSection } from '../sections/BusinessConfigSection';
import { LocalizationSection } from '../sections/LocalizationSection';
import { TaxSection } from '../sections/TaxSection';
import { ReportsSection } from '../sections/ReportsSection';
import { POSSection } from '../sections/POSSection';
import { ReceiptSection } from '../sections/ReceiptSection';
import { InventorySection } from '../sections/InventorySection';
import { CustomerSection } from '../sections/CustomerSection';
import { NotificationsSection } from '../sections/NotificationsSection';
import { WhatsappSection } from '../sections/WhatsappSection';
import { SecuritySection } from '../sections/SecuritySection';
import { BackupSection } from '../sections/BackupSection';
import { DangerZoneSection } from '../sections/DangerZoneSection';
import { DistributionSettingsSection } from '@modules/distribution/setup/settings/DistributionSettingsSection';

const SECTIONS = {
  store: (s: TenantSettings) => <BusinessProfileSection settings={s} />,
  'business-type': () => <BusinessConfigSection />,
  language: (s: TenantSettings) => <LocalizationSection settings={s} />,
  tax: (s: TenantSettings) => <TaxSection settings={s} />,
  reports: (s: TenantSettings) => <ReportsSection settings={s} />,
  counter: (s: TenantSettings) => <POSSection settings={s} />,
  receipt: () => <ReceiptSection />,
  stock: (s: TenantSettings) => <InventorySection settings={s} />,
  'credit-loyalty': (s: TenantSettings) => <CustomerSection settings={s} />,
  notifications: (s: TenantSettings) => <NotificationsSection settings={s} />,
  whatsapp: (s: TenantSettings) => <WhatsappSection settings={s} />,
  security: () => <SecuritySection />,
  'data-export': () => <BackupSection />,
  danger: () => <DangerZoneSection />,
  distribution: () => <DistributionSettingsSection />,
} satisfies Record<string, (s: TenantSettings) => ReactNode>;

type SettingsSectionId = keyof typeof SECTIONS;

export default function SettingsSectionPage({ section }: { section: SettingsSectionId }) {
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const { data, isLoading, refetch, isRefetching } = useSettings();
  const settings = data?.settings;
  const render: (s: TenantSettings) => ReactNode = SECTIONS[section];

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <EmptyState icon={<SettingsIcon className="h-6 w-6" />} title="Settings load nahi huin"
          description="Internet check karein aur dobara koshish karein."
          action={<Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>Dobara koshish</Button>} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700">
          <Eye className="h-4 w-4 shrink-0 text-slate-500" />
          Aap yeh settings sirf dekh sakte hain. Badalne ki permission malik se lein.
        </div>
      )}
      {/* A disabled fieldset locks every control for people who may only look. */}
      <fieldset disabled={!canEdit} className="min-w-0 space-y-4">
        {render(settings)}
      </fieldset>
    </div>
  );
}
