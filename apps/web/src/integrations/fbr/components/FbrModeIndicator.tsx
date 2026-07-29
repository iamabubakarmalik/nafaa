import { useQuery } from '@tanstack/react-query';
import { Shield, ShieldOff } from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import { cn } from '@core/lib/cn';

/**
 * Small badge shown in POS checkout header — tells user what will happen
 * to this sale w.r.t. FBR when they complete it.
 */
export function FbrModeIndicator({ saleTotal, className }: { saleTotal?: number; className?: string }) {
  const { data: config } = useQuery({
    queryKey: ['fbr-config-brief'],
    queryFn: fbrApi.getConfig,
    staleTime: 60_000,
  });

  if (!config || !config.isEnabled) {
    return null;
  }

  let msg = '';
  let icon = <Shield className="h-3 w-3" />;
  let bg = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';

  if (config.submissionMode === 'DISABLED') {
    msg = 'FBR: Not submitting';
    icon = <ShieldOff className="h-3 w-3" />;
    bg = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  } else if (config.submissionMode === 'MANUAL') {
    msg = 'FBR: Manual (post-sale)';
    bg = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
  } else if (config.submissionMode === 'AUTO_ALL') {
    msg = 'FBR: Auto-submit ON';
  } else if (config.submissionMode === 'AUTO_ABOVE_LIMIT') {
    const threshold = Number(config.autoSubmitThreshold ?? 0);
    if (saleTotal && saleTotal >= threshold) {
      msg = `FBR: Auto (≥ Rs ${threshold})`;
    } else {
      msg = `FBR: Skip (< Rs ${threshold})`;
      bg = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
    }
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
      bg, className,
    )}>
      {icon}
      {msg}
      {config.environment === 'SANDBOX' && (
        <span className="ml-1 px-1 rounded bg-amber-500 text-white text-[8px]">SANDBOX</span>
      )}
    </div>
  );
}
