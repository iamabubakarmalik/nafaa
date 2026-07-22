import {
  Sparkles, Star, TrendingUp, Eye, Image as ImageIcon, X,
  AlertCircle, CheckCircle2, Award, Scissors,
} from 'lucide-react';
import { UploadDropzone } from '@core/components/uploads';
import type { SalonWizardBasic } from '../../hooks/useSalonWizard';

interface Props {
  basic: SalonWizardBasic;
  onChange: (patch: Partial<SalonWizardBasic>) => void;
  errors: string[];
}

export function SalonWizardStep3Settings({ basic, onChange, errors }: Props) {
  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* IMAGE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={ImageIcon} title="Service Image" desc="Menu aur booking par dikhega" />

        {basic.imageUrl ? (
          <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border-2 border-slate-200">
            <img src={basic.imageUrl} alt="Service" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange({ imageUrl: '' })}
              className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <UploadDropzone
            purpose="product-image"
            maxFiles={1}
            onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) onChange({ imageUrl: url });
            }}
            hint="Drop 1 image — service photo"
          />
        )}
      </section>

      {/* FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Sparkles} title="Service Flags" desc="Visibility aur highlights" />

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Featured */}
          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isFeatured
              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-100'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={basic.isFeatured}
              onChange={(e) => onChange({ isFeatured: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <Star className={['h-5 w-5', basic.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Featured Service</div>
              <div className="text-xs text-slate-500 font-semibold">Catalog aur menu mein highlight</div>
            </div>
          </label>

          {/* Popular */}
          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isPopular
              ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={basic.isPopular}
              onChange={(e) => onChange({ isPopular: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <TrendingUp className={['h-5 w-5', basic.isPopular ? 'text-red-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Popular</div>
              <div className="text-xs text-slate-500 font-semibold">"🔥 Popular" badge show hoga</div>
            </div>
          </label>

          {/* Active */}
          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            basic.isActive
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={basic.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            {basic.isActive
              ? <Eye className="h-5 w-5 text-emerald-600" />
              : <Eye className="h-5 w-5 text-slate-400" />}
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Active</div>
              <div className="text-xs text-slate-500 font-semibold">POS aur booking mein visible</div>
            </div>
          </label>

          {/* Display order */}
          <div className="p-3 rounded-xl border-2 border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-violet-600" />
              <span className="text-xs font-extrabold text-slate-700">Display Order</span>
            </div>
            <input
              type="number"
              value={basic.displayOrder}
              onChange={(e) => onChange({ displayOrder: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-pink-500"
            />
            <div className="text-[10px] text-slate-500 font-bold mt-1">
              Lower number = appears first in menu
            </div>
          </div>
        </div>
      </section>

      {/* REVIEW SUMMARY */}
      <section className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 space-y-3">
        <SectionHeader icon={CheckCircle2} title="Review Summary" desc="Sab theek hai? Save karne ke liye ready" tone="pink" />

        <div className="grid sm:grid-cols-2 gap-3">
          <ReviewRow label="Service Name" value={basic.name || '—'} />
          <ReviewRow label="Category" value={basic.category.replace(/_/g, ' ')} />
          <ReviewRow label="Price" value={basic.price ? `Rs ${basic.price}` : '—'} />
          <ReviewRow label="Duration" value={`${basic.durationMinutes || 0} min`} />
          <ReviewRow label="Audience" value={[
            basic.forMen && 'Men', basic.forWomen && 'Women', basic.forKids && 'Kids',
          ].filter(Boolean).join(', ') || '—'} />
          <ReviewRow label="Commission" value={
            Number(basic.commissionPct || 0) > 0 || Number(basic.commissionFixed || 0) > 0
              ? `${basic.commissionPct || 0}% + Rs ${basic.commissionFixed || 0}`
              : 'None'
          } />
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-pink-100">
          {basic.isFeatured && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-current" /> Featured
            </span>
          )}
          {basic.isPopular && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" /> Popular
            </span>
          )}
          {basic.isActive && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <Eye className="h-2.5 w-2.5" /> Active
            </span>
          )}
          {basic.imageUrl && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <ImageIcon className="h-2.5 w-2.5" /> Has Image
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    pink: 'from-pink-500 to-rose-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br',
        tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-2.5">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 capitalize truncate">{value}</div>
    </div>
  );
}
