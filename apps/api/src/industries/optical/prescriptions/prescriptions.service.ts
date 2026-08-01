import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths, differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';

const AXIS_MIN = 0;
const AXIS_MAX = 180;

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(dto: UpsertPrescriptionDto) {
    const errors: string[] = [];
    const checkAxis = (axis: number | undefined, side: string) => {
      if (axis == null) return;
      if (axis < AXIS_MIN || axis > AXIS_MAX) errors.push(`${side} axis must be between 0 and 180`);
    };
    checkAxis(dto.rightAxis, 'Right');
    checkAxis(dto.leftAxis, 'Left');

    // If CYL entered, AXIS is mandatory (optical rule)
    if (dto.rightCyl != null && dto.rightCyl !== 0 && dto.rightAxis == null) {
      errors.push('Right axis is required when right CYL is entered');
    }
    if (dto.leftCyl != null && dto.leftCyl !== 0 && dto.leftAxis == null) {
      errors.push('Left axis is required when left CYL is entered');
    }

    const checkSph = (v: number | undefined, side: string) => {
      if (v == null) return;
      if (v < -30 || v > 30) errors.push(`${side} SPH out of realistic range (-30 to +30)`);
    };
    checkSph(dto.rightSph, 'Right');
    checkSph(dto.leftSph, 'Left');

    if (errors.length) throw new BadRequestException(errors.join('; '));
  }

  async create(user: AuthenticatedUser, dto: UpsertPrescriptionDto) {
    this.validate(dto);

    const count = await this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const prescriptionNumber = `RX-${year}-${String(count + 1).padStart(5, '0')}`;

    const prescriptionDate = dto.prescriptionDate ? new Date(dto.prescriptionDate) : new Date();
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : addMonths(prescriptionDate, 12);

    return this.prisma.opticalPrescription.create({
      data: {
        tenantId: user.tenantId,
        prescriptionNumber,
        ...dto,
        prescriptionDate,
        expiryDate,
        imageUrls: dto.imageUrls ?? [],
        documentUrls: dto.documentUrls ?? [],
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    customerId?: string; active?: boolean; expiringSoon?: boolean; expired?: boolean;
    prescriptionType?: string; from?: string; to?: string; search?: string;
  }) {
    const now = new Date();
    const in60 = new Date(); in60.setDate(in60.getDate() + 60);

    return this.prisma.opticalPrescription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.prescriptionType && { prescriptionType: params.prescriptionType as any }),
        ...(params.expiringSoon && { isActive: true, expiryDate: { gte: now, lte: in60 } }),
        ...(params.expired && { expiryDate: { lt: now } }),
        ...(params.from || params.to ? {
          prescriptionDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { prescriptionNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { doctorName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { prescriptionDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');

    const lensOrders = await this.prisma.opticalLensOrder.findMany({
      where: { tenantId: user.tenantId, prescriptionId: id },
      orderBy: { orderedAt: 'desc' },
      take: 20,
    });

    const daysToExpiry = rx.expiryDate ? differenceInDays(new Date(rx.expiryDate), new Date()) : null;

    return {
      ...rx,
      lensOrders,
      computed: {
        daysToExpiry,
        isExpired: daysToExpiry != null && daysToExpiry < 0,
        isExpiringSoon: daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= 60,
        rightEyeSummary: this.formatEye(rx.rightSph, rx.rightCyl, rx.rightAxis, rx.rightAdd),
        leftEyeSummary: this.formatEye(rx.leftSph, rx.leftCyl, rx.leftAxis, rx.leftAdd),
      },
    };
  }

  private formatEye(sph?: number | null, cyl?: number | null, axis?: number | null, add?: number | null) {
    if (sph == null && cyl == null) return null;
    const s = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
    let out = sph != null ? `SPH ${s(sph)}` : '';
    if (cyl != null && cyl !== 0) out += ` / CYL ${s(cyl)}`;
    if (axis != null) out += ` x ${axis}°`;
    if (add != null && add !== 0) out += ` / ADD ${s(add)}`;
    return out.trim();
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.opticalPrescription.findMany({
      where: { tenantId: user.tenantId, customerId },
      orderBy: { prescriptionDate: 'desc' },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertPrescriptionDto) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');
    this.validate(dto);

    return this.prisma.opticalPrescription.update({
      where: { id },
      data: {
        ...dto,
        prescriptionDate: dto.prescriptionDate ? new Date(dto.prescriptionDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  /** Create a fresh copy (renewal) from an existing prescription */
  async renew(user: AuthenticatedUser, id: string, overrides?: Partial<UpsertPrescriptionDto>) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');

    const count = await this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const prescriptionNumber = `RX-${year}-${String(count + 1).padStart(5, '0')}`;
    const prescriptionDate = new Date();

    await this.prisma.opticalPrescription.update({ where: { id }, data: { isActive: false } });

    return this.prisma.opticalPrescription.create({
      data: {
        tenantId: user.tenantId,
        prescriptionNumber,
        customerId: rx.customerId,
        customerName: overrides?.customerName ?? rx.customerName,
        customerPhone: overrides?.customerPhone ?? rx.customerPhone,
        customerAge: overrides?.customerAge ?? rx.customerAge,
        customerGender: rx.customerGender,
        prescribedBy: overrides?.prescribedBy ?? rx.prescribedBy,
        doctorName: overrides?.doctorName ?? rx.doctorName,
        clinicName: rx.clinicName,
        prescriptionType: rx.prescriptionType,
        prescriptionDate,
        expiryDate: addMonths(prescriptionDate, 12),
        rightSph: overrides?.rightSph ?? rx.rightSph,
        rightCyl: overrides?.rightCyl ?? rx.rightCyl,
        rightAxis: overrides?.rightAxis ?? rx.rightAxis,
        rightAdd: overrides?.rightAdd ?? rx.rightAdd,
        rightPd: rx.rightPd,
        leftSph: overrides?.leftSph ?? rx.leftSph,
        leftCyl: overrides?.leftCyl ?? rx.leftCyl,
        leftAxis: overrides?.leftAxis ?? rx.leftAxis,
        leftAdd: overrides?.leftAdd ?? rx.leftAdd,
        leftPd: rx.leftPd,
        pupilDistance: rx.pupilDistance,
        segHeight: rx.segHeight,
        clRightBaseCurve: rx.clRightBaseCurve,
        clLeftBaseCurve: rx.clLeftBaseCurve,
        clRightDiameter: rx.clRightDiameter,
        clLeftDiameter: rx.clLeftDiameter,
        notes: `Renewed from ${rx.prescriptionNumber}`,
        isActive: true,
      },
    });
  }

  async deactivate(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');
    return this.prisma.opticalPrescription.update({ where: { id }, data: { isActive: false } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');
    const used = await this.prisma.opticalLensOrder.count({ where: { prescriptionId: id } });
    if (used > 0) throw new BadRequestException('Prescription used in lens orders — deactivate instead');
    return this.prisma.opticalPrescription.delete({ where: { id } });
  }

  async expiringSoon(user: AuthenticatedUser, days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.prisma.opticalPrescription.findMany({
      where: { tenantId: user.tenantId, isActive: true, expiryDate: { gte: now, lte: future } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const now = new Date();
    const in60 = new Date(); in60.setDate(in60.getDate() + 60);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, expiringSoon, expired, thisMonth] = await Promise.all([
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, isActive: true, expiryDate: { gte: now, lte: in60 } } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, expiryDate: { lt: now } } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, prescriptionDate: { gte: monthStart } } }),
    ]);

    return { total, active, expiringSoon, expired, thisMonth };
  }
}
