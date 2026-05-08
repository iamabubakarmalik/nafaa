import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateReturnDto } from './dto/create-return.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateReturnDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId: user.tenantId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') throw new BadRequestException('Sale is voided');
    if (sale.status === 'FULLY_RETURNED') {
      throw new BadRequestException('Already fully returned');
    }

    const itemMap = new Map(sale.items.map((i) => [i.id, i]));
    let refundAmount = 0;

    const normalizedItems = dto.items.map((item) => {
      const saleItem = itemMap.get(item.saleItemId);
      if (!saleItem) throw new NotFoundException('Sale item not found');

      const remaining = saleItem.quantity - saleItem.returnedQty;
      if (item.quantity > remaining) {
        throw new BadRequestException(
          `Cannot return ${item.quantity}, only ${remaining} available for return`,
        );
      }

      const lineRefund = saleItem.price * item.quantity;
      refundAmount += lineRefund;

      return {
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        quantity: item.quantity,
        refundPrice: saleItem.price,
        total: lineRefund,
      };
    });

    const returnNumber = `RET-${Date.now().toString().slice(-8)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.saleReturn.create({
        data: {
          tenantId: user.tenantId,
          saleId: sale.id,
          createdById: user.id,
          returnNumber,
          reason: dto.reason,
          notes: dto.notes,
          refundAmount,
          refundMethod: dto.refundMethod,
          items: {
            create: normalizedItems,
          },
        },
        include: {
          items: { include: { product: true } },
          sale: { include: { customer: true } },
        },
      });

      // Update sale items returnedQty + return stock
      for (const item of normalizedItems) {
        await tx.saleItem.update({
          where: { id: item.saleItemId },
          data: { returnedQty: { increment: item.quantity } },
        });

        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            balanceAfter: product.stock,
            reference: returnNumber,
            note: 'Sale return',
          },
        });
      }

      // Update sale refundedAmount + status
      const totalRefunded = sale.refundedAmount + refundAmount;
      const allItems = await tx.saleItem.findMany({
        where: { saleId: sale.id },
      });
      const fullyReturned = allItems.every((i) => i.returnedQty >= i.quantity);

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          refundedAmount: totalRefunded,
          status: fullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED',
        },
      });

      // Customer ledger if customer exists
      if (sale.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: sale.customerId },
        });
        if (customer) {
          if (sale.creditAmount > 0 && customer.balance > 0) {
            const reduceCredit = Math.min(refundAmount, customer.balance);
            const newBalance = customer.balance - reduceCredit;

            await tx.customer.update({
              where: { id: customer.id },
              data: { balance: newBalance },
            });

            await tx.customerLedger.create({
              data: {
                tenantId: user.tenantId,
                customerId: customer.id,
                createdById: user.id,
                type: 'REFUND',
                amount: -reduceCredit,
                balanceAfter: newBalance,
                reference: returnNumber,
                note: 'Refund applied to credit',
              },
            });
          }
        }
      }

      // Cash transaction if cash refund + register open
      if (dto.refundMethod === 'CASH' && sale.cashRegisterId) {
        const register = await tx.cashRegister.findFirst({
          where: { id: sale.cashRegisterId, status: 'OPEN' },
        });
        if (register) {
          await tx.cashRegister.update({
            where: { id: register.id },
            data: {
              expectedBalance: { decrement: refundAmount },
              totalCashOut: { increment: refundAmount },
            },
          });
          await tx.cashTransaction.create({
            data: {
              tenantId: user.tenantId,
              cashRegisterId: register.id,
              createdById: user.id,
              type: 'REFUND',
              amount: refundAmount,
              reason: `Refund for ${sale.saleNumber}`,
              reference: returnNumber,
            },
          });
        }
      }

      return created;
    });

    await this.notifications.create({
      tenantId: user.tenantId,
      type: 'RETURN_PROCESSED',
      title: 'Return Processed',
      message: `${returnNumber}: Rs ${refundAmount.toFixed(0)} refunded`,
      link: '/returns',
    });

    return result;
  }

  list(user: AuthenticatedUser) {
    return this.prisma.saleReturn.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { returnedAt: 'desc' },
      take: 50,
      include: {
        sale: {
          include: { customer: true },
        },
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const ret = await this.prisma.saleReturn.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        sale: { include: { customer: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }
}
