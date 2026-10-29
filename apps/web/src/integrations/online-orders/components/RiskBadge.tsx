import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { CustomerRisk } from '../api/online-orders.api';
import { rs } from '../lib/labels';
import { cn } from '@core/lib/cn';

const TONE: Record<CustomerRisk['level'], string> = {
  NEW: 'bg-sky-100 text-sky-800',
  TRUSTED: 'bg-success-100 text-success-800',
  OK: 'bg-slate-100 text-slate-700',
  WATCH: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-rose-600 text-white',
  BLOCKED: 'bg-slate-900 text-white',
};

/** List ki chhoti badge — sirf jahan kuch batane layak ho */
export function RiskBadge({ risk }: { risk?: CustomerRisk | null }) {
  if (!risk) return null;
  return (
    <>
      {risk.level !== 'OK' && (
        <span title={risk.reason} className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold', TONE[risk.level])}>
          {risk.label}
        </span>
      )}
      {(risk.duplicateOpen ?? 0) > 0 && (
        <span title="Isi customer ka pehle se ek order khula hai" className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-violet-800">
          Dobara order ({risk.duplicateOpen})
        </span>
      )}
    </>
  );
}

/** Order detail ka customer card — pichhla hisaab */
export function RiskCard({ risk }: { risk?: CustomerRisk | null }) {
  if (!risk) return null;
  const Icon = risk.level === 'HIGH' || risk.level === 'WATCH' || risk.level === 'BLOCKED' ? ShieldAlert : risk.level === 'NEW' ? ShieldQuestion : ShieldCheck;
  return (
    <div className={cn('mt-3 rounded-xl px-3 py-2.5 text-sm',
      risk.level === 'BLOCKED' ? 'bg-slate-900 text-white'
        : risk.level === 'HIGH' ? 'bg-rose-50 text-rose-900'
        : risk.level === 'WATCH' ? 'bg-amber-50 text-amber-900'
          : risk.level === 'TRUSTED' ? 'bg-success-50 text-success-900'
            : 'bg-slate-50 text-slate-700')}>
      <div className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4" /> {risk.label}</div>
      <div className="mt-0.5 text-xs font-semibold opacity-90">{risk.reason}</div>
      {(risk.duplicateOpen ?? 0) > 0 && (
        <div className="mt-1 text-xs font-bold">Dhyan: isi customer ke {risk.duplicateOpen} aur order abhi khule hain — dobara to nahi bheja?</div>
      )}
      {risk.total > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[0.6875rem] font-bold opacity-80">
          <span>{risk.total} pichhle order</span>
          <span>{risk.delivered} liye</span>
          {risk.returned > 0 && <span>{risk.returned} wapas</span>}
          {risk.cancelled > 0 && <span>{risk.cancelled} cancel</span>}
          {risk.spent > 0 && <span>{rs(risk.spent)} ka maal liya</span>}
        </div>
      )}
    </div>
  );
}
