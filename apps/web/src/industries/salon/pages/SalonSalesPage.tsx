/**
 * Salon sales history (SalesGate opens this page): the shared history, and
 * under each bill the appointment it closed with the stylists who did the
 * work, or the membership / package it sold.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Crown, Gift, Scissors } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { appointmentsApi } from '../api/appointments.api';
import { SALON_KEYS } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

function useSalonExtras(sales: HistorySale[]) {
  const ids = sales.filter((s) => !s.pending).map((s) => s.id);
  const q = useQuery({
    queryKey: [SALON_KEYS.appointments, 'by-sales', ids.join(',')],
    queryFn: () => appointmentsApi.list({ saleIds: ids.join(',') }),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
  const bySale = new Map((q.data ?? []).map((a) => [a.saleId, a]));

  return (sale: HistorySale) => {
    const ref = sale.sourceRef ?? sale.saleNumber;
    if (ref.startsWith('MEM-') || sale.saleNumber.startsWith('SLN-MEM-')) {
      return <div className="mt-1.5"><Link to="/salon/memberships" onClick={(e) => e.stopPropagation()} className={`${chip} bg-amber-50 text-amber-800 hover:underline`}><Crown className="h-3 w-3" /> Membership</Link></div>;
    }
    if (ref.startsWith('PKG-') || sale.saleNumber.startsWith('SLN-PKG-')) {
      return <div className="mt-1.5"><Link to="/salon/packages" onClick={(e) => e.stopPropagation()} className={`${chip} bg-success-50 text-success-800 hover:underline`}><Gift className="h-3 w-3" /> Package</Link></div>;
    }
    const apt = bySale.get(sale.id);
    if (!apt) return null;
    const people = [...new Set(apt.services.map((s) => s.staffName).filter((n): n is string => !!n))];
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Link to={`/salon/appointments/${apt.id}`} onClick={(e) => e.stopPropagation()} className={`${chip} bg-violet-50 text-violet-700 hover:underline`}>
          <CalendarCheck className="h-3 w-3" /> {apt.appointmentNumber}
        </Link>
        {people.map((n) => <span key={n} className={`${chip} bg-pink-50 text-pink-700`}><Scissors className="h-3 w-3" /> {n}</span>)}
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Salon', useBillExtras: useSalonExtras };

export default function SalonSalesPage() {
  return <SalesHistoryPage config={config} />;
}
