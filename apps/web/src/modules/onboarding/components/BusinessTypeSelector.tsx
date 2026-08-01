// apps/web/src/modules/onboarding/components/BusinessTypeSelector.tsx
import { useState, useMemo } from 'react';
import { Check, Sparkles, Search } from 'lucide-react';

export interface BusinessTypeCard {
  value: string;
  label: string;
  labelUrdu?: string;
  emoji: string;
  description: string;
  category: string;
  color?: string;
  popular?: boolean;
  highlights?: string[];
  defaultUnit?: string;
  featureCount?: number;
}

// ─── Fallback list — agar API se options.businessTypes empty aayen ───
const FALLBACK_BUSINESS_TYPES: BusinessTypeCard[] = [
  // ═══ POPULAR (top of list) ═══
  {
    value: 'GROCERY', label: 'Grocery / Kiryana', labelUrdu: 'کریانہ سٹور', emoji: '🛒',
    description: 'General stores, supermarkets', category: 'Retail', popular: true,
    defaultUnit: 'kg',
    highlights: ['Weight-based pricing', 'Expiry tracking', 'Batches', 'Multi-unit'],
  },
  {
    value: 'MOBILE', label: 'Mobile / Electronics', labelUrdu: 'موبائل شاپ', emoji: '📱',
    description: 'Mobile shops, accessories, repairs', category: 'Electronics', popular: true,
    defaultUnit: 'pcs',
    highlights: ['IMEI tracking', 'EMI plans', 'Warranty', 'Used phone trade-in'],
  },
  {
    value: 'PHARMACY', label: 'Pharmacy / Medical Store', labelUrdu: 'میڈیکل سٹور', emoji: '💊',
    description: 'Medical stores, pharmacies', category: 'Healthcare', popular: true,
    defaultUnit: 'strip',
    highlights: ['Expiry tracking', 'Batch numbers', 'Prescriptions', 'Drug interactions'],
  },
  {
    value: 'RESTAURANT', label: 'Restaurant / Cafe', labelUrdu: 'ریسٹورنٹ', emoji: '🍽️',
    description: 'Restaurants, cafes, dhabas', category: 'Food', popular: true,
    defaultUnit: 'plate',
    highlights: ['Table management', 'Kitchen tickets (KOT)', 'Delivery', 'Recipes'],
  },
  {
    value: 'SALON', label: 'Salon / Beauty / Spa', labelUrdu: 'بیوٹی پارلر', emoji: '💇',
    description: 'Salons, parlours, spas', category: 'Service', popular: true,
    defaultUnit: 'service',
    highlights: ['Appointments', 'Staff commissions', 'Memberships', 'Packages'],
  },
  {
    value: 'CLOTHING', label: 'Clothing / Garments', labelUrdu: 'کپڑے کی دکان', emoji: '👕',
    description: 'Clothing stores, tailoring', category: 'Fashion', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Size × Color matrix', 'Fabric meter/gaj', 'Tailoring', 'Alterations'],
  },
  {
    value: 'HARDWARE', label: 'Hardware / Construction', labelUrdu: 'ہارڈویئر', emoji: '🔧',
    description: 'Tools, building materials', category: 'Industrial', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Bulk pricing', 'Quotations', 'Delivery tracking', 'Projects'],
  },
  {
    value: 'APPLIANCES', label: 'Home Appliances', labelUrdu: 'گھریلو آلات', emoji: '🏠',
    description: 'Fridge, AC, washing machine, LED TV', category: 'Retail', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Serial number tracking', 'Warranty', 'EMI plans', 'AMC contracts', 'Delivery + install'],
  },
  {
    value: 'ELECTRONICS', label: 'Electronics & Gadgets', labelUrdu: 'الیکٹرانکس', emoji: '🔌',
    description: 'Tech accessories, smartwatches, drones', category: 'Electronics', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Serial + IMEI', 'Warranty', 'Bundle deals', 'Repair services', 'Trade-in'],
  },

  // ═══ REGULAR ═══
  {
    value: 'BAKERY', label: 'Bakery / Cake Shop', labelUrdu: 'بیکری', emoji: '🍰',
    description: 'Bakeries, sweet shops', category: 'Food',
    defaultUnit: 'pcs',
    highlights: ['Custom cakes', 'Production planning', 'Freshness tracking'],
  },
  {
    value: 'COSMETICS', label: 'Cosmetics / Beauty', labelUrdu: 'کاسمیٹکس', emoji: '💄',
    description: 'Cosmetics, beauty products', category: 'Lifestyle',
    defaultUnit: 'pcs',
    highlights: ['Shade variants', 'Expiry tracking', 'Brand catalog', 'Gift bundles'],
  },
  {
    value: 'STATIONERY', label: 'Stationery / Books', labelUrdu: 'اسٹیشنری', emoji: '📚',
    description: 'Stationery, bookstores', category: 'Education',
    defaultUnit: 'pcs',
    highlights: ['School book lists', 'Book rentals', 'Bulk packs'],
  },
  {
    value: 'CARPET', label: 'Carpets / Flooring', labelUrdu: 'قالین شاپ', emoji: '🏪',
    description: 'Carpets, tiles, rugs', category: 'Retail',
    defaultUnit: 'sqft',
    highlights: ['Length × Width calc', 'Color variants', 'Roll & cut-piece tracking'],
  },
  {
    value: 'AUTO_PARTS', label: 'Auto Parts / Workshop', labelUrdu: 'ورکشاپ', emoji: '🔩',
    description: 'Auto parts, mechanics', category: 'Automotive',
    defaultUnit: 'pcs',
    highlights: ['Vehicle registration', 'Service jobs', 'Warranty', 'Parts compatibility'],
  },
  {
    value: 'MEAT', label: 'Meat / Butchery', labelUrdu: 'قصائی', emoji: '🥩',
    description: 'Meat shops, halal butchery', category: 'Food',
    defaultUnit: 'kg',
    highlights: ['Weight orders', 'Halal slaughter log', 'Qurbani bookings'],
  },
  {
    value: 'DAIRY', label: 'Dairy / Milk Shop', labelUrdu: 'ڈیری', emoji: '🥛',
    description: 'Milk shops, dairy products', category: 'Food',
    defaultUnit: 'liter',
    highlights: ['Delivery routes', 'Daily subscriptions', 'Monthly khata'],
  },
  {
    value: 'AGRI', label: 'Agri / Seeds / Fertilizer', labelUrdu: 'زرعی سٹور', emoji: '🌾',
    description: 'Seeds, fertilizers, feed', category: 'Agriculture',
    defaultUnit: 'kg',
    highlights: ['Farmer khata', 'Seasonal calendar', 'Govt subsidies'],
  },
  {
    value: 'JEWELRY', label: 'Jewelry / Sunar', labelUrdu: 'زیورات', emoji: '💎',
    description: 'Jewelry, sunar, zargar', category: 'Luxury',
    defaultUnit: 'gram',
    highlights: ['Weight × purity pricing', 'Live gold rates', 'Hallmark tracking'],
  },
  {
    value: 'HOTEL', label: 'Hotel / Guest House', labelUrdu: 'ہوٹل', emoji: '🏨',
    description: 'Hotels, guest houses, motels', category: 'Hospitality',
    defaultUnit: 'night',
    highlights: ['Room bookings', 'Housekeeping', 'Folio charges'],
  },
  {
    value: 'GYM', label: 'Gym / Fitness Center', labelUrdu: 'جم', emoji: '💪',
    description: 'Gyms, fitness centers', category: 'Fitness',
    defaultUnit: 'session',
    highlights: ['Memberships', 'Class schedule', 'Body measurements'],
  },
  {
    value: 'CLINIC', label: 'Clinic / Doctor', labelUrdu: 'کلینک', emoji: '⚕️',
    description: 'Clinics, doctors, healthcare', category: 'Healthcare',
    defaultUnit: 'consultation',
    highlights: ['Doctor profiles', 'Patient records', 'Prescriptions', 'Lab tests'],
  },
  {
    value: 'SERVICE', label: 'Service Business', labelUrdu: 'سروس بزنس', emoji: '🔧',
    description: 'Electrician, plumber, AC repair', category: 'Service',
    defaultUnit: 'job',
    highlights: ['Technician dispatch', 'Quotations', 'Warranty', 'AMC contracts'],
  },

  // ═══ 10 NEW INDUSTRIES ═══
  {
    value: 'FURNITURE', label: 'Furniture Store', labelUrdu: 'فرنیچر شاپ', emoji: '🪑',
    description: 'Sofas, beds, tables, custom furniture', category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Custom dimensions', 'Fabric variants', 'Delivery + assembly', 'Workshop orders', 'EMI + layaway'],
  },
  {
    value: 'GAMING', label: 'Gaming Shop / Cyber Cafe', labelUrdu: 'گیمنگ شاپ', emoji: '🎮',
    description: 'Consoles, games, LAN cafe, tournaments', category: 'Entertainment',
    defaultUnit: 'pcs',
    highlights: ['LAN cafe timer', 'Digital top-ups (PSN/UC)', 'Console rentals', 'Tournaments', 'Pre-owned trade-in'],
  },
  {
    value: 'OPTICAL', label: 'Optical / Eyewear', labelUrdu: 'چشمے کی دکان', emoji: '👓',
    description: 'Prescription lenses, frames, eye tests', category: 'Healthcare',
    defaultUnit: 'pcs',
    highlights: ['Eye test bookings', 'Prescription records', 'Lens power tracking', 'Warranty on frames'],
  },
  {
    value: 'PETSHOP', label: 'Pet Shop / Vet Store', labelUrdu: 'پیٹ شاپ', emoji: '🐾',
    description: 'Pet food, accessories, vet supplies', category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Vaccination schedules', 'Pet profiles', 'Bulk pet food', 'Vet appointments', 'Grooming'],
  },
  {
    value: 'SHOE', label: 'Shoe Store / Footwear', labelUrdu: 'جوتوں کی دکان', emoji: '👟',
    description: 'Footwear with sizes, brands', category: 'Fashion',
    defaultUnit: 'pair',
    highlights: ['Size × Color matrix', 'Brand catalog', 'Original boxes', 'Repair services', 'Layaway'],
  },
  {
    value: 'TOYSTORE', label: 'Toy Store', labelUrdu: 'کھلونوں کی دکان', emoji: '🧸',
    description: 'Kids toys, educational, board games', category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Age-appropriate filtering', 'Gift wrapping', 'Combo deals', 'Birthday party orders'],
  },
  {
    value: 'SPORTS', label: 'Sports Shop', labelUrdu: 'اسپورٹس شاپ', emoji: '🏏',
    description: 'Cricket, football, gym equipment', category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Cricket bat customization', 'Team jersey printing', 'Bulk team orders', 'Custom sizing'],
  },
  {
    value: 'FLORIST', label: 'Florist / Flower Shop', labelUrdu: 'پھول والا', emoji: '🌸',
    description: 'Fresh flowers, bouquets, wedding', category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Freshness tracking', 'Custom bouquet orders', 'Event bookings', 'Same-day delivery', 'Wedding packages'],
  },

  {
    value: 'GENERAL', label: 'General Retail', labelUrdu: 'جنرل سٹور', emoji: '🏬',
    description: 'Mixed retail, other', category: 'Other',
    defaultUnit: 'pcs',
    highlights: ['All features available', 'Customize anytime'],
  },
];

