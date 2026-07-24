import { Star, Package, Users, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import type { MarketplaceShopProfile } from '../../shared/types';
import { VERIFICATION_META } from '../../shared/status-utils';
import { formatPKR } from '@core/lib/format';

interface Props {
  s: MarketplaceShopProfile;
}

export default function StatsSection({ s }: Props) {
  const verify = VERIFICATION_META[s.verificationLevel] || VERIFICATION_META.UNVERIFIED;
  const completionRate = s.totalOrders && s.completedOrders
    ? (s.completedOrders / s.totalOrders) * 100
    : 0;
  const cancellationRate = s.totalOrders && s.cancelledOrders
    ? (s.cancelledOrders / s.totalOrders) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          icon={Star}
          color="amber"
          label="Rating"
          value={s.ratingAverage ? s.ratingAverage.toFixed(1) : '—'}
          sub={`${s.ratingCount || 0} reviews`}
        />
        <StatBox
          icon={Package}
          color="emerald"
          label="Total Orders"
          value={String(s.totalOrders || 0)}
          sub="lifetime"
        />
        <StatBox
          icon={Users}
          color="blue"
          label="Followers"
          value={String(s.followerCount || 0)}
          sub="customers"
        />
        <StatBox
          icon={TrendingUp}
          color="violet"
          label="Total Revenue"
          value={`Rs ${formatPKR(s.totalRevenue || 0)}`}
          sub="lifetime"
        />
      </div>

      {/* Verification */}
      <div className={`p-5 rounded-2xl border-2 ${verify.bg} ${verify.border}`}>
        <div className="flex items-start gap-4">
          <div className="text-5xl">{verify.emoji}</div>
          <div className="flex-1">
            <h4 className={`font-black text-lg ${verify.color}`}>Verification Level: {verify.label}</h4>
            <div className={`text-sm font-medium mt-1 ${verify.color} opacity-90`}>
              {s.verificationLevel === 'PLATINUM' && 'Aap top-tier shops mein hain! Highest trust badge.'}
              {s.verificationLevel === 'GOLD' && 'Excellent! Thora aur growth karein Platinum ke liye.'}
              {s.verificationLevel === 'SILVER' && 'Achhi progress! 100+ orders ke baad Gold mein promote honge.'}
              {s.verificationLevel === 'BRONZE' && 'Bronze level! 25+ orders complete karein Silver ke liye.'}
              {(!s.verificationLevel || s.verificationLevel === 'UNVERIFIED') && (
                <div>
                  <p>Verification ke liye ye chahiye:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>Complete profile (logo, cover, description)</li>
                    <li>Verified phone number & address</li>
                    <li>5+ successful orders</li>
                    <li>Rating ≥ 4.0</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance */}
      {s.totalOrders && s.totalOrders > 0 ? (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <h4 className="font-black mb-3 text-slate-900">Performance Metrics</h4>
          <div className="space-y-3">
            <MetricBar
              label="Order Completion Rate"
              value={completionRate}
              color="emerald"
              icon={CheckCircle2}
              hint={`${s.completedOrders || 0} of ${s.totalOrders} orders completed`}
            />
            <MetricBar
              label="Cancellation Rate"
              value={cancellationRate}
              color="rose"
              icon={XCircle}
              hint={`${s.cancelledOrders || 0} orders cancelled`}
              lowerIsBetter
            />
            {s.avgResponseTimeMinutes && (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                <div className="text-xs font-black text-blue-900">Avg. Response Time</div>
                <div className="text-2xl font-black text-blue-700 mt-1">
                  {s.avgResponseTimeMinutes} <span className="text-sm font-bold">min</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 p-6 text-center">
          <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <div className="font-black text-slate-600">No orders yet</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Aap ki performance stats orders aane ke baad dikhengi</div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, color, label, value, sub }: any) {
  const colors: any = {
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <div className={`p-4 rounded-2xl border-2 ${colors[color]}`}>
      <Icon className="h-5 w-5 mb-2" />
      <div className="text-xl font-black tabular-nums truncate">{value}</div>
      <div className="text-xs font-black uppercase tracking-wider">{label}</div>
      <div className="text-[10px] font-medium opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}

function MetricBar({ label, value, color, icon: Icon, hint, lowerIsBetter }: any) {
  const colors: any = {
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
  };
  const isGood = lowerIsBetter ? value < 10 : value >= 80;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black mb-1">
        <span className="text-slate-700 flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${isGood ? 'text-emerald-600' : 'text-slate-500'}`} />
          {label}
        </span>
        <span className={isGood ? 'text-emerald-700' : 'text-slate-700'}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[color]} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-[10px] text-slate-500 font-medium mt-1">{hint}</div>
    </div>
  );
}
