/**
 * Barcode clash check shared by pack units and combos. A scanned code must
 * point at exactly one thing in a tenant, so a new code is checked against
 * products, variants, pack units and combos (case blind, like the scanner
 * lookup). The record being saved, and the product it belongs to, are
 * skipped so a pack can reuse its own product's code on the base unit.
 */

import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ClashSkip {
  unitId?: string;
  productId?: string;
  comboId?: string;
}

export async function findCodeClash(prisma: PrismaService, tenantId: string, raw: string, skip: ClashSkip = {}): Promise<string | null> {
  const code = raw.trim();
  if (!code) return null;
  const same = { equals: code, mode: 'insensitive' as const };
  const [product, variant, unit, combo] = await Promise.all([
    prisma.product.findFirst({
      where: { tenantId, barcode: same, ...(skip.productId && { id: { not: skip.productId } }) },
      select: { name: true },
    }),
    prisma.productVariant.findFirst({
      where: { barcode: same, product: { tenantId }, ...(skip.productId && { productId: { not: skip.productId } }) },
      select: { name: true, product: { select: { name: true } } },
    }),
    prisma.productUnit.findFirst({
      where: { tenantId, barcode: same, ...(skip.unitId && { id: { not: skip.unitId } }) },
      select: { unitName: true, product: { select: { name: true } } },
    }),
    prisma.productCombo.findFirst({
      where: { tenantId, barcode: same, ...(skip.comboId && { id: { not: skip.comboId } }) },
      select: { name: true },
    }),
  ]);
  if (product) return `product "${product.name}"`;
  if (variant) return `"${variant.product.name} (${variant.name})"`;
  if (unit) return `"${unit.product.name}" ki ${unit.unitName}`;
  if (combo) return `combo "${combo.name}"`;
  return null;
}

/** Throws when the code is already used by something else. */
export async function assertCodeFree(prisma: PrismaService, tenantId: string, code: string | null | undefined, skip: ClashSkip = {}) {
  if (!code?.trim()) return;
  const owner = await findCodeClash(prisma, tenantId, code, skip);
  if (owner) throw new ConflictException(`Barcode ${code.trim()} pehle se ${owner} par laga hai`);
}
