/** Furniture labels, query keys and small helpers shared by the furniture pages. */

import { t as tr } from '@core/i18n';
export const FURNITURE_KEYS = {
  orders: 'furniture-orders',
  deliveries: 'furniture-deliveries',
  carpenters: 'furniture-carpenters',
  profiles: 'furniture-profiles',
  dashboard: 'furniture-dashboard-overview',
} as const;

/** Queries that hold money; refreshed after any furniture bill or payment. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata', 'customers', 'cash-register', 'expenses', FURNITURE_KEYS.dashboard];

/** Sale number starts of furniture bills made outside the counter. */
export const BILL_PREFIX = { order: 'FUR-', delivery: 'FDV-' } as const;

export const ORDER_STATUS: Record<string, { label: string; tone: string; step: number }> = {
  QUOTATION: { label: tr('Quotation'), tone: 'bg-slate-100 text-slate-700 ring-slate-200', step: 0 },
  DEPOSIT_PAID: { label: tr('Advance mila'), tone: 'bg-sky-50 text-sky-700 ring-sky-200', step: 1 },
  IN_PRODUCTION: { label: tr('Ban raha'), tone: 'bg-violet-50 text-violet-700 ring-violet-200', step: 2 },
  READY_FOR_DELIVERY: { label: tr('Tayyar'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', step: 3 },
  OUT_FOR_DELIVERY: { label: tr('Raste me'), tone: 'bg-amber-50 text-amber-800 ring-amber-200', step: 4 },
  DELIVERED: { label: tr('De diya'), tone: 'bg-emerald-600 text-white ring-emerald-600', step: 5 },
  ASSEMBLED: { label: tr('Fitting ho gayi'), tone: 'bg-emerald-600 text-white ring-emerald-600', step: 5 },
  COMPLETED: { label: tr('Mukammal'), tone: 'bg-slate-700 text-white ring-slate-700', step: 6 },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200', step: -1 },
  REFUNDED: { label: tr('Wapas'), tone: 'bg-rose-50 text-rose-700 ring-rose-200', step: -1 },
};
export const OPEN_ORDER = ['QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'];
export const BILLED_ORDER = ['DELIVERED', 'ASSEMBLED', 'COMPLETED'];

export const DELIVERY_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: tr('Date nahi'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  SCHEDULED: { label: tr('Tay hai'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  DISPATCHED: { label: tr('Nikal gayi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  IN_TRANSIT: { label: tr('Raste me'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ARRIVED: { label: tr('Pohanch gayi'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  DELIVERED: { label: tr('De di'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ASSEMBLED: { label: tr('Fitting ho gayi'), tone: 'bg-emerald-600 text-white ring-emerald-600' },
  RESCHEDULED: { label: tr('Date badli'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  FAILED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  RETURNED: { label: tr('Wapas aayi'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};
export const OPEN_DELIVERY = ['PENDING', 'SCHEDULED', 'RESCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED'];

export const CATEGORY_GROUPS: Array<{ id: string; label: string; items: Array<[string, string]> }> = [
  { id: 'sofa', label: tr('Sofa'), items: [['SOFA_SET', tr('Sofa set')], ['SOFA_L_SHAPE', tr('L-shape sofa')], ['SOFA_RECLINER', tr('Recliner')], ['SOFA_BED', tr('Sofa cum bed')], ['BEAN_BAG', tr('Bean bag')], ['OTTOMAN', tr('Pouf / ottoman')]] },
  { id: 'bed', label: tr('Bed room'), items: [['BED_SINGLE', tr('Single bed')], ['BED_DOUBLE', tr('Double bed')], ['BED_KING', tr('King bed')], ['BED_QUEEN', tr('Queen bed')], ['BED_BUNK', tr('Bunk bed')], ['MATTRESS', tr('Mattress')], ['WARDROBE', tr('Almari')], ['DRESSING_TABLE', tr('Dressing table')], ['BABY_COT', tr('Baby cot')]] },
  { id: 'dining', label: tr('Dining'), items: [['DINING_SET', tr('Dining set')], ['DINING_TABLE', tr('Dining table')], ['DINING_CHAIR', tr('Dining chair')]] },
  { id: 'living', label: tr('Living'), items: [['CENTER_TABLE', tr('Center table')], ['SIDE_TABLE', tr('Side table')], ['TV_CONSOLE', tr('TV console')], ['ENTERTAINMENT_UNIT', tr('Showcase')], ['SHOE_RACK', tr('Shoe rack')], ['CABINET', tr('Cabinet')], ['CUPBOARD', tr('Cupboard')], ['BOOKSHELF', tr('Bookshelf')]] },
  { id: 'office', label: tr('Office'), items: [['OFFICE_DESK', tr('Office table')], ['OFFICE_CHAIR', tr('Office chair')], ['STUDY_TABLE', tr('Study table')], ['KIDS_FURNITURE', tr('Bachon ka')]] },
  { id: 'other', label: tr('Aur'), items: [['OUTDOOR_FURNITURE', tr('Bahar ka')], ['GARDEN_SET', tr('Garden set')], ['CURTAINS', tr('Parde')], ['RUG', tr('Qaleen')], ['DECOR', tr('Decor')], ['LIGHTING', tr('Lights')], ['MIRROR', tr('Sheesha')], ['CUSTOM_FURNITURE', tr('Custom')], ['OTHER', 'Aur']] },
];
const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.group ?? null : null);

export const MATERIALS: Record<string, string> = {
  SOLID_WOOD_SHEESHAM: tr('Sheesham'), SOLID_WOOD_TEAK: tr('Sagwan (teak)'), SOLID_WOOD_ROSEWOOD: tr('Rosewood'), SOLID_WOOD_MANGO: tr('Aam ki lakri'),
  ENGINEERED_WOOD: tr('Engineered wood'), MDF: 'MDF', PARTICLE_BOARD: tr('Chip board'), PLYWOOD: tr('Ply'),
  METAL_IRON: tr('Lohaa'), METAL_STEEL: tr('Steel'), METAL_ALUMINIUM: tr('Aluminium'), GLASS: tr('Sheesha'), MARBLE: tr('Marble'), GRANITE: tr('Granite'),
  RATTAN: tr('Cane (rattan)'), BAMBOO: tr('Bans'), FABRIC_COTTON: tr('Cotton kapra'), FABRIC_LINEN: tr('Linen'), FABRIC_VELVET: tr('Velvet (makhmal)'),
  LEATHER_GENUINE: tr('Asli leather'), LEATHER_FAUX: tr('Rexine'), PLASTIC: tr('Plastic'), ACRYLIC: tr('Acrylic'), MIXED: tr('Mix'), OTHER: tr('Aur'),
};
export const materialOf = (v?: string | null) => (v ? MATERIALS[v] ?? v : '—');

export const CONDITIONS: Record<string, { label: string; tone: string }> = {
  BRAND_NEW: { label: tr('Naya'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  DISPLAY_MODEL: { label: tr('Display piece'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  FLOOR_MODEL: { label: tr('Showroom piece'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  REFURBISHED: { label: tr('Theek karwaya'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  PRE_OWNED: { label: tr('Used'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CUSTOM_ORDER: { label: tr('Order par'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

export const WOODS = ['Sheesham', 'Diyar', 'Kikar', 'Sagwan', 'Partal', 'Ply + veneer', 'MDF'];
export const POLISHES = ['Natural', 'Walnut', 'Dark brown', 'Mahogany', 'White lacquer', 'Black matte', 'Duco paint'];
export const FABRICS = ['Velvet', 'Jute', 'Linen', 'Rexine', 'Leather', 'Cotton'];

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') },
  { value: 'JAZZCASH', label: tr('JazzCash') },
  { value: 'EASYPAISA', label: tr('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: tr('Bank') },
  { value: 'CARD', label: tr('Card') },
];

export const errorText = (e: unknown, fallback: string) => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
};

/** Number typed in a text box ("1,200" → 1200); empty → null. */
export const numIn = (v: string): number | null => {
  const t = v.replace(/[^\d.]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
export const moneyText = (v: string) => v.replace(/[^\d.]/g, '');
export const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());

/** `yyyy-mm-dd` of a local date. */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};
export const shortDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(v)) : '—';
export const longDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—';

/** Whole days from today to a date (negative = late). */
export const daysTo = (v?: string | null) => {
  if (!v) return null;
  const a = new Date(dayKey());
  const b = new Date(dayKey(new Date(v)));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
};

export const sizeText = (o: { lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null; customDimensions?: string | null }) => {
  const dims = [o.lengthCm, o.widthCm, o.heightCm].filter((n): n is number => !!n);
  return dims.length ? tr('{{value}} cm', { value: dims.join(' × ') }) : o.customDimensions || '';
};

/** What the customer pays for an order in all: agreed price plus fitting, when asked for. */
export const orderTotal = (o: { finalPrice?: number | null; quotedPrice: number; requiresInstallation: boolean; installationCharge?: number | null }) =>
  (o.finalPrice ?? o.quotedPrice) + (o.requiresInstallation ? o.installationCharge ?? 0 : 0);
