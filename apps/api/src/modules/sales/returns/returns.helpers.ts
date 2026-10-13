import { Prisma } from '@prisma/client';

/** Small shared bits of the returns module. */

export const r2 = (n: number) => Math.round(n * 100) / 100;
export const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Activity log action written when the owner's PIN let a return through. */
export const PIN_APPROVAL_ACTION = 'REFUND_PIN_APPROVED';

/**
 * Float columns pick up noise on increment/decrement (210 − 18.67 gives
 * 191.32999999999998). When the stored balance is within a hair of a whole
 * paisa, it is written back as that paisa value. Run it inside the same
 * transaction, right after the balance changed (the row is still locked).
 */
export async function tidyCustomerBalance(
  tx: Prisma.TransactionClient,
  customerId: string,
  balance: number,
): Promise<number> {
  const clean = r2(balance);
  if (clean === balance || Math.abs(clean - balance) > 1e-6) return balance;
  const row = await tx.customer.update({ where: { id: customerId }, data: { balance: clean }, select: { balance: true } });
  return row.balance;
}
