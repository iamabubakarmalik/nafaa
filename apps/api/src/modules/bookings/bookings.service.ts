import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AddBookingPaymentDto } from './dto/add-payment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ConvertBookingDto } from './dto/convert-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── LIST + FILTERS ──────────────────────────────────────
  async findAll(
    user: AuthenticatedUser,
    query: {
      status?: string;
      shopId?: string;
      customerId?: string;
      search?: string;
    },
  ) {
    const where: any = { tenantId: user.tenantId };
    if (query.status) where.status = query.status;
    if (query.shopId) where.shopId = query.shopId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      where.OR = [
        { bookingNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: query.search } } },
      ];
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, balance: true } },
        shop: { select: { id: true, name: true } },
        items: {
          include: {
            // Manual expansion: no direct FK, so we hydrate below in getOne
          },
        },
        payments: true,
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── SUMMARY ─────────────────────────────────────────────
  async summary(user: AuthenticatedUser, shopId?: string) {
    const baseWhere: any = { tenantId: user.tenantId };
    if (shopId) baseWhere.shopId = shopId;

    const [pending, advancePaid, ready, converted, cancelled] = await Promise.all([
      this.prisma.booking.count({ where: { ...baseWhere, status: 'PENDING' } }),
      this.prisma.booking.count({ where: { ...baseWhere, status: 'ADVANCE_PAID' } }),
      this.prisma.booking.count({ where: { ...baseWhere, status: 'READY_FOR_PICKUP' } }),
      this.prisma.booking.count({ where: { ...baseWhere, status: 'CONVERTED' } }),
      this.prisma.booking.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    ]);

    const activeAgg = await this.prisma.booking.aggregate({
      where: { ...baseWhere, status: { in: ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'] } },
      _sum: { total: true, totalPaid: true, balanceDue: true },
    });

    // Expiring in next 3 days
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const expiringSoon = await this.prisma.booking.count({
      where: {
        ...baseWhere,
        status: { in: ['PENDING', 'ADVANCE_PAID'] },
        OR: [
          { expiresAt: { lte: soon, gte: new Date() } },
          { expectedPickupAt: { lte: soon, gte: new Date() } },
        ],
      },
    });

    return {
      counts: { pending, advancePaid, ready, converted, cancelled },
      totalActiveValue: activeAgg._sum.total ?? 0,
      totalAdvanceHeld: activeAgg._sum.totalPaid ?? 0,
      totalBalanceDue: activeAgg._sum.balanceDue ?? 0,
      expiringSoon,
    };
  }

  // ─── GET ONE ─────────────────────────────────────────────
  async findOne(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: true,
        shop: true,
        items: true,
        payments: { orderBy: { paidAt: 'desc' } },
        sale: { select: { id: true, saleNumber: true, total: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Hydrate item details (products, variants, IMEIs, rolls, cut pieces)
    const productIds = [...new Set(booking.items.map((i) => i.productId))];
    const variantIds = booking.items.map((i) => i.variantId).filter(Boolean) as string[];
    const imeiIds = booking.items.map((i) => i.imeiId).filter(Boolean) as string[];
    const rollIds = booking.items.map((i) => i.rollId).filter(Boolean) as string[];
    const cutPieceIds = booking.items.map((i) => i.cutPieceId).filter(Boolean) as string[];

    const [products, variants, imeis, rolls, cutPieces] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } } }),
      variantIds.length
        ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } } })
        : Promise.resolve([]),
      imeiIds.length
        ? this.prisma.productImei.findMany({ where: { id: { in: imeiIds } } })
        : Promise.resolve([]),
      rollIds.length
        ? this.prisma.carpetRoll.findMany({ where: { id: { in: rollIds } } })
        : Promise.resolve([]),
      cutPieceIds.length
        ? this.prisma.carpetCutPiece.findMany({ where: { id: { in: cutPieceIds } } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const imeiMap = new Map(imeis.map((i) => [i.id, i]));
    const rollMap = new Map(rolls.map((r) => [r.id, r]));
    const cutPieceMap = new Map(cutPieces.map((c) => [c.id, c]));

    const enrichedItems = booking.items.map((it) => ({
      ...it,
      product: productMap.get(it.productId) ?? null,
      variant: it.variantId ? variantMap.get(it.variantId) ?? null : null,
      imei: it.imeiId ? imeiMap.get(it.imeiId) ?? null : null,
      roll: it.rollId ? rollMap.get(it.rollId) ?? null : null,
      cutPiece: it.cutPieceId ? cutPieceMap.get(it.cutPieceId) ?? null : null,
    }));

    return { ...booking, items: enrichedItems };
  }

  // ─── CREATE BOOKING ──────────────────────────────────────
  async create(user: AuthenticatedUser, dto: CreateBookingDto) {
    // Validate shop, customer
    const [shop, customer] = await Promise.all([
      this.prisma.shop.findFirst({
        where: { id: dto.shopId, tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId },
      }),
    ]);
    if (!shop) throw new NotFoundException('Shop not found');
    if (!customer) throw new NotFoundException('Customer not found');

    // ─── Validate & reserve items ──────────────────────────
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: user.tenantId, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Check reservations don't conflict
    const imeiIds = dto.items.map((i) => i.imeiId).filter(Boolean) as string[];
    const rollIds = dto.items.map((i) => i.rollId).filter(Boolean) as string[];
    const cutPieceIds = dto.items.map((i) => i.cutPieceId).filter(Boolean) as string[];

    if (imeiIds.length) {
      const imeis = await this.prisma.productImei.findMany({
        where: { id: { in: imeiIds }, tenantId: user.tenantId },
      });
      for (const imei of imeis) {
        if (imei.status !== 'IN_STOCK') {
          throw new BadRequestException(`IMEI ${imei.imei1} is ${imei.status} — cannot reserve`);
        }
      }
      // Also check if already reserved in another PENDING/ADVANCE_PAID booking
      const conflicts = await this.prisma.bookingItem.findMany({
        where: {
          imeiId: { in: imeiIds },
          booking: {
            tenantId: user.tenantId,
            status: { in: ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'] },
          },
        },
      });
      if (conflicts.length > 0) {
        throw new BadRequestException('One or more IMEIs already reserved in another booking');
      }
    }

    if (cutPieceIds.length) {
      const pieces = await this.prisma.carpetCutPiece.findMany({
        where: { id: { in: cutPieceIds }, tenantId: user.tenantId },
      });
      for (const p of pieces) {
        if (p.status !== 'AVAILABLE') {
          throw new BadRequestException(`Cut piece ${p.pieceCode} is ${p.status}`);
        }
      }
      const conflicts = await this.prisma.bookingItem.findMany({
        where: {
          cutPieceId: { in: cutPieceIds },
          booking: {
            tenantId: user.tenantId,
            status: { in: ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'] },
          },
        },
      });
      if (conflicts.length > 0) {
        throw new BadRequestException('One or more cut pieces already reserved');
      }
    }

    // ─── Compute totals ────────────────────────────────────
    let subtotal = 0;
    let lineDiscountTotal = 0;
    for (const item of dto.items) {
      const gross = item.price * item.quantity;
      subtotal += gross;
      lineDiscountTotal += item.lineDiscount ?? 0;
    }

    const discount = (dto.discount ?? 0) + lineDiscountTotal;
    const serviceChargesArr = dto.serviceCharges ?? [];
    const serviceChargesTotal = serviceChargesArr.reduce(
      (s, sc) => s + Number(sc.amount || 0),
      0,
    );
    const total = Math.max(subtotal - discount + serviceChargesTotal, 0);

    const initialAdvance = dto.initialAdvance ?? 0;
    if (initialAdvance > total) {
      throw new BadRequestException('Advance cannot exceed total');
    }
    const balanceDue = Math.max(total - initialAdvance, 0);

    const bookingNumber = `BK-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          tenantId: user.tenantId,
          shopId: dto.shopId,
          customerId: dto.customerId,
          createdById: user.id,
          bookingNumber,
          status: initialAdvance > 0 ? 'ADVANCE_PAID' : 'PENDING',
          subtotal,
          discount,
          serviceCharges: serviceChargesTotal,
          serviceChargesBreakdown:
            serviceChargesArr.length > 0 ? (serviceChargesArr as any) : undefined,
          total,
          totalPaid: initialAdvance,
          balanceDue,
          expectedPickupAt: dto.expectedPickupAt ? new Date(dto.expectedPickupAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          paymentMethod: dto.paymentMethod ?? 'CASH',
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          items: {
            create: dto.items.map((it) => ({
              productId: it.productId,
              variantId: it.variantId,
              imeiId: it.imeiId,
              rollId: it.rollId,
              cutPieceId: it.cutPieceId,
              quantity: it.quantity,
              price: it.price,
              costPrice: it.costPrice ?? 0,
              lineDiscount: it.lineDiscount ?? 0,
              total: it.price * it.quantity - (it.lineDiscount ?? 0),
              useWholesale: it.useWholesale ?? false,
              cutWidthFt: it.cutWidthFt,
              cutLengthFt: it.cutLengthFt,
              cutLengthInch: it.cutLengthInch,
              cutSqft: it.cutSqft,
              note: it.note,
              internalNote: it.internalNote,
            })),
          },
        },
      });

      // Reserve IMEIs & cut pieces (mark RESERVED)
      if (imeiIds.length) {
        await tx.productImei.updateMany({
          where: { id: { in: imeiIds } },
          data: { status: 'RESERVED' },
        });
      }
      if (cutPieceIds.length) {
        await tx.carpetCutPiece.updateMany({
          where: { id: { in: cutPieceIds } },
          data: { status: 'RESERVED' },
        });
      }
      if (rollIds.length) {
        await tx.carpetRoll.updateMany({
          where: { id: { in: rollIds } },
          data: { status: 'RESERVED' },
        });
      }

      // Record initial payment if any
      if (initialAdvance > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: booking.id,
            type: 'ADVANCE',
            amount: initialAdvance,
            paymentMethod: dto.paymentMethod ?? 'CASH',
            createdById: user.id,
            notes: 'Initial advance at booking creation',
          },
        });

        // Customer ledger: advance received reduces balance
        const newBalance = (customer.balance ?? 0) - initialAdvance;
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: newBalance },
        });
        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId,
            customerId: customer.id,
            createdById: user.id,
            type: 'PAYMENT_RECEIVED',
            amount: -initialAdvance,
            balanceAfter: newBalance,
            reference: bookingNumber,
            note: `Booking advance: ${bookingNumber}`,
          },
        });
      }

      return booking;
    });
  }

  // ─── ADD ADDITIONAL PAYMENT ──────────────────────────────
  async addPayment(user: AuthenticatedUser, id: string, dto: AddBookingPaymentDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (['CANCELLED', 'CONVERTED', 'EXPIRED'].includes(booking.status)) {
      throw new BadRequestException(`Cannot add payment to ${booking.status} booking`);
    }
    if (booking.totalPaid + dto.amount > booking.total + 0.01) {
      throw new BadRequestException(
        `Payment exceeds balance. Balance due: ${booking.balanceDue.toFixed(2)}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newPaid = booking.totalPaid + dto.amount;
      const newBalance = Math.max(booking.total - newPaid, 0);
      const newStatus =
        newBalance === 0 ? 'READY_FOR_PICKUP' : 'ADVANCE_PAID';

      await tx.booking.update({
        where: { id },
        data: {
          totalPaid: newPaid,
          balanceDue: newBalance,
          status: newStatus,
        },
      });

      await tx.bookingPayment.create({
        data: {
          bookingId: id,
          type: booking.totalPaid > 0 ? 'ADDITIONAL' : 'ADVANCE',
          amount: dto.amount,
          paymentMethod: dto.paymentMethod ?? 'CASH',
          reference: dto.reference,
          notes: dto.notes,
          createdById: user.id,
        },
      });

      // Customer ledger
      const customer = await tx.customer.findUnique({ where: { id: booking.customerId } });
      if (customer) {
        const newCustBal = (customer.balance ?? 0) - dto.amount;
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: newCustBal },
        });
        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId,
            customerId: customer.id,
            createdById: user.id,
            type: 'PAYMENT_RECEIVED',
            amount: -dto.amount,
            balanceAfter: newCustBal,
            reference: booking.bookingNumber,
            note: `Booking payment: ${booking.bookingNumber}`,
          },
        });
      }

      return this.findOne(user, id);
    });
  }

  // ─── CANCEL BOOKING ──────────────────────────────────────
  async cancel(user: AuthenticatedUser, id: string, dto: CancelBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'CONVERTED') {
      throw new BadRequestException('Cannot cancel converted booking');
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Release reserved IMEIs / rolls / cut pieces
      const imeiIds = booking.items.map((i) => i.imeiId).filter(Boolean) as string[];
      const rollIds = booking.items.map((i) => i.rollId).filter(Boolean) as string[];
      const cutPieceIds = booking.items.map((i) => i.cutPieceId).filter(Boolean) as string[];

      if (imeiIds.length) {
        await tx.productImei.updateMany({
          where: { id: { in: imeiIds } },
          data: { status: 'IN_STOCK' },
        });
      }
      if (rollIds.length) {
        await tx.carpetRoll.updateMany({
          where: { id: { in: rollIds } },
          data: { status: 'ACTIVE' },
        });
      }
      if (cutPieceIds.length) {
        await tx.carpetCutPiece.updateMany({
          where: { id: { in: cutPieceIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      // Refund advance if requested
      let refundAmount = 0;
      if (dto.refundAdvance && booking.totalPaid > 0) {
        refundAmount = booking.totalPaid;

        await tx.bookingPayment.create({
          data: {
            bookingId: id,
            type: 'REFUND',
            amount: refundAmount,
            paymentMethod: dto.refundMethod ?? booking.paymentMethod,
            notes: `Refund on cancel: ${dto.reason || 'no reason'}`,
            createdById: user.id,
          },
        });

        // Customer ledger: refund adds back to balance
        const customer = await tx.customer.findUnique({ where: { id: booking.customerId } });
        if (customer) {
          const newBal = (customer.balance ?? 0) + refundAmount;
          await tx.customer.update({
            where: { id: customer.id },
            data: { balance: newBal },
          });
          await tx.customerLedger.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              createdById: user.id,
              type: 'REFUND',
              amount: refundAmount,
              balanceAfter: newBal,
              reference: booking.bookingNumber,
              note: `Refund from cancelled booking: ${booking.bookingNumber}`,
            },
          });
        }
      }

      await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: dto.reason,
          totalRefunded: refundAmount,
          balanceDue: booking.total - booking.totalPaid + refundAmount,
        },
      });

      return this.findOne(user, id);
    });
  }

  // ─── CONVERT BOOKING TO SALE ─────────────────────────────
  async convertToSale(user: AuthenticatedUser, id: string, dto: ConvertBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'CONVERTED') {
      throw new BadRequestException('Already converted');
    }
    if (['CANCELLED', 'EXPIRED'].includes(booking.status)) {
      throw new BadRequestException(`Cannot convert ${booking.status} booking`);
    }
    if (!booking.shopId) {
      throw new BadRequestException('Booking has no shop — cannot convert');
    }

    const additionalPayment = dto.additionalPayment ?? 0;
    const totalPaidNow = booking.totalPaid + additionalPayment;
    const creditAmount = Math.max(booking.total - totalPaidNow, 0);
    const paymentMethod = dto.paymentMethod ?? booking.paymentMethod;

    // Build sale items from booking items
    return this.prisma.$transaction(async (tx) => {
      const saleNumber = `NF-${Date.now().toString().slice(-8)}`;

      // ─── Release reservations on IMEIs/pieces/rolls BEFORE sale
      // (sale.service logic will re-mark them as SOLD)
      const imeiIds = booking.items.map((i) => i.imeiId).filter(Boolean) as string[];
      const rollIds = booking.items.map((i) => i.rollId).filter(Boolean) as string[];
      const cutPieceIds = booking.items.map((i) => i.cutPieceId).filter(Boolean) as string[];

      if (imeiIds.length) {
        await tx.productImei.updateMany({
          where: { id: { in: imeiIds } },
          data: { status: 'IN_STOCK' },
        });
      }
      if (rollIds.length) {
        await tx.carpetRoll.updateMany({
          where: { id: { in: rollIds } },
          data: { status: 'ACTIVE' },
        });
      }
      if (cutPieceIds.length) {
        await tx.carpetCutPiece.updateMany({
          where: { id: { in: cutPieceIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      // ─── Create Sale ───
      const sale = await tx.sale.create({
        data: {
          tenantId: user.tenantId,
          shopId: booking.shopId!,
          customerId: booking.customerId,
          createdById: user.id,
          saleNumber,
          subtotal: booking.subtotal,
          discount: booking.discount,
          serviceCharges: booking.serviceCharges,
          serviceChargesBreakdown: booking.serviceChargesBreakdown ?? undefined,
          total: booking.total,
          costOfGoods: booking.items.reduce(
            (s, it) => s + (it.costPrice ?? 0) * it.quantity,
            0,
          ),
          paidAmount: totalPaidNow,
          changeAmount: Math.max(totalPaidNow - booking.total, 0),
          creditAmount,
          paymentMethod,
          status: 'COMPLETED',
          bookingId: booking.id,
          items: {
            create: booking.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              price: it.price,
              costPrice: it.costPrice ?? 0,
              total: it.total,
              note: it.note,
              internalNote: it.internalNote,
              ...(it.variantId && {
                variantLink: { create: { variantId: it.variantId } },
              }),
            })),
          },
        },
        include: { items: true },
      });

      // Mark IMEIs SOLD
      for (const bItem of booking.items) {
        if (bItem.imeiId) {
          // Find corresponding sale item
          const saleItem = sale.items[booking.items.indexOf(bItem)];
          if (saleItem) {
            await tx.productImei.update({
              where: { id: bItem.imeiId },
              data: {
                status: 'SOLD',
                saleItemId: saleItem.id,
                soldPrice: bItem.price,
                soldAt: new Date(),
              },
            });
          }
        }
        if (bItem.cutPieceId) {
          const saleItem = sale.items[booking.items.indexOf(bItem)];
          if (saleItem) {
            await tx.carpetCutPiece.update({
              where: { id: bItem.cutPieceId },
              data: {
                status: 'SOLD',
                saleItemId: saleItem.id,
                soldAt: new Date(),
              },
            });
          }
        }
      }

      // Record additional payment if any
      if (additionalPayment > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: id,
            type: 'ADDITIONAL',
            amount: additionalPayment,
            paymentMethod,
            notes: 'Payment at conversion to sale',
            createdById: user.id,
          },
        });
      }

      // Update booking status
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          totalPaid: totalPaidNow,
          balanceDue: creditAmount,
        },
      });

      // Customer ledger: additional payment reduces balance, credit adds
      const customer = await tx.customer.findUnique({ where: { id: booking.customerId } });
      if (customer) {
        let newBal = customer.balance ?? 0;
        if (additionalPayment > 0) {
          newBal -= additionalPayment;
          await tx.customerLedger.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              createdById: user.id,
              type: 'PAYMENT_RECEIVED',
              amount: -additionalPayment,
              balanceAfter: newBal,
              reference: saleNumber,
              note: `Payment at booking conversion: ${booking.bookingNumber} → ${saleNumber}`,
            },
          });
        }
        if (creditAmount > 0) {
          newBal += creditAmount;
          await tx.customerLedger.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              createdById: user.id,
              type: 'SALE_CREDIT',
              amount: creditAmount,
              balanceAfter: newBal,
              reference: saleNumber,
              note: `Udhaar from booking conversion: ${saleNumber}`,
            },
          });
        }
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: newBal, totalSpent: { increment: booking.total } },
        });
      }

      return { booking: await this.findOne(user, id), sale };
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'CANCELLED' && booking.status !== 'EXPIRED') {
      throw new BadRequestException('Only cancelled/expired bookings can be deleted');
    }
    await this.prisma.booking.delete({ where: { id } });
    return { success: true };
  }
}
