import { BadRequestException } from '@nestjs/common';

/** PKR notes and coins a till can be counted in. */
export const PKR_DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1] as const;

/** Count per denomination, e.g. { "1000": 4, "500": 3 }. */
export type Denominations = Record<string, number>;

/**
 * Checks a count sheet and that it adds up to the amount entered. Returns
 * the cleaned sheet (zero rows dropped), or undefined when none was sent.
 */
export function checkDenominations(sheet: Denominations | undefined, amount: number): Denominations | undefined {
  if (!sheet) return undefined;
  const clean: Denominations = {};
  let sum = 0;
  for (const [key, raw] of Object.entries(sheet)) {
    const value = Number(key);
    const count = Number(raw);
    if (!PKR_DENOMINATIONS.includes(value as (typeof PKR_DENOMINATIONS)[number])) {
      throw new BadRequestException(`Rs ${key} ka note ya sikka nahi hota`);
    }
    if (!Number.isInteger(count) || count < 0 || count > 100_000) {
      throw new BadRequestException(`Rs ${key} ki ginti sahi nahi`);
    }
    if (count > 0) {
      clean[key] = count;
      sum += value * count;
    }
  }
  if (Math.abs(sum - amount) > 0.01) {
    throw new BadRequestException(`Notes ki ginti (Rs ${sum}) aur likhi raqam (Rs ${amount}) barabar nahi`);
  }
  return clean;
}
