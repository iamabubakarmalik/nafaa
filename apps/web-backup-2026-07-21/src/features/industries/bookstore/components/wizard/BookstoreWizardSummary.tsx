import {
  BookOpen, Palette, Sparkles, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Package, User, Tag,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { BookstoreWizardDraft } from '../../hooks/useBookstoreWizard';

interface Props {
  draft: BookstoreWizardDraft;
  stats: {
    profit: number;
    margin: number;
    discount: number;
    stockValue: number;
    authorCount: number;
    suitableForCount: number;
  };
  allValid: boolean;
}

const TYPE_CONFIG = {
  BOOK: { emoji: '📚', label: 'Book', icon: BookOpen, tone: 'amber' },
  STATIONERY: { emoji: '✏️', label: 'Stationery', icon: Sparkles, tone: 'blue' },
  ART_SUPPLY: { emoji: '🎨', label: 'Art Supply', icon: Palette, tone: 'pink' },
};

export function BookstoreWizardSummary({ draft, stats, allValid }: Props) {
  const typeCfg = TYPE_CONFIG[draft.basic.productType];
  const TypeIcon = typeCfg.icon;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl">{typeCfg.emoji}</span>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-200">
              {typeCfg.label}
            </div>
          </div>
          <h3 className="mt-1 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || `Untitled ${typeCfg.label}`}
          </h3>
          {draft.basic.productType === 'BOOK' && draft.book.category && (
            <div className="mt-1 text-xs text-white/70 font-semibold">
              {draft.book.category.replace(/_/g, ' ')} • {draft.book.binding}
            </div>
          )}
          {draft.basic.productType === 'BOOK' && (draft.book.isbn10 || draft.book.isbn13) && (
            <div className="mt-1 text-[10px] text-white/60 font-mono">
              ISBN: {draft.book.isbn13 || draft.book.isbn10}
            </div>
          )}
        </div>
      </div>

      {/* Type-specific stats */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        {draft.basic.productType === 'BOOK' && (
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <StatCell icon={User} label="Authors" value={stats.authorCount} tone="amber" />
            <StatCell icon={Tag} label="Language" value={draft.book.language || '—'} tone="blue" small />
          </div>
        )}
        {draft.basic.productType === 'STATIONERY' && (
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <StatCell icon={Package} label="Category" value={(draft.stationery.category || '').replace(/_/g, ' ').slice(0, 12)} tone="blue" small />
            <StatCell icon={Sparkles} label="Pack Size" value={draft.stationery.packSize || '—'} tone="pink" />
          </div>
        )}
        {draft.basic.productType === 'ART_SUPPLY' && (
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <StatCell icon={Palette} label="Category" value={(draft.art.category || '').replace(/_/g, ' ').slice(0, 12)} tone="pink" small />
            <StatCell icon={Sparkles} label="Suitable" value={stats.suitableForCount} tone="amber" />
          </div>
        )}

        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3 w-3 text-amber-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
              Stock
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-900 tabular-nums">
            {Number(draft.basic.stock || 0)} <span className="text-sm">{draft.basic.unit}</span>
          </div>
        </div>
      </div>

      {Number(draft.basic.salePrice || 0) > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          {Number(draft.basic.mrp || 0) > 0 && (
            <Row label="MRP" value={formatPKRFull(Number(draft.basic.mrp || 0))} tone="slate" />
          )}
          <Row label="Sale price" value={formatPKRFull(Number(draft.basic.salePrice || 0))} tone="emerald" />
          {Number(draft.basic.costPrice || 0) > 0 && (
            <Row label="Cost" value={formatPKRFull(Number(draft.basic.costPrice || 0))} tone="slate" />
          )}
          {stats.discount > 0 && (
            <Row label={`Discount off MRP`} value={`${stats.discount.toFixed(1)}%`} tone="amber" />
          )}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit per item
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
          {stats.stockValue > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <Row label="Stock value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone, small }: any) {
  const tones: Record<string, string> = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    pink: 'text-pink-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className={['font-extrabold text-slate-900 tabular-nums', small ? 'text-sm' : 'text-2xl'].join(' ')}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    slate: 'text-slate-700', emerald: 'text-emerald-700', amber: 'text-amber-700',
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
