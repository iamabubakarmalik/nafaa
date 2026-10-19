/**
 * Gift voucher rules shared by the voucher screen and the salon bill.
 *
 * A voucher is sold as its own bill (SLN-<code>), so its money is income on
 * the day it is sold, like a package. Redeeming it lowers the price of the
 * lines it pays for instead of adding a payment, so the same money is never
 * counted as sales twice. Each paid line carries a team-only tag
 * `[Voucher <code> Rs <amount>]` in its internal note; a void or a full
 * return of that line gives the amount back to the voucher and marks the
 * tag `wapas`, so it is given back only once.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, type SalonGiftVoucher } from '@prisma/client';
import { r2 } from '../common/salon-common';

type Db = Prisma.TransactionClient;

const TAG = /\[Voucher (GV-[A-Z0-9]+) Rs ([\d.]+)\]/;
/** Bills of these sold vouchers no longer back the voucher. */
const DEAD_SALE = ['VOIDED', 'FULLY_RETURNED'];

export const voucherTag = (code: string, amount: number) => `[Voucher ${code} Rs ${r2(amount)}]`;
export const voucherSaleNumber = (code: string) => `SLN-${code}`;
export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

/** Why a voucher cannot pay a bill now, or null when it can. */
export async function voucherProblem(db: Db, v: SalonGiftVoucher): Promise<string | null> {
  if (v.status === 'CANCELLED') return 'Ye voucher cancel ho chuka hai';
  if (v.status === 'USED' || v.balance <= 0.009) return 'Is voucher me koi balance baqi nahi';
  if (v.status === 'EXPIRED' || (v.expiryDate && v.expiryDate < new Date())) return 'Is voucher ki muddat khatam ho chuki';
  if (v.saleId) {
    const sale = await db.sale.findFirst({ where: { id: v.saleId, tenantId: v.tenantId }, select: { status: true } });
    if (sale && DEAD_SALE.includes(sale.status)) return 'Is voucher ka bill void / wapas ho chuka hai';
  }
  return null;
}

/** The voucher a bill may be paid with; refuses one that cannot be used. */
export async function usableVoucher(db: Db, tenantId: string, code: string) {
  const v = await db.salonGiftVoucher.findFirst({ where: { tenantId, code: normalizeCode(code) } });
  if (!v) throw new NotFoundException(`Voucher ${normalizeCode(code)} nahi mila`);
  const problem = await voucherProblem(db, v);
  if (problem) throw new BadRequestException(`${v.code}: ${problem}`);
  return v;
}

/**
 * Splits `amount` over bill lines, first to last: the per-unit price cut
 * of each line, never below its own line discount. Returns the cuts and the
 * amount actually placed (whole paisa per unit, so a little may be left).
 */
export function spreadVoucher(lines: Array<{ unit: number; qty: number; lineDiscount: number }>, amount: number) {
  let left = r2(amount);
  const cuts = lines.map((l) => {
    if (left <= 0 || l.qty <= 0) return 0;
    const room = r2(l.unit * l.qty - l.lineDiscount);
    if (room <= 0) return 0;
    const perUnit = Math.floor((Math.min(left, room) / l.qty) * 100) / 100;
    left = r2(left - perUnit * l.qty);
    return perUnit;
  });
  return { cuts, placed: r2(amount - left) };
}

/**
 * Gives voucher money back for lines of a voided bill, or for fully
 * returned lines of a returned bill. Each tag is given back once.
 */
export async function giveVoucherBack(db: Db, tenantId: string, saleId: string, mode: 'void' | 'return') {
  const items = await db.saleItem.findMany({
    where: { saleId, internalNote: { contains: '[Voucher GV-' } },
    select: { id: true, internalNote: true, quantity: true, returnedQty: true },
  });
  let back = 0;
  for (const it of items) {
    const note = it.internalNote ?? '';
    const m = TAG.exec(note);
    if (!m) continue;
    if (mode === 'return' && it.returnedQty < it.quantity - 1e-9) continue;
    const amount = Number(m[2]) || 0;
    const marked = await db.saleItem.updateMany({
      where: { id: it.id, internalNote: note },
      data: { internalNote: note.replace(m[0], `[Voucher ${m[1]} Rs ${m[2]} wapas]`) },
    });
    if (!marked.count || amount <= 0) continue;
    const v = await db.salonGiftVoucher.findFirst({ where: { tenantId, code: m[1] } });
    if (!v) continue;
    await db.salonGiftVoucher.update({
      where: { id: v.id },
      data: { balance: { increment: amount }, ...(v.status === 'USED' && { status: 'ACTIVE' }) },
    });
    back = r2(back + amount);
  }
  return back;
}
