import { useQuery } from '@tanstack/react-query';
import { Flame, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { marketplaceClient, unwrap } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { Card, Badge } from '@/ui';
import { cn } from '@/lib/cn';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  weekProgress: Array<{ day: string; date: string; checked: boolean; reward: number }>;
  nextMilestone: { days: number; reward: string } | null;
}

export function DailyStreak() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const { data, refetch } = useQuery({
    queryKey: ['daily-streak'],
    queryFn: (): Promise<StreakData> => marketplaceClient.get('/streaks/mine').then((r) => unwrap<StreakData>(r)),
    enabled: isAuth,
    staleTime: 60_000,
  });

  const checkInMutation = () => {
    marketplaceClient.post('/streaks/check-in').then(() => refetch());
  };

  if (!isAuth || !data) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center animate-pulse-soft">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-black text-content-muted uppercase tracking-wider">
              Daily streak
            </div>
            <div className="text-2xl font-black text-content">
              {data.currentStreak} day{data.currentStreak !== 1 ? 's' : ''} 🔥
            </div>
          </div>
        </div>
        {data.longestStreak > 0 && (
          <div className="text-right">
            <div className="text-2xs font-bold text-content-muted uppercase">Best</div>
            <div className="text-lg font-black text-content">{data.longestStreak}</div>
          </div>
        )}
      </div>

      {/* Week visual */}
      <div className="flex gap-1.5 justify-between">
        {data.weekProgress.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="text-2xs font-bold text-content-muted mb-1">{day.day}</div>
            <div className={cn(
              'h-11 w-full rounded-xl flex flex-col items-center justify-center text-2xs font-black transition-all',
              day.checked
                ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md'
                : day.date === new Date().toISOString().split('T')[0]
                  ? 'bg-white dark:bg-surface border-2 border-orange-400 border-dashed animate-pulse'
                  : 'bg-surface-muted text-content-subtle',
            )}>
              {day.checked ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : day.date > new Date().toISOString().split('T')[0] ? (
                <Lock className="h-3 w-3" />
              ) : (
                <span>+{day.reward}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.nextMilestone && (
        <div className="mt-3 p-2 rounded-xl bg-white/60 dark:bg-black/20 text-center">
          <div className="text-2xs font-bold text-content-muted">
            🎁 <span className="text-content font-black">{data.nextMilestone.days - data.currentStreak} days</span> to unlock <strong className="text-orange-600 dark:text-orange-400">{data.nextMilestone.reward}</strong>
          </div>
        </div>
      )}

      {!data.checkedInToday && (
        <button
          onClick={checkInMutation}
          className="w-full mt-3 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm shadow-md hover:scale-[1.02] transition flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Check in for today
        </button>
      )}

      {data.checkedInToday && (
        <div className="mt-3 flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 text-sm font-black">
          <CheckCircle2 className="h-4 w-4" />
          Checked in today ✓
        </div>
      )}
    </Card>
  );
}
