/**
 * Gym sales history (SalesGate opens this page): the shared history, and
 * under each bill what it was for: membership, renewal payment, freeze
 * fee, a PT session or package, a class booking or locker rent, with a
 * link to the record.
 */

import { Link } from 'react-router-dom';
import { Award, Calendar, Flame, HandCoins, KeyRound, Package, PauseCircle } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';
const MEMBERSHIP = /^GYM-(GYM-M-\d{4}-\d+)(?:-([PF])\d+)?$/;

function useGymExtras() {
  return (sale: HistorySale) => {
    const m = MEMBERSHIP.exec(sale.saleNumber);
    if (m) {
      const [, number, kind] = m;
      const meta = kind === 'F' ? { icon: PauseCircle, label: 'Freeze fee', tone: 'bg-sky-50 text-sky-800' }
        : kind === 'P' ? { icon: HandCoins, label: 'Fee wasool', tone: 'bg-success-50 text-success-800' }
          : { icon: Award, label: 'Membership', tone: 'bg-amber-50 text-amber-800' };
      const I = meta.icon;
      return <div className="mt-1.5"><Link to="/gym/memberships" onClick={(e) => e.stopPropagation()} className={`${chip} ${meta.tone} hover:underline`}><I className="h-3 w-3" /> {meta.label} · {number}</Link></div>;
    }
    const n = sale.saleNumber;
    if (n.startsWith('GYM-PTP-')) {
      return <div className="mt-1.5"><Link to="/gym/personal-training" onClick={(e) => e.stopPropagation()} className={`${chip} bg-violet-50 text-violet-700 hover:underline`}><Package className="h-3 w-3" /> PT package · {n.slice(4)}</Link></div>;
    }
    if (n.startsWith('GYM-CB-')) {
      return <div className="mt-1.5"><Link to="/gym/classes" onClick={(e) => e.stopPropagation()} className={`${chip} bg-sky-50 text-sky-800 hover:underline`}><Calendar className="h-3 w-3" /> Class · {n.slice(4)}</Link></div>;
    }
    if (n.startsWith('GYM-LKR-')) {
      return <div className="mt-1.5"><Link to="/gym/lockers" onClick={(e) => e.stopPropagation()} className={`${chip} bg-slate-100 text-slate-700 hover:underline`}><KeyRound className="h-3 w-3" /> {sale.sourceRef ?? 'Locker rent'}</Link></div>;
    }
    if (n.startsWith('GYM-PT-')) {
      return <div className="mt-1.5"><Link to="/gym/personal-training" onClick={(e) => e.stopPropagation()} className={`${chip} bg-rose-50 text-rose-700 hover:underline`}><Flame className="h-3 w-3" /> PT · {sale.saleNumber.slice(4)}</Link></div>;
    }
    return null;
  };
}

const config: SalesHistoryConfig = { label: 'Gym', useBillExtras: useGymExtras };

export default function GymSalesPage() {
  return <SalesHistoryPage config={config} />;
}
