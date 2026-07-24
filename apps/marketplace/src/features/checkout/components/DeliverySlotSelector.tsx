import { useQuery } from '@tanstack/react-query';
import { Clock, Zap } from 'lucide-react';
import { checkoutApi } from '../api/checkout.api';
import { Card } from '@/ui';
import { cn } from '@/lib/cn';

interface DeliverySlotSelectorProps {
  selectedStart?: string;
  selectedEnd?: string;
  onSelect: (start: string, end: string) => void;
}

export function DeliverySlotSelector({ selectedStart, onSelect }: DeliverySlotSelectorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-slots'],
    queryFn: () => checkoutApi.slots(),
  });

  if (isLoading) return <div className="skeleton h-24 rounded-2xl" />;

  const slots = data?.slots || [];

  // Group by date
  const grouped = slots.reduce<Record<string, typeof slots>>((acc, s) => {
    const day = new Date(s.start).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
    acc[day] = acc[day] || [];
    acc[day].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {/* ASAP option */}
      <button
        type="button"
        onClick={() => onSelect('', '')}
        className={cn(
          'w-full p-4 rounded-2xl border-2 text-left transition',
          !selectedStart
            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
            : 'border-border bg-surface hover:border-brand-300',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-black">Deliver ASAP</div>
            <div className="text-2xs text-content-muted">Standard estimated time</div>
          </div>
        </div>
      </button>

      {Object.entries(grouped).slice(0, 3).map(([day, slots]) => (
        <div key={day}>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">{day}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {slots.map((s) => {
              const active = selectedStart === s.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => onSelect(s.start, s.end)}
                  className={cn(
                    'h-14 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-1',
                    active
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                      : 'border-border bg-surface hover:border-brand-300',
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {s.label.split(' ').slice(-3).join(' ')}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
