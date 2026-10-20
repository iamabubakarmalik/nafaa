/**
 * Money paid to a gawala. Every payment is one DairyFarmerPayment row, and
 * the money leaves where it was paid from:
 *   - cash with no account picked: the open drawer of the branch (CASH_OUT);
 *   - a picked money account (bank, JazzCash, safe): a WITHDRAW entry;
 *   - bank / wallet with no account picked: the branch's default account for
 *     that method, else only the row (the shop keeps no accounts).
 * Both movements carry `DFP:<payment id>`, so the statement can show where
 * each payment came from. Paying a gawala settles what was bought (the milk
 * cost is already in stock), so it is not an expense.
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertShopAccess } from '../../../common/shop-scope';
import { drawerCash, r2 } from '../dairy-common';

type Db = Prisma.TransactionClient;

/** Movement reference of a payment, on its cash row or account entry. */
export const paymentRef = (id: string) => `DFP:${id}`;

const METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'CARD'];
const isOwner = (u: AuthenticatedUser) => u.role === 'OWNER' || u.role === 'SUPER_ADMIN';

export function farmerPayMethod(value?: string | null): PaymentMethod {
  const m = String(value ?? '').trim().toUpperCase() || 'CASH';
  if (!METHODS.includes(m as PaymentMethod)) throw new BadRequestException('Payment ka tareeqa sahi chunein');
  return m as PaymentMethod;
}

/** Accounts a gawala can be paid from in this branch (branch accounts and business-wide ones). */
export function payAccountsWhere(user: AuthenticatedUser, shopId: string | null): Prisma.MoneyAccountWhereInput {
  const own = !isOwner(user) && user.shopId;
  return {
    tenantId: user.tenantId, isActive: true,
    ...(own ? { OR: [{ shopId: user.shopId }, { shopId: null }] } : shopId ? { OR: [{ shopId }, { shopId: null }] } : {}),
  };
}

export async function payFarmer(tx: Db, user: AuthenticatedUser, input: {
  farmer: { id: string; name: string; farmerNumber: string };
  amount: number;
  method?: string | null;
  accountId?: string | null;
  shopId?: string | null;
  reference?: string | null;
  note?: string | null;
  /** Line for the drawer or account statement. */
  reason: string;
}) {
  const amount = r2(input.amount);
  if (!(amount > 0)) throw new BadRequestException('Amount sahi likhein');
  const method = farmerPayMethod(input.method);
  const shopId = input.shopId ?? user.shopId ?? null;

  let account: { id: string; name: string; shopId: string | null } | null = null;
  if (input.accountId) {
    const a = await tx.moneyAccount.findFirst({ where: { id: input.accountId, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account nahi mila');
    if (!a.isActive) throw new BadRequestException(`${a.name} band hai — pehle chalu karein`);
    if (a.shopId) assertShopAccess(user, a.shopId, 'Account se payment');
    else if (!isOwner(user) && user.shopId) throw new ForbiddenException('Poore karobar ka account sirf malik chala sakta hai');
    account = a;
  } else if (method !== 'CASH') {
    account = await tx.moneyAccount.findFirst({
      where: { ...payAccountsWhere(user, shopId), method, isDefault: true },
      orderBy: { shopId: { sort: 'asc', nulls: 'last' } },
      select: { id: true, name: true, shopId: true },
    });
  }

  const payment = await tx.dairyFarmerPayment.create({
    data: {
      tenantId: user.tenantId, shopId, farmerId: input.farmer.id, amount, method,
      reference: input.reference?.trim() || null, note: input.note?.trim() || null, createdById: user.id,
    },
  });
  const reason = `${input.reason}${input.reference?.trim() ? ` · ${input.reference.trim()}` : ''}`;

  if (account) {
    await tx.moneyAccountEntry.create({
      data: {
        tenantId: user.tenantId, accountId: account.id, shopId: account.shopId ?? shopId, type: 'WITHDRAW', amount,
        reason: reason.slice(0, 120), note: input.note?.trim()?.slice(0, 200) || null, requestId: paymentRef(payment.id), createdById: user.id,
      },
    });
  } else if (method === 'CASH') {
    const register = await drawerCash(tx, user, { direction: 'OUT', amount, method, reason, reference: paymentRef(payment.id), shopId });
    // A shop that uses the drawer must have it open; a shop that never opened one keeps the record only, as before.
    if (!register) {
      const usesDrawer = await tx.cashRegister.findFirst({ where: { tenantId: user.tenantId, ...(shopId && { shopId }) }, select: { id: true } });
      if (usesDrawer) throw new BadRequestException('Galla (cash register) band hai — pehle galla kholein, ya account se payment dein');
    }
  }
  return { payment, accountName: account?.name ?? null };
}
