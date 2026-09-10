import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateRepairTicketDto } from './dto/create-repair-ticket.dto';
import { UpdateRepairTicketDto } from './dto/update-repair-ticket.dto';
import { DiagnoseDto } from './dto/diagnose.dto';
import { AddPartDto } from './dto/add-part.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { DeliverRepairDto } from './dto/deliver-repair.dto';
import { QueryRepairsDto } from './dto/query-repairs.dto';
import { Prisma, RepairStatus } from '@prisma/client';

@Injectable()
export class RepairsService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // HELPER — Calculate totals
  // ════════════════════════════════════════════════════════

  private recalcTotals(parts: { quantity: number; unitPrice: number }[], laborCost: number, discount: number) {
    const partsCost = parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unitPrice), 0);
    const totalCost = Math.max(partsCost + laborCost - discount, 0);
    return { partsCost, totalCost };
  }

  // ════════════════════════════════════════════════════════
  // CREATE TICKET
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateRepairTicketDto) {
    const shopId = dto.shopId ?? user.shopId ?? null;

    // Generate ticket number
    const year = new Date().getFullYear();
    const prefix = `RT-${year}-`;
    const last = await this.prisma.repairTicket.findFirst({
      where: { tenantId: user.tenantId, ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    let nextNum = 1;
    if (last?.ticketNumber) {
      const parts = last.ticketNumber.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) nextNum = n + 1;
    }
    const ticketNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const advance = dto.advancePaid ?? 0;
    const estimated = dto.estimatedCost ?? 0;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.repairTicket.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          ticketNumber,
          imei1: dto.imei1,
          imei2: dto.imei2,
          serialNumber: dto.serialNumber,
          deviceBrand: dto.deviceBrand,
          deviceModel: dto.deviceModel,
          deviceColor: dto.deviceColor,
          passcode: dto.passcode,
          hasSimCard: dto.hasSimCard ?? false,
          hasMemoryCard: dto.hasMemoryCard ?? false,
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerCnic: dto.customerCnic,
          customerAddress: dto.customerAddress,
          reportedIssue: dto.reportedIssue,
          priority: dto.priority ?? 'NORMAL',
          status: 'RECEIVED',
          estimatedCost: estimated,
          advancePaid: advance,
          paidAmount: advance,
          balanceDue: Math.max(estimated - advance, 0),
          paymentStatus: advance > 0 ? 'ADVANCE_PAID' : 'PENDING',
          estimatedReadyAt: dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : null,
          technicianId: dto.technicianId,
          technicianName: dto.technicianName,
          beforePhotos: dto.beforePhotos ?? [],
          notes: dto.notes,
          warrantyDays: dto.warrantyDays ?? 7,
          createdById: user.id,
        },
      });

      // Log initial status
      await tx.repairStatusLog.create({
        data: {
          ticketId: ticket.id,
          toStatus: 'RECEIVED',
          note: 'Ticket created',
          changedById: user.id,
        },
      });

      // Record advance payment if provided
      if (advance > 0) {
        await tx.repairPayment.create({
          data: {
            ticketId: ticket.id,
            amount: advance,
            paymentMethod: 'CASH',
            notes: 'Advance at ticket creation',
            createdById: user.id,
          },
        });
      }

      return ticket;
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL + STATS
  // ════════════════════════════════════════════════════════

  async findAll(user: AuthenticatedUser, query: QueryRepairsDto) {
    const where: Prisma.RepairTicketWhereInput = {
      tenantId: user.tenantId,
      ...(query.shopId && { shopId: query.shopId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.technicianId && { technicianId: query.technicianId }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.search && {
        OR: [
          { ticketNumber: { contains: query.search, mode: 'insensitive' as const } },
          { imei1: { contains: query.search } },
          { customerName: { contains: query.search, mode: 'insensitive' as const } },
          { customerPhone: { contains: query.search } },
          { deviceBrand: { contains: query.search, mode: 'insensitive' as const } },
          { deviceModel: { contains: query.search, mode: 'insensitive' as const } },
          { reportedIssue: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.repairTicket.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true } },
          _count: { select: { parts: true, payments: true } },
        },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.repairTicket.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const ticket = await this.prisma.repairTicket.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, cnic: true, address: true } },
        shop: { select: { id: true, name: true } },
        parts: {
          include: { product: { select: { id: true, name: true, unit: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusLog: { orderBy: { changedAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Repair ticket not found');
    return ticket;
  }

  async stats(user: AuthenticatedUser) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [byStatus, byPriority, todayCount, monthRevenue, totalRevenue, openTickets] =
      await Promise.all([
        this.prisma.repairTicket.groupBy({
          by: ['status'],
          where: { tenantId: user.tenantId },
          _count: { _all: true },
        }),
        this.prisma.repairTicket.groupBy({
          by: ['priority'],
          where: {
            tenantId: user.tenantId,
            status: { notIn: ['DELIVERED', 'CANCELLED'] },
          },
          _count: { _all: true },
        }),
        this.prisma.repairTicket.count({
          where: { tenantId: user.tenantId, receivedAt: { gte: todayStart } },
        }),
        this.prisma.repairTicket.aggregate({
          where: {
            tenantId: user.tenantId,
            status: 'DELIVERED',
            deliveredAt: { gte: monthStart },
          },
          _sum: { totalCost: true, paidAmount: true },
        }),
        this.prisma.repairTicket.aggregate({
          where: { tenantId: user.tenantId, status: 'DELIVERED' },
          _sum: { totalCost: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.repairTicket.count({
          where: {
            tenantId: user.tenantId,
            status: { notIn: ['DELIVERED', 'CANCELLED'] },
          },
        }),
      ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
      todayCount,
      monthRevenue: monthRevenue._sum.paidAmount ?? 0,
      totalRevenue: totalRevenue._sum.paidAmount ?? 0,
      totalDelivered: totalRevenue._count._all,
      openTickets,
    };
  }

  // ════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════

  async update(user: AuthenticatedUser, id: string, dto: UpdateRepairTicketDto) {
    await this.findOne(user, id);
    return this.prisma.repairTicket.update({
      where: { id },
      data: {
        ...dto,
        estimatedReadyAt: dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : undefined,
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // DIAGNOSE
  // ════════════════════════════════════════════════════════

  async diagnose(user: AuthenticatedUser, id: string, dto: DiagnoseDto) {
    const ticket = await this.findOne(user, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.repairTicket.update({
        where: { id },
        data: {
          diagnosedIssue: dto.diagnosedIssue,
          diagnosisNotes: dto.diagnosisNotes,
          recommendedActions: dto.recommendedActions,
          estimatedCost: dto.estimatedCost,
          partsCost: dto.partsCost ?? 0,
          laborCost: dto.laborCost ?? 0,
          totalCost: dto.estimatedCost,
          balanceDue: Math.max(dto.estimatedCost - ticket.paidAmount, 0),
          status: RepairStatus.DIAGNOSED,
          diagnosedAt: new Date(),
        },
      });

      await tx.repairStatusLog.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: RepairStatus.DIAGNOSED,
          note: `Diagnosed: ${dto.diagnosedIssue}. Estimate: ${dto.estimatedCost}`,
          changedById: user.id,
        },
      });

      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // PARTS
  // ════════════════════════════════════════════════════════

  async addPart(user: AuthenticatedUser, ticketId: string, dto: AddPartDto) {
    const ticket = await this.findOne(user, ticketId);
    const total = dto.quantity * dto.unitPrice;

    return this.prisma.$transaction(async (tx) => {
      // If product linked + source is OWN_STOCK, decrement inventory
      if (dto.productId && dto.source === 'OWN_STOCK') {
        const product = await tx.product.findFirst({
          where: { id: dto.productId, tenantId: user.tenantId },
        });
        if (!product) {
          throw new NotFoundException('Linked part product not found');
        }
        if (product.stock < dto.quantity) {
          throw new BadRequestException(
            `${product.name}: insufficient stock (available ${product.stock})`,
          );
        }
        const updated = await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: dto.quantity } },
        });

        // Us shop ka stock bhi kam karo — warna POS galat ginti dikhata hai
        if (ticket.shopId) {
          const shopStock = await tx.shopStock.findFirst({
            where: { shopId: ticket.shopId, productId: product.id, variantId: null },
          });
          if (shopStock) {
            await tx.shopStock.update({
              where: { id: shopStock.id },
              data: { stock: Math.max(Number(shopStock.stock) - dto.quantity, 0) },
            });
          }
        }

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: product.id,
            type: 'SALE_OUT',
            quantity: -dto.quantity,
            balanceAfter: updated.stock,
            reference: ticket.ticketNumber,
            note: `Used in repair ${ticket.ticketNumber}`,
          },
        });
      }

      const part = await tx.repairPart.create({
        data: {
          ticketId,
          productId: dto.productId,
          partName: dto.partName,
          partNumber: dto.partNumber,
          quantity: dto.quantity,
          unitCost: dto.unitCost ?? 0,
          unitPrice: dto.unitPrice,
          totalPrice: total,
          source: dto.source ?? 'OWN_STOCK',
          notes: dto.notes,
        },
      });

      // Recalc ticket totals
      const allParts = await tx.repairPart.findMany({ where: { ticketId } });
      const { partsCost, totalCost } = this.recalcTotals(
        allParts.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })),
        Number(ticket.laborCost),
        Number(ticket.discount),
      );
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          partsCost,
          totalCost,
          balanceDue: Math.max(totalCost - Number(ticket.paidAmount), 0),
        },
      });

      return part;
    });
  }

  async removePart(user: AuthenticatedUser, ticketId: string, partId: string) {
    const ticket = await this.findOne(user, ticketId);
    const part = await this.prisma.repairPart.findFirst({
      where: { id: partId, ticketId },
    });
    if (!part) throw new NotFoundException('Part not found');

    return this.prisma.$transaction(async (tx) => {
      // If from own stock, restore inventory
      if (part.productId && part.source === 'OWN_STOCK') {
        const updated = await tx.product.update({
          where: { id: part.productId },
          data: { stock: { increment: Number(part.quantity) } },
        });

        // Shop ka stock bhi wapas barhao
        if (ticket.shopId) {
          const shopStock = await tx.shopStock.findFirst({
            where: { shopId: ticket.shopId, productId: part.productId, variantId: null },
          });
          if (shopStock) {
            await tx.shopStock.update({
              where: { id: shopStock.id },
              data: { stock: Number(shopStock.stock) + Number(part.quantity) },
            });
          }
        }

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: part.productId,
            type: 'RETURN_IN',
            quantity: Number(part.quantity),
            balanceAfter: updated.stock,
            reference: ticket.ticketNumber,
            note: `Part removed from repair ${ticket.ticketNumber}`,
          },
        });
      }

      await tx.repairPart.delete({ where: { id: partId } });

      // Recalc
      const allParts = await tx.repairPart.findMany({ where: { ticketId } });
      const { partsCost, totalCost } = this.recalcTotals(
        allParts.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })),
        Number(ticket.laborCost),
        Number(ticket.discount),
      );
      return tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          partsCost,
          totalCost,
          balanceDue: Math.max(totalCost - Number(ticket.paidAmount), 0),
        },
      });
    });
  }

  // ════════════════════════════════════════════════════════
  // STATUS WORKFLOW
  // ════════════════════════════════════════════════════════


  // ════════════════════════════════════════════════════════
  // DELIVERY → SALE
  // Repair ki kamai apne aap Sale ban jati hai, taake wo
  // dashboard, roz ke profit, cash register aur khata —
  // sab me wese hi aaye jese phone ki sale aati hai.
  // ════════════════════════════════════════════════════════

  private async createSaleForDeliveredTicket(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    ticketId: string,
  ) {
    const ticket = await tx.repairTicket.findUnique({
      where: { id: ticketId },
      include: { parts: true, shop: { select: { id: true, name: true } } },
    });

    // Ek ticket ki ek hi sale — dobara deliver hone par duplicate na bane.
    if (!ticket || ticket.saleId) return null;

    const grossTotal = Number(ticket.partsCost) + Number(ticket.laborCost);
    const discount = Number(ticket.discount) || 0;
    const netTotal = Number(ticket.totalCost) || 0;

    // Bina paise wale ticket (warranty claim, goodwill) ki sale nahi banti.
    if (netTotal <= 0) return null;

    // Asli lagat = parts ka cost (jo customer se liya wo unitPrice hai, cost nahi)
    const costOfGoods = ticket.parts.reduce(
      (sum, part) => sum + Number(part.quantity) * Number(part.unitCost),
      0,
    );

    const paidAmount = Math.min(Number(ticket.paidAmount) || 0, netTotal);
    const creditAmount = Math.max(netTotal - paidAmount, 0);

    // Udhaar sirf tab jab customer account se juda ho
    if (creditAmount > 0 && !ticket.customerId) {
      throw new BadRequestException(
        `${ticket.ticketNumber}: Rs ${creditAmount} baqi hai. Pehle poora payment lein ya ticket ko customer account se jorein.`,
      );
    }

    const cashRegister = await tx.cashRegister.findFirst({
      where: { tenantId: user.tenantId, shopId: ticket.shopId, status: 'OPEN' },
    });

    const label = `Repair ${ticket.ticketNumber} — ${ticket.deviceBrand} ${ticket.deviceModel}`;
    const workDone = ticket.diagnosedIssue || ticket.reportedIssue || 'Repair service';

    const sale = await tx.sale.create({
      data: {
        tenantId: user.tenantId,
        shopId: ticket.shopId,
        cashRegisterId: cashRegister?.id,
        customerId: ticket.customerId,
        createdById: user.id,
        // ticketNumber tenant ke andar unique hai, is liye saleNumber bhi unique rahega
        saleNumber: `RPR-${ticket.ticketNumber}`,
        subtotal: grossTotal,
        discount,
        total: netTotal,
        costOfGoods,
        paidAmount,
        changeAmount: 0,
        creditAmount,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        soldAt: new Date(),
        serviceCharges: 0,
        serviceChargesBreakdown: [
          { label, amount: Number(ticket.laborCost) || 0, kind: 'REPAIR_LABOR' },
        ] as unknown as Prisma.InputJsonValue,
        items: {
          create: [
            {
              // Repair ek service hai — koi product row nahi hoti.
              // Line ka total discount se PEHLE ka rakhte hain (subtotal ke barabar),
              // taake sale.discount har report me ek hi dafa kate.
              productId: null,
              quantity: 1,
              price: grossTotal,
              costPrice: costOfGoods,
              total: grossTotal,
              note: `${label} — ${workDone}`,
            },
          ],
        },
      },
    });

    if (creditAmount > 0 && ticket.customerId) {
      const customer = await tx.customer.findUnique({ where: { id: ticket.customerId } });
      if (customer) {
        const newBalance = Number(customer.balance) + creditAmount;
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: newBalance },
        });
        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId,
            customerId: customer.id,
            createdById: user.id,
            type: 'SALE_CREDIT',
            amount: creditAmount,
            balanceAfter: newBalance,
            reference: sale.saleNumber,
            note: `Repair udhaar: ${ticket.ticketNumber}${ticket.shop ? ` (${ticket.shop.name})` : ''}`,
          },
        });
      }
    }

    await tx.repairTicket.update({
      where: { id: ticket.id },
      data: { saleId: sale.id },
    });

    return sale;
  }


  // ════════════════════════════════════════════════════════
  // DELIVER — counter par ek hi step
  // Baqi paisa lo → ticket DELIVERED → Sale ban jaye.
  // Teeno ek transaction me, taake aadha kaam kabhi na ho.
  // ════════════════════════════════════════════════════════

  async deliver(user: AuthenticatedUser, id: string, dto: DeliverRepairDto) {
    const ticket = await this.findOne(user, id);

    if (ticket.status === 'DELIVERED') {
      throw new BadRequestException(`${ticket.ticketNumber} pehle hi deliver ho chuka hai`);
    }
    if (ticket.status !== 'READY') {
      throw new BadRequestException(
        `Sirf READY ticket deliver hota hai. ${ticket.ticketNumber} abhi ${ticket.status} hai.`,
      );
    }

    const balanceDue = Math.max(Number(ticket.totalCost) - Number(ticket.paidAmount), 0);
    const amount = Number(dto.amount) || 0;

    if (amount > balanceDue + 0.01) {
      throw new BadRequestException(
        `Baqi sirf Rs ${balanceDue} hai — Rs ${amount} nahi liya ja sakta`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (amount > 0) {
        const newPaid = Number(ticket.paidAmount) + amount;
        const newBalance = Math.max(Number(ticket.totalCost) - newPaid, 0);

        await tx.repairPayment.create({
          data: {
            ticketId: id,
            amount,
            paymentMethod: dto.paymentMethod ?? 'CASH',
            notes: dto.note ?? 'Delivery par liya gaya',
            createdById: user.id,
          },
        });
        await tx.repairTicket.update({
          where: { id },
          data: {
            paidAmount: newPaid,
            balanceDue: newBalance,
            paymentStatus: newBalance === 0 ? 'FULLY_PAID' : 'ADVANCE_PAID',
          },
        });
      }

      const now = new Date();
      await tx.repairTicket.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: now },
      });
      await tx.repairStatusLog.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: 'DELIVERED',
          note: dto.note ?? 'Counter se deliver hua',
          changedById: user.id,
        },
      });

      // Yehi wo qadam hai jo repair ki kamai ko profit tak le jata hai
      const sale = await this.createSaleForDeliveredTicket(tx, user, id);

      const updated = await tx.repairTicket.findUnique({
        where: { id },
        include: { payments: { orderBy: { paidAt: 'desc' } } },
      });

      return { ticket: updated, sale };
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateStatusDto) {
    const ticket = await this.findOne(user, id);

    const validTransitions: Record<RepairStatus, RepairStatus[]> = {
      RECEIVED: ['DIAGNOSED', 'CANCELLED', 'UNREPAIRABLE'],
      DIAGNOSED: ['AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
      AWAITING_APPROVAL: ['AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED'],
      AWAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['READY', 'UNREPAIRABLE', 'CANCELLED'],
      READY: ['DELIVERED', 'IN_PROGRESS'],
      DELIVERED: [],
      CANCELLED: [],
      UNREPAIRABLE: ['CANCELLED'],
    };

    const allowed = validTransitions[ticket.status] || [];
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${ticket.status} to ${dto.toStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const now = new Date();
    const updateData: any = { status: dto.toStatus };

    if (dto.toStatus === 'IN_PROGRESS' && !ticket.startedAt) updateData.startedAt = now;
    if (dto.toStatus === 'READY') {
      updateData.readyAt = now;
      // Calculate warranty end date
      if (ticket.warrantyDays > 0) {
        const wEnd = new Date();
        wEnd.setDate(wEnd.getDate() + ticket.warrantyDays);
        updateData.warrantyEnds = wEnd;
      }
    }
    if (dto.toStatus === 'DELIVERED') updateData.deliveredAt = now;
    if (dto.toStatus === 'AWAITING_APPROVAL' && !ticket.approvedAt) updateData.approvedAt = now;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.repairTicket.update({
        where: { id },
        data: updateData,
      });
      await tx.repairStatusLog.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: dto.toStatus,
          note: dto.note,
          changedById: user.id,
        },
      });

      // Deliver hote hi repair ki kamai Sale ban kar hisab me aa jati hai
      if (dto.toStatus === 'DELIVERED') {
        await this.createSaleForDeliveredTicket(tx, user, id);
      }

      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // PAYMENTS
  // ════════════════════════════════════════════════════════

  async addPayment(user: AuthenticatedUser, ticketId: string, dto: AddPaymentDto) {
    const ticket = await this.findOne(user, ticketId);
    const newPaid = Number(ticket.paidAmount) + dto.amount;
    const newBalance = Math.max(Number(ticket.totalCost) - newPaid, 0);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.repairPayment.create({
        data: {
          ticketId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod ?? 'CASH',
          reference: dto.reference,
          notes: dto.notes,
          createdById: user.id,
        },
      });

      await tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          paidAmount: newPaid,
          balanceDue: newBalance,
          paymentStatus: newBalance === 0 ? 'FULLY_PAID' : 'ADVANCE_PAID',
        },
      });

      return payment;
    });
  }

  // ════════════════════════════════════════════════════════
  // DELETE
  // ════════════════════════════════════════════════════════

  async remove(user: AuthenticatedUser, id: string) {
    const ticket = await this.findOne(user, id);
    if (ticket.status === 'DELIVERED') {
      throw new BadRequestException('Cannot delete delivered ticket');
    }
    await this.prisma.repairTicket.delete({ where: { id } });
    return { message: 'Repair ticket deleted', ticketNumber: ticket.ticketNumber };
  }
}
