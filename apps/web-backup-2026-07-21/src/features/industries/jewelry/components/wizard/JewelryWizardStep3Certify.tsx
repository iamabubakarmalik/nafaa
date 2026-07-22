import {
  Award, Shield, Sparkles, Heart, TrendingUp, Package,
  RefreshCw, DollarSign, AlertCircle, Star, Crown, Gift, Video,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { formatPKRFull } from '@/lib/format';
import type { JewelryWizardCertify } from '../../hooks/useJewelryWizard';

interface Props {
  certify: JewelryWizardCertify;
  onChange: (patch: Partial<JewelryWizardCertify>) => void;
  errors: string[];
}

export function JewelryWizardStep3Certify({ certify, onChange, errors }: Props) {
  const cost = Number(certify.costPrice || 0);
  const sale = Number(certify.estimatedPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const isLoss = cost > 0 && sale > 0 && profit < 0;

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

      {/* Item Origin Flags */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Item Origin & Type</h3>
            <p className="text-xs text-slate-500 font-semibold">Special item classifications</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isCustomOrder ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-300'].join(' ')}>
            <input type="checkbox" checked={certify.isCustomOrder}
              onChange={(e) => onChange({ isCustomOrder: e.target.checked })} className="h-4 w-4 rounded" />
            <Sparkles className={['h-4 w-4', certify.isCustomOrder ? 'text-purple-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="text-sm font-extrabold text-slate-900">Custom Order</div>
              <div className="text-[10px] text-slate-500 font-semibold">Made-to-order</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isBespoke ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'].join(' ')}>
            <input type="checkbox" checked={certify.isBespoke}
              onChange={(e) => onChange({ isBespoke: e.target.checked })} className="h-4 w-4 rounded" />
            <Crown className={['h-4 w-4', certify.isBespoke ? 'text-rose-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="text-sm font-extrabold text-slate-900">Bespoke</div>
              <div className="text-[10px] text-slate-500 font-semibold">Fully customized</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isAntique ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'].join(' ')}>
            <input type="checkbox" checked={certify.isAntique}
              onChange={(e) => onChange({ isAntique: e.target.checked })} className="h-4 w-4 rounded" />
            <Award className={['h-4 w-4', certify.isAntique ? 'text-amber-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="text-sm font-extrabold text-slate-900">Antique</div>
              <div className="text-[10px] text-slate-500 font-semibold">Heritage piece</div>
            </div>
          </label>
        </div>
      </section>

      {/* Certification */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
            <Award className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-blue-900 text-base">Certification</h3>
            <p className="text-xs text-blue-700 font-semibold">GIA, SGL, IGI, IIJP certificate details</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={certify.isCertified}
              onChange={(e) => onChange({ isCertified: e.target.checked })} className="h-5 w-5 rounded" />
            <span className="text-sm font-extrabold text-blue-900">Is Certified?</span>
          </label>
        </div>

        {certify.isCertified && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Certificate Number *"
                value={certify.certificateNumber}
                onChange={(e) => onChange({ certificateNumber: e.target.value })}
                placeholder="GIA-2141234567"
              />
              <Input
                label="Certificate Authority"
                value={certify.certificateAuthority}
                onChange={(e) => onChange({ certificateAuthority: e.target.value })}
                placeholder="GIA / SGL / IGI / IIJP"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Certificate Photo</label>
              {certify.certificatePhotoUrl ? (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-blue-200">
                  <img src={certify.certificatePhotoUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => onChange({ certificatePhotoUrl: '' })}
                    className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">×</button>
                </div>
              ) : (
                <UploadDropzone
                  onUploaded={(records) => {
                    const first = Array.isArray(records) ? records[0] : records;
                    const url = typeof first === 'string' ? first : (first as any)?.url;
                    if (url) onChange({ certificatePhotoUrl: url });
                  }}
                  hint="Photo of certificate"
                />
              )}
            </div>
          </>
        )}
      </section>

      {/* Buyback & Return Policy */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-emerald-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base">Buyback & Return Policy</h3>
            <p className="text-xs text-emerald-700 font-semibold">Customer trust builder</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isBuyBackEligible ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'].join(' ')}>
            <input type="checkbox" checked={certify.isBuyBackEligible}
              onChange={(e) => onChange({ isBuyBackEligible: e.target.checked })} className="h-5 w-5 rounded" />
            <RefreshCw className={['h-5 w-5', certify.isBuyBackEligible ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-sm">Buyback Eligible</div>
              <div className="text-[10px] text-slate-500 font-semibold">Store will buy back at % of value</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isReturnable ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'].join(' ')}>
            <input type="checkbox" checked={certify.isReturnable}
              onChange={(e) => onChange({ isReturnable: e.target.checked })} className="h-5 w-5 rounded" />
            <Package className={['h-5 w-5', certify.isReturnable ? 'text-blue-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-sm">Returnable</div>
              <div className="text-[10px] text-slate-500 font-semibold">Return within X days</div>
            </div>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Buyback % (of sale price)"
            type="number" step="0.1"
            value={certify.buyBackPct}
            onChange={(e) => onChange({ buyBackPct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 85"
            disabled={!certify.isBuyBackEligible}
            hint="Typical: 85-95% for gold"
          />
          <Input
            label="Return Days"
            type="number"
            value={certify.returnDays}
            onChange={(e) => onChange({ returnDays: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="7"
            disabled={!certify.isReturnable}
            hint="Days customer can return"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Current Market Value (Rs)"
            type="number"
            value={certify.currentValue}
            onChange={(e) => onChange({ currentValue: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Today's value"
            leftIcon={<TrendingUp className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Insured Value (Rs)"
            type="number"
            value={certify.insuredValue}
            onChange={(e) => onChange({ insuredValue: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Insurance amount"
            leftIcon={<Shield className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-amber-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-700 text-white flex items-center justify-center shadow-md">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900 text-base">Base Pricing (Estimated)</h3>
            <p className="text-xs text-amber-700 font-semibold">Final price calculated at sale based on live rates</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Cost Price (Rs)"
            type="number"
            value={certify.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Your cost"
            hint="Purchase / manufacturing cost"
          />
          <Input
            label="Estimated Sale Price (Rs)"
            type="number"
            value={certify.estimatedPrice}
            onChange={(e) => onChange({ estimatedPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Menu price estimate"
            hint="Live rate + making + wastage + stones"
          />
        </div>

        {sale > 0 && cost > 0 && (
          <div className={['rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300'
              : margin >= 30 ? 'bg-emerald-50 border-emerald-300'
              : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5', isLoss ? 'text-rose-700' : margin >= 30 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 30 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Expected Profit'}
                </div>
                <div className="text-lg font-extrabold tabular-nums text-slate-900">
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={['text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 30 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}
      </section>

      {/* Collection Tags */}
      <section className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-rose-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-700 text-white flex items-center justify-center shadow-md">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-rose-900 text-base">Collection Tags</h3>
            <p className="text-xs text-rose-700 font-semibold">Special collections & seasonal</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isBridalCollection ? 'border-rose-500 bg-rose-50 shadow' : 'border-slate-200 hover:border-rose-300'].join(' ')}>
            <input type="checkbox" checked={certify.isBridalCollection}
              onChange={(e) => onChange({ isBridalCollection: e.target.checked })} className="h-5 w-5 rounded" />
            <span className="text-xl">👰</span>
            <div className="flex-1">
              <div className="font-extrabold text-sm">Bridal Collection</div>
              <div className="text-[10px] text-slate-500 font-semibold">Wedding jewelry</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isFestivalSpecial ? 'border-orange-500 bg-orange-50 shadow' : 'border-slate-200 hover:border-orange-300'].join(' ')}>
            <input type="checkbox" checked={certify.isFestivalSpecial}
              onChange={(e) => onChange({ isFestivalSpecial: e.target.checked })} className="h-5 w-5 rounded" />
            <span className="text-xl">🎉</span>
            <div className="flex-1">
              <div className="font-extrabold text-sm">Festival Special</div>
              <div className="text-[10px] text-slate-500 font-semibold">Eid / Diwali / etc</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isBestSeller ? 'border-emerald-500 bg-emerald-50 shadow' : 'border-slate-200 hover:border-emerald-300'].join(' ')}>
            <input type="checkbox" checked={certify.isBestSeller}
              onChange={(e) => onChange({ isBestSeller: e.target.checked })} className="h-5 w-5 rounded" />
            <TrendingUp className={['h-5 w-5', certify.isBestSeller ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-sm">Best Seller</div>
              <div className="text-[10px] text-slate-500 font-semibold">Popular item</div>
            </div>
          </label>
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            certify.isPopular ? 'border-amber-500 bg-amber-50 shadow' : 'border-slate-200 hover:border-amber-300'].join(' ')}>
            <input type="checkbox" checked={certify.isPopular}
              onChange={(e) => onChange({ isPopular: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', certify.isPopular ? 'text-amber-500 fill-amber-500' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-sm">Popular</div>
              <div className="text-[10px] text-slate-500 font-semibold">Trending now</div>
            </div>
          </label>
        </div>
      </section>

      {/* Additional Details */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Additional Details</h3>
            <p className="text-xs text-slate-500 font-semibold">Long description, care instructions</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Long Description</label>
          <textarea
            rows={4}
            value={certify.descriptionLong}
            onChange={(e) => onChange({ descriptionLong: e.target.value })}
            placeholder="Detailed description for catalog / website..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Care Instructions</label>
          <textarea
            rows={3}
            value={certify.careInstructions}
            onChange={(e) => onChange({ careInstructions: e.target.value })}
            placeholder="How customer should care for this piece..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
          />
        </div>

        <Input
          label="Video URL (Optional)"
          value={certify.videoUrl}
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          placeholder="YouTube / Vimeo link"
          leftIcon={<Video className="h-4 w-4 text-slate-400" />}
          hint="360° view or promo video"
        />
      </section>
    </div>
  );
}
