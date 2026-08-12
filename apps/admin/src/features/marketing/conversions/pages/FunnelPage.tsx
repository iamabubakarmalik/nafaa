import { useQuery } from '@tanstack/react-query';
import { TrendingDown } from 'lucide-react';
import { conversionsApi } from '../../../../api/marketing/marketing-conversions.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { DateRangePicker } from '../../_shared/components/DateRangePicker';
import { useMarketingDateRange } from '../../_shared/hooks/useMarketingDateRange';

export function FunnelPage() {
  const { from, to, setRange } = useMarketingDateRange(30);

  const { data, isLoading } = useQuery({
    queryKey: ['funnel', from, to],
    queryFn: () => conversionsApi.funnel(from, to),
  });

  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-2xl bg-white" />;

  const maxCount = Math.max(...data.funnel.map((s: any) => s.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversion Funnel"
        subtitle={`Overall conversion: ${data.overallConversion}`}
        actions={<DateRangePicker from={from} to={to} onChange={setRange} />}
      />

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {data.funnel.map((step: any, i: number) => {
            const w = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
            return (
              <div key={step.step} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-800">
                    {i + 1}. {step.step}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-neutral-900">{step.count.toLocaleString()}</span>
                    {step.conversionFromPrev !== '—' && (
                      <span className="text-xs text-neutral-500">
                        {step.conversionFromPrev} from prev
                      </span>
                    )}
                    {step.dropoff !== '—' && (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600">
                        <TrendingDown className="h-3 w-3" /> {step.dropoff}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 overflow-hidden rounded-lg bg-neutral-100">
                  <div
                    className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 text-xs font-medium text-white transition-all"
                    style={{ width: `${w}%` }}
                  >
                    {w > 15 && step.count.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
