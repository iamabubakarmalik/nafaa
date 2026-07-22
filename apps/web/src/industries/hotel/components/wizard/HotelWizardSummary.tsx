import {
  Bed, Sparkles, Home, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Users, Wifi, Wind,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { HotelWizardDraft } from '../../hooks/useHotelWizard';

interface Props {
  draft: HotelWizardDraft;
  stats: {
    roomCount: number;
    basePrice: number;
    totalDailyRevenue: number;
    monthlyPotential: number;
    amenityCount: number;
    capacity: number;
  };
  allValid: boolean;
}

export function HotelWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Room Type'}
          </h3>
          {draft.basic.code && (
            <div className="text-xs text-white/70 font-mono mt-1 uppercase">Code: {draft.basic.code}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.amenities.hasAC && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[9px] font-extrabold uppercase border border-blue-300/40">
                <Wind className="h-2 w-2" /> AC
              </span>
            )}
            {draft.amenities.hasWifi && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200 text-[9px] font-extrabold uppercase border border-cyan-300/40">
                <Wifi className="h-2 w-2" /> WiFi
              </span>
            )}
            {draft.amenities.hasMinibar && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-extrabold uppercase border border-amber-300/40">
                Minibar
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Users} label="Max Guests" value={draft.basic.maxOccupancy || 0} tone="blue" />
          <StatCell icon={Sparkles} label="Amenities" value={stats.amenityCount} tone="violet" />
        </div>
        {draft.rooms.addRooms && (
          <div className="border-t border-slate-100 p-4 bg-indigo-50">
            <div className="flex items-center gap-1.5 mb-1">
              <Home className="h-3 w-3 text-indigo-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700">
                Rooms to Create
              </div>
            </div>
            <div className="text-3xl font-extrabold text-indigo-900 tabular-nums">{stats.roomCount}</div>
            {stats.roomCount > 0 && (
              <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
                Total capacity: {stats.capacity} guests
              </div>
            )}
          </div>
        )}
      </div>

      {stats.basePrice > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Revenue Potential
          </div>
          <Row label="Base rate/night" value={formatPKRFull(stats.basePrice)} tone="emerald" />
          {stats.roomCount > 0 && (
            <>
              <Row label="Full occupancy/day" value={formatPKRFull(stats.totalDailyRevenue)} tone="slate" />
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    Monthly potential
                  </div>
                  <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                    {formatPKRFull(stats.monthlyPotential)}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                  * 100% occupancy × 30 days
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'text-blue-700',
    violet: 'text-violet-700',
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    slate: 'text-slate-700', emerald: 'text-emerald-700',
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
