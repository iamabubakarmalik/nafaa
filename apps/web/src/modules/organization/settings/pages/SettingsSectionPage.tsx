/**
 * One settings page (store details, counter rules, receipt…). Loads the
 * shop's settings once, shows a skeleton while they load, and locks every
 * control for people who may only view settings. The Settings frame around
 * it supplies the title, the folder sidebar and the search.
 */

import type { ReactNode } from 'react';
import { Eye, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/design-system/components';
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
        {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <SettingsIcon className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Settings load nahi huin</p>
        <p className="mt-1 text-sm text-slate-500">Internet check karein aur dobara koshish karein.</p>
        <Button variant="secondary" size="sm" className="mt-4" loading={isRefetching} onClick={() => refetch()}>Dobara koshish</Button>
      </div>
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
