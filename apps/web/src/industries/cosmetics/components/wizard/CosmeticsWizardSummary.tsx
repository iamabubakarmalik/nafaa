import {
  Sparkles, Boxes, TrendingUp, DollarSign, Award, Package,
  AlertTriangle, CheckCircle2, Palette, Calendar, Heart,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { CosmeticsWizardDraft } from '../../hooks/useCosmeticsWizard';

interface Props {
  draft: CosmeticsWizardDraft;
  stats: {
    variantCount: number;
    totalStock: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
    profitMargin: number;
    certCount: number;
  };
  allValid: boolean;
}

export function CosmeticsWizardSummary({ draft, stats, allValid }: Props) {
  const hasName = !!draft.basic.name.trim();
  const hasPrice = Number(draft.basic.retailPrice || 0) > 0;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft — incomplete</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Product name...'}
          </h3>

          {(draft.basic.shadeName || draft.basic.shadeCode) && (
            <div className="mt-2 flex items-center gap-2">
              {draft.basic.shadeHex && (
                <span className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: draft.basic.shadeHex }} />
              )}
              <div className="text-xs font-extrabold text-white/85">
                {draft.basic.shadeCode && <span className="font-mono">{draft.basic.shadeCode} · </span>}
                {draft.basic.shadeName}
              </div>
            </div>
          )}

          {hasPrice && (
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.retailPrice || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">retail price</div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.basic.categoryType && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> {draft.basic.categoryType.replace(/_/g, ' ')}
              </span>
            )}
            {draft.basic.finish && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider">
                ✨ {draft.basic.finish}
              </span>
            )}
            {draft.ingredients.sizeDisplay && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold tracking-wider">
                {draft.ingredients.sizeDisplay}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <Cell icon={Palette} label="Variants" value={stats.variantCount} hint={draft.hasVariants ? 'shades/sizes' : 'single SKU'} tone="pink" />
          <Cell icon={Boxes} label="Total Stock" value={stats.totalStock} hint="units" tone="emerald" />
        </div>

        {stats.certCount > 0 && (
          <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="h-3 w-3 text-emerald-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Certifications</div>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {draft.certifications.isHalalCertified && <Cert emoji="🕌" label="Halal" />}
              {draft.certifications.isCrueltyFree && <Cert emoji="🐰" label="CF" />}
              {draft.certifications.isVegan && <Cert emoji="🌱" label="Vegan" />}
              {draft.certifications.isOrganic && <Cert emoji="🌿" label="Organic" />}
              {draft.certifications.isDermatologistTested && <Cert emoji="👨‍⚕️" label="Derm" />}
              {stats.certCount > 5 && (
                <span className="text-[10px] font-extrabold text-emerald-700">+{stats.certCount - 5} more</span>
              )}
            </div>
          </div>
        )}

        {draft.batch.requiresBatchTracking && draft.batch.expiryDate && (
          <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-amber-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">Batch expiry</div>
            </div>
            <div className="text-sm font-extrabold text-amber-900">
              {new Date(draft.batch.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {draft.batch.shelfLifeMonths && (
              <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                {draft.batch.shelfLifeMonths} months shelf life
              </div>
            )}
          </div>
        )}
      </div>

      {stats.totalStock > 0 && hasPrice && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Financial preview
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.stockCost)} tone="slate" />
          <Row label="Retail value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> Potential profit
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.potentialProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                {formatPKRFull(stats.potentialProfit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-1">
              <span>Margin</span>
              <span className={stats.profitMargin >= 40 ? 'text-emerald-700' : stats.profitMargin >= 0 ? 'text-amber-700' : 'text-rose-700'}>
                {stats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {draft.ingredients.skinType.length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 flex items-center gap-1">
            <Heart className="h-3 w-3" /> For skin types
          </div>
          <div className="flex flex-wrap gap-1">
            {draft.ingredients.skinType.map((s) => (
              <span key={s} className="px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-extrabold">
                {s.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {(draft.basic.isFeatured || draft.basic.isBestSeller || draft.basic.isNewArrival || draft.basic.isLimitedEdition || draft.basic.isViral) && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Marketing flags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.basic.isFeatured && <Flag icon="⭐" label="Featured" />}
            {draft.basic.isBestSeller && <Flag icon="🏆" label="Best Seller" />}
            {draft.basic.isNewArrival && <Flag icon="🆕" label="New" />}
            {draft.basic.isLimitedEdition && <Flag icon="👑" label="Limited" />}
            {draft.basic.isViral && <Flag icon="🔥" label="Viral" />}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Product name" />
        <Chk done={hasPrice} label="Retail price" />
        <Chk done={!!draft.basic.categoryType} label="Category type" />
        <Chk done={!!draft.basic.brandId} label="Brand" />
        <Chk done={stats.totalStock > 0} label="Stock added" />
      </div>

      <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-2.5 text-[10px] text-pink-800 font-extrabold text-center">
        💾 Draft auto-saved — safe to close and return later
      </div>
    </aside>
  );
}

function Cell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = { pink: 'text-pink-700', emerald: 'text-emerald-700' };
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
function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 line-through' : 'text-slate-600'].join(' ')}>{label}</span>
    </div>
  );
}
function Cert({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
      {emoji} {label}
    </span>
  );
}
function Flag({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 text-[10px] font-extrabold border border-pink-200">
      {icon} {label}
    </span>
  );
}
