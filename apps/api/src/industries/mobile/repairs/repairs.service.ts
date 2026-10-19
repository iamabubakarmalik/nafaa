import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma, RepairStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta, isServiceProduct } from '../../../common/shop-scope';
import { addDaysTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { CreateRepairTicketDto } from './dto/create-repair-ticket.dto';
import { UpdateRepairTicketDto } from './dto/update-repair-ticket.dto';
import { DiagnoseDto } from './dto/diagnose.dto';
import { AddPartDto } from './dto/add-part.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { DeliverRepairDto } from './dto/deliver-repair.dto';
import { QueryRepairsDto } from './dto/query-repairs.dto';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { assertOwnCustomer, assertOwnShop } from '../common/mobile-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Tickets that are finished one way or another. */
const CLOSED: RepairStatus[] = ['DELIVERED', 'CANCELLED'];
/** Tickets still in the shop (being worked on or waiting). */
const OPEN: RepairStatus[] = ['RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'READY', 'UNREPAIRABLE'];

const TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED', 'UNREPAIRABLE'],
  DIAGNOSED: ['AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_APPROVAL: ['AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'AWAITING_PARTS', 'UNREPAIRABLE', 'CANCELLED'],
  READY: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
  UNREPAIRABLE: ['DELIVERED', 'CANCELLED'],
};

/** The bill's payment method: the one that brought in the most money. */
function mainMethod(payments: Array<{ amount: unknown; paymentMethod: string | null }>): PaymentMethod {
  const valid: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];
  const by = new Map<string, number>();
  for (const p of payments) {
    const m = p.paymentMethod === 'BANK' ? 'BANK_TRANSFER' : String(p.paymentMethod || 'CASH');
    by.set(m, (by.get(m) ?? 0) + Number(p.amount || 0));
  }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return valid.includes(top as PaymentMethod) ? (top as PaymentMethod) : 'CASH';
}

