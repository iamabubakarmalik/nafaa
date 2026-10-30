/**
 * Wraps every distribution page. Shows a short explanation instead of the
 * page while the plan lacks the feature or the switch is off, so staff never
 * land on a screen full of refused requests. In Wholesale mode the van and
 * route pages explain how to switch to full distribution instead.
 */

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Lock, Settings, Truck } from 'lucide-react';
import { Button, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useDistributionState } from '../hooks/useDistribution';

/** Pages that belong to full distribution (vans, routes); hidden in Wholesale mode. */
export const FULL_ONLY_PATHS = ['/distribution/load-sheets', '/distribution/routes'];

export function DistributionGate({ children }: { children: ReactNode }) {
  const { state, data } = useDistributionState();
  const { pathname } = useLocation();
  const canSettings = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const canBilling = usePermission(PERMISSIONS.BILLING_VIEW);
  const fullOnly = data?.settings.mode === 'WHOLESALE' && FULL_ONLY_PATHS.some((p) => pathname.startsWith(p));

  if (state === 'on' && fullOnly) {
    return (
      <PageShell>
        <PageHero title="Distribution" chip={<><Truck /> Wholesale</>} meta="Aap ne sirf wholesale chuna hai" />
        <section className="mx-auto w-full max-w-xl rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200/80">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Truck className="h-6 w-6" /></span>
          <h2 className="mt-4 text-[1.0625rem] font-semibold text-slate-900">Ye hissa poori distribution ka hai</h2>
          <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-slate-500">
            Routes, booker, load sheet aur gaari se delivery chahiye to Settings me "Poori distribution" chunein. Price list, order aur recovery abhi bhi chalte hain.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {canSettings
              ? <Link to="/settings/distribution"><Button leftIcon={<Settings className="h-4 w-4" />}>Open settings</Button></Link>
              : <p className="text-[0.8125rem] text-slate-500">Dukaan ke malik se kahein.</p>}
          </div>
        </section>
      </PageShell>
    );
  }
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
            ? 'Aap ka setup tayyar hai — plan upgrade karte hi ye sab yahin chalu ho jayega:'
            : 'Settings me Distribution on karein — phir orders, load sheets aur recoveries yahan dikhenge.'}
        </p>
        {plan && (
          <ul className="mx-auto mt-4 grid max-w-sm gap-1.5 text-left text-[0.8125rem] text-slate-700">
            {['Price list har customer group ke liye', 'Order, Invoice aur udhaar ki limit', 'Recovery aur purane udhaar ki list', 'Booker app, routes aur load sheet'].map((t) => (
              <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{t}</li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex justify-center gap-2">
          {plan && canBilling && <Link to="/plans"><Button>See plans</Button></Link>}
          {!plan && canSettings && <Link to="/settings/distribution"><Button leftIcon={<Settings className="h-4 w-4" />}>Settings kholein</Button></Link>}
          {!(plan ? canBilling : canSettings) && <p className="text-[0.8125rem] text-slate-500">Dukaan ke malik se kahein.</p>}
        </div>
      </section>
    </PageShell>
  );
}
