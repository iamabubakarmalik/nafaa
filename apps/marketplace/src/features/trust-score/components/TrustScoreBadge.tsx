import { ShieldCheck, Star, Award, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useState } from 'react';

interface Props {
  score: number;
  breakdown?: {
    verifiedPurchases: number;
    onTimeDelivery: number;
    responseTime: number;
    disputeResolution: number;
    customerSatisfaction: number;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function TrustScoreBadge({ score, breakdown, size = 'md' }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const level = score >= 90 ? 'Exceptional' : score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'New';
  const gradient = score >= 90 ? 'from-emerald-500 to-teal-600'
    : score >= 75 ? 'from-brand-500 to-emerald-600'
    : score >= 60 ? 'from-blue-500 to-indigo-600'
    : score >= 40 ? 'from-amber-500 to-orange-600'
    : 'from-slate-500 to-slate-600';

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-2xs',
    md: 'h-10 px-3 text-xs',
    lg: 'h-12 px-4 text-sm',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          `inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${gradient} text-white font-black shadow-md hover:shadow-lg transition`,
          sizeClasses[size],
        )}
      >
        <ShieldCheck className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        <span>Trust {score}</span>
        <Info className={cn('opacity-70', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      </button>

      {showDetails && breakdown && (
        <div className="absolute top-full mt-2 left-0 z-30 w-64 p-3 rounded-2xl bg-surface border border-border shadow-soft-lg animate-slide-down">
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg">{score}/100</div>
              <div className="text-2xs text-content-muted font-bold uppercase">{level}</div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Verified purchases', value: breakdown.verifiedPurchases },
              { label: 'On-time delivery', value: breakdown.onTimeDelivery },
              { label: 'Response time', value: breakdown.responseTime },
              { label: 'Dispute resolution', value: breakdown.disputeResolution },
              { label: 'Customer satisfaction', value: breakdown.customerSatisfaction },
            ].map((b, i) => (
              <div key={i}>
                <div className="flex justify-between text-2xs mb-0.5">
                  <span className="font-bold text-content-muted">{b.label}</span>
                  <span className="font-black">{b.value}%</span>
                </div>
                <div className="h-1 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradient} transition-all`}
                    style={{ width: `${b.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
