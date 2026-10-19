import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PrescriptionStatus, RefillFrequency } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ControlledLogService, IN_REGISTER } from '../controlled-log/controlled-log.service';
import { dayRange, round2 } from '../common/pharmacy-time';
import { CreatePrescriptionDto, DispenseDto, ListPrescriptionsDto } from './dto/create-prescription.dto';

const STATUSES: PrescriptionStatus[] = ['PENDING', 'VERIFIED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'REJECTED', 'CANCELLED'];

/** Days until the next refill, by frequency. */
const REFILL_DAYS: Record<RefillFrequency, number | null> = {
  DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30, QUARTERLY: 90, AS_NEEDED: null,
};

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly controlledLog: ControlledLogService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Next free Rx number for this year; skips numbers already taken. */
  private async nextNumber(tenantId: string) {
    const year = new Date().getFullYear();
    let seq = (await this.prisma.prescription.count({ where: { tenantId } })) + 1;
    let num = `Rx-${year}-${String(seq).padStart(4, '0')}`;
    while (await this.prisma.prescription.findFirst({ where: { tenantId, prescriptionNumber: num }, select: { id: true } })) {
      seq += 1;
      num = `Rx-${year}-${String(seq).padStart(4, '0')}`;
    }
    return num;
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreatePrescriptionDto) {
    // The form sends '' for a doctor or patient that was not picked.
    const customerId = dto.customerId || undefined;
    const doctorId = dto.doctorId || undefined;
    const customer = customerId
      ? await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { name: true, phone: true, cnic: true } })
      : null;
    if (customerId && !customer) throw new NotFoundException('Customer nahi mila');
    const doctor = doctorId
      ? await this.prisma.doctor.findFirst({
        where: { id: doctorId, tenantId: user.tenantId },
        select: { name: true, registrationNumber: true, specialization: true, clinicName: true, hospitalAffiliation: true },
      })
      : null;
    if (doctorId && !doctor) throw new NotFoundException('Doctor nahi mila');
    let shopId = scope.shopId;
    if (dto.shopId) {
      const shop = await this.prisma.shop.findFirst({ where: { id: dto.shopId, tenantId: user.tenantId }, select: { id: true } });
      if (!shop) throw new NotFoundException('Shop nahi mili');
      shopId = shop.id;
    }
    const patientName = dto.patientName?.trim() || customer?.name;
    if (!patientName) throw new BadRequestException('Mareez ka naam likhein ya customer chunein');

    const productIds = [...new Set(dto.items.map((it) => it.productId).filter(Boolean) as string[])];
    const products = productIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, price: true, unit: true } })
      : [];
    if (products.length !== productIds.length) throw new NotFoundException('Dawai (product) nahi mili');
    const byId = new Map(products.map((p) => [p.id, p]));
    const prescriptionDate = dto.prescriptionDate ? new Date(dto.prescriptionDate) : null;
    if (prescriptionDate && Number.isNaN(prescriptionDate.getTime())) throw new BadRequestException('Nuskhe ki tareekh theek nahi');
    const prescriptionNumber = await this.nextNumber(user.tenantId);

    return this.prisma.prescription.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        customerId,
        doctorId,
        prescriptionNumber,
        type: dto.type ?? 'WALK_IN',
        status: 'PENDING',
        // A picked doctor fills the snapshot so the Rx keeps the name even if the doctor changes later.
        doctorName: dto.doctorName?.trim() || doctor?.name,
        doctorRegNumber: dto.doctorRegNumber?.trim() || doctor?.registrationNumber,
        doctorSpeciality: dto.doctorSpeciality?.trim() || doctor?.specialization,
        hospitalName: dto.hospitalName?.trim() || doctor?.clinicName || doctor?.hospitalAffiliation,
        patientName,
        patientAge: dto.patientAge,
        patientGender: dto.patientGender,
        patientPhone: dto.patientPhone?.trim() || customer?.phone,
        patientCnic: dto.patientCnic?.trim() || customer?.cnic,
        patientWeight: dto.patientWeight,
        prescriptionDate,
        diagnosis: dto.diagnosis,
        chiefComplaint: dto.chiefComplaint,
        imageUrls: dto.imageUrls ?? [],
        isRefillable: dto.isRefillable ?? false,
        refillsAllowed: dto.isRefillable ? dto.refillsAllowed ?? 0 : 0,
        refillFrequency: dto.refillFrequency,
        isInsuranceClaim: dto.isInsuranceClaim ?? false,
        insuranceProvider: dto.insuranceProvider,
        insuranceApprovalCode: dto.insuranceApprovalCode,
        notes: dto.notes,
        items: {
          create: dto.items.map((it, idx) => {
            const p = it.productId ? byId.get(it.productId) : undefined;
            return {
              productId: it.productId || undefined,
              medicineName: it.medicineName.trim(),
              saltName: it.saltName,
              strength: it.strength,
              dose: it.dose,
              frequency: it.frequency,
              duration: it.duration,
              route: it.route,
              instructions: it.instructions,
              prescribedQty: it.prescribedQty,
              // Quantity is counted in the product's own unit.
              unit: p?.unit ?? it.unit ?? 'tablet',
              // Shelf price as the starting rate, so dispensing is not billed at 0.
              unitPrice: p ? Number(p.price) || 0 : 0,
              displayOrder: idx,
            };
          }),
        },
      },
      include: { items: true, doctor: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; doctorId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.prescription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.doctorId && { doctorId: params.doctorId }),
        ...(params.from || params.to ? {
          createdAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { prescriptionNumber: { contains: params.search, mode: 'insensitive' } },
            { patientName: { contains: params.search, mode: 'insensitive' } },
            { patientPhone: { contains: params.search } },
            { doctorName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        doctor: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * One page of prescriptions for the list screen, with the count per status
   * and the value dispensed over the whole filter (status aside), so the tabs
   * and totals do not depend on the page being viewed.
   */
  async page(user: AuthenticatedUser, scope: ShopScope, q: ListPrescriptionsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const created = await dayRange(this.tz, user.tenantId, q.from, q.to);
    const search = q.search?.trim();
    const base: Prisma.PrescriptionWhereInput = {
      tenantId: user.tenantId,
      ...scope.whereLoose,
      ...(q.doctorId && { doctorId: q.doctorId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...((created.gte || created.lt) && { createdAt: created }),
      ...(search && {
        AND: [{
          OR: [
            { prescriptionNumber: { contains: search, mode: 'insensitive' } },
            { patientName: { contains: search, mode: 'insensitive' } },
            { patientPhone: { contains: search } },
            { patientCnic: { contains: search } },
            { doctorName: { contains: search, mode: 'insensitive' } },
            { items: { some: { medicineName: { contains: search, mode: 'insensitive' } } } },
          ],
        }],
      }),
    };
    const status = q.status && STATUSES.includes(q.status as PrescriptionStatus) ? (q.status as PrescriptionStatus) : undefined;
    const where: Prisma.PrescriptionWhereInput = { ...base, ...(status && { status }) };

    const [items, total, byStatus, value] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: { doctor: { select: { id: true, name: true, specialization: true } }, items: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
      this.prisma.prescription.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.prescription.aggregate({ where: base, _sum: { totalAmount: true } }),
    ]);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<PrescriptionStatus, number>;
    for (const r of byStatus) counts[r.status] = r._count._all;
    return {
      items,
      total,
      page,
      limit,
      counts: { all: byStatus.reduce((t, r) => t + r._count._all, 0), ...counts },
      dispensedValue: round2(Number(value._sum.totalAmount ?? 0)),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        doctor: true,
        items: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!rx) throw new NotFoundException('Nuskha nahi mila');
    // The latest bill made from this prescription, for the receipt link.
    const sale = rx.saleId
      ? await this.prisma.sale.findFirst({
        where: { id: rx.saleId, tenantId: user.tenantId },
        select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, soldAt: true },
      })
      : null;
    return { ...rx, sale };
  }

  async verify(user: AuthenticatedUser, id: string, notes?: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId: user.tenantId }, select: { status: true } });
    if (!rx) throw new NotFoundException('Nuskha nahi mila');
    if (rx.status !== 'PENDING') throw new BadRequestException('Sirf naya (check baqi) nuskha verify ho sakta hai');

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedById: user.id,
        verifiedAt: new Date(),
        verificationNotes: notes,
      },
      include: { items: true },
    });
  }

  /**
   * Turns a prescription down. Nothing dispensed yet: rejected. Part already
   * handed over: the rest is cancelled; the bill already made stays.
   */
  async reject(user: AuthenticatedUser, id: string, reason: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId: user.tenantId }, select: { status: true } });
    if (!rx) throw new NotFoundException('Nuskha nahi mila');
    if (!['PENDING', 'VERIFIED', 'PARTIALLY_DISPENSED'].includes(rx.status)) {
      throw new BadRequestException('Ye nuskha pehle hi band ho chuka hai');
    }
    return this.prisma.prescription.update({
      where: { id },
      data: { status: rx.status === 'PARTIALLY_DISPENSED' ? 'CANCELLED' : 'REJECTED', rejectionReason: reason.trim() },
    });
  }

  /**
   * Hands medicines over and bills them as one normal sale, so stock (shop
   * and product), the patient's khata, the cash drawer and every report see
   * it exactly like a counter sale. The chosen batch is drawn down and
   * narcotics get a register line.
   */
  async dispense(user: AuthenticatedUser, scope: ShopScope, id: string, dto: DispenseDto) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!rx) throw new NotFoundException('Nuskha nahi mila');
    if (rx.status === 'DISPENSED') throw new BadRequestException('Is nuskhe ki saari dawai pehle de di gayi hai');
    if (rx.status === 'REJECTED' || rx.status === 'CANCELLED') throw new BadRequestException('Ye nuskha radd ho chuka hai');
    if (!['VERIFIED', 'PARTIALLY_DISPENSED'].includes(rx.status)) {
      throw new BadRequestException('Pehle nuskha verify karein');
    }

    type Line = { rxItem: (typeof rx.items)[number]; qty: number; productId: string; batchId?: string; unitPrice: number; isSubstituted?: boolean; substituteFor?: string };
    const lines: Line[] = [];
    const seen = new Set<string>();
    for (const d of dto.items) {
      if (!(d.dispensedQty > 0)) continue;
      const rxItem = rx.items.find((r) => r.id === d.itemId);
      if (!rxItem) throw new BadRequestException('Ye dawai is nuskhe me nahi hai');
      if (seen.has(rxItem.id)) throw new BadRequestException(`${rxItem.medicineName} do dafa bheji gayi`);
      seen.add(rxItem.id);
      const remaining = rxItem.prescribedQty - rxItem.dispensedQty;
      if (d.dispensedQty > remaining + 1e-9) {
        throw new BadRequestException(`${rxItem.medicineName}: sirf ${remaining} baqi hai`);
      }
      const productId = d.productId || rxItem.productId;
      if (!productId) {
        throw new BadRequestException(`${rxItem.medicineName}: pehle is dawai ko stock wale product se jorein`);
      }
      const substituted = !!rxItem.productId && productId !== rxItem.productId;
      lines.push({
        rxItem,
        qty: d.dispensedQty,
        productId,
        batchId: d.batchId || undefined,
        unitPrice: d.unitPrice ?? rxItem.unitPrice,
        isSubstituted: d.isSubstituted ?? (substituted || undefined),
        substituteFor: d.substituteFor ?? (substituted ? rxItem.medicineName : undefined),
      });
    }
    if (!lines.length) throw new BadRequestException('Koi dawai nahi chuni');

    const ids = [...new Set(lines.map((l) => l.productId))];
    const owned = await this.prisma.product.count({ where: { id: { in: ids }, tenantId: user.tenantId } });
    if (owned !== ids.length) throw new NotFoundException('Dawai (product) nahi mili');
    for (const l of lines) {
      if (!l.batchId) continue;
      const batch = await this.prisma.productBatch.findFirst({
        where: { id: l.batchId, productId: l.productId, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!batch) throw new NotFoundException(`${l.rxItem.medicineName}: batch nahi mila`);
    }

    const billed = round2(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0) - (dto.discount ?? 0));
    if (billed < 0) throw new BadRequestException('Discount bill se zyada hai');
    const lineNote = [`Nuskha ${rx.prescriptionNumber}`, rx.doctorName ? `Dr. ${rx.doctorName}` : ''].filter(Boolean).join(' · ');
    const sale: any = await this.sales.create(user, scope, {
      shopId: dto.shopId || rx.shopId || undefined,
      customerId: rx.customerId || undefined,
      paymentMethod: dto.paymentMethod ?? 'CASH',
      paidAmount: dto.paidAmount ?? billed,
      ...(dto.payments?.length && { payments: dto.payments }),
      discount: dto.discount ?? 0,
      ...(dto.managerPin && { managerPin: dto.managerPin }),
      // The sale takes the chosen batch first (or the earliest expiry) and records it.
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.qty,
        priceOverride: l.unitPrice,
        batchId: l.batchId,
        note: l.substituteFor ? `${lineNote} · ${l.substituteFor} ki jagah` : lineNote,
        ...(dto.notes && { internalNote: dto.notes }),
      })),
    } as any);

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const l of lines) {
        const newDispensedQty = l.rxItem.dispensedQty + l.qty;
        await tx.prescriptionItem.update({
          where: { id: l.rxItem.id },
          data: {
            dispensedQty: newDispensedQty,
            isDispensed: newDispensedQty >= l.rxItem.prescribedQty - 1e-9,
            unitPrice: l.unitPrice,
            totalPrice: round2(l.rxItem.totalPrice + l.unitPrice * l.qty),
            productId: l.productId,
            batchId: l.batchId ?? l.rxItem.batchId,
            isSubstituted: l.isSubstituted ?? l.rxItem.isSubstituted,
            substituteFor: l.substituteFor ?? l.rxItem.substituteFor,
          },
        });
      }

      const items = await tx.prescriptionItem.findMany({ where: { prescriptionId: id } });
      const allDispensed = items.every((it) => it.isDispensed);
      const someDispensed = items.some((it) => it.dispensedQty > 0);
      const days = allDispensed && rx.isRefillable && rx.refillFrequency ? REFILL_DAYS[rx.refillFrequency] : null;
      return tx.prescription.update({
        where: { id },
        data: {
          status: allDispensed ? 'DISPENSED' : someDispensed ? 'PARTIALLY_DISPENSED' : rx.status,
          dispensedById: allDispensed ? user.id : rx.dispensedById,
          dispensedAt: allDispensed ? new Date() : rx.dispensedAt,
          totalAmount: round2(rx.totalAmount + Number(sale.total ?? 0)),
          saleId: sale.id,
          ...(days && { nextRefillDate: new Date(Date.now() + days * 86_400_000) }),
        },
        include: { items: true, doctor: true },
      });
    });

    // A refillable prescription gets a reminder for the patient's next visit.
    if (updated.nextRefillDate && updated.customerId && updated.status === 'DISPENSED' && rx.refillsUsed < rx.refillsAllowed) {
      await this.prisma.refillReminder.create({
        data: {
          tenantId: user.tenantId,
          customerId: updated.customerId,
          prescriptionId: rx.id,
          productId: lines[0].productId,
          medicineName: lines.map((l) => l.rxItem.medicineName).join(', ').slice(0, 190),
          scheduledFor: updated.nextRefillDate,
          reminderType: 'WHATSAPP',
          status: 'PENDING',
        },
      }).catch((e: Error) => this.logger.warn(`Refill reminder not saved for ${rx.prescriptionNumber}: ${e.message}`));
    }

    // Narcotic register lines; a failure here must not undo a completed sale.
    for (const l of lines) {
      try {
        const med = await this.prisma.pharmacyMedicine.findFirst({
          where: { productId: l.productId, tenantId: user.tenantId, ...IN_REGISTER },
          select: { id: true },
        });
        if (!med) continue;
        await this.controlledLog.record(this.prisma, user.tenantId, {
          productId: l.productId,
          logType: 'SALE',
          quantity: l.qty,
          unit: l.rxItem.unit,
          batchId: l.batchId,
          saleId: sale.id,
          prescriptionId: rx.id,
          prescriptionNumber: rx.prescriptionNumber,
          patientName: rx.patientName ?? undefined,
          patientCnic: rx.patientCnic ?? undefined,
          patientPhone: rx.patientPhone ?? undefined,
          doctorName: rx.doctorName ?? undefined,
          doctorRegNumber: rx.doctorRegNumber ?? undefined,
        }, user.email);
      } catch (e) {
        this.logger.warn(`Narcotic register entry failed for ${rx.prescriptionNumber}: ${(e as Error).message}`);
      }
    }

    return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber, total: sale.total, creditAmount: sale.creditAmount } };
  }

  async refill(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!rx) throw new NotFoundException('Nuskha nahi mila');
    if (rx.type === 'REFILL') throw new BadRequestException('Refill asal nuskhe se banayein');
    if (!rx.isRefillable) throw new BadRequestException('Ye nuskha refill wala nahi');
    // CANCELLED means the rest was closed after some medicine was given, so a refill still makes sense.
    if (rx.status === 'REJECTED') throw new BadRequestException('Ye nuskha radd ho chuka hai');
    if (rx.status === 'PENDING') throw new BadRequestException('Pehle asal nuskha check karein');
    if (rx.refillsUsed >= rx.refillsAllowed) throw new BadRequestException('Is nuskhe ke saare refill ho chuke');

    // Bill at today's shelf price; the old rate may be stale or 0.
    const productIds = [...new Set(rx.items.map((it) => it.productId).filter(Boolean) as string[])];
    const prices = new Map(
      (productIds.length
        ? await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, price: true } })
        : []
      ).map((p) => [p.id, p.price]),
    );

    const newNumber = await this.nextNumber(user.tenantId);

    // Count the refill only if the new prescription was made.
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.prescription.updateMany({
        where: { id, refillsUsed: { lt: rx.refillsAllowed } },
        data: { refillsUsed: { increment: 1 } },
      });
      if (!claimed.count) throw new BadRequestException('Is nuskhe ke saare refill ho chuke');
      return tx.prescription.create({
        data: {
          tenantId: user.tenantId,
          shopId: rx.shopId,
          customerId: rx.customerId,
          doctorId: rx.doctorId,
          prescriptionNumber: newNumber,
          type: 'REFILL',
          status: 'VERIFIED',
          verifiedById: user.id,
          verifiedAt: new Date(),
          doctorName: rx.doctorName,
          doctorRegNumber: rx.doctorRegNumber,
          doctorSpeciality: rx.doctorSpeciality,
          hospitalName: rx.hospitalName,
          patientName: rx.patientName,
          patientAge: rx.patientAge,
          patientGender: rx.patientGender,
          patientPhone: rx.patientPhone,
          patientCnic: rx.patientCnic,
          patientWeight: rx.patientWeight,
          diagnosis: rx.diagnosis,
          chiefComplaint: rx.chiefComplaint,
          imageUrls: rx.imageUrls,
          isRefillable: false,
          refillsAllowed: 0,
          refillFrequency: rx.refillFrequency,
          notes: `Refill of ${rx.prescriptionNumber}`,
          items: {
            create: rx.items.map((it) => ({
              productId: it.productId,
              medicineName: it.medicineName,
              saltName: it.saltName,
              strength: it.strength,
              dose: it.dose,
              frequency: it.frequency,
              duration: it.duration,
              route: it.route,
              instructions: it.instructions,
              prescribedQty: it.prescribedQty,
              unit: it.unit,
              unitPrice: (it.productId && prices.get(it.productId)) || it.unitPrice,
              displayOrder: it.displayOrder,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const where: any = { tenantId: user.tenantId };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from && { gte: new Date(params.from) }),
        ...(params.to && { lte: new Date(params.to) }),
      };
    }

    const [byStatus, byType, totalRevenue] = await Promise.all([
      this.prisma.prescription.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.prescription.groupBy({ by: ['type'], where, _count: { _all: true } }),
      this.prisma.prescription.aggregate({ where: { ...where, status: 'DISPENSED' }, _sum: { totalAmount: true } }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      byStatus,
      byType,
    };
  }
}
