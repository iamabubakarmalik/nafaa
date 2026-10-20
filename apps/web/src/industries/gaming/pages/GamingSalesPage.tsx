/**
 * Gaming sales history (SalesGate opens this page): the shared history,
 * with a mark under bills made outside the counter — station session,
 * rental, tournament entry or single card — linking to its page.
 */

import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, PackageOpen, Timer, Trophy } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { BILL_PREFIX } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold hover:underline';
const stop = (e: MouseEvent) => e.stopPropagation();

const MARKS = [
  { prefix: BILL_PREFIX.session, to: '/gaming/cafe', icon: Timer, label: 'Station', tone: 'bg-violet-50 text-violet-700' },
  { prefix: BILL_PREFIX.rental, to: '/gaming/rentals', icon: PackageOpen, label: 'Rental', tone: 'bg-sky-50 text-sky-700' },
  { prefix: BILL_PREFIX.tournament, to: '/gaming/tournaments', icon: Trophy, label: 'Tournament entry', tone: 'bg-amber-50 text-amber-800' },
  { prefix: BILL_PREFIX.topup, to: '/gaming/topups', icon: CreditCard, label: 'Card', tone: 'bg-emerald-50 text-emerald-700' },
];

function useGamingExtras() {
  return (sale: HistorySale) => {
    const m = MARKS.find((x) => sale.saleNumber.startsWith(x.prefix));
    if (!m) return null;
    const Icon = m.icon;
    return (
      <div className="mt-1.5">
        <Link to={m.to} onClick={stop} className={`${chip} ${m.tone}`}><Icon className="h-3 w-3" />{m.label} {sale.sourceRef}</Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Gaming', useBillExtras: useGamingExtras };

export default function GamingSalesPage() {
  return <SalesHistoryPage config={config} />;
}
