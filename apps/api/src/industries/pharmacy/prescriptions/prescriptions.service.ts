import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ControlledLogService } from '../controlled-log/controlled-log.service';
import { CreatePrescriptionDto, DispenseDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly controlledLog: ControlledLogService,
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

  async create(user: AuthenticatedUser, dto: CreatePrescriptionDto) {
    // The form sends '' for a doctor or patient that was not picked.
    const customerId = dto.customerId || undefined;
    const doctorId = dto.doctorId || undefined;
    if (customerId && !(await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Customer nahi mila');
    }
    if (doctorId && !(await this.prisma.doctor.findFirst({ where: { id: doctorId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Doctor nahi mila');
    }
    const productIds = [...new Set(dto.items.map((it) => it.productId).filter(Boolean) as string[])];
    const products = productIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, price: true } })
      : [];
    if (products.length !== productIds.length) throw new NotFoundException('Dawai (product) nahi mili');
    const priceOf = new Map(products.map((p) => [p.id, p.price]));
    const prescriptionNumber = await this.nextNumber(user.tenantId);

    return this.prisma.prescription.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId || undefined,
        customerId,
        doctorId,
        prescriptionNumber,
        type: dto.type ?? 'WALK_IN',
        status: 'PENDING',
        doctorName: dto.doctorName,
        doctorRegNumber: dto.doctorRegNumber,
        doctorSpeciality: dto.doctorSpeciality,
        hospitalName: dto.hospitalName,
        patientName: dto.patientName,
        patientAge: dto.patientAge,
        patientGender: dto.patientGender,
        patientPhone: dto.patientPhone,
        patientCnic: dto.patientCnic,
        patientWeight: dto.patientWeight,
        prescriptionDate: dto.prescriptionDate ? new Date(dto.prescriptionDate) : null,
        diagnosis: dto.diagnosis,
        chiefComplaint: dto.chiefComplaint,
        imageUrls: dto.imageUrls ?? [],
        isRefillable: dto.isRefillable ?? false,
        refillsAllowed: dto.refillsAllowed ?? 0,
        refillFrequency: dto.refillFrequency,
        isInsuranceClaim: dto.isInsuranceClaim ?? false,
        insuranceProvider: dto.insuranceProvider,
        insuranceApprovalCode: dto.insuranceApprovalCode,
        notes: dto.notes,
        items: {
          create: dto.items.map((it, idx) => ({
            productId: it.productId || undefined,
            medicineName: it.medicineName,
            saltName: it.saltName,
            strength: it.strength,
            dose: it.dose,
            frequency: it.frequency,
            duration: it.duration,
            route: it.route,
            instructions: it.instructions,
            prescribedQty: it.prescribedQty,
            unit: it.unit ?? 'tablet',
            // Shelf price as the starting rate, so dispensing is not billed at 0.
            unitPrice: it.productId ? priceOf.get(it.productId) ?? 0 : 0,
            displayOrder: idx,
          })),
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
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }

  async verify(user: AuthenticatedUser, id: string, notes?: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.status !== 'PENDING') throw new BadRequestException(`Cannot verify — status is ${rx.status}`);

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

  async reject(user: AuthenticatedUser, id: string, reason: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');
    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason },
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
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.status === 'DISPENSED') throw new BadRequestException('Is nuskhe ki saari dawai pehle de di gayi hai');
    if (rx.status === 'REJECTED' || rx.status === 'CANCELLED') throw new BadRequestException('Ye nuskha radd ho chuka hai');
    if (!['VERIFIED', 'PARTIALLY_DISPENSED'].includes(rx.status)) {
      throw new BadRequestException(`Pehle nuskha verify karein (abhi status ${rx.status} hai)`);
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
      lines.push({
        rxItem,
        qty: d.dispensedQty,
        productId,
        batchId: d.batchId || undefined,
        unitPrice: d.unitPrice ?? rxItem.unitPrice,
        isSubstituted: d.isSubstituted,
        substituteFor: d.substituteFor,
      });
    }
    if (!lines.length) throw new BadRequestException('Koi dawai nahi chuni');

    for (const l of lines) {
      if (!l.batchId) continue;
      const batch = await this.prisma.productBatch.findFirst({
        where: { id: l.batchId, productId: l.productId, tenantId: user.tenantId },
      });
      if (!batch) throw new NotFoundException(`${l.rxItem.medicineName}: batch nahi mila`);
    }

    const sale: any = await this.sales.create(user, scope, {
      shopId: dto.shopId || rx.shopId || undefined,
      customerId: rx.customerId || undefined,
      paymentMethod: dto.paymentMethod ?? 'CASH',
      paidAmount: dto.paidAmount ?? lines.reduce((s, l) => s + l.unitPrice * l.qty, 0) - (dto.discount ?? 0),
      discount: dto.discount ?? 0,
      note: [`Nuskha ${rx.prescriptionNumber}`, rx.doctorName ? `Dr. ${rx.doctorName}` : '', dto.notes || ''].filter(Boolean).join(' · '),
      items: lines.map((l) => ({ productId: l.productId, quantity: l.qty, priceOverride: l.unitPrice })),
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
            totalPrice: l.rxItem.totalPrice + l.unitPrice * l.qty,
            productId: l.productId,
            batchId: l.batchId ?? l.rxItem.batchId,
            isSubstituted: l.isSubstituted ?? l.rxItem.isSubstituted,
            substituteFor: l.substituteFor ?? l.rxItem.substituteFor,
          },
        });
        if (l.batchId) {
          const batch = await tx.productBatch.findUnique({ where: { id: l.batchId }, select: { quantity: true } });
          const take = Math.min(Math.round(l.qty), batch?.quantity ?? 0);
          if (take > 0) {
            await tx.productBatch.update({ where: { id: l.batchId }, data: { quantity: { decrement: take } } });
          }
        }
      }

      const items = await tx.prescriptionItem.findMany({ where: { prescriptionId: id } });
      const allDispensed = items.every((it) => it.isDispensed);
      const someDispensed = items.some((it) => it.dispensedQty > 0);
      return tx.prescription.update({
        where: { id },
        data: {
          status: allDispensed ? 'DISPENSED' : someDispensed ? 'PARTIALLY_DISPENSED' : rx.status,
          dispensedById: allDispensed ? user.id : rx.dispensedById,
          dispensedAt: allDispensed ? new Date() : rx.dispensedAt,
          totalAmount: rx.totalAmount + Number(sale.total ?? 0),
          saleId: sale.id,
        },
        include: { items: true, doctor: true },
      });
    });

    // Narcotic register lines; a failure here must not undo a completed sale.
    for (const l of lines) {
      try {
        const med = await this.prisma.pharmacyMedicine.findFirst({
          where: { productId: l.productId, tenantId: user.tenantId, isNarcotic: true },
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
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.type === 'REFILL') throw new BadRequestException('Refill asal nuskhe se banayein');
    if (!rx.isRefillable) throw new BadRequestException('Ye nuskha refill wala nahi');
    if (rx.refillsUsed >= rx.refillsAllowed) throw new BadRequestException('Is nuskhe ke saare refill ho chuke');

    // Bill at today's shelf price; the old rate may be stale or 0.
    const productIds = [...new Set(rx.items.map((it) => it.productId).filter(Boolean) as string[])];
    const prices = new Map(
      (productIds.length
        ? await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, price: true } })
        : []
      ).map((p) => [p.id, p.price]),
    );

    // Create new prescription based on original
    const newNumber = await this.nextNumber(user.tenantId);

    const newRx = await this.prisma.prescription.create({
      data: {
        tenantId: user.tenantId,
        shopId: rx.shopId,
        customerId: rx.customerId,
        doctorId: rx.doctorId,
        prescriptionNumber: newNumber,
        type: 'REFILL',
        status: 'VERIFIED',
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

    // Increment refill count on original
    await this.prisma.prescription.update({
      where: { id },
      data: { refillsUsed: { increment: 1 } },
    });

    return newRx;
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
