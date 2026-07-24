import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Flame } from 'lucide-react';
import { dealsApi } from '@/features/deals/api/deals.api';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/cn';

export function FlashSaleBanner() {
  const { data: flashSales } = useQuery({
    queryKey: ['flash-sales-banner'],
    queryFn: dealsApi.flashSales,
    staleTime: 60_000,
  });

  const activeSale = flashSales?.[0];
  const cd = useCountdown(activeSale?.endsAt);

  if (!activeSale || cd.expired) return null;

  const isEndingSoon = cd.total < 3_600_000;

  return (
    <Link to={`/deals`} className="block">
      <div className={cn(
        'relative overflow-hidden rounded-3xl p-4 flex items-center gap-3 group',
        isEndingSoon
          ? 'bg-gradient-to-r from-danger via-red-500 to-orange-500 animate-pulse-soft'
          : 'bg-gradient-to-r from-accent-500 via-orange-500 to-red-500',
      )}>
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3 w-full text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 animate-bounce-soft">
            <Flame className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xs font-black uppercase tracking-wider opacity-90">
              ⚡ Flash Sale
            </div>
            <div className="font-black text-sm md:text-base line-clamp-1">
              {activeSale.title}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xs font-bold opacity-90">Ends in</div>
            <div className="text-sm md:text-base font-black tabular-nums">
              {formatCountdown(cd)}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 group-hover:translate-x-1 transition" />
        </div>
      </div>
    </Link>
  );
}
