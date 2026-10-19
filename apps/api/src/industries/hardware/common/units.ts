import { HardwareUnit } from '@prisma/client';

/** Product unit (lowercase, shared catalog) to the hardware slip unit. */
const UNIT: Record<string, HardwareUnit> = {
  bag: 'BAG', kg: 'KG', ton: 'TON', pcs: 'PIECE', piece: 'PIECE', dozen: 'DOZEN', carton: 'CARTON',
  meter: 'METER', m: 'METER', feet: 'FEET', ft: 'FEET', inch: 'INCH', sqft: 'SQFT', sqm: 'SQMETER',
  cft: 'CUBIC_FEET', cum: 'CUBIC_METER', liter: 'LITER', litre: 'LITER', gallon: 'GALLON', bundle: 'BUNDLE',
  roll: 'ROLL', sheet: 'SHEET', box: 'BOX', set: 'SET', trip: 'TRIP',
};

export const slipUnit = (unit?: string | null): HardwareUnit => UNIT[(unit ?? '').trim().toLowerCase()] ?? 'PIECE';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r4 = (n: number) => Math.round((Number(n) || 0) * 10_000) / 10_000;
