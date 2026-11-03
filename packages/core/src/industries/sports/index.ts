/**
 * Sports shop rules shared by web and mobile: team order totals (rate plus
 * printing per piece, discount, delivery), the printing list parser, the
 * team rate a counter line moves to at the team quantity, and the order and
 * repair step flows.
 */

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface TeamLine { quantity: number; unitPrice: number; printingPrice?: number }

export function teamTotals(lines: TeamLine[], discountPct: number, shipping: number) {
  const subtotal = r2(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * ((Number(l.unitPrice) || 0) + (Number(l.printingPrice) || 0)), 0));
  const discount = r2((subtotal * Math.min(Math.max(Number(discountPct) || 0, 0), 100)) / 100);
  return { subtotal, discount, total: r2(subtotal - discount + (Number(shipping) || 0)), pieces: lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0) };
}

export interface RosterRow { name: string; number: string; size: string }

/** "Ali 10 M" or "Ali, 10, M" per line becomes a roster row (name, shirt number, size). */
export function parseRoster(text: string): RosterRow[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.includes(',') || l.includes('\t') ? l.split(/[,\t]/).map((s) => s.trim()) : l.split(/\s+/);
    const numberAt = parts.findIndex((p) => /^\d{1,3}$/.test(p));
    if (numberAt < 0) return { name: parts.join(' '), number: '', size: '' };
    return { name: parts.slice(0, numberAt).join(' '), number: parts[numberAt], size: parts.slice(numberAt + 1).join(' ') };
  });
}

/**
 * Rate a counter line should have: the team rate (per base unit, times the
 * pack size) once the base quantity reaches the team minimum, the normal
 * rate again when it falls back. A rate typed by hand is never changed.
 * Returns undefined when nothing changes.
 */
export function teamLineRate(line: { unitPrice: number; basePrice: number; conversionRate: number; baseQuantity: number }, team: { price: number; min: number }): number | undefined {
  if (!(team.price > 0) || !(team.min > 1)) return undefined;
  const rate = team.price * line.conversionRate;
  if (!(rate < line.basePrice)) return undefined;
  if (line.baseQuantity >= team.min) return Math.abs(line.unitPrice - rate) < 0.005 ? undefined : rate;
  return Math.abs(line.unitPrice - rate) < 0.005 ? line.basePrice : undefined;
}

export type TeamStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
export const TEAM_NEXT: Record<string, TeamStatus | undefined> = { DRAFT: 'QUOTED', QUOTED: 'CONFIRMED', CONFIRMED: 'IN_PRODUCTION', IN_PRODUCTION: 'READY' };
export const TEAM_OPEN: string[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY'];
export const REPAIR_OPEN: string[] = ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

/** A confirmed order past its delivery day. */
export const isTeamLate = (o: { status: string; expectedDeliveryDate?: string | null }, today: string) =>
  ['CONFIRMED', 'IN_PRODUCTION', 'READY'].includes(o.status) && !!o.expectedDeliveryDate && o.expectedDeliveryDate.slice(0, 10) < today;

/** Bill of a repair on delivery: charge plus parts from stock, less the advance already held. */
export function repairBill(charge: number, parts: Array<{ quantity: number; price: number }>, advance: number) {
  const partsTotal = r2(parts.reduce((s, p) => s + p.quantity * p.price, 0));
  const bill = r2((Number(charge) || 0) + partsTotal);
  return { partsTotal, bill, due: r2(Math.max(bill - advance, 0)) };
}

/** Advance still held on a cancelled job (given less refunded). */
export const heldAdvance = (advancePaid: number, refunded: number) => r2(advancePaid - refunded);

/** Kit, jersey and shoes come in sizes. */
export const isApparel = (type?: string | null) => !!type && /JERSEY|KIT$|SHOES|SWIMSUIT/.test(type) && type !== 'CRICKET_KIT_BAG';
export const isBat = (type?: string | null) => type === 'CRICKET_BAT';
export const isBall = (type?: string | null) => !!type && /BALL|SHUTTLE/.test(type) && type !== 'FOOTBALL_SHOES';

/** Sale percent of an item priced below its MRP. */
export const salePct = (mrp?: number | null, price?: number) => (mrp && price && price > 0 && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
