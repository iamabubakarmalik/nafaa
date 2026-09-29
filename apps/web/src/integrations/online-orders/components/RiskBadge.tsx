import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { CustomerRisk } from '../api/online-orders.api';
import { rs } from '../lib/labels';
import { cn } from '@core/lib/cn';

const TONE: Record<CustomerRisk['level'], string> = {
  NEW: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  TRUSTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  OK: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  WATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  HIGH: 'bg-rose-600 text-white',
  BLOCKED: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
};

/** List ki chhoti badge — sirf jahan kuch batane layak ho */
export function RiskBadge({ risk }: { risk?: CustomerRisk | null }) {
  if (!risk) return null;
  return (
    <>
      {risk.level !== 'OK' && (
        <span title={risk.reason} className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-black', TONE[risk.level])}>
          {risk.level === 'HIGH' ? '⚠ ' : risk.level === 'TRUSTED' ? '★ ' : risk.level === 'BLOCKED' ? '⛔ ' : ''}{risk.label}
        </span>
      )}
      {(risk.duplicateOpen ?? 0) > 0 && (
        <span title="Isi customer ka pehle se ek order khula hai" className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
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
      risk.level === 'BLOCKED' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : risk.level === 'HIGH' ? 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200'
        : risk.level === 'WATCH' ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'
          : risk.level === 'TRUSTED' ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200'
            : 'bg-slate-50 text-slate-700 dark:bg-neutral-800/60 dark:text-slate-200')}>
      <div className="flex items-center gap-2 font-black"><Icon className="h-4 w-4" /> {risk.label}</div>
      <div className="mt-0.5 text-xs font-semibold opacity-90">{risk.reason}</div>
      {(risk.duplicateOpen ?? 0) > 0 && (
        <div className="mt-1 text-xs font-black">⚠ Isi customer ke {risk.duplicateOpen} aur order abhi khule hain — dobara to nahi bheja?</div>
      )}
      {risk.total > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] font-bold opacity-80">
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
