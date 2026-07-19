import {
  MapPin, Building2, FileText, AlertCircle, Info, Utensils,
  Award, Star, TrendingUp, Zap, Beef, Activity,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { MeatWizardOrigin } from '../../hooks/useMeatWizard';

interface Props {
  origin: MeatWizardOrigin;
  onChange: (patch: Partial<MeatWizardOrigin>) => void;
  errors: string[];
}

export function MeatWizardStep3Origin({ origin, onChange, errors }: Props) {
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

      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-blue-900 text-sm">Origin & Nutrition Info</h3>
          <p className="text-xs text-blue-800 font-semibold mt-0.5 leading-relaxed">
            Sab optional hai — farm details, batch info, nutrition data se customer trust badhega.
          </p>
        </div>
      </div>

      {/* Farm & Origin */}
      <section className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-green-900 text-base">Farm & Origin</h3>
            <p className="text-xs text-green-700 font-semibold">Where did the meat come from?</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Farm Name" value={origin.farmName}
            onChange={(e) => onChange({ farmName: e.target.value })}
            placeholder="e.g. Green Valley Farm" />
          <Input label="Farm Location" value={origin.farmLocation}
            onChange={(e) => onChange({ farmLocation: e.target.value })}
            placeholder="e.g. Sahiwal, Punjab" leftIcon={<MapPin className="h-4 w-4 text-slate-400" />} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Country of Origin" value={origin.countryOfOrigin}
            onChange={(e) => onChange({ countryOfOrigin: e.target.value })}
            placeholder="Pakistan" />
          <Input label="Breed" value={origin.breed}
            onChange={(e) => onChange({ breed: e.target.value })}
            placeholder="Sahiwal, Beetal, Kajli..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Animal Age" value={origin.animalAge}
            onChange={(e) => onChange({ animalAge: e.target.value })}
            placeholder="e.g. 2 years, 8 months" />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Animal Sex</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-green-500"
              value={origin.animalSex}
              onChange={(e) => onChange({ animalSex: e.target.value })}
            >
              <option value="">-- Select --</option>
              <option value="Male">♂️ Male</option>
              <option value="Female">♀️ Female</option>
              <option value="Castrated">Castrated</option>
            </select>
          </div>
        </div>
      </section>

      {/* Slaughterhouse */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base">Slaughterhouse</h3>
            <p className="text-xs text-emerald-700 font-semibold">Facility details</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Slaughterhouse Name" value={origin.slaughterhouseName}
            onChange={(e) => onChange({ slaughterhouseName: e.target.value })}
            placeholder="e.g. Al-Halal Meat Processing" />
          <Input label="License Number" value={origin.slaughterhouseLic}
            onChange={(e) => onChange({ slaughterhouseLic: e.target.value })}
            placeholder="LIC-2026-001" />
        </div>
      </section>

      {/* Batch & Processing */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900 text-base">Batch & Processing</h3>
            <p className="text-xs text-amber-700 font-semibold">Traceability information</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Batch Number" value={origin.batchNumber}
            onChange={(e) => onChange({ batchNumber: e.target.value })}
            placeholder="B-2026-0719" />
          <Input label="Cutting Style" value={origin.cuttingStyle}
            onChange={(e) => onChange({ cuttingStyle: e.target.value })}
            placeholder="e.g. Cubes 1inch, Strips" />
          <Input label="Cleaning Level" value={origin.cleaningLevel}
            onChange={(e) => onChange({ cleaningLevel: e.target.value })}
            placeholder="e.g. Fully cleaned, Skin on" />
        </div>
      </section>

      {/* Nutrition (per 100g) */}
      <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-violet-900 text-base">Nutrition (per 100g)</h3>
            <p className="text-xs text-violet-700 font-semibold">Health-conscious customers ke liye</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Calories (kcal)" type="number" value={origin.nutritionCalories}
            onChange={(e) => onChange({ nutritionCalories: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 250" />
          <Input label="Protein (g)" type="number" step="0.1" value={origin.nutritionProtein}
            onChange={(e) => onChange({ nutritionProtein: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 26" />
          <Input label="Fat (g)" type="number" step="0.1" value={origin.nutritionFat}
            onChange={(e) => onChange({ nutritionFat: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 15" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Carbs (g)" type="number" step="0.1" value={origin.nutritionCarbs}
            onChange={(e) => onChange({ nutritionCarbs: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" />
          <Input label="Cholesterol (mg)" type="number" value={origin.nutritionCholesterol}
            onChange={(e) => onChange({ nutritionCholesterol: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 80" />
          <Input label="Sodium (mg)" type="number" value={origin.nutritionSodium}
            onChange={(e) => onChange({ nutritionSodium: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 75" />
        </div>
      </section>

      {/* Description & Cooking */}
      <section className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-orange-900 text-base">Description & Cooking</h3>
            <p className="text-xs text-orange-700 font-semibold">Detailed info & recipe suggestions</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Long Description</label>
          <textarea rows={3} value={origin.descriptionLong}
            onChange={(e) => onChange({ descriptionLong: e.target.value })}
            placeholder="Detailed product story — sourcing, quality, taste..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Cooking Suggestions</label>
          <textarea rows={3} value={origin.cookingSuggestions}
            onChange={(e) => onChange({ cookingSuggestions: e.target.value })}
            placeholder="Best for BBQ, karahi, biryani. Marinate for 2 hours before grilling..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {/* Marketing Flags */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center shadow-md">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Marketing Badges</h3>
            <p className="text-xs text-slate-500 font-semibold">Highlight products in catalog</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            origin.isPopular ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'].join(' ')}>
            <input type="checkbox" checked={origin.isPopular}
              onChange={(e) => onChange({ isPopular: e.target.checked })} className="h-5 w-5 rounded" />
            <TrendingUp className={['h-5 w-5', origin.isPopular ? 'text-red-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Popular</div>
              <div className="text-[10px] text-slate-500 font-semibold">Best-selling</div>
            </div>
          </label>

          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            origin.isNewArrival ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'].join(' ')}>
            <input type="checkbox" checked={origin.isNewArrival}
              onChange={(e) => onChange({ isNewArrival: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={['h-5 w-5', origin.isNewArrival ? 'text-blue-600 fill-blue-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">New Arrival</div>
              <div className="text-[10px] text-slate-500 font-semibold">Just launched</div>
            </div>
          </label>

          <label className={['flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            origin.isOnSale ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'].join(' ')}>
            <input type="checkbox" checked={origin.isOnSale}
              onChange={(e) => onChange({ isOnSale: e.target.checked })} className="h-5 w-5 rounded" />
            <Zap className={['h-5 w-5', origin.isOnSale ? 'text-rose-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">On Sale</div>
              <div className="text-[10px] text-slate-500 font-semibold">Discount active</div>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
