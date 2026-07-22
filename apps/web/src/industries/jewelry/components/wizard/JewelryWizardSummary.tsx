import {
  Gem, Scale, Sparkles, Diamond, ShieldCheck, Award,
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Star,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { JewelryWizardDraft } from '../../hooks/useJewelryWizard';

interface Props {
  draft: JewelryWizardDraft;
  stats: any;
  allValid: boolean;
}

export function JewelryWizardSummary({ draft, stats, allValid }: Props) {
  const purityLabel = draft.basic.purity.replace('KARAT_', '').replace('SILVER_', 'S') + 'K';

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Jewelry Item'}
          </h3>
          <div className="mt-2 text-xs font-extrabold text-amber-300">
            {draft.basic.category} • {draft.basic.metalType} {purityLabel}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.certify.isBridalCollection && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 text-[9px] font-extrabold uppercase border border-rose-300/40">👰 Bridal</span>
            )}
            {draft.certify.isFestivalSpecial && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-200 text-[9px] font-extrabold uppercase border border-orange-300/40">🎉 Festival</span>
            )}
            {draft.certify.isBestSeller && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40"><TrendingUp className="h-2 w-2" /> Best Seller</span>
            )}
            {stats.hasHallmark && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40"><ShieldCheck className="h-2 w-2" /> Hallmark</span>
            )}
            {stats.hasCertificate && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[9px] font-extrabold uppercase border border-blue-300/40"><Award className="h-2 w-2" /> Certified</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Scale} label="Gross" value={stats.grossWeight.toFixed(2) + 'g'} tone="amber" />
          <StatCell icon={Scale} label="Net" value={stats.netWeight.toFixed(2) + 'g'} tone="emerald" />
        </div>
        {(stats.stoneWeight > 0 || stats.waxWeight > 0) && (
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
            <StatCell icon={Diamond} label="Stones" value={stats.stoneWeight.toFixed(2) + 'g'} tone="cyan" />
            <StatCell icon={Sparkles} label="Wax/Other" value={stats.waxWeight.toFixed(2) + 'g'} tone="purple" />
          </div>
        )}
        {stats.gemstoneCount > 0 && (
          <div className="border-t border-slate-100 p-4 bg-cyan-50">
            <div className="flex items-center gap-1.5 mb-1">
              <Diamond className="h-3 w-3 text-cyan-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">
                Gemstones ({stats.gemstoneCount})
              </div>
            </div>
            <div className="text-2xl font-extrabold text-cyan-900 tabular-nums">
              {stats.gemstoneCaret.toFixed(2)}<span className="text-sm ml-1">ct</span>
            </div>
            {stats.gemstoneValue > 0 && (
              <div className="text-[10px] font-bold text-emerald-700 mt-0.5">Value: {formatPKRFull(stats.gemstoneValue)}</div>
            )}
          </div>
        )}
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-amber-50 to-white">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 mb-1">Making Charges</div>
          <div className="space-y-0.5 text-xs">
            {stats.makingPct > 0 && <div className="font-bold text-slate-700">{stats.makingPct}% of metal value</div>}
            {stats.makingPerGram > 0 && <div className="font-bold text-slate-700">Rs {stats.makingPerGram}/g</div>}
            {stats.makingFixed > 0 && <div className="font-bold text-slate-700">Rs {stats.makingFixed} fixed</div>}
            {stats.wastagePct > 0 && <div className="font-bold text-orange-700">Wastage: {stats.wastagePct}%</div>}
          </div>
        </div>
      </div>

      {stats.estimatedPrice > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Estimated Finance
          </div>
          <Row label="Cost" value={formatPKRFull(stats.costPrice)} tone="slate" />
          <Row label="Est. Sale" value={formatPKRFull(stats.estimatedPrice)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                {formatPKRFull(stats.profit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-1">
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

function StatCell({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'text-amber-700', emerald: 'text-emerald-700',
    cyan: 'text-cyan-700', purple: 'text-purple-700',
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
  const tones: Record<string, string> = { slate: 'text-slate-700', emerald: 'text-emerald-700' };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
