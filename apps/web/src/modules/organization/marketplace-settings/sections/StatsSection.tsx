import { Star, Package, Users } from 'lucide-react';
import type { MarketplaceProfile } from '../api/marketplace-settings.api';

interface Props {
  s: MarketplaceProfile;
}

const VERIFY_LEVELS: Record<string, { emoji: string; label: string; color: string }> = {
  UNVERIFIED: { emoji: '⚪', label: 'Unverified', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  BRONZE:     { emoji: '🥉', label: 'Bronze',     color: 'bg-amber-100 text-amber-800 border-amber-300' },
  SILVER:     { emoji: '🥈', label: 'Silver',     color: 'bg-slate-200 text-slate-700 border-slate-400' },
  GOLD:       { emoji: '🥇', label: 'Gold',       color: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
  PLATINUM:   { emoji: '💎', label: 'Platinum',   color: 'bg-cyan-100 text-cyan-800 border-cyan-400' },
};

export default function StatsSection({ s }: Props) {
  const verify = VERIFY_LEVELS[s.verificationLevel || 'UNVERIFIED'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatBox
          icon={Star}
          color="amber"
          label="Rating"
          value={s.ratingAverage?.toFixed(1) || '—'}
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
      </div>

      <div className={`p-5 rounded-2xl border-2 ${verify.color}`}>
        <div className="flex items-start gap-4">
          <div className="text-5xl">{verify.emoji}</div>
          <div className="flex-1">
            <h4 className="font-black text-lg">Verification Level: {verify.label}</h4>
            <div className="text-sm font-medium mt-1 opacity-90">
              {s.verificationLevel === 'PLATINUM' && 'Aap top-tier shops mein hain! Highest trust badge.'}
              {s.verificationLevel === 'GOLD' && 'Excellent! Thora aur growth karein Platinum ke liye.'}
              {s.verificationLevel === 'SILVER' && 'Achhi progress! 100+ orders ke baad Gold mein promote honge.'}
              {s.verificationLevel === 'BRONZE' && 'Bronze level! 25+ orders complete karein Silver ke liye.'}
              {(!s.verificationLevel || s.verificationLevel === 'UNVERIFIED') && (
                <>
                  <p>Verification ke liye:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>Complete kar lein apni profile (logo, cover, description)</li>
                    <li>Address aur contact verify karein</li>
                    <li>5+ orders complete karein</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, color, label, value, sub }: any) {
  const colors: any = {
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`p-4 rounded-2xl border-2 ${colors[color]}`}>
      <Icon className="h-5 w-5 mb-2" />
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-black uppercase tracking-wider">{label}</div>
      <div className="text-[10px] font-medium opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}
