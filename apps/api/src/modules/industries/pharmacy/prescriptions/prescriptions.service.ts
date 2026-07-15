import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreatePrescriptionDto, DispenseDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreatePrescriptionDto) {
    const count = await this.prisma.prescription.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const prescriptionNumber = `Rx-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.prescription.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        customerId: dto.customerId,
        doctorId: dto.doctorId,
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
            unit: it.unit ?? 'tablet',
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

  async dispense(user: AuthenticatedUser, id: string, dto: DispenseDto) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (!['VERIFIED', 'PARTIALLY_DISPENSED'].includes(rx.status)) {
      throw new BadRequestException(`Cannot dispense — status is ${rx.status}. Verify first.`);
    }

    let totalAmount = 0;

    for (const dispatchItem of dto.items) {
      const rxItem = rx.items.find((r) => r.id === dispatchItem.itemId);
      if (!rxItem) continue;

      const newDispensedQty = rxItem.dispensedQty + dispatchItem.dispensedQty;
      const isFullyDispensed = newDispensedQty >= rxItem.prescribedQty;
      const unitPrice = dispatchItem.unitPrice ?? rxItem.unitPrice;
      const linePrice = unitPrice * dispatchItem.dispensedQty;
      totalAmount += linePrice;

      await this.prisma.prescriptionItem.update({
        where: { id: rxItem.id },
        data: {
          dispensedQty: newDispensedQty,
          isDispensed: isFullyDispensed,
          unitPrice,
          totalPrice: rxItem.totalPrice + linePrice,
          productId: dispatchItem.productId ?? rxItem.productId,
          batchId: dispatchItem.batchId ?? rxItem.batchId,
          isSubstituted: dispatchItem.isSubstituted ?? rxItem.isSubstituted,
          substituteFor: dispatchItem.substituteFor ?? rxItem.substituteFor,
        },
      });

      // Deduct stock
      if (dispatchItem.productId) {
        await this.prisma.product.update({
          where: { id: dispatchItem.productId },
          data: { stock: { decrement: dispatchItem.dispensedQty } },
        });

        if (dispatchItem.batchId) {
          await this.prisma.productBatch.update({
            where: { id: dispatchItem.batchId },
            data: { quantity: { decrement: dispatchItem.dispensedQty } },
          });
        }

        await this.prisma.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: dispatchItem.productId,
            type: 'SALE_OUT',
            quantity: -dispatchItem.dispensedQty,
            balanceAfter: 0,
            reference: rx.prescriptionNumber,
            note: `Dispensed to ${rx.patientName || 'patient'}`,
          },
        });
      }
    }

    // Update prescription status
    const updated = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: true },
    });

    const allDispensed = updated!.items.every((it) => it.isDispensed);
    const someDispensed = updated!.items.some((it) => it.isDispensed);

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: allDispensed ? 'DISPENSED' : someDispensed ? 'PARTIALLY_DISPENSED' : rx.status,
        dispensedById: allDispensed ? user.id : rx.dispensedById,
        dispensedAt: allDispensed ? new Date() : rx.dispensedAt,
        totalAmount: rx.totalAmount + totalAmount,
      },
      include: { items: true, doctor: true },
    });
  }

  async refill(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (!rx.isRefillable) throw new BadRequestException('Not refillable');
    if (rx.refillsUsed >= rx.refillsAllowed) throw new BadRequestException('No refills remaining');

    // Create new prescription based on original
    const count = await this.prisma.prescription.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const newNumber = `Rx-${year}-${String(count + 1).padStart(4, '0')}`;

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
        isRefillable: rx.refillsUsed + 1 < rx.refillsAllowed,
        refillsAllowed: Math.max(rx.refillsAllowed - rx.refillsUsed - 1, 0),
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
