/**
 * Product type filter from a query string. An unknown value used to reach
 * Prisma as-is and fail with a server error; it is now a clear 400.
 */
import { BadRequestException } from '@nestjs/common';
import { ElectronicsCategoryType } from '@prisma/client';

const TYPES = new Set<string>(Object.values(ElectronicsCategoryType));

export function categoryTypeParam(value?: string): ElectronicsCategoryType | undefined {
  const v = value?.trim().toUpperCase();
  if (!v) return undefined;
  if (!TYPES.has(v)) throw new BadRequestException(`Product type "${value}" nahi mila`);
  return v as ElectronicsCategoryType;
}