@Injectable()
export class RepairsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Money taken before delivery is cash in hand today: it goes on the
   * customer's khata as an advance and is used up by the repair bill.
   */
  private async takeAdvance(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    ticket: { id: string; ticketNumber: string; shopId: string | null; customerId: string | null; customerName: string; customerPhone: string },
    amount: number,
    method?: string | null,
  ) {
    const shopId = await resolveIndustryShopId(tx, user, ticket.shopId);
    const customerId = await ensureCustomer(tx, user, {
      customerId: ticket.customerId, name: ticket.customerName, phone: ticket.customerPhone, shopId,
    });
    await recordKhataPayment(tx, user, {
      customerId, shopId, amount, reference: ticket.ticketNumber, note: `Repair advance ${ticket.ticketNumber}`, method,
    });
    if (customerId !== ticket.customerId || shopId !== ticket.shopId) {
      await tx.repairTicket.update({ where: { id: ticket.id }, data: { customerId, shopId } });
    }
    return customerId;
  }

  private recalcTotals(parts: { quantity: number; unitPrice: number }[], laborCost: number, discount: number) {
    const partsCost = r2(parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unitPrice), 0));
    const totalCost = r2(Math.max(partsCost + laborCost - discount, 0));
    return { partsCost, totalCost };
  }

  /** A billed, delivered or cancelled ticket no longer changes its work or money. */
  private assertOpen(ticket: { ticketNumber: string; status: RepairStatus; saleId: string | null }) {
    if (ticket.saleId || CLOSED.includes(ticket.status)) {
      throw new BadRequestException(`${ticket.ticketNumber} band ho chuka hai (${ticket.status}) — ab ye badla nahi ja sakta`);
    }
  }

  /** Branch whose shelf gives and takes this ticket's parts. */
  private partsShop(tx: Prisma.TransactionClient, user: AuthenticatedUser, ticket: { shopId: string | null }) {
    return resolveIndustryShopId(tx, user, ticket.shopId);
  }

  // ════════════════════════════════════════════════════════
  // CREATE TICKET (job card at the counter)
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateRepairTicketDto) {
    await assertOwnShop(this.prisma, user, dto.shopId);
    await assertOwnCustomer(this.prisma, user, dto.customerId);
    if (dto.estimatedReadyAt && new Date(dto.estimatedReadyAt).getTime() < startOfDayTz(new Date()).getTime()) {
      throw new BadRequestException('Tayyar hone ki tareekh guzri hui nahi ho sakti');
    }
    const advance = r2(dto.advancePaid ?? 0);
    const estimated = r2(dto.estimatedCost ?? 0);
    if (estimated > 0 && advance > estimated + 0.01) {
      throw new BadRequestException(`Advance (Rs ${advance}) andaze (Rs ${estimated}) se zyada nahi ho sakta`);
    }
    const shopId = dto.shopId ?? user.shopId ?? null;

    // A customer already on the list is linked by phone number.
    let customerId = dto.customerId ?? null;
    const phone = dto.customerPhone.trim();
    if (!customerId && phone) {
      customerId = (await this.prisma.customer.findFirst({
        where: { tenantId: user.tenantId, phone, isActive: true },
        select: { id: true },
      }))?.id ?? null;
    }

    let warrantyNote: string | null = null;
    let warrantyOfId: string | null = null;
    if (dto.warrantyOf) {
      const prior = await this.prisma.repairTicket.findFirst({
        where: { tenantId: user.tenantId, ticketNumber: dto.warrantyOf.trim() },
        select: { id: true, ticketNumber: true, status: true, warrantyEnds: true },
      });
      if (!prior) throw new BadRequestException(`Purana ticket ${dto.warrantyOf} nahi mila`);
      if (prior.status !== 'DELIVERED' || !prior.warrantyEnds || prior.warrantyEnds < new Date()) {
        throw new BadRequestException(`${prior.ticketNumber} ki repair warranty khatam ho chuki hai`);
      }
      warrantyNote = `Warranty claim: ${prior.ticketNumber}`;
      warrantyOfId = prior.id;
    }

    const year = new Date().getFullYear();
    const prefix = `RT-${year}-`;
    const last = await this.prisma.repairTicket.findFirst({
      where: { tenantId: user.tenantId, ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    let nextNum = 1;
    if (last?.ticketNumber) {
      const n = parseInt(last.ticketNumber.split('-').pop() ?? '', 10);
      if (!isNaN(n)) nextNum = n + 1;
    }
    const ticketNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.repairTicket.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          ticketNumber,
          imei1: dto.imei1,
          imei2: dto.imei2,
          serialNumber: dto.serialNumber,
          deviceBrand: dto.deviceBrand.trim(),
          deviceModel: dto.deviceModel.trim(),
          deviceColor: dto.deviceColor,
          passcode: dto.passcode,
          hasSimCard: dto.hasSimCard ?? false,
          hasMemoryCard: dto.hasMemoryCard ?? false,
          customerId,
          customerName: dto.customerName.trim(),
          customerPhone: phone,
          customerCnic: dto.customerCnic,
          customerAddress: dto.customerAddress,
          reportedIssue: dto.reportedIssue.trim(),
          priority: dto.priority ?? 'NORMAL',
          status: 'RECEIVED',
          estimatedCost: estimated,
          advancePaid: advance,
          paidAmount: advance,
          balanceDue: Math.max(estimated - advance, 0),
          paymentStatus: advance > 0 ? 'ADVANCE_PAID' : 'PENDING',
          estimatedReadyAt: dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : null,
          technicianId: dto.technicianId,
          technicianName: dto.technicianName?.trim() || undefined,
          beforePhotos: dto.beforePhotos ?? [],
          notes: [warrantyNote, dto.notes?.trim()].filter(Boolean).join('\n') || null,
          warrantyDays: dto.warrantyDays ?? 7,
          warrantyOfId,
          createdById: user.id,
        },
      });

      await tx.repairStatusLog.create({
        data: { ticketId: ticket.id, toStatus: 'RECEIVED', note: warrantyNote ?? 'Ticket bana', changedById: user.id },
      });

      if (advance > 0) {
        await tx.repairPayment.create({
          data: {
            ticketId: ticket.id,
            amount: advance,
            paymentMethod: dto.advanceMethod ?? 'CASH',
            notes: 'Ticket banate waqt advance',
            createdById: user.id,
          },
        });
        const linked = await this.takeAdvance(tx, user, ticket, advance, dto.advanceMethod);
        return { ...ticket, customerId: linked };
      }
      return ticket;
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL + STATS
  // ════════════════════════════════════════════════════════

  private listWhere(user: AuthenticatedUser, query: QueryRepairsDto, withView = true): Prisma.RepairTicketWhereInput {
    const q = query.search?.trim();
    const and: Prisma.RepairTicketWhereInput[] = [];
    if (q) {
      and.push({
        OR: [
          { ticketNumber: { contains: q, mode: 'insensitive' as const } },
          { imei1: { contains: q } },
          { imei2: { contains: q } },
          { customerName: { contains: q, mode: 'insensitive' as const } },
          { customerPhone: { contains: q } },
          { deviceBrand: { contains: q, mode: 'insensitive' as const } },
          { deviceModel: { contains: q, mode: 'insensitive' as const } },
          { reportedIssue: { contains: q, mode: 'insensitive' as const } },
          { technicianName: { contains: q, mode: 'insensitive' as const } },
        ],
      });
    }
    const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (ok(query.from) || ok(query.to)) {
      const r: Prisma.DateTimeFilter = {};
      if (ok(query.from)) r.gte = startOfDayTz(new Date(`${query.from}T12:00:00Z`));
      if (ok(query.to)) r.lt = startOfDayTz(new Date(new Date(`${query.to}T12:00:00Z`).getTime() + 86_400_000));
      and.push(query.view === 'closed' ? { OR: [{ deliveredAt: r }, { AND: [{ deliveredAt: null }, { updatedAt: r }] }] } : { receivedAt: r });
    }
    if (withView && query.view) {
      const now = new Date();
      if (query.view === 'open') and.push({ status: { in: OPEN } });
      if (query.view === 'ready') and.push({ status: 'READY' });
      if (query.view === 'handover') and.push({ status: { in: ['READY', 'UNREPAIRABLE'] }, saleId: null });
      if (query.view === 'working') and.push({ status: { in: ['RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS'] } });
      if (query.view === 'late') and.push({ status: { in: OPEN.filter((s) => s !== 'READY') }, estimatedReadyAt: { lt: now } });
      if (query.view === 'unpaid') and.push({ status: { in: OPEN }, balanceDue: { gt: 0 } });
      if (query.view === 'closed') and.push({ status: { in: CLOSED } });
      if (query.view === 'warranty') and.push({ status: 'DELIVERED', warrantyEnds: { gte: now } });
    }
    return {
      tenantId: user.tenantId,
      ...(query.shopId && { shopId: query.shopId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.technicianId && { technicianId: query.technicianId }),
      ...(query.technician && { technicianName: { equals: query.technician, mode: 'insensitive' as const } }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(and.length && { AND: and }),
    };
  }

  async findAll(user: AuthenticatedUser, query: QueryRepairsDto) {
    const where = this.listWhere(user, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const orderBy: Prisma.RepairTicketOrderByWithRelationInput[] =
      query.sort === 'due' ? [{ estimatedReadyAt: { sort: 'asc', nulls: 'last' } }, { receivedAt: 'asc' }]
        : query.sort === 'old' ? [{ receivedAt: 'asc' }]
          : query.sort === 'amount' ? [{ totalCost: 'desc' }]
            : [{ receivedAt: 'desc' }];

    const [items, total, byStatus, sums] = await Promise.all([
      this.prisma.repairTicket.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true } },
          sale: { select: { id: true, saleNumber: true } },
          _count: { select: { parts: true, payments: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.repairTicket.count({ where }),
      this.prisma.repairTicket.groupBy({ by: ['status'], where: this.listWhere(user, { ...query, status: undefined }, false), _count: { _all: true } }),
      this.prisma.repairTicket.aggregate({ where, _sum: { totalCost: true, estimatedCost: true, paidAmount: true, balanceDue: true } }),
    ]);

    const now = Date.now();
    return {
      items: items.map((t) => ({
        ...t,
        isLate: !!t.estimatedReadyAt && OPEN.includes(t.status) && t.status !== 'READY' && t.estimatedReadyAt.getTime() < now,
        daysInShop: Math.max(0, Math.floor(((t.deliveredAt?.getTime() ?? now) - t.receivedAt.getTime()) / 86_400_000)),
        warrantyActive: t.status === 'DELIVERED' && !!t.warrantyEnds && t.warrantyEnds.getTime() >= now,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<RepairStatus, number>>,
      totals: {
        bill: Number(sums._sum.totalCost ?? 0),
        estimate: Number(sums._sum.estimatedCost ?? 0),
        paid: Number(sums._sum.paidAmount ?? 0),
        due: Number(sums._sum.balanceDue ?? 0),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const ticket = await this.prisma.repairTicket.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, cnic: true, address: true, balance: true } },
        shop: { select: { id: true, name: true } },
        sale: { select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true } },
        parts: {
          include: { product: { select: { id: true, name: true, unit: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusLog: { orderBy: { changedAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        warrantyOf: { select: { id: true, ticketNumber: true, status: true, deliveredAt: true, warrantyEnds: true, reportedIssue: true, diagnosedIssue: true } },
        warrantyRepairs: { select: { id: true, ticketNumber: true, status: true, receivedAt: true, reportedIssue: true }, orderBy: { receivedAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Repair ticket nahi mila');
    return ticket;
  }

  /** Technician names used on tickets, with how many open jobs each has. */
  async technicians(user: AuthenticatedUser) {
    const rows = await this.prisma.repairTicket.groupBy({
      by: ['technicianName'],
      where: { tenantId: user.tenantId, technicianName: { not: null } },
      _count: { _all: true },
    });
    const open = await this.prisma.repairTicket.groupBy({
      by: ['technicianName'],
      where: { tenantId: user.tenantId, technicianName: { not: null }, status: { in: OPEN } },
      _count: { _all: true },
    });
    const openBy = new Map(open.map((o) => [o.technicianName, o._count._all]));
    return rows
      .filter((r) => r.technicianName?.trim())
      .map((r) => ({ name: r.technicianName!, total: r._count._all, open: openBy.get(r.technicianName) ?? 0 }))
      .sort((a, b) => b.total - a.total);
  }

  async stats(user: AuthenticatedUser, shopId?: string) {
    const now = new Date();
    const todayStart = startOfDayTz(now);
    const monthStart = startOfMonthTz(now);
    const base: Prisma.RepairTicketWhereInput = { tenantId: user.tenantId, ...(shopId && { shopId }) };

    const [byStatus, byPriority, todayCount, monthRevenue, totalRevenue, openTickets, late, readyDue, deliveredToday] =
      await Promise.all([
        this.prisma.repairTicket.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
        this.prisma.repairTicket.groupBy({ by: ['priority'], where: { ...base, status: { in: OPEN } }, _count: { _all: true } }),
        this.prisma.repairTicket.count({ where: { ...base, receivedAt: { gte: todayStart } } }),
        this.prisma.repairTicket.aggregate({
          where: { ...base, status: 'DELIVERED', deliveredAt: { gte: monthStart } },
          _sum: { totalCost: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.repairTicket.aggregate({
          where: { ...base, status: 'DELIVERED' },
          _sum: { totalCost: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.repairTicket.count({ where: { ...base, status: { in: OPEN } } }),
        this.prisma.repairTicket.count({ where: { ...base, status: { in: OPEN.filter((s) => s !== 'READY') }, estimatedReadyAt: { lt: now } } }),
        this.prisma.repairTicket.aggregate({ where: { ...base, status: 'READY' }, _sum: { balanceDue: true } }),
        this.prisma.repairTicket.count({ where: { ...base, status: 'DELIVERED', deliveredAt: { gte: todayStart } } }),
      ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
      todayCount,
      // Billed value of tickets delivered this month (what reached the books).
      monthRevenue: Number(monthRevenue._sum.totalCost ?? 0),
      monthDelivered: monthRevenue._count._all,
      totalRevenue: Number(totalRevenue._sum.totalCost ?? 0),
      totalDelivered: totalRevenue._count._all,
      openTickets,
      late,
      readyDue: Number(readyDue._sum.balanceDue ?? 0),
      deliveredToday,
    };
  }

  // ════════════════════════════════════════════════════════
  // UPDATE — job card details; money changes go through payments
  // ════════════════════════════════════════════════════════

  async update(user: AuthenticatedUser, id: string, dto: UpdateRepairTicketDto) {
    const ticket = await this.findOne(user, id);
    const closed = !!ticket.saleId || CLOSED.includes(ticket.status);
    if (dto.advancePaid !== undefined && Number(dto.advancePaid) !== Number(ticket.advancePaid)) {
      throw new BadRequestException('Advance yahan se nahi badalta — "Payment lein" istemal karein');
    }
    if (dto.shopId !== undefined && dto.shopId !== ticket.shopId) {
      throw new BadRequestException('Ticket ki shop nahi badalti');
    }
    if (dto.customerId !== undefined && dto.customerId !== ticket.customerId) {
      if ((await paidOnKhata(this.prisma, user.tenantId, ticket.ticketNumber)) > 0) {
        throw new BadRequestException('Is ticket ka advance purane customer ke khata me hai — customer nahi badla ja sakta');
      }
      await assertOwnCustomer(this.prisma, user, dto.customerId);
    }
    const moneyFields = ['estimatedCost', 'laborCost', 'discount', 'warrantyDays'] as const;
    if (closed && moneyFields.some((k) => dto[k] !== undefined && Number(dto[k]) !== Number(ticket[k]))) {
      throw new BadRequestException(`${ticket.ticketNumber} ka bill ban chuka ya band ho chuka — amount ab nahi badalti`);
    }

    const data: Prisma.RepairTicketUncheckedUpdateInput = {};
    const copy = [
      'imei1', 'imei2', 'serialNumber', 'deviceBrand', 'deviceModel', 'deviceColor', 'passcode', 'hasSimCard', 'hasMemoryCard',
      'customerId', 'customerName', 'customerPhone', 'customerCnic', 'customerAddress', 'reportedIssue', 'priority',
      'estimatedCost', 'technicianId', 'technicianName', 'beforePhotos', 'afterPhotos', 'notes', 'warrantyDays',
    ] as const;
    for (const k of copy) if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = dto[k];
    if (dto.estimatedReadyAt !== undefined) data.estimatedReadyAt = dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : null;

    // Labour or discount changes the bill; parts already on the ticket stay.
    if (dto.laborCost !== undefined || dto.discount !== undefined) {
      const labour = r2(dto.laborCost ?? ticket.laborCost);
      const discount = r2(dto.discount ?? ticket.discount);
      const totals = this.recalcTotals(ticket.parts.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })), labour, discount);
      if (discount > totals.partsCost + labour + 0.01) throw new BadRequestException('Discount bill se zyada nahi ho sakta');
      data.laborCost = labour;
      data.discount = discount;
      data.partsCost = totals.partsCost;
      data.totalCost = totals.totalCost;
      data.balanceDue = Math.max(totals.totalCost - Number(ticket.paidAmount), 0);
      if (totals.totalCost > 0 && Number(ticket.paidAmount) > totals.totalCost + 0.01) {
        throw new BadRequestException(`Rs ${ticket.paidAmount} pehle mil chuke — bill is se kam nahi ho sakta`);
      }
    } else if (dto.estimatedCost !== undefined && !ticket.parts.length && !Number(ticket.laborCost)) {
      data.balanceDue = Math.max(r2(dto.estimatedCost) - Number(ticket.paidAmount), 0);
    }

    return this.prisma.repairTicket.update({ where: { id }, data });
  }

  // ════════════════════════════════════════════════════════
  // DIAGNOSE
  // ════════════════════════════════════════════════════════

  async diagnose(user: AuthenticatedUser, id: string, dto: DiagnoseDto) {
    const ticket = await this.findOne(user, id);
    this.assertOpen(ticket);
    // Parts already on the ticket are the real bill; the estimate is used only until they are added.
    const laborCost = r2(dto.laborCost ?? 0);
    const totals = ticket.parts.length
      ? this.recalcTotals(ticket.parts.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })), laborCost, Number(ticket.discount))
      : { partsCost: r2(dto.partsCost ?? 0), totalCost: r2(dto.estimatedCost) };
    if (Number(ticket.paidAmount) > totals.totalCost + 0.01 && totals.totalCost > 0) {
      throw new BadRequestException(`Rs ${ticket.paidAmount} advance mil chuka — andaza is se kam nahi ho sakta`);
    }
    const toStatus: RepairStatus = ticket.status === 'RECEIVED' ? RepairStatus.DIAGNOSED : ticket.status;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.repairTicket.update({
        where: { id },
        data: {
          diagnosedIssue: dto.diagnosedIssue,
          diagnosisNotes: dto.diagnosisNotes,
          recommendedActions: dto.recommendedActions,
          estimatedCost: dto.estimatedCost,
          partsCost: totals.partsCost,
          laborCost,
          totalCost: totals.totalCost,
          balanceDue: Math.max(totals.totalCost - Number(ticket.paidAmount), 0),
          status: toStatus,
          diagnosedAt: ticket.diagnosedAt ?? new Date(),
        },
      });

      await tx.repairStatusLog.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus,
          note: `Check: ${dto.diagnosedIssue}. Andaza: Rs ${dto.estimatedCost}`,
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
    this.assertOpen(ticket);
    const source = dto.source ?? (dto.productId ? 'OWN_STOCK' : 'PURCHASED_FOR_REPAIR');
    if (!['OWN_STOCK', 'PURCHASED_FOR_REPAIR', 'CUSTOMER_PROVIDED'].includes(source)) {
      throw new BadRequestException('Part kahan se aaya: OWN_STOCK, PURCHASED_FOR_REPAIR ya CUSTOMER_PROVIDED');
    }
    if (source === 'OWN_STOCK' && !dto.productId) throw new BadRequestException('Apne stock ka part ho to product chunein');
    const total = r2(dto.quantity * dto.unitPrice);

    return this.prisma.$transaction(async (tx) => {
      let unitCost = dto.unitCost;
      if (dto.productId) {
        const product = await tx.product.findFirst({
          where: { id: dto.productId, tenantId: user.tenantId },
          select: { id: true, name: true, costPrice: true, productType: true, unit: true },
        });
        if (!product) throw new NotFoundException('Part ka product nahi mila');
        // A part from own stock costs the shop its buying price.
        if (unitCost === undefined || unitCost === null) unitCost = Number(product.costPrice) || 0;
        if (source === 'OWN_STOCK' && !isServiceProduct(product)) {
          const shopId = await this.partsShop(tx, user, ticket);
          await applyStockDelta({
            tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: null,
            delta: -dto.quantity, movementType: 'SALE_OUT', reference: ticket.ticketNumber,
            note: `Repair ${ticket.ticketNumber} me laga`, preventNegative: true, label: product.name,
            userId: user.id, unitCost,
          });
        }
      }

      const part = await tx.repairPart.create({
        data: {
          ticketId,
          productId: dto.productId,
          partName: dto.partName.trim(),
          partNumber: dto.partNumber,
          quantity: dto.quantity,
          unitCost: unitCost ?? 0,
          unitPrice: dto.unitPrice,
          totalPrice: total,
          source,
          notes: dto.notes,
        },
      });

      const allParts = await tx.repairPart.findMany({ where: { ticketId } });
      const { partsCost, totalCost } = this.recalcTotals(
        allParts.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })),
        Number(ticket.laborCost),
        Number(ticket.discount),
      );
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: { partsCost, totalCost, balanceDue: Math.max(totalCost - Number(ticket.paidAmount), 0) },
      });

      return part;
    });
  }

  /** Puts a part from own stock back on the shelf (with a movement) and drops it from the ticket. */
  private async dropPart(tx: Prisma.TransactionClient, user: AuthenticatedUser, ticket: { ticketNumber: string; shopId: string | null }, part: { id: string; productId: string | null; source: string | null; quantity: number; unitCost: number }) {
    if (part.productId && part.source === 'OWN_STOCK') {
      const product = await tx.product.findFirst({ where: { id: part.productId }, select: { productType: true, unit: true } });
      if (product && !isServiceProduct(product)) {
        const shopId = await this.partsShop(tx, user, ticket);
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: part.productId, variantId: null,
          delta: Number(part.quantity), movementType: 'RETURN_IN', reference: ticket.ticketNumber,
          note: `Repair ${ticket.ticketNumber} se part wapas shelf par`, userId: user.id, unitCost: Number(part.unitCost) || null,
        });
      }
    }
    await tx.repairPart.delete({ where: { id: part.id } });
  }

  async removePart(user: AuthenticatedUser, ticketId: string, partId: string) {
    const ticket = await this.findOne(user, ticketId);
    this.assertOpen(ticket);
    const part = ticket.parts.find((p) => p.id === partId);
    if (!part) throw new NotFoundException('Part nahi mila');

    return this.prisma.$transaction(async (tx) => {
      await this.dropPart(tx, user, ticket, part);
      const allParts = await tx.repairPart.findMany({ where: { ticketId } });
      const { partsCost, totalCost } = this.recalcTotals(
        allParts.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })),
        Number(ticket.laborCost),
        Number(ticket.discount),
      );
      return tx.repairTicket.update({
        where: { id: ticketId },
        data: { partsCost, totalCost, balanceDue: Math.max(totalCost - Number(ticket.paidAmount), 0) },
      });
    });
  }

  // ════════════════════════════════════════════════════════
  // DELIVERY → SALE
  // The repair's earning becomes a bill, so it reaches the dashboard,
  // profit, cash register and khata like any phone sale.
  // ════════════════════════════════════════════════════════

  private async createSaleForDeliveredTicket(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    ticketId: string,
    paidNow = 0,
    method?: PaymentMethod,
  ) {
    const ticket = await tx.repairTicket.findUnique({
      where: { id: ticketId },
      include: { parts: true, payments: true },
    });

    // One bill per ticket: a second delivery never makes a duplicate.
    if (!ticket || ticket.saleId) return null;

    const netTotal = Number(ticket.totalCost) || 0;
    const partsOwnCost = ticket.parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unitCost || 0), 0);
    // A free job (warranty, goodwill) makes no bill unless it used parts the
    // shop paid for: then a Rs 0 bill carries that cost into the profit.
    if (netTotal <= 0 && partsOwnCost <= 0.005) return null;

    // Money taken before advances went on khata counts as paid with this bill.
    const onKhata = await paidOnKhata(tx, user.tenantId, ticket.ticketNumber);
    const legacyPaid = r2(Math.max(Number(ticket.paidAmount) - paidNow - onKhata, 0));
    const paidAtCounter = r2(Math.min(paidNow + legacyPaid, netTotal));

    const shopId = await resolveIndustryShopId(tx, user, ticket.shopId);
    let customerId = ticket.customerId;
    if (!customerId && netTotal - paidAtCounter > 0.005) {
      if (!ticket.customerName?.trim()) {
        throw new BadRequestException(
          `${ticket.ticketNumber}: Rs ${r2(netTotal - paidAtCounter)} baqi hai. Poora payment lein ya customer ka naam likhein.`,
        );
      }
      customerId = await ensureCustomer(tx, user, { name: ticket.customerName, phone: ticket.customerPhone, shopId });
    }

    const device = `${ticket.deviceBrand} ${ticket.deviceModel}`.trim();
    const lines = [
      ...ticket.parts.map((part) => ({
        label: `Repair ${ticket.ticketNumber} part: ${part.partName}`,
        amount: r2(Number(part.quantity) * Number(part.unitPrice)),
        cost: r2(Number(part.quantity) * Number(part.unitCost || 0)),
        quantity: Number(part.quantity) || 1,
      })),
      {
        label: `Repair ${ticket.ticketNumber} — ${device}: ${ticket.diagnosedIssue || ticket.reportedIssue || 'mazdoori'}`,
        amount: r2(Number(ticket.laborCost) || 0),
      },
    ];
    // Old tickets whose parts were not itemised still bill their full amount.
    const itemised = lines.reduce((sum, l) => sum + l.amount, 0);
    const discount = r2(Number(ticket.discount) || 0);
    if (itemised - discount < netTotal - 0.005) {
      lines.push({ label: `Repair ${ticket.ticketNumber} — baqi kaam`, amount: r2(netTotal + discount - itemised) });
    }

    const sale = await postIndustrySale(tx, user, {
      saleNumber: `RPR-${ticket.ticketNumber}`,
      sourceRef: ticket.ticketNumber,
      shopId,
      customerId,
      lines,
      discount,
      paidAmount: paidAtCounter,
      paymentMethod: method ?? mainMethod(ticket.payments),
    });

    await tx.repairTicket.update({
      where: { id: ticket.id },
      data: { saleId: sale.id, customerId, shopId },
    });

    return sale;
  }

  /** Delivery stamps, and the repair warranty from the day the phone goes back. */
  private deliveryStamp(ticket: { warrantyDays: number; status: RepairStatus }) {
    const now = new Date();
    const warranty = ticket.status === 'READY' && ticket.warrantyDays > 0;
    return {
      status: RepairStatus.DELIVERED,
      deliveredAt: now,
      warrantyEnds: warranty ? addDaysTz(now, ticket.warrantyDays) : null,
    };
  }

  // ════════════════════════════════════════════════════════
  // DELIVER — one step at the counter: take the balance, close the ticket,
  // post the bill. All in one transaction so nothing is left half done.
  // ════════════════════════════════════════════════════════

  async deliver(user: AuthenticatedUser, id: string, dto: DeliverRepairDto) {
    const ticket = await this.findOne(user, id);

    if (ticket.status === 'DELIVERED') {
      throw new BadRequestException(`${ticket.ticketNumber} pehle hi deliver ho chuka hai`);
    }
    if (ticket.status !== 'READY' && ticket.status !== 'UNREPAIRABLE') {
      throw new BadRequestException(
        `Sirf tayyar (ya theek na ho sakne wala) phone wapas diya jata hai. ${ticket.ticketNumber} abhi ${ticket.status} hai.`,
      );
    }

    const balanceDue = Math.max(Number(ticket.totalCost) - Number(ticket.paidAmount), 0);
    const amount = r2(dto.amount ?? 0);

    if (amount > balanceDue + 0.01) {
      throw new BadRequestException(`Baqi sirf Rs ${balanceDue} hai — Rs ${amount} nahi liya ja sakta`);
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
          data: { paidAmount: newPaid, balanceDue: newBalance, paymentStatus: newBalance === 0 ? 'FULLY_PAID' : 'ADVANCE_PAID' },
        });
      }

      await tx.repairTicket.update({ where: { id }, data: this.deliveryStamp(ticket) });
      await tx.repairStatusLog.create({
        data: { ticketId: id, fromStatus: ticket.status, toStatus: 'DELIVERED', note: dto.note ?? 'Counter se wapas diya', changedById: user.id },
      });

      // This step brings the repair's earning into the books.
      const sale = await this.createSaleForDeliveredTicket(tx, user, id, amount, dto.paymentMethod);

      const updated = await tx.repairTicket.findUnique({
        where: { id },
        include: { payments: { orderBy: { paidAt: 'desc' } } },
      });

      return { ticket: updated, sale };
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateStatusDto) {
    const ticket = await this.findOne(user, id);

    const allowed = TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `${ticket.status} se ${dto.toStatus} nahi ho sakta. Ho sakta hai: ${allowed.join(', ') || 'kuch nahi'}`,
      );
    }
    // Handing the phone back bills it, so it goes through deliver().
    if (dto.toStatus === 'DELIVERED') {
      const res = await this.deliver(user, id, { amount: 0, note: dto.note });
      return res.ticket;
    }

    const now = new Date();
    const updateData: Prisma.RepairTicketUpdateInput = { status: dto.toStatus };
    if (dto.toStatus === 'IN_PROGRESS' && !ticket.startedAt) updateData.startedAt = now;
    if (dto.toStatus === 'READY') updateData.readyAt = now;
    if (dto.toStatus === 'AWAITING_APPROVAL' && !ticket.approvedAt) updateData.approvedAt = now;

    return this.prisma.$transaction(async (tx) => {
      // A cancelled job gives its own-stock parts back to the shelf.
      if (dto.toStatus === 'CANCELLED') {
        for (const part of ticket.parts) {
          if (part.productId && part.source === 'OWN_STOCK') await this.dropPart(tx, user, ticket, part);
        }
        const left = await tx.repairPart.findMany({ where: { ticketId: id } });
        const totals = this.recalcTotals(left.map((p) => ({ quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) })), Number(ticket.laborCost), Number(ticket.discount));
        updateData.partsCost = totals.partsCost;
        updateData.totalCost = totals.totalCost;
        updateData.balanceDue = 0;
      }
      const updated = await tx.repairTicket.update({ where: { id }, data: updateData });
      const advance = dto.toStatus === 'CANCELLED' ? await paidOnKhata(tx, user.tenantId, ticket.ticketNumber) : 0;
      await tx.repairStatusLog.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: dto.toStatus,
          note: [dto.note, advance > 0 ? `Rs ${advance} advance customer ke khata me jama hai` : null].filter(Boolean).join(' — ') || null,
          changedById: user.id,
        },
      });
      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // PAYMENTS (before delivery: advance on khata)
  // ════════════════════════════════════════════════════════

  async addPayment(user: AuthenticatedUser, ticketId: string, dto: AddPaymentDto) {
    const ticket = await this.findOne(user, ticketId);
    if (!(Number(dto.amount) > 0)) throw new BadRequestException('Amount zero se zyada ho');
    if (ticket.saleId) {
      // After delivery the balance sits in the customer's khata.
      throw new BadRequestException(`${ticket.ticketNumber} deliver ho chuka — baqi amount customer ke Khata se wasool karein`);
    }
    if (['CANCELLED', 'DELIVERED'].includes(ticket.status)) {
      throw new BadRequestException(`${ticket.ticketNumber} band ho chuka hai`);
    }
    const ceiling = Number(ticket.totalCost) > 0 ? Number(ticket.totalCost) : Number(ticket.estimatedCost);
    if (ceiling > 0 && Number(ticket.paidAmount) + Number(dto.amount) > ceiling + 0.01) {
      throw new BadRequestException(`Baqi sirf Rs ${Math.max(ceiling - Number(ticket.paidAmount), 0)} hai`);
    }
    const newPaid = Number(ticket.paidAmount) + dto.amount;
    const newBalance = Math.max(Number(ticket.totalCost || ticket.estimatedCost) - newPaid, 0);

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
      await this.takeAdvance(tx, user, ticket, dto.amount, dto.paymentMethod);
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: { paidAmount: newPaid, balanceDue: newBalance, paymentStatus: newBalance === 0 ? 'FULLY_PAID' : 'ADVANCE_PAID' },
      });
      return payment;
    });
  }

  // ════════════════════════════════════════════════════════
  // DELETE — a ticket is cancelled, never erased (history stays)
  // ════════════════════════════════════════════════════════

  async remove(user: AuthenticatedUser, id: string) {
    const ticket = await this.findOne(user, id);
    if (ticket.status === 'DELIVERED' || ticket.saleId) {
      throw new BadRequestException('Deliver hua ticket mitaya nahi ja sakta');
    }
    if (ticket.status !== 'CANCELLED') {
      if (!TRANSITIONS[ticket.status].includes('CANCELLED')) {
        throw new BadRequestException(`${ticket.ticketNumber} abhi ${ticket.status} hai — pehle kaam rokein`);
      }
      await this.updateStatus(user, id, { toStatus: 'CANCELLED', note: 'Ticket hataya gaya' });
    }
    return { message: 'Repair ticket cancel ho gaya', ticketNumber: ticket.ticketNumber };
  }
}
