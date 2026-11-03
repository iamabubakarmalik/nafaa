/**
 * Restaurant: dish options (sizes and add-on groups) and their price, the
 * order bill (service charge, tax, delivery, packing, tip, discount), split
 * bills (equal shares and dishes moved to a separate bill) and the kitchen
 * display lanes. Same rules as apps/web/src/industries/restaurant; the
 * server repeats every check.
 */

export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DRIVE_THRU' | 'ROOM_SERVICE' | 'PICKUP';
export type OrderStatus =
  | 'DRAFT' | 'PLACED' | 'CONFIRMED' | 'COOKING' | 'READY' | 'SERVED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
export type KotStatus = 'PENDING' | 'PRINTED' | 'ACKNOWLEDGED' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Order types offered when taking an order. */
export const ORDER_MODES: OrderMode[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP'];

/** Orders still on the floor, in the kitchen or with a rider (same list as the API). */
export const OPEN_STATUSES: OrderStatus[] = ['DRAFT', 'PLACED', 'CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD'];
export const isOpenOrder = (o: { status: OrderStatus; saleId?: string | null }) => OPEN_STATUSES.includes(o.status) && !o.saleId;

// ── Dish options ───────────────────────────────────────────────

export interface ModOption { id: string; name: string; priceAdjustment: number; isDefault?: boolean }
export interface ModGroup { id: string; name: string; isRequired: boolean; minSelections: number; maxSelections: number; options: ModOption[] }
export interface DishSize { id: string; name: string; price: number }
export interface Dish { price: number; sizes: DishSize[]; groups: ModGroup[] }
export interface PickedModifier { modifierOptionId: string; name: string; quantity: number; priceAdjustment: number }

/** Options ticked when the picker opens: each group's defaults, up to its maximum. */
export function defaultPicks(groups: ModGroup[]): Record<string, string[]> {
  return Object.fromEntries(groups.map((g) => [g.id, g.options.filter((o) => o.isDefault).slice(0, Math.max(1, g.maxSelections)).map((o) => o.id)]));
}

/** Tapping an option: one-choice groups swap, others add up to the maximum. */
export function togglePick(picked: Record<string, string[]>, group: Pick<ModGroup, 'id' | 'maxSelections'>, optionId: string): Record<string, string[]> {
  const cur = picked[group.id] ?? [];
  if (cur.includes(optionId)) return { ...picked, [group.id]: cur.filter((x) => x !== optionId) };
  if (group.maxSelections <= 1) return { ...picked, [group.id]: [optionId] };
  if (cur.length >= group.maxSelections) return picked;
  return { ...picked, [group.id]: [...cur, optionId] };
}

/** Choices a group needs before the dish can go on the order. */
export const groupNeed = (g: Pick<ModGroup, 'isRequired' | 'minSelections'>) => (g.isRequired ? Math.max(1, g.minSelections) : g.minSelections);

/** First thing still to choose ('size' or a group id), or null when the dish is complete. */
export function missingChoice(dish: Pick<Dish, 'sizes' | 'groups'>, size: DishSize | undefined, picked: Record<string, string[]>): string | null {
  if (dish.sizes.length && !size) return 'size';
  const g = dish.groups.find((x) => (picked[x.id]?.length ?? 0) < groupNeed(x));
  return g ? g.id : null;
}

/** Picked options in group order, as order lines carry them. */
export function pickedModifiers(groups: ModGroup[], picked: Record<string, string[]>): PickedModifier[] {
  return groups.flatMap((g) => (picked[g.id] ?? [])
    .map((id) => g.options.find((o) => o.id === id))
    .filter((o): o is ModOption => !!o)
    .map((o) => ({ modifierOptionId: o.id, name: o.name, quantity: 1, priceAdjustment: o.priceAdjustment })));
}

/** One plate: size price (or the dish price) plus every add-on. */
export function unitPrice(basePrice: number, size: DishSize | undefined, modifiers: Array<Pick<PickedModifier, 'priceAdjustment' | 'quantity'>>): number {
  return r2((size?.price ?? basePrice) + modifiers.reduce((s, m) => s + m.priceAdjustment * (m.quantity || 1), 0));
}

/** Two order lines merge when dish, size and options are the same and neither has a note. */
export function sameLine(
  a: { productId: string; sizeId?: string; modifiers: Array<{ modifierOptionId: string }>; note?: string },
  b: { productId: string; sizeId?: string; modifiers: Array<{ modifierOptionId: string }>; note?: string },
): boolean {
  if (a.productId !== b.productId || (a.sizeId ?? '') !== (b.sizeId ?? '') || a.note || b.note) return false;
  const ka = a.modifiers.map((m) => m.modifierOptionId).sort().join(',');
  const kb = b.modifiers.map((m) => m.modifierOptionId).sort().join(',');
  return ka === kb;
}

/** "Large, 2× Extra cheese" for a line's options. */
export function extrasText(mods: Array<{ quantity?: number; name?: string; modifierOption?: { name: string } }>): string {
  return mods.map((m) => `${(m.quantity ?? 1) > 1 ? `${m.quantity}× ` : ''}${m.name ?? m.modifierOption?.name ?? ''}`).filter((x) => x.trim()).join(', ');
}

// ── Order bill ─────────────────────────────────────────────────

export interface BillInput {
  mode: OrderMode;
  /** Dishes at menu price with their options. */
  subtotal: number;
  /** Happy-hour cut the server quoted (capped to the subtotal). */
  happy?: number;
  servicePct?: number;
  taxPct?: number;
  deliveryFee?: number;
  packing?: number;
  tip?: number;
  discount?: number;
}

export interface Bill {
  subtotal: number; happy: number; itemsNet: number; service: number; tax: number; fee: number; pack: number; tip: number; discount: number; total: number;
  /** What a discount may not exceed. */
  beforeDiscount: number;
}

/**
 * The composer's bill: service charge only on dine-in, tax on dishes plus
 * service, delivery fee only on delivery, packing off the table.
 */
export function orderBill(b: BillInput): Bill {
  const subtotal = r2(b.subtotal);
  const happy = r2(Math.min(Math.max(b.happy ?? 0, 0), subtotal));
  const itemsNet = r2(subtotal - happy);
  const service = b.mode === 'DINE_IN' ? r2(itemsNet * (b.servicePct || 0) / 100) : 0;
  const tax = r2((itemsNet + service) * (b.taxPct || 0) / 100);
  const fee = b.mode === 'DELIVERY' ? b.deliveryFee || 0 : 0;
  const pack = b.mode !== 'DINE_IN' ? b.packing || 0 : 0;
  const tip = b.tip || 0;
  const discount = b.discount || 0;
  const beforeDiscount = r2(itemsNet + service + tax + fee + pack + tip);
  return { subtotal, happy, itemsNet, service, tax, fee, pack, tip, discount, beforeDiscount, total: r2(Math.max(beforeDiscount - discount, 0)) };
}

export type ComposerProblem = 'empty' | 'address' | 'phone' | 'discount' | null;

/** Why a new order cannot be saved yet. */
export function composerProblem(o: { lines: number; adding: boolean; mode: OrderMode; address?: string; phone?: string; bill: Bill }): ComposerProblem {
  if (!o.lines) return 'empty';
  if (!o.adding && o.mode === 'DELIVERY' && !o.address?.trim()) return 'address';
  if (!o.adding && o.mode === 'DELIVERY' && !o.phone?.trim()) return 'phone';
  if (o.bill.discount > o.bill.beforeDiscount) return 'discount';
  return null;
}

export interface ChargesInput { servicePct: number; taxPct: number; discount: number; packing: number; deliveryFee: number; tip: number }

/**
 * A running order's bill after its charges change (web ChargesDialog): the
 * new total and why it cannot be saved (percent over 100, discount over the
 * bill, total under what was already paid).
 */
export function chargesPreview(o: { mode: OrderMode; subtotal: number; paidAmount: number }, c: ChargesInput): { total: number; problem: 'percent' | 'discount' | 'paid' | null } {
  const service = r2(o.subtotal * c.servicePct / 100);
  const tax = r2((o.subtotal + service) * c.taxPct / 100);
  const delivery = o.mode === 'DELIVERY' ? c.deliveryFee : 0;
  const total = r2(Math.max(o.subtotal + service + tax + delivery + c.packing + c.tip - c.discount, 0));
  const problem = c.servicePct > 100 || c.taxPct > 100 ? 'percent'
    : c.discount > o.subtotal + service + tax + delivery + c.packing ? 'discount'
      : total < o.paidAmount - 0.01 ? 'paid' : null;
  return { total, problem };
}

// ── Split bill ─────────────────────────────────────────────────

/** Each guest's share when a table splits equally; the last share takes the rounding. */
export function equalShares(due: number, people: number): number[] {
  const n = Math.max(1, Math.min(50, Math.floor(people) || 1));
  const each = Math.ceil((due / n) * 100) / 100;
  const shares = Array.from({ length: n }, () => each);
  shares[n - 1] = r2(due - each * (n - 1));
  return shares;
}

export interface SplitLine { id: string; quantity: number; total: number }

/** Amount of the dishes chosen for a separate bill (before service and tax follow them). */
export function splitAmount(lines: SplitLine[], qty: Record<string, number>): number {
  return r2(lines.reduce((s, it) => s + (it.quantity > 0 ? (it.total / it.quantity) * Math.min(qty[it.id] ?? 0, it.quantity) : 0), 0));
}

/** A split needs at least one dish chosen and at least one plate left on the first bill. */
export function splitProblem(lines: SplitLine[], qty: Record<string, number>): 'none' | 'all' | null {
  const picked = lines.filter((it) => (qty[it.id] ?? 0) > 0);
  if (!picked.length) return 'none';
  if (lines.every((it) => (qty[it.id] ?? 0) >= it.quantity)) return 'all';
  return null;
}

/** Whether "split by dishes" is possible: nothing paid and more than one plate. */
export const canSplitItems = (o: { paidAmount: number }, live: Array<{ quantity: number }>) =>
  o.paidAmount <= 0 && live.length > 0 && !(live.length === 1 && live[0].quantity < 2);

// ── Kitchen display ────────────────────────────────────────────

export type KitchenLane = 'new' | 'cooking' | 'ready';
export const LANE_OF: Partial<Record<KotStatus, KitchenLane>> = { PENDING: 'new', PRINTED: 'new', ACKNOWLEDGED: 'new', COOKING: 'cooking', READY: 'ready' };

/** The next step of a ticket in its lane ("bump"). */
export const NEXT_KOT: Record<KitchenLane, KotStatus> = { new: 'COOKING', cooking: 'READY', ready: 'SERVED' };

/** Ticket age tone: amber after 10 minutes, red after 20. */
export const ageTone = (minutes: number): 'ok' | 'late' | 'very-late' => (minutes >= 20 ? 'very-late' : minutes >= 10 ? 'late' : 'ok');

export const minutesSince = (iso?: string | Date | null, now = Date.now()) => (iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000)) : 0);

/** Takeaway/delivery orders whose every ticket is ready, to call out at the counter. */
export function readyCallouts(kots: Array<{ status: KotStatus; order?: { id: string; mode: string; token?: number | null; customerName?: string | null; orderNumber: string } | null }>): string[] {
  const m = new Map<string, { label: string; all: boolean }>();
  for (const k of kots) {
    if (!k.order || k.order.mode === 'DINE_IN' || k.status === 'CANCELLED') continue;
    const label = k.order.token ? `#${k.order.token}` : k.order.customerName || k.order.orderNumber;
    const prev = m.get(k.order.id);
    m.set(k.order.id, { label, all: (prev?.all ?? true) && k.status === 'READY' });
  }
  return [...m.values()].filter((x) => x.all).map((x) => x.label);
}

/** Ids of tickets that were not on the screen before (sound / haptic once each). */
export function freshTickets(prev: Set<string> | null, kots: Array<{ id: string; status: KotStatus }>): string[] {
  if (!prev) return [];
  return kots.filter((k) => !prev.has(k.id) && k.status !== 'READY' && k.status !== 'CANCELLED').map((k) => k.id);
}
export * from './menu';
