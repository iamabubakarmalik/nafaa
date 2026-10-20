import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addMonths, differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { addDaysTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { ensureCustomer } from '../../_shared/industry-sale.helper';
import { checkEyePower, nextNumber, pageArgs, type PageArgs } from '../common/optical-common';
import { UpdatePrescriptionDto, UpsertPrescriptionDto } from './dto/upsert-prescription.dto';

export type RxView = 'active' | 'expiring' | 'expired' | 'inactive' | 'all';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(dto: Partial<UpsertPrescriptionDto>) {
    checkEyePower(dto);
    const date = dto.prescriptionDate ? new Date(dto.prescriptionDate) : null;
    const expiry = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (date && Number.isNaN(date.getTime())) throw new BadRequestException('Prescription ki date sahi nahi');
    if (expiry && Number.isNaN(expiry.getTime())) throw new BadRequestException('Muddat ki date sahi nahi');
    if (date && expiry && expiry <= date) throw new BadRequestException('Muddat prescription ki date ke baad honi chahiye');
  }

  private numberFor(user: AuthenticatedUser, count: number) {
    return nextNumber('RX', count, async (n) =>
      !!(await this.prisma.opticalPrescription.findFirst({ where: { tenantId: user.tenantId, prescriptionNumber: n }, select: { id: true } })));
  }

  async create(user: AuthenticatedUser, dto: UpsertPrescriptionDto) {
    this.validate(dto);
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');

    const count = await this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } });
    const prescriptionNumber = await this.numberFor(user, count);
    // Linked to the customer's record when there is a phone, so their history stays together.
    const customerId = dto.customerId || dto.customerPhone?.trim()
      ? await ensureCustomer(this.prisma, user, { customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone })
      : undefined;

    const prescriptionDate = dto.prescriptionDate ? new Date(dto.prescriptionDate) : new Date();
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : addMonths(prescriptionDate, 12);

    return this.prisma.opticalPrescription.create({
      data: {
        tenantId: user.tenantId,
        prescriptionNumber,
        ...dto,
        customerId,
        customerName: dto.customerName.trim(),
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
    const now = startOfDayTz();
    const in60 = addDaysTz(now, 60);

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
    if (!rx) throw new NotFoundException('Prescription nahi mila');

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

  async update(user: AuthenticatedUser, id: string, dto: UpdatePrescriptionDto) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription nahi mila');
    this.validate({ ...rx, ...dto } as Partial<UpsertPrescriptionDto>);

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
    if (!rx) throw new NotFoundException('Prescription nahi mila');

    const merged = { ...rx, ...overrides } as Partial<UpsertPrescriptionDto>;
    this.validate({ ...merged, prescriptionDate: undefined, expiryDate: undefined });
    const count = await this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } });
    const prescriptionNumber = await this.numberFor(user, count);
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
        notes: `${rx.prescriptionNumber} se renew`,
        isActive: true,
      },
    });
  }

  async deactivate(user: AuthenticatedUser, id: string) {
    const rx = await this.prisma.opticalPrescription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rx) throw new NotFoundException('Prescription nahi mila');
    return this.prisma.opticalPrescription.update({ where: { id }, data: { isActive: false } });
  }

  /** Kept for old callers: prescriptions are history, so removing one switches it off. */
  async remove(user: AuthenticatedUser, id: string) {
    return this.deactivate(user, id);
  }

  private viewWhere(view: RxView): Prisma.OpticalPrescriptionWhereInput {
    const today = startOfDayTz();
    switch (view) {
      case 'active': return { isActive: true, OR: [{ expiryDate: null }, { expiryDate: { gte: today } }] };
      case 'expiring': return { isActive: true, expiryDate: { gte: today, lte: addDaysTz(today, 60) } };
      case 'expired': return { expiryDate: { lt: today } };
      case 'inactive': return { isActive: false };
      default: return {};
    }
  }

  async page(user: AuthenticatedUser, q: PageArgs & { view?: string; search?: string; from?: string; to?: string; customerId?: string; type?: string }) {
    const { page, limit, skip } = pageArgs(q);
    const term = q.search?.trim();
    const where: Prisma.OpticalPrescriptionWhereInput = {
      tenantId: user.tenantId,
      AND: [
        this.viewWhere((q.view ?? 'active') as RxView),
        ...(term ? [{ OR: [
          { prescriptionNumber: { contains: term, mode: 'insensitive' as const } },
          { customerName: { contains: term, mode: 'insensitive' as const } },
          { customerPhone: { contains: term } },
          { doctorName: { contains: term, mode: 'insensitive' as const } },
        ] }] : []),
      ],
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.type && { prescriptionType: q.type as Prisma.OpticalPrescriptionWhereInput['prescriptionType'] }),
      ...(q.from || q.to ? { prescriptionDate: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.opticalPrescription.findMany({ where, orderBy: { prescriptionDate: 'desc' }, skip, take: limit }),
      this.prisma.opticalPrescription.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async expiringSoon(user: AuthenticatedUser, days = 60) {
    const now = startOfDayTz();
    const future = addDaysTz(now, Math.min(Math.max(Number(days) || 60, 1), 365));
    return this.prisma.opticalPrescription.findMany({
      where: { tenantId: user.tenantId, isActive: true, expiryDate: { gte: now, lte: future } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const now = startOfDayTz();
    const in60 = addDaysTz(now, 60);
    const monthStart = startOfMonthTz();

    const [total, active, expiringSoon, expired, thisMonth] = await Promise.all([
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, ...this.viewWhere('active') } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, isActive: true, expiryDate: { gte: now, lte: in60 } } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, expiryDate: { lt: now } } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, prescriptionDate: { gte: monthStart } } }),
    ]);

    return { total, active, expiringSoon, expired, thisMonth };
  }
}
