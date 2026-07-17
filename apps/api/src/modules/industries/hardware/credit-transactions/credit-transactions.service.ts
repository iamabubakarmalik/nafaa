import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateCreditTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class CreditTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCreditTransactionDto) {
    const account = await this.prisma.hardwareCreditAccount.findFirst({
      where: { id: dto.accountId, tenantId: user.tenantId },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.status === 'CLOSED') throw new BadRequestException('Account is closed');

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.hardwareCreditTransaction.count({ where: { tenantId: user.tenantId } });
      const year = new Date().getFullYear();
      const transactionNumber = `LDG-${year}-${String(count + 1).padStart(6, '0')}`;

      // Debit: SALE/INTEREST/ADJUSTMENT (positive) increase balance
      // Credit: PAYMENT/REFUND/WRITE_OFF decrease balance
      const isDebit = ['SALE', 'INTEREST', 'ADJUSTMENT', 'OPENING_BALANCE'].includes(dto.transactionType);
      const signedAmount = isDebit ? Math.abs(dto.amount) : -Math.abs(dto.amount);
      const newBalance = account.currentBalance + signedAmount;

      // Check credit limit for sales
      if (dto.transactionType === 'SALE' && account.creditLimit > 0 && newBalance > account.creditLimit) {
        throw new BadRequestException(
          `Sale would exceed credit limit. Current: ${account.currentBalance}, Limit: ${account.creditLimit}, Sale: ${dto.amount}`,
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
      const patch: any = {
        currentBalance: newBalance,
      };

      if (dto.transactionType === 'SALE') {
        patch.totalPurchases = { increment: Math.abs(dto.amount) };
        patch.lastPurchaseDate = new Date();
      } else if (dto.transactionType === 'PAYMENT') {
        patch.totalPayments = { increment: Math.abs(dto.amount) };
        patch.lastPaymentDate = new Date();
      } else if (dto.transactionType === 'WRITE_OFF') {
        patch.totalWriteOffs = { increment: Math.abs(dto.amount) };
      } else if (dto.transactionType === 'INTEREST') {
        patch.totalInterest = { increment: Math.abs(dto.amount) };
      }

      // Update status if overdue
      if (newBalance > account.creditLimit && account.status === 'ACTIVE') {
        patch.status = 'OVERDUE';
      } else if (account.status === 'OVERDUE' && newBalance <= account.creditLimit) {
        patch.status = 'ACTIVE';
      }

      await tx.hardwareCreditAccount.update({ where: { id: dto.accountId }, data: patch });

      return transaction;
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

    // Create reversal transaction
    const reversalType: any = tx.transactionType === 'SALE' ? 'ADJUSTMENT' : tx.transactionType === 'PAYMENT' ? 'ADJUSTMENT' : 'ADJUSTMENT';
    return this.create(user, {
      accountId: tx.accountId,
      transactionType: reversalType,
      amount: -tx.amount,
      description: `Reversal of ${tx.transactionNumber}: ${reason}`,
      notes: reason,
    } as any);
  }
}
