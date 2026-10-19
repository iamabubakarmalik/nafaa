/**
 * Heavy-goods delivery: booking (address, floor, lift, charges), vehicle and
 * driver, dispatch, hand-over with the receiver's name and CNIC.
 *
 * Delivery charges are money the shop earns, so the delivered trip becomes a
 * bill numbered like the delivery (APDL-…) unless the counter bill already
 * carried them. What the driver collected at the door is paid on that bill;
 * the rest stays on the customer's khata and can be taken later.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { paidOnKhata } from '../../_shared/industry-sale.helper';
import { endOfDayTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { billJob, receiveJobMoney } from '../common/books';
import { checkLinks, dayRange, nextInSequence, optDate, r2, stamp, yearPrefix } from '../common/appliance-common';
import {
  ApplianceDeliveryPaymentDto, AssignApplianceVehicleDto, ConfirmApplianceDeliveryDto, CreateApplianceDeliveryDto,
  UpdateApplianceDeliveryStatusDto,
} from './dto/create-delivery.dto';

const OPEN = ['PENDING', 'SCHEDULED', 'DISPATCHED', 'ARRIVED'];
const CLOSED = ['DELIVERED', 'FAILED', 'CANCELLED'];
type Row = Prisma.ApplianceDeliveryGetPayload<object>;

export type DeliveryView = 'open' | 'today' | 'novehicle' | 'late' | 'unpaid' | 'delivered' | 'closed' | 'all';

const party = (d: Row) => ({ number: d.deliveryNumber, customerId: d.customerId, customerName: d.customerName, customerPhone: d.customerPhone });

@Injectable()
export class ApplianceDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Next delivery number after the highest used this year (a count would repeat numbers). */
  private async nextNumber(tenantId: string) {
    const prefix = yearPrefix('APDL');
    const last = await this.prisma.applianceDelivery.findFirst({
      where: { tenantId, deliveryNumber: { startsWith: prefix } },
      orderBy: { deliveryNumber: 'desc' },
      select: { deliveryNumber: true },
    });
    return nextInSequence(prefix, last?.deliveryNumber);
  }

  private async find(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    return d;
  }

  /** True when the counter bill this delivery came from already charged for it. */
  private async chargedAtCounter(tenantId: string, saleId: string | null) {
    if (!saleId) return false;
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { serviceChargesBreakdown: true } });
    return JSON.stringify(sale?.serviceChargesBreakdown ?? '').includes('DELIVERY');
  }

  /** Money side of each row: paid so far and what is still owed. */
  private async withMoney(tenantId: string, rows: Row[]) {
    const numbers = rows.map((r) => r.deliveryNumber);
    const [bills, khata] = numbers.length ? await Promise.all([
      this.prisma.sale.findMany({ where: { tenantId, sourceRef: { in: numbers }, status: { not: 'VOIDED' } }, select: { id: true, sourceRef: true, paidAmount: true } }),
      this.prisma.customerLedger.groupBy({ by: ['reference'], where: { tenantId, reference: { in: numbers }, type: 'PAYMENT_RECEIVED' }, _sum: { amount: true } }),
    ]) : [[], []];
    const billBy = new Map(bills.map((b) => [b.sourceRef ?? '', b]));
    const khataBy = new Map(khata.map((k) => [k.reference ?? '', -(Number(k._sum.amount) || 0)]));
    return rows.map((r) => {
      const live = billBy.get(r.deliveryNumber) ?? null;
      const paid = r2((live ? Number(live.paidAmount) : 0) + (khataBy.get(r.deliveryNumber) ?? 0));
      const owed = r.status === 'CANCELLED' || r.status === 'FAILED' ? 0 : r2(Math.max(Number(r.totalCharge) - paid, 0));
      return { ...r, billId: live?.id ?? null, paidAmount: paid, dueAmount: r.status === 'DELIVERED' && !live ? 0 : owed };
    });
  }

  async create(user: AuthenticatedUser, dto: CreateApplianceDeliveryDto) {
    await checkLinks(this.prisma, user.tenantId, { customerId: dto.customerId, saleId: dto.saleId });
    const serialIds = [...new Set(dto.serialTrackingIds ?? [])];
    if (serialIds.length) {
      const found = await this.prisma.applianceSerialTracking.count({ where: { tenantId: user.tenantId, id: { in: serialIds } } });
      if (found !== serialIds.length) throw new NotFoundException('Ek ya zyada serial nahi mile');
    }
    if (!dto.deliveryAddress?.trim()) throw new BadRequestException('Delivery ka pata likhein');

    let floorCharge = dto.floorCharge ?? 0;
    if (dto.floorCharge === undefined && !dto.hasLift && dto.floorNumber && dto.floorNumber > 0) {
      floorCharge = dto.floorNumber * 300; // Default Rs 300 per floor without a lift
    }
    const totalCharge = r2((dto.deliveryCharge ?? 0) + (dto.loadingCharge ?? 0) + (dto.unloadingCharge ?? 0) + floorCharge);
    const deliveryNumber = await this.nextNumber(user.tenantId);

    return this.prisma.applianceDelivery.create({
      data: {
        tenantId: user.tenantId,
        deliveryNumber,
        ...dto,
        serialTrackingIds: serialIds,
        floorCharge,
        totalCharge,
        scheduledDate: optDate(dto.scheduledDate),
        status: dto.vehicleNumber && dto.scheduledDate ? 'SCHEDULED' : 'PENDING',
      },
    });
  }

  private viewWhere(view: DeliveryView | undefined): Prisma.ApplianceDeliveryWhereInput {
    const today = startOfDayTz();
    switch (view) {
      case 'open': return { status: { in: OPEN } };
      case 'today': return { status: { in: OPEN }, scheduledDate: { gte: today, lte: endOfDayTz() } };
      case 'novehicle': return { status: { in: OPEN }, vehicleNumber: null };
      case 'late': return { status: { in: OPEN }, scheduledDate: { lt: today } };
      case 'delivered': return { status: 'DELIVERED' };
      case 'closed': return { status: { in: CLOSED } };
      case 'unpaid': return { status: { notIn: ['CANCELLED', 'FAILED'] }, totalCharge: { gt: 0 } };
      default: return {};
    }
  }

  /**
   * Without `page` the old array comes back (other screens read it). With
   * `page`: a page of rows, totals and paging.
   */
  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; from?: string; to?: string; search?: string; view?: DeliveryView; page?: number; limit?: number;
  }) {
    const q = params.search?.trim();
    const range = dayRange(params.from, params.to);
    const where: Prisma.ApplianceDeliveryWhereInput = {
      tenantId: user.tenantId,
      ...this.viewWhere(params.view),
      ...(params.status && { status: params.status }),
      ...(params.customerId && { customerId: params.customerId }),
      ...(range && { scheduledDate: range }),
      ...(q && {
        OR: [
          { deliveryNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q } },
          { deliveryAddress: { contains: q, mode: 'insensitive' } },
          { area: { contains: q, mode: 'insensitive' } },
          { vehicleNumber: { contains: q, mode: 'insensitive' } },
          { driverName: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const orderBy: Prisma.ApplianceDeliveryOrderByWithRelationInput[] = [{ scheduledDate: 'desc' }, { createdAt: 'desc' }];

    if (!params.page) {
      const rows = await this.prisma.applianceDelivery.findMany({ where, orderBy, take: 200 });
      return this.withMoney(user.tenantId, rows);
    }
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 40));
    const [rows, total, sums] = await Promise.all([
      this.prisma.applianceDelivery.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.applianceDelivery.count({ where }),
      this.prisma.applianceDelivery.aggregate({ where, _sum: { totalCharge: true } }),
    ]);
    let items = await this.withMoney(user.tenantId, rows);
    if (params.view === 'unpaid') items = items.filter((r) => r.dueAmount > 0);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), totals: { charges: r2(sums._sum.totalCharge) } };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.find(user, id);
    const [row] = await this.withMoney(user.tenantId, [d]);
    const serials = d.serialTrackingIds.length
      ? await this.prisma.applianceSerialTracking.findMany({
          where: { tenantId: user.tenantId, id: { in: d.serialTrackingIds } },
          select: { id: true, serialNumber: true, modelNumber: true, productId: true, status: true },
        })
      : [];
    const installation = d.saleId
      ? await this.prisma.applianceInstallation.findFirst({ where: { tenantId: user.tenantId, saleId: d.saleId }, select: { id: true, installationNumber: true, status: true, scheduledDate: true } })
      : null;
    const sale = d.saleId ? await this.prisma.sale.findFirst({ where: { id: d.saleId, tenantId: user.tenantId }, select: { id: true, saleNumber: true, total: true } }) : null;
    return { ...row, serials, installation, sale, chargedAtCounter: await this.chargedAtCounter(user.tenantId, d.saleId) };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateApplianceDeliveryStatusDto) {
    const d = await this.find(user, id);
    if (dto.status === 'DELIVERED') throw new BadRequestException('Maal pohanchne par "Confirm delivery" se band karein — receiver ka naam aur paisa wahin likha jata hai');
    if (CLOSED.includes(d.status)) throw new BadRequestException('Band delivery ki halat nahi badalti');
    if ((dto.status === 'CANCELLED' || dto.status === 'FAILED') && !dto.notes?.trim()) throw new BadRequestException('Wajah likhein');
    if (dto.status === 'DISPATCHED' && !d.vehicleNumber) throw new BadRequestException('Pehle gaari aur driver likhein');

    const patch: Prisma.ApplianceDeliveryUpdateInput = { status: dto.status };
    const now = new Date();
    if (dto.status === 'DISPATCHED') patch.dispatchedAt = d.dispatchedAt ?? now;
    if (dto.status === 'ARRIVED') patch.arrivedAt = d.arrivedAt ?? now;
    if (dto.notes) patch.notes = stamp(d.notes, `${dto.status}: ${dto.notes}`);
    return this.prisma.applianceDelivery.update({ where: { id }, data: patch });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmApplianceDeliveryDto) {
    const d = await this.find(user, id);
    if (CLOSED.includes(d.status)) throw new BadRequestException('Ye delivery pehle hi band ho chuki hai');
    const charged = await this.chargedAtCounter(user.tenantId, d.saleId);
    const total = charged ? 0 : r2(d.totalCharge);
    const advance = await paidOnKhata(this.prisma, user.tenantId, d.deliveryNumber);
    const paidNow = r2(dto.paidAmount ?? Math.max(total - advance, 0));
    if (advance + paidNow > total + 0.005) {
      throw new BadRequestException(`Delivery ke charges Rs ${total} hain${advance ? `, Rs ${advance} pehle mil chuka` : ''} — is se zyada nahi`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceDelivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          arrivedAt: d.arrivedAt ?? new Date(),
          receivedByName: dto.receivedByName,
          receivedByCnic: dto.receivedByCnic,
          signatureUrl: dto.signatureUrl,
          photoUrls: dto.photoUrls ?? [],
        },
      });

      if (total > 0) {
        const lines = [
          { label: `Delivery ${d.deliveryNumber} — kiraya`, amount: d.deliveryCharge },
          { label: `Delivery ${d.deliveryNumber} — loading`, amount: d.loadingCharge },
          { label: `Delivery ${d.deliveryNumber} — unloading`, amount: d.unloadingCharge },
          { label: `Delivery ${d.deliveryNumber} — manzil (floor)`, amount: d.floorCharge },
        ].filter((l) => l.amount > 0);
        const bill = await billJob(tx, user, party(d), lines, advance + paidNow, dto.paymentMethod);
        if (bill?.customerId && bill.customerId !== d.customerId) {
          await tx.applianceDelivery.update({ where: { id }, data: { customerId: bill.customerId } });
        }
      }

      if (d.serialTrackingIds.length > 0) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: { in: d.serialTrackingIds }, tenantId: user.tenantId },
          data: { deliveredAt: new Date(), deliveredBy: d.driverName, deliveryAddress: d.deliveryAddress },
        });
      }
      return updated;
    });
  }

  /** Delivery charges still owed: before the trip an advance, after it a khata payment on its bill. */
  async addPayment(user: AuthenticatedUser, id: string, dto: ApplianceDeliveryPaymentDto) {
    const d = await this.find(user, id);
    if (d.status === 'CANCELLED' || d.status === 'FAILED') throw new BadRequestException('Band delivery par paisa nahi liya ja sakta');
    const [row] = await this.withMoney(user.tenantId, [d]);
    const due = d.status === 'DELIVERED' ? row.dueAmount : r2(Math.max(Number(d.totalCharge) - row.paidAmount, 0));
    if (due <= 0) throw new BadRequestException('Is delivery ka koi paisa baqi nahi');
    if (dto.amount > due + 0.005) throw new BadRequestException(`Sirf Rs ${due} baqi hai`);
    return this.prisma.$transaction(async (tx) => {
      const customerId = await receiveJobMoney(tx, user, party(d), dto.amount, `Delivery ${d.deliveryNumber} wusooli`, dto.paymentMethod);
      return tx.applianceDelivery.update({
        where: { id },
        data: { customerId, notes: stamp(d.notes, `Wusooli: ${dto.amount}${dto.note ? ` — ${dto.note}` : ''}`) },
      });
    });
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: AssignApplianceVehicleDto) {
    const d = await this.find(user, id);
    if (CLOSED.includes(d.status)) throw new BadRequestException('Band delivery par gaari nahi lagti');
    if (!dto.vehicleNumber.trim() || !dto.driverName.trim()) throw new BadRequestException('Gaari ka number aur driver ka naam likhein');
    return this.prisma.applianceDelivery.update({
      where: { id },
      data: {
        vehicleNumber: dto.vehicleNumber.trim().toUpperCase(),
        driverName: dto.driverName.trim(),
        driverPhone: dto.driverPhone?.trim() || null,
        helperCount: dto.helperCount,
        ...(dto.scheduledDate && { scheduledDate: optDate(dto.scheduledDate) }),
        ...(dto.scheduledSlot !== undefined && { scheduledSlot: dto.scheduledSlot }),
        status: d.status === 'PENDING' ? 'SCHEDULED' : d.status,
      },
    });
  }

  /** Counts, today's trips and the month's delivery earnings. */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();
    const monthStart = startOfMonthTz();

    const [byStatus, openRows, doneMonth, todayScheduled, billed] = await Promise.all([
      this.prisma.applianceDelivery.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.applianceDelivery.findMany({
        where: { tenantId, status: { in: OPEN } },
        select: { id: true, scheduledDate: true, vehicleNumber: true, requiresInstallation: true, installationLinked: true },
      }),
      this.prisma.applianceDelivery.findMany({
        where: { tenantId, status: 'DELIVERED', deliveredAt: { gte: monthStart } },
        select: {
          totalCharge: true, deliveryCharge: true, loadingCharge: true,
          unloadingCharge: true, floorCharge: true, requiresInstallation: true, installationLinked: true,
        },
      }),
      this.prisma.applianceDelivery.count({ where: { tenantId, status: { in: OPEN }, scheduledDate: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.applianceDelivery.findMany({ where: { tenantId, status: 'DELIVERED', totalCharge: { gt: 0 } }, orderBy: { deliveredAt: 'desc' }, take: 300 }),
    ]);

    const map = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
    const revenue = doneMonth.reduce((s, r) => s + Number(r.totalCharge), 0);
    const unpaid = (await this.withMoney(tenantId, billed)).filter((r) => r.dueAmount > 0);

    return {
      pending: map['PENDING'] ?? 0,
      scheduled: map['SCHEDULED'] ?? 0,
      dispatched: map['DISPATCHED'] ?? 0,
      delivered: map['DELIVERED'] ?? 0,
      todayScheduled,

      arrived: map['ARRIVED'] ?? 0,
      cancelled: (map['CANCELLED'] ?? 0) + (map['FAILED'] ?? 0),
      open: openRows.length,
      /** No vehicle booked yet */
      noVehicle: openRows.filter((r) => !r.vehicleNumber).length,
      /** Date passed, goods not delivered */
      overdue: openRows.filter((r) => r.scheduledDate && new Date(r.scheduledDate) < todayStart).length,
      /** Delivered, installation not booked yet */
      installationPending: doneMonth.filter((r) => r.requiresInstallation && !r.installationLinked).length,
      unpaidCount: unpaid.length,
      unpaidAmount: r2(unpaid.reduce((s, r) => s + r.dueAmount, 0)),

      month: {
        trips: doneMonth.length,
        revenue,
        avgTrip: doneMonth.length ? revenue / doneMonth.length : 0,
        breakdown: {
          delivery: doneMonth.reduce((s, r) => s + Number(r.deliveryCharge), 0),
          loading: doneMonth.reduce((s, r) => s + Number(r.loadingCharge), 0),
          unloading: doneMonth.reduce((s, r) => s + Number(r.unloadingCharge), 0),
          floor: doneMonth.reduce((s, r) => s + Number(r.floorCharge), 0),
        },
      },
    };
  }

}
