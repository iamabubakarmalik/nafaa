/**
 * Under the customer on the bill: the farmer's village, land and crops, the
 * udhaar by crop season with its recovery date, and the credit limit. A
 * customer who is not a farmer yet gets a link to make them one.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Ban, MapPin, Tractor, UserPlus } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { farmersApi } from '../api/farmers.api';
import { shortDate } from '../lib/meta';

export function FarmerStrip({ customerId }: { customerId?: string | null }) {
  const { sales: money } = useMasked();
  const canView = usePermission(PERMISSIONS.AGRI_FARMERS_VIEW);
  const canAdd = usePermission(PERMISSIONS.AGRI_FARMERS_MANAGE);
  const { data: f, isLoading } = useQuery({
    queryKey: ['agri-farmer-by-customer', customerId],
    queryFn: () => farmersApi.byCustomer(customerId!).catch(() => null),
    enabled: !!customerId && canView,
    staleTime: 30_000,
  });
  if (!customerId || !canView || isLoading) return null;
  if (!f) {
    return canAdd ? (
      <Link to={`/agri/farmers/new?customer=${customerId}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50">
        <UserPlus className="h-4 w-4" />Farmer banayein — gaon, zameen aur season ka udhaar
      </Link>
    ) : null;
  }
  const owed = f.currentBalance || 0;
  const limit = f.creditLimit || 0;
  const pct = limit > 0 ? Math.min((owed / limit) * 100, 100) : 0;
  const due = f.dueNow ?? 0;
  const stopped = f.status === 'SUSPENDED' || f.status === 'CLOSED';
  const next = (f.seasons ?? []).find((s) => !s.due);
  return (
    <div className="space-y-1.5 rounded-xl bg-lime-50/70 px-3 py-2 ring-1 ring-lime-200">
      <div className="flex items-center gap-2">
        <Tractor className="h-4 w-4 shrink-0 text-lime-700" />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-900">{f.fullName} <span className="font-normal text-slate-500">· {f.farmerNumber}</span></span>
        <Link to={`/agri/farmers/${f.id}`} className="text-[0.6875rem] font-semibold text-brand-700 hover:underline">Khata</Link>
      </div>
      <p className="flex items-center gap-1 truncate text-[0.6875rem] text-slate-600">
        <MapPin className="h-3 w-3 shrink-0" />{[f.village, f.district].filter(Boolean).join(', ') || 'Gaon nahi likha'}{f.landAreaAcres ? ` · ${f.landAreaAcres} acre` : ''}{f.primaryCrops?.length ? ` · ${f.primaryCrops.slice(0, 3).join(', ')}` : ''}
      </p>
      <div className="flex items-center justify-between text-[0.75rem]">
        <span className="text-slate-600">Udhaar</span>
        <span className={cn('font-bold tabular-nums', owed > 0 ? 'text-slate-900' : 'text-slate-400')}>{money(owed)}{(f.advance ?? 0) > 0 && <span className="ml-1 font-medium text-emerald-700">· advance {money(f.advance)}</span>}</span>
      </div>
      {limit > 0 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white"><div className={cn('h-full rounded-full', f.overLimit ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} /></div>
          <p className={cn('mt-0.5 text-[0.6875rem] tabular-nums', f.overLimit ? 'font-semibold text-rose-700' : 'text-slate-500')}>Had {money(limit)}{f.overLimit ? ' — had se upar, udhaar par manager PIN lagega' : ''}</p>
        </div>
      )}
      {due > 0 && <p className="flex items-center gap-1 text-[0.6875rem] font-semibold text-rose-700"><AlertTriangle className="h-3 w-3" />{money(due)} pichle season ka — katai guzar gayi, wasooli karein</p>}
      {next && <p className="text-[0.6875rem] text-slate-500">{next.label}: {money(next.owed)} · wapsi {shortDate(next.recoveryBy)} tak</p>}
      {stopped && <p className="flex items-center gap-1 text-[0.6875rem] font-semibold text-rose-700"><Ban className="h-3 w-3" />Udhaar roka hua — {f.suspensionReason || 'cash par dein'}</p>}
    </div>
  );
}