interface Props {
  value?: string;
  options: BusinessTypeCard[];
  onSelect?: (type: BusinessTypeCard) => void;
  onChange?: (type: BusinessTypeCard) => void;
  showConfirmButton?: boolean;
}

export function BusinessTypeSelector({ value, options, onChange, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // ═══ FIX: agar API se options empty aayen to fallback use karo ═══
  const effectiveOptions = useMemo<BusinessTypeCard[]>(() => {
    if (Array.isArray(options) && options.length > 0) return options;
    return FALLBACK_BUSINESS_TYPES;
  }, [options]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = effectiveOptions;
    if (q) {
      list = list.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.labelUrdu || '').toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q),
      );
    } else if (!showAll) {
      // Show popular + first few
      const popular = list.filter((o) => o.popular);
      const rest = list.filter((o) => !o.popular).slice(0, 4);
      list = [...popular, ...rest];
    }
    return list;
  }, [effectiveOptions, search, showAll]);

  const selectedCard = effectiveOptions.find((o) => o.value === value);

  const handlePick = (type: BusinessTypeCard) => {
    onChange?.(type);
    onSelect?.(type);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your business type (e.g. bakery, mobile, salon)..."
          className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-10 pr-3 text-sm font-medium focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <div className="font-black text-slate-900">"{search}" ke liye kuch nahi mila</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Alag keyword try karein ya "General Retail" chunein</div>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-3 text-xs font-black text-emerald-600 hover:text-emerald-700 underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePick(opt)}
                className={`group relative rounded-3xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-xl shadow-emerald-500/20 scale-[1.03]'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </div>
                )}
                {opt.popular && !isSelected && (
                  <div className="absolute -top-2 left-3 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow border border-white">
                    ⭐ POPULAR
                  </div>
                )}

                <div className="text-4xl mb-2">{opt.emoji}</div>
                <div className={`font-black text-sm leading-tight ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                  {opt.label}
                </div>
                {opt.labelUrdu && (
                  <div className="text-xs text-slate-500 mt-0.5">{opt.labelUrdu}</div>
                )}
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 font-medium">{opt.description}</div>

                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                    isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {opt.category}
                  </span>
                  {opt.defaultUnit && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      isSelected ? 'bg-teal-200 text-teal-800' : 'bg-teal-50 text-teal-700'
                    }`}>
                      {opt.defaultUnit}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Show all */}
      {!showAll && !search && effectiveOptions.length > filtered.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full text-sm font-black text-slate-600 hover:text-slate-900 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition"
        >
          Show all {effectiveOptions.length} business types →
        </button>
      )}

      {/* Preview */}
      {selectedCard && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-800 text-white p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{selectedCard.emoji}</div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Auto-configured for you
              </div>
              <h3 className="mt-2 text-2xl font-black">{selectedCard.label}</h3>
              <p className="text-sm text-white/85 mt-1 font-medium">{selectedCard.description}</p>
            </div>
          </div>

          {selectedCard.highlights && selectedCard.highlights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-white/60 font-black mb-2">
                Features enabled automatically:
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {selectedCard.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <span className="text-white/90 font-medium">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
