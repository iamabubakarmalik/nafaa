/**
 * Business type picker used by Settings → Business config: search, a grid of
 * industry cards and a summary of what the chosen type turns on.
 */

import { useState, useMemo } from 'react';
import { Check, ChevronDown, Sparkles, Search } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Badge, Button, EmptyState, Input } from '@/design-system/components';
import { t } from '@core/i18n';

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

// Fallback list, used when the API returns no business types.
const FALLBACK_BUSINESS_TYPES: BusinessTypeCard[] = [
  // Popular types (shown first)
  {
    value: 'GROCERY', label: t('Grocery / Kiryana'), labelUrdu: 'کریانہ سٹور', emoji: '🛒',
    description: t('General stores, supermarkets'), category: 'Retail', popular: true,
    defaultUnit: 'kg',
    highlights: ['Weight-based pricing', 'Expiry tracking', 'Batches', 'Multi-unit'],
  },
  {
    value: 'MOBILE', label: t('Mobile / Electronics'), labelUrdu: 'موبائل شاپ', emoji: '📱',
    description: t('Mobile shops, accessories, repairs'), category: 'Electronics', popular: true,
    defaultUnit: 'pcs',
    highlights: ['IMEI tracking', 'EMI plans', 'Warranty', 'Used phone trade-in'],
  },
  {
    value: 'PHARMACY', label: t('Pharmacy / Medical Store'), labelUrdu: 'میڈیکل سٹور', emoji: '💊',
    description: t('Medical stores, pharmacies'), category: 'Healthcare', popular: true,
    defaultUnit: 'strip',
    highlights: ['Expiry tracking', 'Batch numbers', 'Prescriptions', 'Drug interactions'],
  },
  {
    value: 'RESTAURANT', label: t('Restaurant / Cafe'), labelUrdu: 'ریسٹورنٹ', emoji: '🍽️',
    description: t('Restaurants, cafes, dhabas'), category: 'Food', popular: true,
    defaultUnit: 'plate',
    highlights: ['Table management', 'Kitchen tickets (KOT)', 'Delivery', 'Recipes'],
  },
  {
    value: 'SALON', label: t('Salon / Beauty / Spa'), labelUrdu: 'بیوٹی پارلر', emoji: '💇',
    description: t('Salons, parlours, spas'), category: 'Service', popular: true,
    defaultUnit: 'service',
    highlights: ['Appointments', 'Staff commissions', 'Memberships', 'Packages'],
  },
  {
    value: 'CLOTHING', label: t('Clothing / Garments'), labelUrdu: 'کپڑے کی دکان', emoji: '👕',
    description: t('Clothing stores, tailoring'), category: 'Fashion', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Size × Color matrix', 'Fabric meter/gaj', 'Tailoring', 'Alterations'],
  },
  {
    value: 'HARDWARE', label: t('Hardware / Construction'), labelUrdu: 'ہارڈویئر', emoji: '🔧',
    description: t('Tools, building materials'), category: 'Industrial', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Bulk pricing', 'Quotations', 'Delivery tracking', 'Projects'],
  },
  {
    value: 'APPLIANCES', label: t('Home Appliances'), labelUrdu: 'گھریلو آلات', emoji: '🏠',
    description: t('Fridge, AC, washing machine, LED TV'), category: 'Retail', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Serial number tracking', 'Warranty', 'EMI plans', 'AMC contracts', 'Delivery + install'],
  },
  {
    value: 'ELECTRONICS', label: t('Electronics & Gadgets'), labelUrdu: 'الیکٹرانکس', emoji: '🔌',
    description: t('Tech accessories, smartwatches, drones'), category: 'Electronics', popular: true,
    defaultUnit: 'pcs',
    highlights: ['Serial + IMEI', 'Warranty', 'Bundle deals', 'Repair services', 'Trade-in'],
  },

  // Other types
  {
    value: 'BAKERY', label: t('Bakery / Cake Shop'), labelUrdu: 'بیکری', emoji: '🍰',
    description: t('Bakeries, sweet shops'), category: 'Food',
    defaultUnit: 'pcs',
    highlights: ['Custom cakes', 'Production planning', 'Freshness tracking'],
  },
  {
    value: 'COSMETICS', label: t('Cosmetics / Beauty'), labelUrdu: 'کاسمیٹکس', emoji: '💄',
    description: t('Cosmetics, beauty products'), category: 'Lifestyle',
    defaultUnit: 'pcs',
    highlights: ['Shade variants', 'Expiry tracking', 'Brand catalog', 'Gift bundles'],
  },
  {
    value: 'STATIONERY', label: t('Stationery / Books'), labelUrdu: 'اسٹیشنری', emoji: '📚',
    description: t('Stationery, bookstores'), category: 'Education',
    defaultUnit: 'pcs',
    highlights: ['School book lists', 'Book rentals', 'Bulk packs'],
  },
  {
    value: 'CARPET', label: t('Carpets / Flooring'), labelUrdu: 'قالین شاپ', emoji: '🏪',
    description: t('Carpets, tiles, rugs'), category: 'Retail',
    defaultUnit: 'sqft',
    highlights: ['Length × Width calc', 'Color variants', 'Roll & cut-piece tracking'],
  },
  {
    value: 'AUTO_PARTS', label: t('Auto Parts / Workshop'), labelUrdu: 'ورکشاپ', emoji: '🔩',
    description: t('Auto parts, mechanics'), category: 'Automotive',
    defaultUnit: 'pcs',
    highlights: ['Vehicle registration', 'Service jobs', 'Warranty', 'Parts compatibility'],
  },
  {
    value: 'MEAT', label: t('Meat / Butchery'), labelUrdu: 'قصائی', emoji: '🥩',
    description: t('Meat shops, halal butchery'), category: 'Food',
    defaultUnit: 'kg',
    highlights: ['Weight orders', 'Halal slaughter log', 'Qurbani bookings'],
  },
  {
    value: 'DAIRY', label: t('Dairy / Milk Shop'), labelUrdu: 'ڈیری', emoji: '🥛',
    description: t('Milk shops, dairy products'), category: 'Food',
    defaultUnit: 'liter',
    highlights: ['Delivery routes', 'Daily subscriptions', 'Monthly khata'],
  },
  {
    value: 'AGRI', label: t('Agri / Seeds / Fertilizer'), labelUrdu: 'زرعی سٹور', emoji: '🌾',
    description: t('Seeds, fertilizers, feed'), category: 'Agriculture',
    defaultUnit: 'kg',
    highlights: ['Farmer khata', 'Seasonal calendar', 'Govt subsidies'],
  },
  {
    value: 'JEWELRY', label: t('Jewelry / Sunar'), labelUrdu: 'زیورات', emoji: '💎',
    description: t('Jewelry, sunar, zargar'), category: 'Luxury',
    defaultUnit: 'gram',
    highlights: ['Weight × purity pricing', 'Live gold rates', 'Hallmark tracking'],
  },
  {
    value: 'HOTEL', label: t('Hotel / Guest House'), labelUrdu: 'ہوٹل', emoji: '🏨',
    description: t('Hotels, guest houses, motels'), category: 'Hospitality',
    defaultUnit: 'night',
    highlights: ['Room bookings', 'Housekeeping', 'Folio charges'],
  },
  {
    value: 'GYM', label: t('Gym / Fitness Center'), labelUrdu: 'جم', emoji: '💪',
    description: t('Gyms, fitness centers'), category: 'Fitness',
    defaultUnit: 'session',
    highlights: ['Memberships', 'Class schedule', 'Body measurements'],
  },
  {
    value: 'CLINIC', label: t('Clinic / Doctor'), labelUrdu: 'کلینک', emoji: '⚕️',
    description: t('Clinics, doctors, healthcare'), category: 'Healthcare',
    defaultUnit: 'consultation',
    highlights: ['Doctor profiles', 'Patient records', 'Prescriptions', 'Lab tests'],
  },
  {
    value: 'SERVICE', label: t('Service Business'), labelUrdu: 'سروس بزنس', emoji: '🔧',
    description: t('Electrician, plumber, AC repair'), category: 'Service',
    defaultUnit: 'job',
    highlights: ['Technician dispatch', 'Quotations', 'Warranty', 'AMC contracts'],
  },

  // Industries added later
  {
    value: 'FURNITURE', label: t('Furniture Store'), labelUrdu: 'فرنیچر شاپ', emoji: '🪑',
    description: t('Sofas, beds, tables, custom furniture'), category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Custom dimensions', 'Fabric variants', 'Delivery + assembly', 'Workshop orders', 'EMI + layaway'],
  },
  {
    value: 'GAMING', label: t('Gaming Shop / Cyber Cafe'), labelUrdu: 'گیمنگ شاپ', emoji: '🎮',
    description: t('Consoles, games, LAN cafe, tournaments'), category: 'Entertainment',
    defaultUnit: 'pcs',
    highlights: ['LAN cafe timer', 'Digital top-ups (PSN/UC)', 'Console rentals', 'Tournaments', 'Pre-owned trade-in'],
  },
  {
    value: 'OPTICAL', label: t('Optical / Eyewear'), labelUrdu: 'چشمے کی دکان', emoji: '👓',
    description: t('Prescription lenses, frames, eye tests'), category: 'Healthcare',
    defaultUnit: 'pcs',
    highlights: ['Eye test bookings', 'Prescription records', 'Lens power tracking', 'Warranty on frames'],
  },
  {
    value: 'PETSHOP', label: t('Pet Shop / Vet Store'), labelUrdu: 'پیٹ شاپ', emoji: '🐾',
    description: t('Pet food, accessories, vet supplies'), category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Vaccination schedules', 'Pet profiles', 'Bulk pet food', 'Vet appointments', 'Grooming'],
  },
  {
    value: 'SHOE', label: t('Shoe Store / Footwear'), labelUrdu: 'جوتوں کی دکان', emoji: '👟',
    description: t('Footwear with sizes, brands'), category: 'Fashion',
    defaultUnit: 'pair',
    highlights: ['Size × Color matrix', 'Brand catalog', 'Original boxes', 'Repair services', 'Layaway'],
  },
  {
    value: 'TOYSTORE', label: t('Toy Store'), labelUrdu: 'کھلونوں کی دکان', emoji: '🧸',
    description: t('Kids toys, educational, board games'), category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Age-appropriate filtering', 'Gift wrapping', 'Combo deals', 'Birthday party orders'],
  },
  {
    value: 'SPORTS', label: t('Sports Shop'), labelUrdu: 'اسپورٹس شاپ', emoji: '🏏',
    description: t('Cricket, football, gym equipment'), category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Cricket bat customization', 'Team jersey printing', 'Bulk team orders', 'Custom sizing'],
  },
  {
    value: 'FLORIST', label: t('Florist / Flower Shop'), labelUrdu: 'پھول والا', emoji: '🌸',
    description: t('Fresh flowers, bouquets, wedding'), category: 'Retail',
    defaultUnit: 'pcs',
    highlights: ['Freshness tracking', 'Custom bouquet orders', 'Event bookings', 'Same-day delivery', 'Wedding packages'],
  },

  {
    value: 'GENERAL', label: t('General Retail'), labelUrdu: 'جنرل سٹور', emoji: '🏬',
    description: t('Mixed retail, other'), category: 'Other',
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

  // Fall back to the built-in list when the API returns none.
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
      // Popular types first, then a few others.
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
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('Apna kaam search karein (bakery, mobile, salon…)')}
        aria-label={t('Business type search')}
        leftIcon={<Search className="h-4 w-4" aria-hidden />}
      />

      {filtered.length === 0 && (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title={t('"{{search}}" ke liye kuch nahi mila', { search })}
          description={t('Alag lafz try karein ya "General Retail" chunein.')}
          action={<Button variant="secondary" size="sm" onClick={() => setSearch('')}>{t('Search saaf karein')}</Button>}
        />
      )}

      {filtered.length > 0 && (
        <div role="radiogroup" aria-label={t('Business type')} className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handlePick(opt)}
                className={cn(
                  'relative flex flex-col rounded-xl border bg-white p-3.5 text-start transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                  isSelected ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {isSelected && (
                  <span className="absolute end-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-brand-fg">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                )}
                <span className="mb-2 text-3xl leading-none" aria-hidden>{opt.emoji}</span>
                <span className={cn('pe-6 text-sm font-semibold leading-tight', isSelected ? 'text-brand-800' : 'text-slate-900')}>{opt.label}</span>
                {opt.labelUrdu && <span className="mt-0.5 font-urdu text-xs text-slate-500">{opt.labelUrdu}</span>}
                <span className="mt-1 line-clamp-2 text-xs text-slate-500">{opt.description}</span>
                <span className="mt-2 flex flex-wrap items-center gap-1">
                  {opt.popular && <Badge size="xs" variant="warning">{t('Popular')}</Badge>}
                  <Badge size="xs" variant={isSelected ? 'brand' : 'default'}>{opt.category}</Badge>
                  {opt.defaultUnit && <Badge size="xs" variant="outline">{opt.defaultUnit}</Badge>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!showAll && !search && effectiveOptions.length > filtered.length && (
        <Button variant="secondary" fullWidth onClick={() => setShowAll(true)} rightIcon={<ChevronDown className="h-4 w-4" />}>
          {t('Sab {{count}} business types dekhein', { count: effectiveOptions.length })}
        </Button>
      )}

      {selectedCard && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none" aria-hidden>{selectedCard.emoji}</span>
            <div className="min-w-0 flex-1">
              <Badge size="xs" variant="brand"><Sparkles className="h-3 w-3" aria-hidden /> {' '}{t('Aap ke liye set ho jayega')}</Badge>
              <h3 className="mt-1.5 text-lg font-bold text-slate-900">{selectedCard.label}</h3>
              <p className="mt-0.5 text-sm text-slate-600">{selectedCard.description}</p>
            </div>
          </div>

          {selectedCard.highlights && selectedCard.highlights.length > 0 && (
            <div className="mt-4 border-t border-brand-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Ye features khud on ho jayenge')}</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {selectedCard.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
