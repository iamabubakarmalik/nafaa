/** Furniture labels, query keys and small helpers (mirror of the web furniture lib/meta.ts). Labels are source keys marked with msg(). */

import { dayKey, daysTo } from '@nafaa/core/industries/furniture';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';

export { dayKey, daysTo };

export const FURNITURE_KEYS = {
  orders: 'furniture-orders', deliveries: 'furniture-deliveries', carpenters: 'furniture-carpenters', profiles: 'furniture-profiles', dashboard: 'furniture-dashboard-overview',
} as const;

/** Queries that hold money; refreshed after any furniture bill or payment. */
const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'expenses', 'inv', 'offline', FURNITURE_KEYS.dashboard];
export function refreshFurniture(keys: string[], money = true) {
  [...keys, FURNITURE_KEYS.dashboard, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface StatusMeta { label: string; tone: StatusTone }

export const ORDER_STATUS: Record<string, StatusMeta & { step: number }> = {
  QUOTATION: { label: msg('Quotation'), tone: 'neutral', step: 0 },
  DEPOSIT_PAID: { label: msg('Advance mila'), tone: 'info', step: 1 },
  IN_PRODUCTION: { label: msg('Ban raha'), tone: 'accent', step: 2 },
  READY_FOR_DELIVERY: { label: msg('Tayyar'), tone: 'success', step: 3 },
  OUT_FOR_DELIVERY: { label: msg('Raste me'), tone: 'warning', step: 4 },
  DELIVERED: { label: msg('De diya'), tone: 'success', step: 5 },
  ASSEMBLED: { label: msg('Fitting ho gayi'), tone: 'success', step: 5 },
  COMPLETED: { label: msg('Mukammal'), tone: 'neutral', step: 6 },
  CANCELLED: { label: msg('Cancel'), tone: 'danger', step: -1 },
  REFUNDED: { label: msg('Wapas'), tone: 'danger', step: -1 },
};
export const orderStatus = (s?: string | null): StatusMeta & { step: number } => ORDER_STATUS[s ?? ''] ?? { label: String(s ?? '—'), tone: 'neutral', step: 0 };
export const OPEN_ORDER = ['QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'];
export const BILLED_ORDER = ['DELIVERED', 'ASSEMBLED', 'COMPLETED'];

export const DELIVERY_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: msg('Date nahi'), tone: 'neutral' }, SCHEDULED: { label: msg('Tay hai'), tone: 'info' }, DISPATCHED: { label: msg('Nikal gayi'), tone: 'warning' },
  IN_TRANSIT: { label: msg('Raste me'), tone: 'warning' }, ARRIVED: { label: msg('Pohanch gayi'), tone: 'accent' }, DELIVERED: { label: msg('De di'), tone: 'success' },
  ASSEMBLED: { label: msg('Fitting ho gayi'), tone: 'success' }, RESCHEDULED: { label: msg('Date badli'), tone: 'warning' }, FAILED: { label: msg('Cancel'), tone: 'danger' },
  RETURNED: { label: msg('Wapas aayi'), tone: 'danger' },
};
export const deliveryStatus = (s?: string | null): StatusMeta => DELIVERY_STATUS[s ?? ''] ?? { label: String(s ?? '—'), tone: 'neutral' };
export const OPEN_DELIVERY = ['PENDING', 'SCHEDULED', 'RESCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED'];

export const CATEGORY_GROUPS: Array<{ id: string; label: string; items: Array<[string, string]> }> = [
  { id: 'sofa', label: msg('Sofa'), items: [['SOFA_SET', msg('Sofa set')], ['SOFA_L_SHAPE', msg('L-shape sofa')], ['SOFA_RECLINER', msg('Recliner')], ['SOFA_BED', msg('Sofa cum bed')], ['BEAN_BAG', msg('Bean bag')], ['OTTOMAN', msg('Pouf / ottoman')]] },
  { id: 'bed', label: msg('Bed room'), items: [['BED_SINGLE', msg('Single bed')], ['BED_DOUBLE', msg('Double bed')], ['BED_KING', msg('King bed')], ['BED_QUEEN', msg('Queen bed')], ['BED_BUNK', msg('Bunk bed')], ['MATTRESS', msg('Mattress')], ['WARDROBE', msg('Almari')], ['DRESSING_TABLE', msg('Dressing table')], ['BABY_COT', msg('Baby cot')]] },
  { id: 'dining', label: msg('Dining'), items: [['DINING_SET', msg('Dining set')], ['DINING_TABLE', msg('Dining table')], ['DINING_CHAIR', msg('Dining chair')]] },
  { id: 'living', label: msg('Living'), items: [['CENTER_TABLE', msg('Center table')], ['SIDE_TABLE', msg('Side table')], ['TV_CONSOLE', msg('TV console')], ['ENTERTAINMENT_UNIT', msg('Showcase')], ['SHOE_RACK', msg('Shoe rack')], ['CABINET', msg('Cabinet')], ['CUPBOARD', msg('Cupboard')], ['BOOKSHELF', msg('Bookshelf')]] },
  { id: 'office', label: msg('Office'), items: [['OFFICE_DESK', msg('Office table')], ['OFFICE_CHAIR', msg('Office chair')], ['STUDY_TABLE', msg('Study table')], ['KIDS_FURNITURE', msg('Bachon ka')]] },
  { id: 'other', label: msg('Aur'), items: [['OUTDOOR_FURNITURE', msg('Bahar ka')], ['GARDEN_SET', msg('Garden set')], ['CURTAINS', msg('Parde')], ['RUG', msg('Qaleen')], ['DECOR', msg('Decor')], ['LIGHTING', msg('Lights')], ['MIRROR', msg('Sheesha')], ['CUSTOM_FURNITURE', msg('Custom')], ['OTHER', msg('Aur')]] },
];
const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? (CATEGORY_INDEX.get(v) ? t(CATEGORY_INDEX.get(v)!.label) : v) : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.group ?? null : null);

