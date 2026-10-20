/** Furniture labels, query keys and small helpers shared by the furniture pages. */

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
  QUOTATION: { label: 'Quotation', tone: 'bg-slate-100 text-slate-700 ring-slate-200', step: 0 },
  DEPOSIT_PAID: { label: 'Advance mila', tone: 'bg-sky-50 text-sky-700 ring-sky-200', step: 1 },
  IN_PRODUCTION: { label: 'Ban raha', tone: 'bg-violet-50 text-violet-700 ring-violet-200', step: 2 },
  READY_FOR_DELIVERY: { label: 'Tayyar', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', step: 3 },
  OUT_FOR_DELIVERY: { label: 'Raste me', tone: 'bg-amber-50 text-amber-800 ring-amber-200', step: 4 },
  DELIVERED: { label: 'De diya', tone: 'bg-emerald-600 text-white ring-emerald-600', step: 5 },
  ASSEMBLED: { label: 'Fitting ho gayi', tone: 'bg-emerald-600 text-white ring-emerald-600', step: 5 },
  COMPLETED: { label: 'Mukammal', tone: 'bg-slate-700 text-white ring-slate-700', step: 6 },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700 ring-rose-200', step: -1 },
  REFUNDED: { label: 'Wapas', tone: 'bg-rose-50 text-rose-700 ring-rose-200', step: -1 },
};
export const OPEN_ORDER = ['QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'];
export const BILLED_ORDER = ['DELIVERED', 'ASSEMBLED', 'COMPLETED'];

export const DELIVERY_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'Date nahi', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  SCHEDULED: { label: 'Tay hai', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  DISPATCHED: { label: 'Nikal gayi', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  IN_TRANSIT: { label: 'Raste me', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ARRIVED: { label: 'Pohanch gayi', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  DELIVERED: { label: 'De di', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ASSEMBLED: { label: 'Fitting ho gayi', tone: 'bg-emerald-600 text-white ring-emerald-600' },
  RESCHEDULED: { label: 'Date badli', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  FAILED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  RETURNED: { label: 'Wapas aayi', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};
export const OPEN_DELIVERY = ['PENDING', 'SCHEDULED', 'RESCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED'];

export const CATEGORY_GROUPS: Array<{ id: string; label: string; items: Array<[string, string]> }> = [
  { id: 'sofa', label: 'Sofa', items: [['SOFA_SET', 'Sofa set'], ['SOFA_L_SHAPE', 'L-shape sofa'], ['SOFA_RECLINER', 'Recliner'], ['SOFA_BED', 'Sofa cum bed'], ['BEAN_BAG', 'Bean bag'], ['OTTOMAN', 'Pouf / ottoman']] },
  { id: 'bed', label: 'Bed room', items: [['BED_SINGLE', 'Single bed'], ['BED_DOUBLE', 'Double bed'], ['BED_KING', 'King bed'], ['BED_QUEEN', 'Queen bed'], ['BED_BUNK', 'Bunk bed'], ['MATTRESS', 'Mattress'], ['WARDROBE', 'Almari'], ['DRESSING_TABLE', 'Dressing table'], ['BABY_COT', 'Baby cot']] },
  { id: 'dining', label: 'Dining', items: [['DINING_SET', 'Dining set'], ['DINING_TABLE', 'Dining table'], ['DINING_CHAIR', 'Dining chair']] },
  { id: 'living', label: 'Living', items: [['CENTER_TABLE', 'Center table'], ['SIDE_TABLE', 'Side table'], ['TV_CONSOLE', 'TV console'], ['ENTERTAINMENT_UNIT', 'Showcase'], ['SHOE_RACK', 'Shoe rack'], ['CABINET', 'Cabinet'], ['CUPBOARD', 'Cupboard'], ['BOOKSHELF', 'Bookshelf']] },
  { id: 'office', label: 'Office', items: [['OFFICE_DESK', 'Office table'], ['OFFICE_CHAIR', 'Office chair'], ['STUDY_TABLE', 'Study table'], ['KIDS_FURNITURE', 'Bachon ka']] },
  { id: 'other', label: 'Aur', items: [['OUTDOOR_FURNITURE', 'Bahar ka'], ['GARDEN_SET', 'Garden set'], ['CURTAINS', 'Parde'], ['RUG', 'Qaleen'], ['DECOR', 'Decor'], ['LIGHTING', 'Lights'], ['MIRROR', 'Sheesha'], ['CUSTOM_FURNITURE', 'Custom'], ['OTHER', 'Aur']] },
];
const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.group ?? null : null);

export const MATERIALS: Record<string, string> = {
  SOLID_WOOD_SHEESHAM: 'Sheesham', SOLID_WOOD_TEAK: 'Sagwan (teak)', SOLID_WOOD_ROSEWOOD: 'Rosewood', SOLID_WOOD_MANGO: 'Aam ki lakri',
  ENGINEERED_WOOD: 'Engineered wood', MDF: 'MDF', PARTICLE_BOARD: 'Chip board', PLYWOOD: 'Ply',
  METAL_IRON: 'Lohaa', METAL_STEEL: 'Steel', METAL_ALUMINIUM: 'Aluminium', GLASS: 'Sheesha', MARBLE: 'Marble', GRANITE: 'Granite',
  RATTAN: 'Cane (rattan)', BAMBOO: 'Bans', FABRIC_COTTON: 'Cotton kapra', FABRIC_LINEN: 'Linen', FABRIC_VELVET: 'Velvet (makhmal)',
  LEATHER_GENUINE: 'Asli leather', LEATHER_FAUX: 'Rexine', PLASTIC: 'Plastic', ACRYLIC: 'Acrylic', MIXED: 'Mix', OTHER: 'Aur',
};
export const materialOf = (v?: string | null) => (v ? MATERIALS[v] ?? v : '—');

export const CONDITIONS: Record<string, { label: string; tone: string }> = {
  BRAND_NEW: { label: 'Naya', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  DISPLAY_MODEL: { label: 'Display piece', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  FLOOR_MODEL: { label: 'Showroom piece', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  REFURBISHED: { label: 'Theek karwaya', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  PRE_OWNED: { label: 'Used', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CUSTOM_ORDER: { label: 'Order par', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

export const WOODS = ['Sheesham', 'Diyar', 'Kikar', 'Sagwan', 'Partal', 'Ply + veneer', 'MDF'];
export const POLISHES = ['Natural', 'Walnut', 'Dark brown', 'Mahogany', 'White lacquer', 'Black matte', 'Duco paint'];
export const FABRICS = ['Velvet', 'Jute', 'Linen', 'Rexine', 'Leather', 'Cotton'];

export const PAY_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'CARD', label: 'Card' },
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
  return dims.length ? `${dims.join(' × ')} cm` : o.customDimensions || '';
};

/** What the customer pays for an order in all: agreed price plus fitting, when asked for. */
export const orderTotal = (o: { finalPrice?: number | null; quotedPrice: number; requiresInstallation: boolean; installationCharge?: number | null }) =>
  (o.finalPrice ?? o.quotedPrice) + (o.requiresInstallation ? o.installationCharge ?? 0 : 0);
