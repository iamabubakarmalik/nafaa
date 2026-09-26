/* ═════════════════════════════════════════════════════════════
   DASHBOARD KE TUKRE — har industry ke liye ek hi shakal
   ─────────────────────────────────────────────────────────────
   Card, uska sirnama, chart ka legend, aur khali khane ka paigham.
   Ye Retail dashboard ka design hai — sab se zyada kaam wahan hua
   tha, is liye wohi standard hai.

   Ek jagah hone ka faida: jab dark mode ya kisi naap me behtari
   aati hai, wo har industry ke dashboard par ek saath pohnchti
   hai — pehle sirf usi safhe par rehti thi jahan likhi gayi.
   ═════════════════════════════════════════════════════════════ */

export function DashCard({ children, noPad = false }: any) {
  return (
    <div className={[
      'rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm',
      'border-2 border-slate-200 dark:border-slate-800',
      'shadow-sm dark:shadow-black/20 overflow-hidden',
      noPad ? '' : 'p-4 sm:p-5',
    ].join(' ')}>
      {children}
    </div>
  );
}

export function DashCardHeader({ icon: Icon, title, subtitle, tone, right }: any) {
  const tones: Record<string, string> = {
    sky:     'from-sky-500 to-cyan-600',
    violet:  'from-violet-500 to-purple-600',
    emerald: 'from-emerald-500 to-teal-600',
    pink:    'from-pink-500 to-rose-600',
    amber:   'from-amber-500 to-orange-600',
  };
  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone] ?? tones.sky} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

export function DashChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
      {items.map((it) => (
        <div key={it.label} className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

export function DashEmptyChart({ icon: Icon, message }: any) {
  return (
    <div className="h-[240px] sm:h-[300px] flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
      <Icon className="h-10 w-10" />
      <p className="text-sm font-extrabold">{message}</p>
    </div>
  );
}

export function DashEmptyList({ icon: Icon, message }: any) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="font-extrabold text-slate-500 dark:text-slate-400 text-sm">{message}</p>
    </div>
  );
}