export const MATERIALS: Record<string, string> = {
  SOLID_WOOD_SHEESHAM: msg('Sheesham'), SOLID_WOOD_TEAK: msg('Sagwan (teak)'), SOLID_WOOD_ROSEWOOD: msg('Rosewood'), SOLID_WOOD_MANGO: msg('Aam ki lakri'),
  ENGINEERED_WOOD: msg('Engineered wood'), MDF: 'MDF', PARTICLE_BOARD: msg('Chip board'), PLYWOOD: msg('Ply'),
  METAL_IRON: msg('Lohaa'), METAL_STEEL: msg('Steel'), METAL_ALUMINIUM: msg('Aluminium'), GLASS: msg('Sheesha'), MARBLE: msg('Marble'), GRANITE: msg('Granite'),
  RATTAN: msg('Cane (rattan)'), BAMBOO: msg('Bans'), FABRIC_COTTON: msg('Cotton kapra'), FABRIC_LINEN: msg('Linen'), FABRIC_VELVET: msg('Velvet (makhmal)'),
  LEATHER_GENUINE: msg('Asli leather'), LEATHER_FAUX: msg('Rexine'), PLASTIC: msg('Plastic'), ACRYLIC: msg('Acrylic'), MIXED: msg('Mix'), OTHER: msg('Aur'),
};
export const materialOf = (v?: string | null) => (v ? (MATERIALS[v] ? t(MATERIALS[v]) : v) : '—');

export const CONDITIONS: Record<string, StatusMeta> = {
  BRAND_NEW: { label: msg('Naya'), tone: 'success' }, DISPLAY_MODEL: { label: msg('Display piece'), tone: 'info' }, FLOOR_MODEL: { label: msg('Showroom piece'), tone: 'info' },
  REFURBISHED: { label: msg('Theek karwaya'), tone: 'accent' }, PRE_OWNED: { label: msg('Used'), tone: 'warning' }, CUSTOM_ORDER: { label: msg('Order par'), tone: 'neutral' },
};

export const WOODS = ['Sheesham', 'Diyar', 'Kikar', 'Sagwan', 'Partal', 'Ply + veneer', 'MDF'];
export const POLISHES = ['Natural', 'Walnut', 'Dark brown', 'Mahogany', 'White lacquer', 'Black matte', 'Duco paint'];
export const FABRICS = ['Velvet', 'Jute', 'Linen', 'Rexine', 'Leather', 'Cotton'];
export const SKILLS = ['Bed', 'Sofa', 'Almari', 'Dining', 'Kitchen', 'Polish', 'Gaddi / poshish', 'Carving', 'Fitting'];
export const SLOTS = ['Subah 9-12', 'Dopahar 12-3', 'Sham 3-6', 'Raat 6-9'];
export const VEHICLES = ['Shehzore', 'Mazda', 'Suzuki pickup', 'Loader rickshaw', 'Truck'];
export const ITEMS = ['Double bed', 'Sofa set 7 seater', 'Almari 3 door', 'Dining table 6 kursi', 'Dressing table', 'Center table', 'TV console', 'Kitchen cabinet'];

export const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export const sizeText = (o: { lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null; customDimensions?: string | null }) => {
  const dims = [o.lengthCm, o.widthCm, o.heightCm].filter((n): n is number => !!n);
  return dims.length ? t('{{value}} cm', { value: dims.join(' × ') }) : o.customDimensions || '';
};

/** What the customer pays for an order in all: agreed price plus fitting, when asked for. */
export const orderTotal = (o: { finalPrice?: number | null; quotedPrice: number; requiresInstallation: boolean; installationCharge?: number | null }) =>
  (o.finalPrice ?? o.quotedPrice) + (o.requiresInstallation ? o.installationCharge ?? 0 : 0);

/** All delivery charges of one delivery. */
export const charges = (d: { deliveryCharge: number; loadingCharge: number; unloadingCharge: number; floorCharge: number; assemblyCharge: number }) =>
  d.deliveryCharge + d.loadingCharge + d.unloadingCharge + d.floorCharge + d.assemblyCharge;
