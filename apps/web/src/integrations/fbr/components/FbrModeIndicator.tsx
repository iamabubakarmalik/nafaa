import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import { taxAuthorityApi } from '@integrations/tax-authority/taxAuthority.api';
import { cn } from '@core/lib/cn';

const NAME: Record<string, string> = { PRA: 'PRA', SRB: 'SRB', KPRA: 'KPRA', FBR: 'FBR' };

/**
 * POS par chhota sa nishan: tax chalu hai to "PRA: har bill authority ko".
 * Band ho to kuch nahi. (Naam purana — 18 POS pages yahi lagate hain.)
 */
export function FbrModeIndicator({ className }: { saleTotal?: number; className?: string }) {
  const { data } = useQuery({ queryKey: ['tax-authority-pos'], queryFn: taxAuthorityApi.pos, staleTime: 10 * 60_000, retry: false });
  if (!data?.enabled || !data.authority) return null;
  const test = data.env !== 'live';
  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold',
      test ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', className)}>
      <Landmark className="h-3 w-3" />
      {NAME[data.authority] ?? data.authority}: har bill authority ko{test ? ' (test)' : ''}
    </div>
  );
}
