/**
 * Stock conversions of a meat shop: live birds or an animal become dressed
 * meat (slaughter), a carcass becomes cuts (cutting).
 *
 * What goes in leaves stock at its average cost; what comes out enters at a
 * share of that value, split by sale value (kg x rate), so boneless carries
 * more of the cost than bones. Waste carries no value: its cost sits in the
 * saleable cuts. Both moves are stock movements without a stock adjustment,
 * so the profit report does not count them as write-offs or found goods.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../common/shop-scope';
import { r2, r3, r4 } from './meat-money';

export interface ConvertLine { productId: string; qty: number }

export interface ConvertInput {
  shopId: string;
  reference: string;
  note: string;
  take: ConvertLine[];
  give: ConvertLine[];
  /** Value of what goes in when known exactly (an animal's price); default: average cost. */
  value?: number;
}

export interface ConvertResult {
  value: number;
  given: Array<{ productId: string; name: string; qty: number; unitCost: number }>;
}

export async function allowNegativeStock(tx: Prisma.TransactionClient, tenantId: string) {
  const s = await tx.tenantSettings.findUnique({ where: { tenantId }, select: { allowNegativeStock: true } });
  return !!s?.allowNegativeStock;
}

export async function convertStock(tx: Prisma.TransactionClient, user: AuthenticatedUser, input: ConvertInput): Promise<ConvertResult> {
  const take = input.take.filter((l) => l.qty > 0);
  const give = input.give.filter((l) => l.qty > 0);
  if (!give.length) throw new BadRequestException('Kam se kam ek cheez ka wazan likhein jo stock me aayegi');
  const ids = [...new Set([...take, ...give].map((l) => l.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: ids }, tenantId: user.tenantId, isActive: true },
    select: { id: true, name: true, price: true, costPrice: true, stock: true, hasVariants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) throw new NotFoundException('Ek item nahi mila ya band hai');
    if (p.hasVariants) throw new BadRequestException(`${p.name} ke variants hain — gosht ke liye bina variant ka item chunein`);
  }
  if (take.some((t) => give.some((g) => g.productId === t.productId))) throw new BadRequestException('Jo item nikal raha hai wohi stock me nahi aa sakta');

  const value = r2(input.value ?? take.reduce((s, l) => s + l.qty * Number(byId.get(l.productId)!.costPrice || 0), 0));
  const negative = await allowNegativeStock(tx, user.tenantId);
  for (const l of take) {
    const p = byId.get(l.productId)!;
    await applyStockDelta({
      tx, tenantId: user.tenantId, shopId: input.shopId, productId: p.id, delta: -r3(l.qty),
      movementType: 'ADJUSTMENT_OUT', unitCost: Number(p.costPrice) || 0, reference: input.reference,
      note: input.note, userId: user.id, preventNegative: !negative, label: p.name,
    });
  }

  // Sale value decides each output's share; outputs without a rate share by weight.
  const weights = give.map((l) => l.qty * (Number(byId.get(l.productId)!.price) || 0));
  const total = weights.reduce((s, w) => s + w, 0);
  const kg = give.reduce((s, l) => s + l.qty, 0);
  const given: ConvertResult['given'] = [];
  for (let i = 0; i < give.length; i++) {
    const l = give[i];
    const p = byId.get(l.productId)!;
    const share = total > 0 ? weights[i] / total : l.qty / kg;
    const unitCost = r4((value * share) / l.qty);
    const old = Math.max(Number(p.stock), 0);
    const avg = r4(old > 0 ? (old * Number(p.costPrice || 0) + l.qty * unitCost) / (old + l.qty) : unitCost);
    if (avg > 0) {
      await tx.product.update({ where: { id: p.id }, data: { costPrice: avg } });
      const units = await tx.productUnit.findMany({ where: { productId: p.id, variantId: null }, select: { id: true, conversionRate: true } });
      for (const u of units) await tx.productUnit.update({ where: { id: u.id }, data: { costPrice: r2(avg * (Number(u.conversionRate) || 1)) } });
    }
    await applyStockDelta({
      tx, tenantId: user.tenantId, shopId: input.shopId, productId: p.id, delta: r3(l.qty),
      movementType: 'ADJUSTMENT_IN', unitCost, reference: input.reference, note: input.note, userId: user.id,
    });
    given.push({ productId: p.id, name: p.name, qty: r3(l.qty), unitCost });
  }
  return { value, given };
}
