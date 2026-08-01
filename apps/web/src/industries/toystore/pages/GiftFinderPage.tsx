import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles, Baby, DollarSign, GraduationCap, ShieldCheck,
  Search, Package, Star, ArrowRight, Cake, Heart, Gift,
} from 'lucide-react';
import { toast } from 'sonner';
import { toyProductsApi } from '../api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const AGE_PRESETS = [
  { years: 0.5, l: '6 months', e: '👶' },
  { years: 1, l: '1 year', e: '🍼' },
  { years: 2, l: '2 years', e: '🧸' },
  { years: 3, l: '3 years', e: '🎈' },
  { years: 4, l: '4 years', e: '🎨' },
  { years: 5, l: '5 years', e: '🎒' },
  { years: 6, l: '6 years', e: '📚' },
  { years: 8, l: '8 years', e: '⚽' },
  { years: 10, l: '10 years', e: '🎮' },
  { years: 12, l: '12 years', e: '📱' },
  { years: 15, l: '15+ years', e: '🎯' },
];

const BUDGET_PRESETS = [500, 1000, 2000, 3000, 5000, 10000];

export default function GiftFinderPage() {
  const [years, setYears] = useState<number | ''>('');
  const [gender, setGender] = useState('UNISEX');
  const [maxBudget, setMaxBudget] = useState<number | ''>('');
  const [educationalOnly, setEducationalOnly] = useState(false);
  const [safeOnly, setSafeOnly] = useState(true);
  const [results, setResults] = useState<any | null>(null);

  const findGifts = useMutation({
    mutationFn: () => toyProductsApi.forAge({
      years: Number(years),
      gender: gender === 'UNISEX' ? undefined : gender,
      maxBudget: maxBudget === '' ? undefined : Number(maxBudget),
      educationalOnly,
      safeOnly,
    }),
    onSuccess: (data) => {
      setResults(data);
      if (data.count === 0) {
        toast.info('No matches — try widening the search');
      } else {
        toast.success(`Found ${data.count} perfect toys`);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Search failed'),
  });

  const canSearch = years !== '' && Number(years) > 0;

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> AI Gift Finder
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✨ Find the perfect toy</h1>
          <p className="mt-2 text-sm text-white/80 font-semibold max-w-2xl">
            Age-appropriate + gender + budget + safety = the toy your customer's kid will love.
            Perfect for walk-in customers who need help choosing a gift.
          </p>
        </div>
      </section>

      {/* SEARCH FORM */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        {/* AGE */}
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-600" /> Child's age *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-2 mb-3">
            {AGE_PRESETS.map((a) => (
              <button key={a.years} onClick={() => setYears(a.years)}
                className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5 min-h-[68px] ${
                  years === a.years ? 'border-violet-600 bg-violet-600 text-white shadow-md scale-[1.03]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'}`}>
                <span className="text-xl leading-none">{a.e}</span>
                <span className="text-[10px] font-extrabold text-center leading-tight">{a.l}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600">Or exact age:</span>
            <input type="number" step="0.5" min="0" max="18" value={years}
              onChange={(e) => setYears(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 4.5"
              className="h-11 w-32 rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            <span className="text-xs font-bold text-slate-500">years</span>
          </div>
        </div>

        {/* GENDER */}
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Baby className="h-5 w-5 text-pink-600" /> Child's gender
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'UNISEX', l: 'Any', e: '⚧️' },
              { v: 'BOYS', l: 'Boy', e: '👦' },
              { v: 'GIRLS', l: 'Girl', e: '👧' },
            ].map((g) => (
              <button key={g.v} onClick={() => setGender(g.v)}
                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                  gender === g.v ? 'border-pink-500 bg-pink-500 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300'}`}>
                <span className="text-3xl">{g.e}</span>
                <span className="text-sm font-extrabold">{g.l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* BUDGET */}
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" /> Maximum budget (PKR)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            {BUDGET_PRESETS.map((b) => (
              <button key={b} onClick={() => setMaxBudget(b)}
                className={`h-11 rounded-xl border-2 text-sm font-extrabold tabular-nums transition ${
                  maxBudget === b ? 'border-emerald-500 bg-emerald-500 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'}`}>
                {formatPKR(b)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600">Custom:</span>
            <input type="number" step="100" value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Any budget"
              className="h-11 w-40 rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            <button onClick={() => setMaxBudget('')} className="text-xs font-extrabold text-slate-500 hover:text-rose-600">
              Clear
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-3">Extra preferences</label>
          <div className="grid sm:grid-cols-2 gap-2">
            <button onClick={() => setEducationalOnly((v) => !v)}
              className={`p-4 rounded-xl border-2 transition flex items-center gap-3 text-left ${
                educationalOnly ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'}`}>
              <GraduationCap className={`h-6 w-6 ${educationalOnly ? 'text-violet-600' : 'text-slate-400'}`} />
              <div className="flex-1">
                <div className="font-extrabold text-sm text-slate-900">Educational only</div>
                <div className="text-[11px] text-slate-500 font-semibold">STEM, learning, Montessori</div>
              </div>
            </button>
            <button onClick={() => setSafeOnly((v) => !v)}
              className={`p-4 rounded-xl border-2 transition flex items-center gap-3 text-left ${
                safeOnly ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
              <ShieldCheck className={`h-6 w-6 ${safeOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div className="flex-1">
                <div className="font-extrabold text-sm text-slate-900">Safety filter (for under 3s)</div>
                <div className="text-[11px] text-slate-500 font-semibold">No choking hazards, non-toxic</div>
              </div>
            </button>
          </div>
        </div>

        {/* SEARCH BUTTON */}
        <button onClick={() => findGifts.mutate()} disabled={!canSearch || findGifts.isPending}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-700 hover:from-violet-700 text-white font-extrabold text-lg shadow-xl inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {findGifts.isPending ? (
            <>Searching...</>
          ) : (
            <>
              <Sparkles className="h-5 w-5" /> Find Perfect Gifts
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </section>

      {/* RESULTS */}
      {results && (
        <section className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 p-4 flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-emerald-900">
                {results.count} toys found for age {results.childAgeYears}
              </h3>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                Matched age groups: {results.matchedAgeGroups.join(', ')}
                {results.safetyFilterApplied && ' • Safety-filtered for young children'}
              </p>
            </div>
          </div>

          {results.count === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-extrabold text-slate-900">No matches found</h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">Try widening the age range or increasing budget</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {results.items.map((item: any) => (
                <Link key={item.id} to={`/toy-products/${item.productId}`}
                  className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-violet-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {item.product?.images?.[0]?.url ? (
                      <img src={item.product.images[0].url} loading="lazy" alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50">
                        <Baby className="h-12 w-12 text-violet-300" />
                      </div>
                    )}
                    {item.isBestSeller && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow">
                        🏆 BEST
                      </div>
                    )}
                    {item.isBirthdayGift && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-pink-500 text-white text-[9px] font-extrabold shadow">
                        🎂 GIFT
                      </div>
                    )}
                    {item.isEducational && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold shadow inline-flex items-center gap-0.5">
                        <GraduationCap className="h-2.5 w-2.5" /> EDU
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-extrabold text-slate-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                      {item.product?.name}
                    </div>
                    {item.brand && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{item.brand}</div>}
                    <div className="mt-2 flex items-end justify-between">
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-none">
                        {formatPKR(item.retailPrice || item.product?.price || 0)}
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* HELPFUL TIPS */}
      {!results && (
        <section className="rounded-3xl bg-gradient-to-br from-pink-50 to-violet-50 border-2 border-pink-200 p-5">
          <h3 className="font-extrabold text-pink-900 mb-3 flex items-center gap-2">
            <Heart className="h-5 w-5" /> Pro Tips for Gift Recommendations
          </h3>
          <ul className="space-y-2 text-sm text-slate-700 font-semibold">
            <li className="flex items-start gap-2">
              <span className="text-violet-600 font-extrabold">✓</span>
              For <strong>under 3 years</strong>, always keep the safety filter ON — no choking hazards, non-toxic materials only
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-600 font-extrabold">✓</span>
              <strong>Educational filter</strong> highlights STEM, Montessori, and learning toys — great for grandparents shopping for milestones
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-600 font-extrabold">✓</span>
              Set a <strong>budget</strong> to avoid disappointing walk-in customers with too-expensive options
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-600 font-extrabold">✓</span>
              Use the "Any" gender option to see unisex toys — often the safest bet when unsure
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
