import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicPrescriptionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

const STATUSES = Object.values(ClinicPrescriptionStatus);
const str = (v: unknown, max = 200) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim().slice(0, max));
const bool = (v: unknown) => (v === undefined || v === null ? undefined : !!v);

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const items = Array.isArray(dto?.items) ? dto.items : [];
    if (!dto?.encounterId) throw new BadRequestException('Pehle checkup save karein');
    if (!items.length) throw new BadRequestException('Kam se kam ek dawai likhein');
    const encounter = await this.prisma.clinicEncounter.findFirst({ where: { id: dto.encounterId, tenantId: user.tenantId } });
    if (!encounter) throw new NotFoundException('Checkup nahi mila');

    const lines = items.map((it: any, i: number) => {
      const drugName = str(it?.drugName, 160);
      if (!drugName) throw new BadRequestException(`Line ${i + 1}: dawai ka naam likhein`);
      const days = it?.durationDays === undefined || it?.durationDays === '' || it?.durationDays === null ? undefined : Number(it.durationDays);
      if (days !== undefined && !(days > 0 && days <= 365)) throw new BadRequestException(`${drugName}: din 1 se 365 tak`);
      return {
        drugId: str(it.drugId, 60), drugName, strength: str(it.strength), form: str(it.form), dose: str(it.dose), frequency: str(it.frequency),
        route: str(it.route), durationDays: days, quantity: str(it.quantity), beforeMeal: bool(it.beforeMeal), afterMeal: bool(it.afterMeal),
        atBedtime: bool(it.atBedtime), emptyStomach: bool(it.emptyStomach), instructions: str(it.instructions, 1000), displayOrder: i,
      };
    });
    if (lines.some((l: { drugId?: string }) => l.drugId)) {
      const ids = lines.map((l: { drugId?: string }) => l.drugId).filter(Boolean) as string[];
      const found = await this.prisma.product.count({ where: { tenantId: user.tenantId, id: { in: ids } } });
      if (found !== new Set(ids).size) throw new BadRequestException('Dawai list me nahi mili');
    }
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;
    if (validUntil && Number.isNaN(validUntil.getTime())) throw new BadRequestException('Tareekh sahi likhein');

    for (let attempt = 0; ; attempt += 1) {
      const last = await this.prisma.clinicPrescription.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, select: { prescriptionNumber: true } });
      const seq = Number(/(\d+)$/.exec(last?.prescriptionNumber ?? '')?.[1] ?? 0) + 1 + attempt;
      try {
        return await this.prisma.clinicPrescription.create({
          data: {
            tenantId: user.tenantId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            doctorId: encounter.doctorId,
            prescriptionNumber: `RX-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`,
            generalInstructions: str(dto.generalInstructions, 2000),
            validUntil,
            totalItems: lines.length,
            items: { create: lines },
          },
          include: { items: { orderBy: { displayOrder: 'asc' } } },
        });
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** With patient and doctor names. Without `page` the old array; with `page` a page and total. */
  async list(user: AuthenticatedUser, params: Record<string, string | undefined>) {
    const q = params.search?.trim();
    const patientIds = q ? (await this.prisma.clinicPatientProfile.findMany({
      where: { tenantId: user.tenantId, OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { mrn: { contains: q, mode: 'insensitive' } }, { phonePrimary: { contains: q } }] },
      select: { id: true }, take: 200,
    })).map((p) => p.id) : [];
    const where: Prisma.ClinicPrescriptionWhereInput = {
      tenantId: user.tenantId,
      ...(params.patientId && { patientId: params.patientId }),
      ...(params.doctorId && { doctorId: params.doctorId }),
      ...(params.status && STATUSES.includes(params.status as ClinicPrescriptionStatus) && { status: params.status as ClinicPrescriptionStatus }),
      ...(params.from || params.to ? { issuedAt: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } } : {}),
      ...(q && { OR: [{ prescriptionNumber: { contains: q, mode: 'insensitive' } }, { items: { some: { drugName: { contains: q, mode: 'insensitive' } } } }, { patientId: { in: patientIds } }] }),
    };
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const [rows, total] = await Promise.all([
      this.prisma.clinicPrescription.findMany({ where, include: { items: { orderBy: { displayOrder: 'asc' } } }, orderBy: { issuedAt: 'desc' }, skip: params.page ? (page - 1) * limit : 0, take: params.page ? limit : 100 }),
      params.page ? this.prisma.clinicPrescription.count({ where }) : Promise.resolve(0),
    ]);
    const [patients, doctors, encounters] = await Promise.all([
      this.prisma.clinicPatientProfile.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.patientId))] } }, select: { id: true, fullName: true, mrn: true, phonePrimary: true, gender: true, dateOfBirth: true, allergies: true, customerId: true } }),
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.doctorId))] } }, select: { id: true, fullName: true, title: true, qualifications: true, pmcNumber: true } }),
      this.prisma.clinicEncounter.findMany({ where: { tenantId: user.tenantId, id: { in: rows.map((r) => r.encounterId) } }, select: { id: true, appointmentId: true, finalDiagnosis: true, provisionalDiagnosis: true, advice: true, followUpDate: true } }),
    ]);
    const items = rows.map((r) => ({
      ...r,
      patient: patients.find((p) => p.id === r.patientId) ?? null,
      doctor: doctors.find((d) => d.id === r.doctorId) ?? null,
      encounter: encounters.find((e) => e.id === r.encounterId) ?? null,
    }));
    return params.page ? { items, total, page, limit } : items;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.clinicPrescription.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: { orderBy: { displayOrder: 'asc' } } } });
    if (!p) throw new NotFoundException('Nuskha nahi mila');
    return p;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    await this.getOne(user, id);
    if (!STATUSES.includes(status as ClinicPrescriptionStatus)) throw new BadRequestException('Status ghalat hai');
    return this.prisma.clinicPrescription.update({ where: { id }, data: { status: status as ClinicPrescriptionStatus } });
  }
}
