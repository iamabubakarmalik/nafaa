import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateCreditTransactionDto } from './dto/create-transaction.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';

/** Totals on the account that each entry type feeds. */
const TOTAL_FIELD: Partial<Record<string, 'totalPurchases' | 'totalPayments' | 'totalWriteOffs' | 'totalInterest'>> = {
  SALE: 'totalPurchases',
  PAYMENT: 'totalPayments',
  WRITE_OFF: 'totalWriteOffs',
  INTEREST: 'totalInterest',
};

@Injectable()
export class CreditTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCreditTransactionDto, reverses?: { transactionType: string; amount: number }) {
    if (!dto.amount) throw new BadRequestException('Raqam 0 nahi ho sakti');
    const account = await this.prisma.hardwareCreditAccount.findFirst({
      where: { id: dto.accountId, tenantId: user.tenantId },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.status === 'CLOSED') throw new BadRequestException('Account is closed');
    // A linked account shows the customer khata, so an entry here would count the money twice.
    if (account.customerId && !reverses) {
      throw new BadRequestException('Is contractor ka hisaab customer khate se chalta hai — udhaar POS se aur wusooli khate se darj karein');
    }

    const prefix = `LDG-${new Date().getFullYear()}-`;
    return createWithDocNumber({
      prefix,
      width: 6,
      existing: async () => (await this.prisma.hardwareCreditTransaction.findMany({
        where: { tenantId: user.tenantId, transactionNumber: { startsWith: prefix } },
        select: { transactionNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((t) => t.transactionNumber),
      create: (transactionNumber) => this.prisma.$transaction(async (tx) => {
      // SALE/INTEREST/OPENING_BALANCE raise the balance, PAYMENT/REFUND/WRITE_OFF lower it.
      // ADJUSTMENT keeps the sign it is given, so it can correct either way.
      const isDebit = ['SALE', 'INTEREST', 'OPENING_BALANCE'].includes(dto.transactionType);
      const signedAmount = dto.transactionType === 'ADJUSTMENT'
        ? dto.amount
        : isDebit ? Math.abs(dto.amount) : -Math.abs(dto.amount);
      // Atomic increment locks the row, so two entries at once both count.
      const fresh = await tx.hardwareCreditAccount.update({
        where: { id: account.id },
        data: { currentBalance: { increment: signedAmount } },
      });
      const newBalance = fresh.currentBalance;

      // Check credit limit for sales
      if (dto.transactionType === 'SALE' && fresh.creditLimit > 0 && newBalance > fresh.creditLimit) {
        throw new BadRequestException(
          `Udhaar had se zyada ho jayega. Baqi: ${newBalance - signedAmount}, Had: ${fresh.creditLimit}, Naya: ${dto.amount}`,
        );
      }

      const transaction = await tx.hardwareCreditTransaction.create({
        data: {
          tenantId: user.tenantId,
          accountId: dto.accountId,
          transactionNumber,
          transactionType: dto.transactionType,
          amount: signedAmount,
          runningBalance: newBalance,
          description: dto.description,
          saleId: dto.saleId,
          deliveryId: dto.deliveryId,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
          notes: dto.notes,
          attachmentUrls: dto.attachmentUrls ?? [],
          handledById: user.id,
        },
      });

      // Update account balances
      const patch: any = {};

      const field = TOTAL_FIELD[dto.transactionType];
      if (field) patch[field] = { increment: Math.abs(dto.amount) };
      if (dto.transactionType === 'SALE') patch.lastPurchaseDate = new Date();
      if (dto.transactionType === 'PAYMENT') patch.lastPaymentDate = new Date();
      // A reversal also takes the original entry out of its running total.
      const reversedField = reverses ? TOTAL_FIELD[reverses.transactionType] : undefined;
      if (reversedField) patch[reversedField] = { decrement: Math.abs(reverses!.amount) };

      // Over the limit only counts when a limit is set.
      if (fresh.creditLimit > 0 && newBalance > fresh.creditLimit && fresh.status === 'ACTIVE') {
        patch.status = 'OVERDUE';
      } else if (fresh.status === 'OVERDUE' && (fresh.creditLimit <= 0 || newBalance <= fresh.creditLimit)) {
        patch.status = 'ACTIVE';
      }

      await tx.hardwareCreditAccount.update({ where: { id: dto.accountId }, data: patch });

      return transaction;
    }),
    });
  }

  async list(user: AuthenticatedUser, params: { accountId?: string; type?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.hardwareCreditTransaction.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.accountId && { accountId: params.accountId }),
        ...(params.type && { transactionType: params.type as any }),
        ...(params.from || params.to ? {
          transactionDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { transactionNumber: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
            { paymentReference: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { transactionDate: 'desc' },
      take: 500,
    });
  }

  async statement(user: AuthenticatedUser, accountId: string, from?: string, to?: string) {
    const account = await this.prisma.hardwareCreditAccount.findFirst({ where: { id: accountId, tenantId: user.tenantId } });
    if (!account) throw new NotFoundException('Account not found');

    const transactions = await this.prisma.hardwareCreditTransaction.findMany({
      where: {
        accountId,
        ...(from || to ? {
          transactionDate: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        } : {}),
      },
      orderBy: { transactionDate: 'asc' },
    });

    const totalDebit = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalCredit = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    return {
      account,
      transactions,
      summary: {
        openingBalance: transactions.length > 0 ? transactions[0].runningBalance - transactions[0].amount : account.currentBalance,
        totalDebit,
        totalCredit,
        closingBalance: transactions.length > 0 ? transactions[transactions.length - 1].runningBalance : account.currentBalance,
        transactionCount: transactions.length,
      },
    };
  }

  async removeReversal(user: AuthenticatedUser, id: string, reason: string) {
    const tx = await this.prisma.hardwareCreditTransaction.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    const marker = `Reversal of ${tx.transactionNumber}:`;
    if (tx.description.startsWith('Reversal of ')) throw new BadRequestException('Wapsi wali entry dobara wapas nahi hoti');
    const already = await this.prisma.hardwareCreditTransaction.findFirst({
      where: { accountId: tx.accountId, description: { startsWith: marker } },
      select: { id: true },
    });
    if (already) throw new BadRequestException('Ye entry pehle hi wapas ho chuki hai');

    // The stored amount is signed, so the opposite sign undoes it exactly.
    return this.create(user, {
      accountId: tx.accountId,
      transactionType: 'ADJUSTMENT',
      amount: -tx.amount,
      description: `${marker} ${reason || ''}`.trim(),
      notes: reason,
    } as CreateCreditTransactionDto, { transactionType: tx.transactionType, amount: tx.amount });
  }
}
