import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicVaccineStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

const STATUSES = Object.values(ClinicVaccineStatus);
const str = (v: unknown, max = 200) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim().slice(0, max));

function date(v: unknown, label: string) {
  const d = new Date(String(v ?? ''));
  if (!v || Number.isNaN(d.getTime())) throw new BadRequestException(`${label} sahi likhein`);
  return d;
}

/** Pakistan EPI schedule: weeks after birth. */
const EPI = [
  { name: 'BCG', code: 'BCG', doseNumber: 1, weeks: 0 },
  { name: 'OPV-0', code: 'OPV0', doseNumber: 0, weeks: 0 },
  { name: 'Hepatitis B (birth)', code: 'HEPB0', doseNumber: 0, weeks: 0 },
  { name: 'Pentavalent-1', code: 'PENTA1', doseNumber: 1, weeks: 6 },
  { name: 'OPV-1', code: 'OPV1', doseNumber: 1, weeks: 6 },
  { name: 'Rotavirus-1', code: 'ROTA1', doseNumber: 1, weeks: 6 },
  { name: 'PCV-1', code: 'PCV1', doseNumber: 1, weeks: 6 },
  { name: 'Pentavalent-2', code: 'PENTA2', doseNumber: 2, weeks: 10 },
  { name: 'OPV-2', code: 'OPV2', doseNumber: 2, weeks: 10 },
  { name: 'Rotavirus-2', code: 'ROTA2', doseNumber: 2, weeks: 10 },
  { name: 'PCV-2', code: 'PCV2', doseNumber: 2, weeks: 10 },
  { name: 'Pentavalent-3', code: 'PENTA3', doseNumber: 3, weeks: 14 },
  { name: 'OPV-3', code: 'OPV3', doseNumber: 3, weeks: 14 },
  { name: 'IPV', code: 'IPV', doseNumber: 1, weeks: 14 },
  { name: 'PCV-3', code: 'PCV3', doseNumber: 3, weeks: 14 },
  { name: 'Measles-1', code: 'MR1', doseNumber: 1, weeks: 39 },
  { name: 'Typhoid (TCV)', code: 'TCV', doseNumber: 1, weeks: 39 },
  { name: 'Measles-2', code: 'MR2', doseNumber: 2, weeks: 65 },
];

