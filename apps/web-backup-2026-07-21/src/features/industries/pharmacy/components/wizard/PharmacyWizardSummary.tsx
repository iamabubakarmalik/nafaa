import {
  Pill, Beaker, Package, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ShieldAlert, Snowflake,
  Clock, Repeat,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { PharmacyWizardDraft } from '../../hooks/usePharmacyWizard';

interface Props {
  draft: PharmacyWizardDraft;
  stats: {
    saltCount: number;
    batchCount: number;
    substituteCount: number;
    totalStock: number;
    stockValue: number;
    stockCost: number;
    profit: number;
    margin: number;
    expiringSoon: number;
    expired: number;
  };
  allValid: boolean;
}

export function PharmacyWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Medicine'}
          </h3>
          {draft.basic.registrationNumber && (
            <div className="text-xs text-white/70 font-mono mt-1">DRAP: {draft.basic.registrationNumber}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.clinical.requiresPrescription && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-extrabold uppercase border border-amber-300/40">
                Rx Only
              </span>
            )}
            {draft.clinical.isNarcotic && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] font-extrabold uppercase border border-red-300/40">
                <ShieldAlert className="h-2 w-2" /> Narcotic
              </span>
            )}
            {draft.clinical.requiresColdChain && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[9px] font-extrabold uppercase border border-blue-300/40">
                <Snowflake className="h-2 w-2" /> Cold Chain
              </span>
            )}
            {draft.basic.isGeneric && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                Generic
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Beaker} label="Salts" value={stats.saltCount} tone="cyan"
            hint={draft.clinical.salts[0]?.saltName ?? 'none'} />
          <StatCell icon={Package} label="Batches" value={stats.batchCount} tone="amber"
            hint={draft.inventory.hasBatches ? 'expiry tracked' : 'no tracking'} />
        </div>
        {stats.substituteCount > 0 && (
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Repeat className="h-3 w-3 text-violet-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">Substitutes</div>
            </div>
            <div className="text-2xl font-extrabold text-violet-900 tabular-nums">{stats.substituteCount}</div>
          </div>
        )}
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-teal-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Pill className="h-3 w-3 text-teal-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-teal-700">
              Total Stock ({draft.basic.unit || 'unit'})
            </div>
          </div>
          <div className="text-3xl font-extrabold text-teal-900 tabular-nums">
            {stats.totalStock}
          </div>
        </div>
      </div>

      {(stats.expiringSoon > 0 || stats.expired > 0) && (
        <div className="rounded-2xl bg-white border-2 border-amber-300 shadow-sm p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Expiry Alerts
          </div>
          {stats.expiringSoon > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-800 font-bold">Expiring &lt; 90 days</span>
              <span className="font-extrabold text-amber-700 tabular-nums">{stats.expiringSoon}</span>
            </div>
          )}
          {stats.expired > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-800 font-bold">Already expired</span>
              <span className="font-extrabold text-rose-700 tabular-nums">{stats.expired}</span>
            </div>
          )}
        </div>
      )}

      {stats.totalStock > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.stockCost)} tone="slate" />
          <Row label="Sale value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit / unit
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                {formatPKRFull(stats.profit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>Margin</span>
              <span className={stats.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {stats.margin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = {
    cyan: 'text-cyan-700', amber: 'text-amber-700', teal: 'text-teal-700', violet: 'text-violet-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{hint}</div>}
    </div>
  );
}

function Row({ label, value, tone }: any) {
  const tones: Record<string, string> = { slate: 'text-slate-700', emerald: 'text-emerald-700' };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
