// apps/web/src/modules/purchasing/purchases/pages/PurchasesGate.tsx
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PurchasesPage from './PurchasesPage';

/**
 * PurchasesGate — ab lagbhag har industry ek hi purchase page use karti hai.
 *
 * Dekha to retail aur restaurant ke purchase pages me ek bhi
 * industry-specific cheez nahi thi — sirf rang alag the. Ab ek hi
 * page: barcode scanner, rate ka farq (pichli baar se compare),
 * smart reorder, analytics aur poora record.
 *
 * Do istisna (exception):
 *  • Electronics — wahi global page + serial numbers daalne ka extra
 *    hissa (ek chhota wrapper, poora page nahi).
 *  • Carpet — iske rolls (width/length/sqft) ka data model hi alag
 *    hai, is liye uska apna page rahega.
 *
 * Purane industry pages disk par mojood hain, bas gate se hata diye gaye.
 */

const ElectronicsPurchases = lazy(() => import('@industries/electronics/pages/ElectronicsPurchasesPage'));
const CarpetPurchases = lazy(() => import('@industries/carpet/pages/CarpetPurchasesV2'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin" />
    </div>
  );
}

/** Har industry ka apna rang — baqi sab kuch ek jaisa */
const THEMES: Record<string, { gradient: string; emoji: string; label: string }> = {
  retail:      { gradient: 'from-slate-950 via-emerald-900 to-teal-700',  emoji: '🛒', label: 'Retail' },
  restaurant:  { gradient: 'from-slate-950 via-orange-900 to-red-700',    emoji: '🍽️', label: 'Restaurant' },
  mobile:      { gradient: 'from-slate-950 via-blue-900 to-indigo-700',   emoji: '📱', label: 'Mobile' },
  pharmacy:    { gradient: 'from-slate-950 via-cyan-900 to-teal-700',     emoji: '💊', label: 'Pharmacy' },
  garments:    { gradient: 'from-slate-950 via-pink-900 to-fuchsia-700',  emoji: '👕', label: 'Garments' },
  bakery:      { gradient: 'from-slate-950 via-amber-900 to-orange-700',  emoji: '🧁', label: 'Bakery' },
  jewelry:     { gradient: 'from-slate-950 via-yellow-900 to-amber-700',  emoji: '💍', label: 'Jewelry' },
  hardware:    { gradient: 'from-slate-950 via-slate-800 to-zinc-700',    emoji: '🔧', label: 'Hardware' },
  autoparts:   { gradient: 'from-slate-950 via-red-900 to-orange-700',    emoji: '🚗', label: 'Auto Parts' },
  dairy:       { gradient: 'from-slate-950 via-sky-900 to-blue-700',      emoji: '🥛', label: 'Dairy' },
  meat:        { gradient: 'from-slate-950 via-rose-900 to-red-700',      emoji: '🥩', label: 'Meat' },
  agri:        { gradient: 'from-slate-950 via-lime-900 to-green-700',    emoji: '🌾', label: 'Agri' },
  bookstore:   { gradient: 'from-slate-950 via-indigo-900 to-violet-700', emoji: '📚', label: 'Bookstore' },
};

export default function PurchasesGate() {
  const industry = useCurrentIndustry();
  const id = industry?.id ?? '';

  if (id === 'electronics') {
    return <Suspense fallback={<Loader />}><ElectronicsPurchases /></Suspense>;
  }
  if (id === 'carpet') {
    return <Suspense fallback={<Loader />}><CarpetPurchases /></Suspense>;
  }

  const t = THEMES[id];
  return (
    <PurchasesPage
      gradient={t?.gradient}
      emoji={t?.emoji}
      industryLabel={t?.label}
    />
  );
}