@Injectable()
export class VaccinationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownPatient(user: AuthenticatedUser, patientId: string) {
    const p = await this.prisma.clinicPatientProfile.findFirst({ where: { id: patientId, tenantId: user.tenantId }, select: { id: true, dateOfBirth: true } });
    if (!p) throw new NotFoundException('Mareez nahi mila');
    return p;
  }

  async schedule(user: AuthenticatedUser, dto: any) {
    await this.ownPatient(user, dto?.patientId);
    const vaccineName = str(dto?.vaccineName, 120);
    if (!vaccineName) throw new BadRequestException('Vaccine ka naam likhein');
    return this.prisma.clinicVaccination.create({
      data: {
        tenantId: user.tenantId,
        patientId: dto.patientId,
        vaccineName,
        vaccineCode: str(dto.vaccineCode, 30),
        scheduleName: str(dto.scheduleName, 60),
        doseNumber: dto.doseNumber === undefined || dto.doseNumber === '' ? undefined : Math.max(0, Math.round(Number(dto.doseNumber) || 0)),
        dueDate: date(dto.dueDate, 'Due tareekh'),
        notes: str(dto.notes, 1000),
      },
    });
  }

  /** Adds the EPI doses a child does not have yet (by vaccine code). */
  async bulkScheduleEPI(user: AuthenticatedUser, patientId: string, birthDate?: string) {
    const p = await this.ownPatient(user, patientId);
    const birth = birthDate ? date(birthDate, 'Paidaish ki tareekh') : p.dateOfBirth;
    if (!birth) throw new BadRequestException('Bachay ki paidaish ki tareekh likhein');
    if (birth > new Date()) throw new BadRequestException('Paidaish ki tareekh aage ki nahi ho sakti');
    const have = new Set((await this.prisma.clinicVaccination.findMany({ where: { tenantId: user.tenantId, patientId, scheduleName: 'EPI' }, select: { vaccineCode: true } })).map((v) => v.vaccineCode));
    const missing = EPI.filter((v) => !have.has(v.code));
    if (!missing.length) throw new ConflictException('EPI schedule pehle se laga hua hai');
    await this.prisma.clinicVaccination.createMany({
      data: missing.map((v) => ({
        tenantId: user.tenantId, patientId, vaccineName: v.name, vaccineCode: v.code, scheduleName: 'EPI', doseNumber: v.doseNumber,
        dueDate: new Date(birth.getTime() + v.weeks * 7 * 86_400_000), status: 'DUE' as const,
      })),
    });
    return { added: missing.length };
  }

  async administer(user: AuthenticatedUser, id: string, dto: any) {
    const own = await this.prisma.clinicVaccination.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, status: true } });
    if (!own) throw new NotFoundException('Vaccine record nahi mila');
    if (own.status === 'ADMINISTERED') throw new BadRequestException('Ye dose pehle hi lag chuki hai');
    const expiry = dto?.expiryDate ? date(dto.expiryDate, 'Expiry') : undefined;
    if (expiry && expiry < startOfDayTz(new Date())) throw new BadRequestException('Expired vaccine nahi lagayi ja sakti');
    return this.prisma.clinicVaccination.update({
      where: { id },
      data: {
        batchNumber: str(dto?.batchNumber, 60), manufacturer: str(dto?.manufacturer, 120), siteAdministered: str(dto?.siteAdministered, 60),
        routeAdministered: str(dto?.routeAdministered, 30), administeredBy: str(dto?.administeredBy, 120), expiryDate: expiry,
        adverseReactions: str(dto?.adverseReactions, 1000), notes: str(dto?.notes, 1000),
        administeredAt: new Date(), status: 'ADMINISTERED',
      },
    });
  }

  /** Delay, skip or mark a dose not to be given; or move its due date. */
  async setStatus(user: AuthenticatedUser, id: string, body: { status: string; notes?: string; dueDate?: string }) {
    const own = await this.prisma.clinicVaccination.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, status: true } });
    if (!own) throw new NotFoundException('Vaccine record nahi mila');
    if (!STATUSES.includes(body.status as ClinicVaccineStatus) || body.status === 'ADMINISTERED') throw new BadRequestException('Status ghalat hai');
    if (own.status === 'ADMINISTERED') throw new BadRequestException('Lagi hui dose ka status nahi badalta');
    return this.prisma.clinicVaccination.update({
      where: { id },
      data: { status: body.status as ClinicVaccineStatus, notes: str(body.notes, 1000), ...(body.dueDate && { dueDate: date(body.dueDate, 'Due tareekh') }) },
    });
  }

  /** With patient names. Without `page` the old array; with `page` a page, total and counts. */
  async list(user: AuthenticatedUser, params: Record<string, string | undefined>) {
    const q = params.search?.trim();
    const patientIds = q ? (await this.prisma.clinicPatientProfile.findMany({
      where: { tenantId: user.tenantId, OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { mrn: { contains: q, mode: 'insensitive' } }, { phonePrimary: { contains: q } }, { motherName: { contains: q, mode: 'insensitive' } }] },
      select: { id: true }, take: 300,
    })).map((p) => p.id) : [];
    const today = startOfDayTz(new Date());
    const where: Prisma.ClinicVaccinationWhereInput = {
      tenantId: user.tenantId,
      ...(params.patientId && { patientId: params.patientId }),
      ...(params.status && STATUSES.includes(params.status as ClinicVaccineStatus) && { status: params.status as ClinicVaccineStatus }),
      ...(params.status === 'OVERDUE' && { status: { in: ['DUE', 'DELAYED'] }, dueDate: { lt: today } }),
      ...(params.from || params.to ? { dueDate: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } } : {}),
      ...(q && { OR: [{ vaccineName: { contains: q, mode: 'insensitive' } }, { patientId: { in: patientIds } }] }),
    };
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const rows = await this.prisma.clinicVaccination.findMany({ where, orderBy: { dueDate: 'asc' }, skip: params.page ? (page - 1) * limit : 0, take: params.page ? limit : 500 });
    const patients = await this.prisma.clinicPatientProfile.findMany({
      where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.patientId))] } },
      select: { id: true, fullName: true, mrn: true, phonePrimary: true, dateOfBirth: true, motherName: true, gender: true },
    });
    const items = rows.map((r) => ({ ...r, patient: patients.find((p) => p.id === r.patientId) ?? null }));
    if (!params.page) return items;
    const base = { tenantId: user.tenantId };
    const weekEnd = endOfDayTz(new Date(Date.now() + 7 * 86_400_000));
    const [total, overdue, thisWeek, givenThisMonth] = await Promise.all([
      this.prisma.clinicVaccination.count({ where }),
      this.prisma.clinicVaccination.count({ where: { ...base, status: { in: ['DUE', 'DELAYED'] }, dueDate: { lt: today } } }),
      this.prisma.clinicVaccination.count({ where: { ...base, status: 'DUE', dueDate: { gte: today, lte: weekEnd } } }),
      this.prisma.clinicVaccination.count({ where: { ...base, status: 'ADMINISTERED', administeredAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
    ]);
    return { items, total, page, limit, summary: { overdue, thisWeek, givenThisMonth } };
  }

  async due(user: AuthenticatedUser, days = 7) {
    const span = Math.min(Math.max(Number(days) || 7, 1), 90);
    return this.prisma.clinicVaccination.findMany({
      where: { tenantId: user.tenantId, status: 'DUE', dueDate: { gte: startOfDayTz(new Date()), lte: endOfDayTz(new Date(Date.now() + span * 86_400_000)) } },
      orderBy: { dueDate: 'asc' },
    });
  }
}
