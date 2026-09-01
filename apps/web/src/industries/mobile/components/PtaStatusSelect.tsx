import { CheckCircle2, AlertTriangle, AlertOctagon, Clock, Shield, Info, ExternalLink, DollarSign } from 'lucide-react';
import {
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '@industries/mobile/api/imei.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA PTA STATUS SELECT — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   🎨 Dark mode complete
   💡 Emoji + description on hover
   📝 Full label (not truncated)
   💰 Better tax field UX (currency prefix)
   🔗 DIRBS portal quick link
   ⚠️  Warning banners per status
   📱 Grid responsive (5-col desktop, 2-col mobile)
   ═════════════════════════════════════════════════════════════ */

interface Props {
  value: PtaStatus;
  onChange: (value: PtaStatus) => void;
  label?: string;
  hint?: string;
  taxPaid?: number;
  onTaxPaidChange?: (value: number) => void;
  showTaxField?: boolean;
  compact?: boolean;
}

const STATUSES: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

const ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

const EMOJIS: Record<PtaStatus, string> = {
  APPROVED: '✅',
  NON_PTA: '❌',
  PATCH: '⚠️',
  PENDING: '⏳',
  EXEMPT: '🛡️',
};

const DESCRIPTIONS: Record<PtaStatus, string> = {
  APPROVED: 'PTA approved — tax paid, sab kuch legal',
  NON_PTA: 'Import kiya hua — tax nahi diya, resale mushkil',
  PATCH: 'Patched / non-genuine — thora risky',
  PENDING: 'Registration process me — DIRBS check kar sakte hain',
  EXEMPT: 'Local ya tax-exempt — no PTA required',
};

const WARNINGS: Record<PtaStatus, { text: string; tone: 'success' | 'warning' | 'danger' | 'info' } | null> = {
  APPROVED: { text: '✨ Best status — resale ke liye ideal', tone: 'success' },
  NON_PTA: { text: '⚠️ Customer ko batayen — resale kam price pe hogi', tone: 'danger' },
  PATCH: { text: '⚠️ Warranty aur updates issue ho sakte hain', tone: 'warning' },
  PENDING: { text: 'ℹ️ DIRBS portal se status verify karein', tone: 'info' },
  EXEMPT: null,
};

export function PtaStatusSelect({
  value,
  onChange,
  label = 'PTA Status',
  hint,
  taxPaid,
  onTaxPaidChange,
  showTaxField = true,
  compact = false,
}: Props) {
  const currentWarning = WARNINGS[value];

  return (
    <div className="space-y-2.5">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
          </label>
          <a
            href="https://dirbs.pta.gov.pk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition"
          >
            <ExternalLink className="h-3 w-3" />
            DIRBS Portal
          </a>
        </div>
      )}

      {/* Status grid */}
      <div className={compact ? 'grid grid-cols-5 gap-1' : 'grid grid-cols-2 sm:grid-cols-5 gap-1.5'}>
        {STATUSES.map((status) => {
          const Icon = ICONS[status];
          const colors = PTA_STATUS_COLORS[status];
          const active = value === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => onChange(status)}
              title={DESCRIPTIONS[status]}
              className={[
                'group relative flex flex-col items-center gap-1 rounded-xl border-2 transition text-center',
                compact ? 'p-1.5' : 'p-2.5',
                active
                  ? `${colors.bg} ${colors.border} shadow-md scale-105 dark:brightness-125`
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500',
              ].join(' ')}
            >
              {compact ? (
                <>
                  <Icon className={`h-3.5 w-3.5 ${active ? colors.text : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className={`text-[9px] font-extrabold leading-tight ${active ? colors.text : 'text-slate-600 dark:text-slate-400'}`}>
                    {PTA_STATUS_LABELS[status].split(' ')[0]}
                  </span>
                </>
              ) : (
                <>
                  <div className="text-xl leading-none">{EMOJIS[status]}</div>
                  <div className="min-w-0 w-full">
                    <div className={`text-[10px] font-extrabold uppercase tracking-wider leading-tight ${active ? colors.text : 'text-slate-700 dark:text-slate-200'}`}>
                      {PTA_STATUS_LABELS[status]}
                    </div>
                  </div>
                  {active && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {hint && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-start gap-1">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          {hint}
        </p>
      )}

      {/* Status-specific warning */}
      {currentWarning && !compact && (
        <div className={[
          'rounded-xl p-2.5 text-[11px] font-extrabold border-2',
          currentWarning.tone === 'success' && 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300',
          currentWarning.tone === 'warning' && 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300',
          currentWarning.tone === 'danger' && 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300',
          currentWarning.tone === 'info' && 'bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-300',
        ].filter(Boolean).join(' ')}>
          {currentWarning.text}
        </div>
      )}

      {/* Tax paid field — shown when APPROVED or PATCH */}
      {showTaxField && (value === 'APPROVED' || value === 'PATCH') && onTaxPaidChange && (
        <div className="pt-3 border-t-2 border-slate-100 dark:border-slate-800">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            <DollarSign className="h-3 w-3 inline mr-0.5" />
            PTA Tax Paid (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
              Rs
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={taxPaid ?? ''}
              onChange={(e) => onTaxPaidChange(Number(e.target.value) || 0)}
              placeholder="0"
              className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-start gap-1">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            Warranty aur customer records ke liye rakha jayega
          </p>
        </div>
      )}
    </div>
  );
}
