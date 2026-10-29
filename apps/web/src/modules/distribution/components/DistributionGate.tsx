/**
 * Wraps every distribution page. Shows a short explanation instead of the
 * page while the plan lacks the feature or the switch is off, so staff never
 * land on a screen full of refused requests.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Settings, Truck } from 'lucide-react';
import { Button, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useDistributionState } from '../hooks/useDistribution';

export function DistributionGate({ children }: { children: ReactNode }) {
  const { state, data } = useDistributionState();
  const canSettings = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const canBilling = usePermission(PERMISSIONS.BILLING_VIEW);

  if (state === 'on') return <>{children}</>;
  if (state === 'loading') {
    return (
      <PageShell>
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </PageShell>
    );
  }

  const plan = state === 'plan';
  return (
    <PageShell>
      <PageHero title="Distribution" chip={<><Truck /> Wholesale</>} meta="Booker se order, Invoice, load sheet, delivery aur recovery — sab ek jagah" />
      <section className="mx-auto w-full max-w-xl rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200/80">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          {plan ? <Lock className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
        </span>
        <h2 className="mt-4 text-[1.0625rem] font-semibold text-slate-900">
          {plan ? `Aap ke plan${data?.access.planName ? ` (${data.access.planName})` : ''} me Distribution shamil nahi` : 'Distribution abhi band hai'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-slate-500">
          {plan
            ? 'Order booker, load sheet, route aur recovery ke liye plan upgrade karein.'
            : 'Settings me Distribution on karein — phir orders, load sheets aur recoveries yahan dikhenge.'}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {plan && canBilling && <Link to="/billing"><Button>Plan dekhein</Button></Link>}
          {!plan && canSettings && <Link to="/settings/distribution"><Button leftIcon={<Settings className="h-4 w-4" />}>Settings kholein</Button></Link>}
          {!(plan ? canBilling : canSettings) && <p className="text-[0.8125rem] text-slate-500">Dukaan ke malik se kahein.</p>}
        </div>
      </section>
    </PageShell>
  );
}
