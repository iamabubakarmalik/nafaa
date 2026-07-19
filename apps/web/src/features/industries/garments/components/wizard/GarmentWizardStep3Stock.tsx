import {
  Package, MapPin, AlertCircle, Sparkles, Info, Ruler, Scissors,
  Bookmark, CreditCard, ShoppingBag, Award, Clock, Globe, User,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type {
  GarmentWizardBasic, GarmentWizardStock,
} from '../../hooks/useGarmentWizard';

interface Props {
  basic: GarmentWizardBasic;
  hasVariants: boolean;
  stock: GarmentWizardStock;
  onUpdateBasic: (patch: Partial<GarmentWizardBasic>) => void;
  onUpdateStock: (patch: Partial<GarmentWizardStock>) => void;
  errors: string[];
}

export function GarmentWizardStep3Stock({
  basic, hasVariants, stock, onUpdateBasic, onUpdateStock, errors,
}: Props) {
  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-pink-900 text-sm">Final Setup</h3>
          <p className="text-xs text-pink-800 font-semibold mt-0.5 leading-relaxed">
            {hasVariants
              ? 'Variants ka stock Step 2 mein set kar chuke ho. Yahan sirf services aur additional info.'
              : 'Simple product hai — yahan stock aur services set karo.'}
          </p>
        </div>
      </div>

      {/* Simple stock (only if no variants) */}
      {!hasVariants && (
        <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900 text-base">Stock Entry</h3>
              <p className="text-xs text-emerald-700 font-semibold">Simple stock (no variants)</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input label={`Current Stock (${basic.unit || 'pcs'})`} type="number" step="0.01"
              value={stock.currentStock}
              onChange={(e) => onUpdateStock({ currentStock: Number(e.target.value || 0) })} />
            <Input label="Low Stock Alert" type="number" step="1"
              value={stock.lowStockAlert}
              onChange={(e) => onUpdateStock({ lowStockAlert: Number(e.target.value || 0) })} />
            <Input label="Rack / Location" value={stock.rackNumber}
              onChange={(e) => onUpdateStock({ rackNumber: e.target.value })}
              placeholder="Rack-A"
              leftIcon={<MapPin className="h-4 w-4 text-slate-400" />} />
          </div>

          {stock.currentStock > 0 && Number(basic.salePrice || 0) > 0 && (
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Stock Value</div>
                <div className="text-lg font-extrabold text-emerald-900 tabular-nums">
                  {formatPKRFull(stock.currentStock * Number(basic.salePrice || 0))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Units</div>
                <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                  {stock.currentStock} {basic.unit}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Product Type Flags */}
      <section className="rounded-2xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-md">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-fuchsia-900 text-base">Product Type</h3>
            <p className="text-xs text-fuchsia-700 font-semibold">Ready-made ya stitchable?</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className={[
            'flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            basic.isReadyMade ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300',
          ].join(' ')}>
            <input type="checkbox" checked={basic.isReadyMade}
              onChange={(e) => onUpdateBasic({ isReadyMade: e.target.checked })} className="h-5 w-5 rounded mt-0.5" />
            <div>
              <ShoppingBag className="h-5 w-5 text-emerald-600 mb-1" />
              <div className="font-extrabold text-slate-900 text-sm">Ready-Made</div>
              <div className="text-xs text-slate-500 font-semibold">Stitched, ready to wear</div>
            </div>
          </label>

          <label className={[
            'flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            basic.isStitchable ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300',
          ].join(' ')}>
            <input type="checkbox" checked={basic.isStitchable}
              onChange={(e) => onUpdateBasic({ isStitchable: e.target.checked })} className="h-5 w-5 rounded mt-0.5" />
            <div>
              <Scissors className="h-5 w-5 text-purple-600 mb-1" />
              <div className="font-extrabold text-slate-900 text-sm">Stitchable</div>
              <div className="text-xs text-slate-500 font-semibold">Custom tailoring available</div>
            </div>
          </label>

          <label className={[
            'flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            basic.isFabricOnly ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300',
          ].join(' ')}>
            <input type="checkbox" checked={basic.isFabricOnly}
              onChange={(e) => onUpdateBasic({ isFabricOnly: e.target.checked })} className="h-5 w-5 rounded mt-0.5" />
            <div>
              <Package className="h-5 w-5 text-cyan-600 mb-1" />
              <div className="font-extrabold text-slate-900 text-sm">Fabric Only</div>
              <div className="text-xs text-slate-500 font-semibold">Raw material, unstitched</div>
            </div>
          </label>
        </div>
      </section>

      {/* Service Options */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900 text-base">Service Options</h3>
            <p className="text-xs text-amber-700 font-semibold">Customer services enable karo</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            basic.allowAlteration ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300',
          ].join(' ')}>
            <input type="checkbox" checked={basic.allowAlteration}
              onChange={(e) => onUpdateBasic({ allowAlteration: e.target.checked })} className="h-5 w-5 rounded" />
            <Ruler className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Alterations</div>
              <div className="text-xs text-slate-500 font-semibold">Allow fitting adjustments</div>
            </div>
          </label>

          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            basic.allowReservation ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300',
          ].join(' ')}>
            <input type="checkbox" checked={basic.allowReservation}
              onChange={(e) => onUpdateBasic({ allowReservation: e.target.checked })} className="h-5 w-5 rounded" />
            <Bookmark className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Reservations</div>
              <div className="text-xs text-slate-500 font-semibold">Hold with deposit</div>
            </div>
          </label>

          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition',
            basic.allowLayaway ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300',
          ].join(' ')}>
            <input type="checkbox" checked={basic.allowLayaway}
              onChange={(e) => onUpdateBasic({ allowLayaway: e.target.checked })} className="h-5 w-5 rounded" />
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Layaway / EMI</div>
              <div className="text-xs text-slate-500 font-semibold">Installment plans</div>
            </div>
          </label>
        </div>

        {basic.allowAlteration && (
          <Input
            label="Min. alteration days"
            type="number"
            value={basic.minAlterationDays}
            onChange={(e) => onUpdateBasic({ minAlterationDays: e.target.value === '' ? '' : Number(e.target.value) })}
            hint="Typical alteration turnaround"
            leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
          />
        )}

        {basic.isStitchable && (
          <Input
            label="Default stitching days"
            type="number"
            value={basic.defaultStitchingDays}
            onChange={(e) => onUpdateBasic({ defaultStitchingDays: e.target.value === '' ? '' : Number(e.target.value) })}
            hint="From order to delivery"
            leftIcon={<Scissors className="h-4 w-4 text-slate-400" />}
          />
        )}
      </section>

      {/* Care & Origin */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-md">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Care & Origin</h3>
            <p className="text-xs text-slate-500 font-semibold">Additional information</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Care Instructions</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
            value={basic.careInstructions}
            onChange={(e) => onUpdateBasic({ careInstructions: e.target.value })}
            placeholder="Dry clean only, hand wash cold, iron on low..."
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Country of Origin"
            value={basic.countryOfOrigin}
            onChange={(e) => onUpdateBasic({ countryOfOrigin: e.target.value })}
            placeholder="Pakistan"
            leftIcon={<Globe className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Manufacturer"
            value={basic.manufacturer}
            onChange={(e) => onUpdateBasic({ manufacturer: e.target.value })}
            placeholder="Optional"
          />
          <Input
            label="Designer"
            value={basic.designer}
            onChange={(e) => onUpdateBasic({ designer: e.target.value })}
            placeholder="Optional"
            leftIcon={<User className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </section>
    </div>
  );
}
