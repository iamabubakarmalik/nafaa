/**
 * Cash the shop pays out of the open drawer for old gold or silver it buys
 * across the counter. Recorded as a drawer cash-out so the register closes
 * without a false shortage. Without an open register there is no drawer to
 * correct, and the caller is told so.
 */
import { PrismaService } from '../../../prisma/prisma.service';

export async function payFromDrawer(
  prisma: PrismaService,
  input: { tenantId: string; userId: string; shopId?: string | null; amount: number; reason: string; note?: string; reference: string },
): Promise<boolean> {
  const register = await prisma.cashRegister.findFirst({
    where: { tenantId: input.tenantId, status: 'OPEN', ...(input.shopId && { shopId: input.shopId }) },
    orderBy: { openedAt: 'desc' },
    select: { id: true },
  });
  if (!register || !(input.amount > 0)) return false;
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.cashRegister.updateMany({
      where: { id: register.id, status: 'OPEN' },
      data: { expectedBalance: { decrement: input.amount }, totalCashOut: { increment: input.amount } },
    });
    if (!claimed.count) return false;
    await tx.cashTransaction.create({
      data: {
        tenantId: input.tenantId, cashRegisterId: register.id, createdById: input.userId,
        type: 'CASH_OUT', amount: input.amount, reason: input.reason, note: input.note, reference: input.reference,
      },
    });
    return true;
  });
}
