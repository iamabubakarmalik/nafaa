/**
 * Grooming appointments: booking, check-in, work, ready, pickup. Pickup
 * makes the bill (sales, profit, day book, drawer); advances wait on the
 * customer's khata until then. A split payment at pickup puts the first
 * part on the bill and the rest on the khata first, so each part lands in
 * its own account. Appointments are cancelled, never deleted.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PetGroomingStatus, PetSpeciesType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  CheckInDto, CompleteGroomingDto, CreateGroomingAppointmentDto,
  GroomingPaymentDto, PickupGroomingDto, RateGroomingDto, UpdateGroomingAppointmentDto, UpdateGroomingStatusDto,
} from './dto/create-appointment.dto';
import { ShopScope } from '../../../common/shop-scope';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { dayEnd, dayKey, dayRange, dayStart, parseDay, weekdayInTz } from '../petshop-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Blank form fields arrive as ''; a blank id is "none", never a link. */
const blank = (v?: string | null) => (v && String(v).trim() ? v : undefined);

@Injectable()
export class GroomingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateGroomingAppointmentDto) {
    dto = { ...dto, customerId: blank(dto.customerId), groomerId: blank(dto.groomerId), scheduledSlot: blank(dto.scheduledSlot) };
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }
    const count = await this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId } });
    const year = dayKey().slice(0, 4);
    // A deleted booking frees a count, so step past numbers already taken.
    let n = count + 1;
    let appointmentNumber = `GRM-${year}-${String(n).padStart(5, '0')}`;
    while (await this.prisma.petGroomingAppointment.findFirst({ where: { tenantId: user.tenantId, appointmentNumber }, select: { id: true } })) {
      n += 1;
      appointmentNumber = `GRM-${year}-${String(n).padStart(5, '0')}`;
    }

    let groomerName: string | undefined;
    if (dto.groomerId) {
      const g = await this.prisma.petGroomer.findFirst({ where: { id: dto.groomerId, tenantId: user.tenantId } });
      if (!g) throw new NotFoundException('Groomer not found');
      if (!g.isActive) throw new BadRequestException('Ye groomer band hai');
      groomerName = g.name;
    }

    const scheduledDate = parseDay(dto.scheduledDate);
    if (!scheduledDate) throw new BadRequestException('Date sahi chunein');

    // Prevent double booking
    if (dto.groomerId && dto.scheduledSlot) {
      const clash = await this.prisma.petGroomingAppointment.findFirst({
        where: {
          tenantId: user.tenantId,
          groomerId: dto.groomerId,
          scheduledSlot: dto.scheduledSlot,
          scheduledDate: { gte: dayStart(scheduledDate), lte: dayEnd(scheduledDate) },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      });
      if (clash) throw new BadRequestException(`Slot ${dto.scheduledSlot} already booked for this groomer`);
    }

    const additionalCharges = dto.additionalCharges ?? 0;
    const discount = dto.discount ?? 0;
    const totalFee = Math.max(dto.serviceFee + additionalCharges - discount, 0);

    return this.prisma.petGroomingAppointment.create({
      data: {
        tenantId: user.tenantId,
        appointmentNumber,
        ...dto,
        additionalServices: dto.additionalServices ?? [],
        photosBeforeUrls: dto.photosBeforeUrls ?? [],
        scheduledDate,
        groomerName,
        additionalCharges,
        discount,
        totalFee,
        status: 'SCHEDULED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; groomerId?: string; species?: string;
    today?: boolean; from?: string; to?: string; search?: string;
  }) {
    const todayStart = dayStart();
    const todayEnd = dayEnd();
    const range = dayRange(params.from, params.to);

    return this.prisma.petGroomingAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.groomerId && { groomerId: params.groomerId }),
        ...(params.species && { petSpecies: params.species as any }),
        ...(params.today ? { scheduledDate: { gte: todayStart, lte: todayEnd } } : {}),
        ...(!params.today && range ? { scheduledDate: range } : {}),
        ...(params.search && {
          OR: [
            { appointmentNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { petName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ scheduledDate: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    let history: any[] = [];
    if (a.customerId) {
      history = await this.prisma.petGroomingAppointment.findMany({
        where: { tenantId: user.tenantId, customerId: a.customerId, id: { not: id }, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 10,
      });
    }

    const durationMinutes = a.startedAt && a.completedAt
      ? Math.round((new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 60000)
      : null;

    return { ...a, previousVisits: history, computed: { durationMinutes, balance: Math.max(a.totalFee - a.paidAmount, 0) } };
  }

  async assignGroomer(user: AuthenticatedUser, id: string, groomerId: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    const g = await this.prisma.petGroomer.findFirst({ where: { id: groomerId, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');
    if (!g.isActive) throw new BadRequestException('Ye groomer band hai');
    if (!['SCHEDULED', 'CONFIRMED'].includes(a.status)) throw new BadRequestException('Kaam shuru hone ke baad groomer nahi badalta');

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { groomerId, groomerName: g.name, status: 'CONFIRMED' },
    });
  }

  async checkIn(user: AuthenticatedUser, id: string, dto: CheckInDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (!['SCHEDULED', 'CONFIRMED'].includes(a.status)) throw new BadRequestException(`Ye appointment ${a.status} hai`);

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
        photosBeforeUrls: dto.photosBeforeUrls ?? a.photosBeforeUrls,
        groomerNotes: dto.notes ? ((a.groomerNotes || '') + '\n' + dto.notes).trim() : a.groomerNotes,
        status: 'CONFIRMED',
      },
    });
  }

  async start(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (!['SCHEDULED', 'CONFIRMED'].includes(a.status)) throw new BadRequestException(`Ye appointment ${a.status} hai, shuru nahi ho sakti`);

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date(), checkedInAt: a.checkedInAt ?? new Date() },
    });
  }

  /** Edit a booking before work starts; the fee is worked out again. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateGroomingAppointmentDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (!['SCHEDULED', 'CONFIRMED'].includes(a.status)) throw new BadRequestException('Kaam shuru hone ke baad booking badli nahi ja sakti');

    const customerId = dto.customerId === undefined ? undefined : blank(dto.customerId) ?? null;
    if (customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }
    let groomerName: string | null | undefined;
    const groomerId = dto.groomerId === undefined ? undefined : blank(dto.groomerId) ?? null;
    if (groomerId) {
      const g = await this.prisma.petGroomer.findFirst({ where: { id: groomerId, tenantId: user.tenantId } });
      if (!g) throw new NotFoundException('Groomer not found');
      groomerName = g.name;
    } else if (groomerId === null) {
      groomerName = null;
    }
    const scheduledDate = dto.scheduledDate ? parseDay(dto.scheduledDate) : undefined;
    if (dto.scheduledDate && !scheduledDate) throw new BadRequestException('Date sahi chunein');

    const serviceFee = dto.serviceFee ?? a.serviceFee;
    const additionalCharges = dto.additionalCharges ?? a.additionalCharges;
    const discount = dto.discount ?? a.discount;
    const totalFee = Math.max(serviceFee + additionalCharges - discount, 0);
    if (totalFee < a.paidAmount - 0.01) throw new BadRequestException(`Rs ${a.paidAmount} pehle mil chuke hain — fee us se kam nahi ho sakti`);

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: {
        ...dto,
        customerId,
        groomerId,
        ...(groomerName !== undefined && { groomerName }),
        scheduledSlot: dto.scheduledSlot === undefined ? undefined : blank(dto.scheduledSlot) ?? null,
        scheduledDate: scheduledDate ?? undefined,
        serviceFee, additionalCharges, discount, totalFee,
      },
    });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteGroomingDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (!['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status)) throw new BadRequestException('Ye appointment pehle hi mukammal ya band hai');

    const additionalCharges = dto.additionalCharges ?? a.additionalCharges;
    const discount = dto.discount ?? a.discount;
    const totalFee = Math.max(a.serviceFee + additionalCharges - discount, 0);
    if (totalFee < a.paidAmount - 0.01) throw new BadRequestException(`Rs ${a.paidAmount} pehle mil chuke hain — fee us se kam nahi ho sakti`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.petGroomingAppointment.update({
        where: { id },
        data: {
          status: 'READY_FOR_PICKUP',
          startedAt: a.startedAt ?? new Date(),
          completedAt: new Date(),
          photosAfterUrls: dto.photosAfterUrls ?? a.photosAfterUrls,
          additionalCharges,
          discount,
          totalFee,
          groomerNotes: dto.groomerNotes ? ((a.groomerNotes || '') + '\n' + dto.groomerNotes).trim() : a.groomerNotes,
        },
      });

      if (a.groomerId) {
        await tx.petGroomer.update({
          where: { id: a.groomerId },
          data: {
            completedAppointments: { increment: 1 },
            totalRevenue: { increment: totalFee },
          },
        });
      }
      return updated;
    });
  }

  /**
   * The owner takes the pet back and the bill is settled. The visit becomes
   * a bill (sales, profit, day book and drawer all see it); money paid in
   * advance was already on the customer's khata and is used up there.
   * Before, pickup needed the fee to be paid first, but no screen could
   * take the payment, so no visit could ever be closed.
   */
  async pickup(user: AuthenticatedUser, scope: ShopScope, id: string, dto: PickupGroomingDto = {}) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (a.status === 'COMPLETED') throw new BadRequestException('Pet pehle hi le jaya ja chuka hai');
    if (a.status !== 'READY_FOR_PICKUP') throw new BadRequestException('Pehle grooming mukammal (Ready) karein');

    const stillOwed = r2(Math.max(a.totalFee - a.paidAmount, 0));
    const parts = (dto.payments ?? []).map((p) => ({ method: p.method, amount: r2(p.amount) })).filter((p) => p.amount > 0);
    const handed = parts.length
      ? r2(parts.reduce((t, p) => t + p.amount, 0))
      : dto.paidAmount === undefined ? stillOwed : r2(Math.max(Number(dto.paidAmount) || 0, 0));
    const kept = r2(Math.min(handed, stillOwed));
    const credit = r2(stillOwed - kept);
    // On a split the cash part goes on the bill (it can carry change); the others go on the khata.
    const billPart = parts.find((p) => p.method === 'CASH') ?? parts[0];
    const others = parts.length > 1 ? parts.filter((p) => p !== billPart) : [];
    const othersSum = r2(others.reduce((t, p) => t + p.amount, 0));
    if (othersSum > kept + 0.005) throw new BadRequestException('Card / bank ki amount baqi se zyada nahi ho sakti');
    if (handed - stillOwed > 0.005 && (billPart ? billPart.method : dto.paymentMethod ?? 'CASH') !== 'CASH') {
      throw new BadRequestException('Zyada amount sirf cash me wapas ho sakti hai');
    }
    const method = billPart?.method ?? dto.paymentMethod;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.petGroomingAppointment.updateMany({
        where: { id, status: 'READY_FOR_PICKUP' },
        data: { status: 'COMPLETED', pickedUpAt: new Date() },
      });
      if (claimed.count === 0) throw new BadRequestException('Appointment abhi badli gayi — dobara koshish karein');

      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      const split = others.length > 0;
      const customerId = a.customerId ?? (credit > 0 || split
        ? await ensureCustomer(tx, user, { name: a.customerName, phone: a.customerPhone, shopId })
        : null);
      // Payments taken before advances went to khata count as paid with this bill.
      const legacyPaid = r2(Math.max(a.paidAmount - (await paidOnKhata(tx, user.tenantId, a.appointmentNumber)), 0));

      for (const p of others) {
        await recordKhataPayment(tx, user, {
          customerId: customerId!, shopId, amount: p.amount, reference: a.appointmentNumber, method: p.method,
          note: `Grooming payment (${p.method}): ${a.petName} (${a.appointmentNumber})`,
        });
      }
      const onBill = r2(kept - othersSum);

      // A voided earlier bill keeps its number; the new bill takes the next one.
      const base = `PGR-${a.appointmentNumber}`;
      const taken = await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: base } } });
      const sale = await postIndustrySale(tx, user, {
        saleNumber: taken ? `${base}-${taken + 1}` : base,
        sourceRef: a.appointmentNumber,
        shopId,
        customerId,
        lines: [
          { label: `Grooming: ${a.serviceType.replace(/_/g, ' ')} — ${a.petName}`, amount: a.serviceFee },
          { label: 'Extra services', amount: a.additionalCharges },
        ],
        discount: a.discount,
        paidAmount: r2(onBill + legacyPaid),
        paymentMethod: method,
      });

      const updated = await tx.petGroomingAppointment.update({
        where: { id },
        data: {
          paidAmount: r2(a.paidAmount + kept),
          customerId: customerId ?? undefined,
          paymentMethod: method ?? a.paymentMethod,
        },
      });
      return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber }, change: r2(handed - kept) };
    });
  }

  /** Advance taken before pickup: held on the customer's khata until the bill. */
  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: GroomingPaymentDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (a.status === 'COMPLETED' || a.status === 'CANCELLED') throw new BadRequestException('Is appointment par ab amount nahi li ja sakti');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount sahi likhein');
    if (a.paidAmount + amount > a.totalFee + 0.01) throw new BadRequestException('Payment exceeds total fee');

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      const customerId = await ensureCustomer(tx, user, { customerId: a.customerId, name: a.customerName, phone: a.customerPhone, shopId });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: a.appointmentNumber, method: dto.paymentMethod, note: `Grooming advance: ${a.petName} (${a.appointmentNumber})`,
      });
      return tx.petGroomingAppointment.update({
        where: { id },
        data: { paidAmount: r2(a.paidAmount + amount), customerId, paymentMethod: dto.paymentMethod ?? a.paymentMethod },
      });
    });
  }

  async rate(user: AuthenticatedUser, id: string, dto: RateGroomingDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be 1-5');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.petGroomingAppointment.update({
        where: { id },
        data: { customerRating: dto.rating, customerFeedback: dto.feedback },
      });

      if (a.groomerId) {
        const rated = await tx.petGroomingAppointment.findMany({
          where: { tenantId: user.tenantId, groomerId: a.groomerId, customerRating: { not: null } },
          select: { customerRating: true },
        });
        const avg = rated.reduce((s, r) => s + (r.customerRating ?? 0), 0) / (rated.length || 1);
        await tx.petGroomer.update({ where: { id: a.groomerId }, data: { avgRating: Number(avg.toFixed(2)) } });
      }
      return updated;
    });
  }

  /**
   * Booking states only: confirm, no-show, cancel, or move to another day.
   * Work steps (start, ready) and pickup (the bill) have their own actions,
   * so no status change here can skip the bill.
   */
  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateGroomingStatusDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    const allowed: PetGroomingStatus[] = ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'];
    if (!allowed.includes(dto.status)) throw new BadRequestException('Kaam shuru, Ready aur Pickup apne buttons se hote hain');
    if (!['SCHEDULED', 'CONFIRMED', 'NO_SHOW'].includes(a.status) && !(a.status === 'CANCELLED' && dto.status === 'SCHEDULED')) {
      throw new BadRequestException(`Ye appointment ${a.status} hai — ab badli nahi ja sakti`);
    }

    const patch: Prisma.PetGroomingAppointmentUpdateInput = { status: dto.status };
    if (dto.rescheduledDate) {
      const day = parseDay(dto.rescheduledDate);
      if (!day) throw new BadRequestException('Nayi date sahi chunein');
      patch.scheduledDate = day;
      patch.status = 'SCHEDULED';
    }
    if (dto.reason) patch.groomerNotes = ((a.groomerNotes || '') + `\n[${dto.status}] ${dto.reason}`).trim();

    return this.prisma.petGroomingAppointment.update({ where: { id }, data: patch });
  }

  /** DELETE keeps its route but cancels; an advance stays on the customer's khata. */
  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED'].includes(a.status)) {
      throw new BadRequestException('Kaam shuru ho chuka — cancel nahi ho sakta');
    }
    if (a.status === 'CANCELLED') return a;
    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { status: 'CANCELLED', groomerNotes: ((a.groomerNotes || '') + '\n[CANCELLED]').trim() },
    });
  }

  /**
   * The pickup bill was voided: the pet's visit is billable again. What the
   * customer paid stays on their khata and counts as paid.
   */
  async reopenAfterVoid(tenantId: string, appointmentNumber: string, saleNumber: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { tenantId, appointmentNumber, status: 'COMPLETED' } });
    if (!a) return null;
    const held = await paidOnKhata(this.prisma as unknown as Prisma.TransactionClient, tenantId, appointmentNumber);
    return this.prisma.petGroomingAppointment.update({
      where: { id: a.id },
      data: {
        status: 'READY_FOR_PICKUP', pickedUpAt: null, paidAmount: Math.min(held, a.totalFee),
        groomerNotes: ((a.groomerNotes || '') + `\nBill ${saleNumber} void — dobara pickup karein`).trim(),
      },
    });
  }

  private where(user: AuthenticatedUser, params: { status?: string; groomerId?: string; species?: string; from?: string; to?: string; search?: string; today?: boolean }): Prisma.PetGroomingAppointmentWhereInput {
    const range = params.today ? { gte: dayStart(), lte: dayEnd() } : dayRange(params.from, params.to);
    const known = (v: string | undefined, all: string[]) => (v && all.includes(v) ? v : undefined);
    const status = params.status === 'OPEN'
      ? { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP'] as PetGroomingStatus[] }
      : known(params.status, Object.values(PetGroomingStatus)) as PetGroomingStatus | undefined;
    const species = known(params.species, Object.values(PetSpeciesType)) as PetSpeciesType | undefined;
    return {
      tenantId: user.tenantId,
      ...(status && { status }),
      ...(params.groomerId && { groomerId: params.groomerId }),
      ...(species && { petSpecies: species }),
      ...(range && { scheduledDate: range }),
      ...(params.search && {
        OR: [
          { appointmentNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { petName: { contains: params.search, mode: 'insensitive' } },
          { petBreed: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  /** Paged record with status counts and money for the grooming page. */
  async paged(user: AuthenticatedUser, params: { status?: string; groomerId?: string; species?: string; from?: string; to?: string; search?: string; today?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit) || 25)));
    const where = this.where(user, params);
    const [items, total, money, byStatus] = await Promise.all([
      this.prisma.petGroomingAppointment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ scheduledDate: 'asc' }, { scheduledSlot: 'asc' }] }),
      this.prisma.petGroomingAppointment.count({ where }),
      this.prisma.petGroomingAppointment.aggregate({ where: { ...where, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }, _sum: { totalFee: true, paidAmount: true } }),
      this.prisma.petGroomingAppointment.groupBy({ by: ['status'], where: this.where(user, { ...params, status: undefined }), _count: { _all: true } }),
    ]);
    return {
      items, total, page, limit,
      totals: { fee: r2(money._sum.totalFee ?? 0), paid: r2(money._sum.paidAmount ?? 0) },
      counts: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
    };
  }

  /** Visits per day, service, groomer and species over a period (analytics tab). */
  async analytics(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const range = dayRange(params.from, params.to) ?? { gte: dayStart(dayKey().slice(0, 8) + '01'), lte: dayEnd() };
    const rows = await this.prisma.petGroomingAppointment.findMany({
      where: { tenantId: user.tenantId, scheduledDate: range },
      select: { scheduledDate: true, totalFee: true, serviceType: true, groomerName: true, petSpecies: true, status: true, customerRating: true },
      take: 5000,
    });
    const done = rows.filter((r) => r.status === 'COMPLETED' || r.status === 'READY_FOR_PICKUP');
    const group = (key: (r: (typeof rows)[number]) => string) => {
      const m = new Map<string, { count: number; value: number }>();
      for (const r of done) {
        const k = key(r);
        const x = m.get(k) ?? { count: 0, value: 0 };
        x.count += 1; x.value = r2(x.value + r.totalFee); m.set(k, x);
      }
      return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.value - a.value);
    };
    const rated = done.filter((r) => r.customerRating);
    return {
      booked: rows.length,
      done: done.length,
      noShow: rows.filter((r) => r.status === 'NO_SHOW').length,
      cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
      value: r2(done.reduce((t, r) => t + r.totalFee, 0)),
      avgRating: rated.length ? r2(rated.reduce((t, r) => t + (r.customerRating ?? 0), 0) / rated.length) : null,
      byDay: group((r) => dayKey(r.scheduledDate)).sort((a, b) => a.key.localeCompare(b.key)),
      byService: group((r) => r.serviceType),
      byGroomer: group((r) => r.groomerName ?? '—'),
      bySpecies: group((r) => r.petSpecies),
    };
  }

  async availableSlots(user: AuthenticatedUser, groomerId: string, date: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id: groomerId, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');

    const day = parseDay(date);
    if (!day) throw new BadRequestException('Date sahi chunein');
    if (!g.workingDays.includes(weekdayInTz(day))) {
      return { available: [], booked: [], reason: 'Groomer not working on this day' };
    }

    const booked = await this.prisma.petGroomingAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        groomerId,
        scheduledDate: { gte: dayStart(day), lte: dayEnd(day) },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { scheduledSlot: true, petName: true, serviceType: true },
    });
    const bookedSlots = booked.map((b) => b.scheduledSlot).filter(Boolean) as string[];

    const [sh, sm] = g.workStartTime.split(':').map(Number);
    const [eh, em] = g.workEndTime.split(':').map(Number);
    const slots: string[] = [];
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + 60 <= end) {
      slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
      cur += 60;
    }

    return {
      groomer: { id: g.id, name: g.name, perServiceRate: g.perServiceRate },
      available: slots.filter((s) => !bookedSlots.includes(s)),
      booked,
      workHours: { start: g.workStartTime, end: g.workEndTime },
    };
  }

  async todaySchedule(user: AuthenticatedUser) {
    return this.prisma.petGroomingAppointment.findMany({
      where: { tenantId: user.tenantId, scheduledDate: { gte: dayStart(), lte: dayEnd() } },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = dayStart();
    const todayEnd = dayEnd();
    const monthStart = dayStart(dayKey().slice(0, 8) + '01');

    const [scheduled, inProgress, readyForPickup, todayCount, monthRevenue, unpaid] = await Promise.all([
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_PICKUP' } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, scheduledDate: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.petGroomingAppointment.aggregate({
        where: { tenantId: user.tenantId, completedAt: { gte: monthStart } },
        _sum: { totalFee: true, paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.petGroomingAppointment.count({
        where: { tenantId: user.tenantId, status: { in: ['READY_FOR_PICKUP', 'COMPLETED'] }, paidAmount: { lt: this.prisma.petGroomingAppointment.fields.totalFee } as any },
      }).catch(() => 0),
    ]);

    return {
      scheduled, inProgress, readyForPickup, todayCount, unpaidCount: unpaid,
      monthly: {
        count: monthRevenue._count._all,
        billed: monthRevenue._sum.totalFee ?? 0,
        collected: monthRevenue._sum.paidAmount ?? 0,
      },
    };
  }
}
