import { useMemo } from 'react';
import { Clock, Flame } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { formatPKR } from '@core/lib/format';
import { DashCard, DashCardHeader, DashChartLegend, DashEmptyChart } from './DashCard';

/* ═════════════════════════════════════════════════════════════
   PEAK HOURS — dukaan kis waqt masroof hoti hai
   ─────────────────────────────────────────────────────────────
   Ghanta server se aata hai, dukaan ke apne timezone (Asia/Karachi)
   me nikala hua. Pehle `getHours()` server ke UTC par chalta tha,
   is liye shaam 8 baje ka rush chart me dopahar 3 baje dikhta tha —
   dukaan-daar theek kehta tha ke "timing sahi nahi bata raha".

   Sab se zaroori baat chart se PEHLE likhi hai, saaf lafzon me.
   Chart parhna ek hunar hai; ek jumla parhna sab ko aata hai.

   Bakery ke liye ye khaas ahem hai: subah ka nashta aur shaam ki
   chai do alag rush hote hain, aur production isi naqshe se plan
   hoti hai.
   ═════════════════════════════════════════════════════════════ */

/** 14 → "2 PM", 0 → "12 AM" — dukaan-daar ki ghari wali zabaan. */
export const hourLabel = (h: number) =>
  h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

/** Chart ke X-axis par chhota naap — jagah kam hoti hai. */
const hourTick = (h: number) =>
  h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;

export function PeakHoursCard({
  hourly, hourDays, setHourDays,
}: {
  hourly: any;
  hourDays: 1 | 7;
  setHourDays: (d: 1 | 7) => void;
}) {
  const hourlyRaw: any[] = hourly?.hours ?? [];
  const peakHour: number | null = hourly?.peakHour ?? null;
  const currentHour: number | undefined = hourly?.currentHour;

  const hourlyData = useMemo(() =>
    hourlyRaw
      // Band ghanton ka khali khana chart me jagah kha jata hai — sirf
      // wohi ghante jin me kuch bika, aur dukaan ka aam waqt.
      .filter((h) => h.total > 0 || (h.hour >= 8 && h.hour <= 22))
      .map((h) => ({
        ...h,
        label: hourTick(h.hour),
        fullLabel: hourLabel(h.hour),
        isPeak: h.hour === peakHour && h.total > 0,
        isNow: hourDays === 1 && h.hour === currentHour,
      })), [hourlyRaw, peakHour, currentHour, hourDays]);

  return (
<DashCard>
  <DashCardHeader
    icon={Clock}
    title="Peak Hours"
    subtitle={hourDays === 1 ? 'Aaj kis waqt zyada bika' : '7 din ka rozana ausat'}
    tone="violet"
    right={
      <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-extrabold">
        {([[1, 'Aaj'], [7, '7 Din']] as const).map(([d, l]) => (
          <button
            key={d}
            onClick={() => setHourDays(d as 1 | 7)}
            className={[
              'px-3 py-1.5 rounded-lg transition-all',
              hourDays === d
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {l}
          </button>
        ))}
      </div>
    }
  />

  {/* Sab se zaroori jumla — chart se pehle, saaf lafzon me */}
  {peakHour !== null && (
    <div className="mb-3 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 border-2 border-violet-200 dark:border-violet-500/30 px-3 py-2.5 flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
        <Flame className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300">
          Sab se masroof waqt
        </div>
        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
          {hourLabel(peakHour)} – {hourLabel((peakHour + 1) % 24)}
          <span className="text-slate-500 dark:text-slate-400 font-bold">
            {' • '}{formatPKR((hourly as any)?.peakTotal ?? 0)}
            {hourDays > 1 ? ' rozana' : ''}
          </span>
        </div>
      </div>
    </div>
  )}

  {hourlyData.length > 0 ? (
    <div className="h-[200px] sm:h-[248px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={hourlyData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="hourlyBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="hourlyPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
              <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" opacity={0.4} />
          <XAxis dataKey="label" className="fill-slate-500 dark:fill-slate-400" fontSize={9} interval={1} tickLine={false} axisLine={false} />
          <YAxis className="fill-slate-500 dark:fill-slate-400" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: any, _n: any, item: any) => [
              formatPKR(Number(v)),
              `${Math.round(item?.payload?.count ?? 0)} orders`,
            ]}
            labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.fullLabel ?? ''}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.2)',
              backgroundColor: 'rgba(15,23,42,0.95)',
              color: '#f8fafc',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
            cursor={{ fill: 'rgba(168,85,247,0.1)' }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {hourlyData.map((h: any) => (
              <Cell
                key={h.hour}
                fill={h.isPeak ? 'url(#hourlyPeak)' : 'url(#hourlyBar)'}
                stroke={h.isNow ? '#0ea5e9' : 'none'}
                strokeWidth={h.isNow ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <DashEmptyChart icon={Clock} message={hourDays === 1 ? 'Aaj tak koi sale nahi' : 'Is hafte koi sale nahi'} />
  )}

  <DashChartLegend items={[
    { color: '#ea580c', label: 'Peak ghanta' },
    { color: '#7c3aed', label: 'Baqi ghante' },
    ...(hourDays === 1 && currentHour !== undefined
      ? [{ color: '#0ea5e9', label: 'Abhi ka ghanta' }] : []),
  ]} />
</DashCard>
  );
}

export default PeakHoursCard;
