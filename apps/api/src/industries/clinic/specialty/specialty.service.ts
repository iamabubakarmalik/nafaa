import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

const TOOTH_SYSTEMS = ['FDI', 'UNIVERSAL', 'PALMER'];

const text = (v: unknown, max = 2000) => (v === undefined ? undefined : v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, max));

function num(v: unknown, label: string, min: number, max: number, int = false) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new BadRequestException(`${label} sahi likhein`);
  return n;
}

function date(v: unknown, label: string) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} sahi likhein`);
  return d;
}

function list(v: unknown) {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : String(v ?? '').split(',');
  return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 30).map((x) => x.slice(0, 120));
}

/** Drops keys left undefined so a partial update only touches what was sent. */
const defined = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/**
 * Dental chart entries, antenatal visits and physio sessions. Every field
 * is read from a fixed list; the patient, appointment and doctor must
 * belong to this clinic. Dental entries are switched off, never deleted.
 */
@Injectable()
export class SpecialtyService {
  constructor(private readonly prisma: PrismaService) {}

  /** The patient (and appointment / doctor, when given) must belong to this clinic. */
  private async ownRefs(user: AuthenticatedUser, dto: any, doctorKey?: 'doctorId' | 'therapistId') {
    if (!dto?.patientId) throw new BadRequestException('Mareez chunein');
    const p = await this.prisma.clinicPatientProfile.findFirst({ where: { id: String(dto.patientId), tenantId: user.tenantId }, select: { id: true } });
    if (!p) throw new NotFoundException('Mareez nahi mila');
    if (dto.appointmentId) {
      const a = await this.prisma.clinicAppointment.findFirst({ where: { id: String(dto.appointmentId), tenantId: user.tenantId, patientId: p.id }, select: { id: true } });
      if (!a) throw new NotFoundException('Appointment nahi mili');
    }
    if (doctorKey && dto[doctorKey]) {
      const d = await this.prisma.clinicDoctorProfile.findFirst({ where: { id: String(dto[doctorKey]), tenantId: user.tenantId }, select: { id: true } });
      if (!d) throw new NotFoundException('Doctor nahi mila');
    }
    return { patientId: p.id, appointmentId: dto.appointmentId ? String(dto.appointmentId) : null };
  }

  // ─── DENTAL ───
  private readDental(dto: any, partial: boolean) {
    const out = defined({
      toothNumber: text(dto?.toothNumber, 10),
      toothSystem: dto?.toothSystem === undefined ? undefined : String(dto.toothSystem || 'FDI').toUpperCase(),
      surface: text(dto?.surface, 40),
      condition: text(dto?.condition, 120),
      treatment: text(dto?.treatment, 500),
      procedureCode: text(dto?.procedureCode, 40),
      color: text(dto?.color, 20),
      notes: text(dto?.notes),
      performedAt: date(dto?.performedAt, 'Tareekh'),
    });
    if ((!partial || out.toothNumber !== undefined) && !out.toothNumber) throw new BadRequestException('Daant ka number likhein');
    if ((!partial || out.condition !== undefined) && !out.condition) throw new BadRequestException('Daant ki halat likhein');
    if (out.toothSystem && !TOOTH_SYSTEMS.includes(out.toothSystem)) throw new BadRequestException('Numbering ghalat hai');
    if (out.performedAt === null) delete out.performedAt;
    return out;
  }

  async recordDental(user: AuthenticatedUser, dto: any) {
    const refs = await this.ownRefs(user, dto, 'doctorId');
    const data = this.readDental(dto, false);
    return this.prisma.clinicDentalRecord.create({
      data: {
        ...data,
        toothNumber: data.toothNumber!, condition: data.condition!,
        tenantId: user.tenantId, ...refs, doctorId: dto.doctorId ? String(dto.doctorId) : null,
      } as Prisma.ClinicDentalRecordUncheckedCreateInput,
    });
  }

  /** Active entries only; switched-off ones stay in the database. */
  async dentalChart(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicDentalRecord.findMany({
      where: { tenantId: user.tenantId, patientId, isActive: true },
      orderBy: [{ toothNumber: 'asc' }, { performedAt: 'desc' }],
    });
  }

  private async ownDental(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.clinicDentalRecord.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!r) throw new NotFoundException('Record nahi mila');
  }

  async updateDental(user: AuthenticatedUser, id: string, dto: any) {
    await this.ownDental(user, id);
    return this.prisma.clinicDentalRecord.update({ where: { id }, data: this.readDental(dto, true) as Prisma.ClinicDentalRecordUncheckedUpdateInput });
  }

  /** The delete route switches the entry off; the record is kept. */
  async removeDental(user: AuthenticatedUser, id: string) {
    await this.ownDental(user, id);
    return this.prisma.clinicDentalRecord.update({ where: { id }, data: { isActive: false } });
  }

  // ─── ANTENATAL (Gyne) ───
  async createAncVisit(user: AuthenticatedUser, dto: any) {
    const refs = await this.ownRefs(user, dto);
    const count = await this.prisma.clinicAntenatalVisit.count({ where: { tenantId: user.tenantId, patientId: refs.patientId } });
    const data = defined({
      visitNumber: num(dto?.visitNumber, 'Visit number', 1, 60, true) ?? count + 1,
      gestationWeeks: num(dto?.gestationWeeks, 'Hafte', 0, 45, true),
      gestationDays: num(dto?.gestationDays, 'Din', 0, 6, true),
      weightKg: num(dto?.weightKg, 'Wazan', 20, 250),
      bpSystolic: num(dto?.bpSystolic, 'BP', 50, 260, true),
      bpDiastolic: num(dto?.bpDiastolic, 'BP', 30, 180, true),
      fundalHeightCm: num(dto?.fundalHeightCm, 'Fundal height', 0, 60),
      fetalHeartRate: num(dto?.fetalHeartRate, 'Bachay ki dhadkan', 60, 220, true),
      fetalPosition: text(dto?.fetalPosition, 60),
      fetalMovements: text(dto?.fetalMovements, 60),
      urineProtein: text(dto?.urineProtein, 20),
      urineSugar: text(dto?.urineSugar, 20),
      edema: text(dto?.edema, 40),
      ultrasoundNotes: text(dto?.ultrasoundNotes),
      advice: text(dto?.advice),
      nextVisitDate: date(dto?.nextVisitDate, 'Agli visit'),
      visitDate: date(dto?.visitDate, 'Tareekh') ?? new Date(),
    });
    return this.prisma.clinicAntenatalVisit.create({ data: { ...data, tenantId: user.tenantId, ...refs } as Prisma.ClinicAntenatalVisitUncheckedCreateInput });
  }

  async ancHistory(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicAntenatalVisit.findMany({
      where: { tenantId: user.tenantId, patientId },
      orderBy: { visitDate: 'desc' },
    });
  }

  // ─── PHYSIO ───
  async createPhysioSession(user: AuthenticatedUser, dto: any) {
    if (!dto?.therapistId) throw new BadRequestException('Therapist chunein');
    const refs = await this.ownRefs(user, dto, 'therapistId');
    const count = await this.prisma.clinicPhysioSession.count({ where: { tenantId: user.tenantId, patientId: refs.patientId } });
    const exercises = list(dto?.exercisesPerformed);
    const data = defined({
      sessionNumber: num(dto?.sessionNumber, 'Session number', 1, 500, true) ?? count + 1,
      totalSessionsPrescribed: num(dto?.totalSessionsPrescribed, 'Kul sessions', 1, 500, true),
      diagnosis: text(dto?.diagnosis),
      chiefComplaint: text(dto?.chiefComplaint),
      painScore: num(dto?.painScore, 'Dard (0–10)', 0, 10, true),
      romNotes: text(dto?.romNotes),
      exercisesPerformed: exercises === undefined ? undefined : (exercises as Prisma.InputJsonValue),
      modalitiesUsed: list(dto?.modalitiesUsed),
      durationMin: num(dto?.durationMin, 'Minute', 1, 600, true),
      progressNotes: text(dto?.progressNotes),
      homeExercises: text(dto?.homeExercises),
      nextSessionDate: date(dto?.nextSessionDate, 'Agla session'),
      sessionDate: date(dto?.sessionDate, 'Tareekh') ?? new Date(),
    });
    return this.prisma.clinicPhysioSession.create({
      data: { ...data, tenantId: user.tenantId, ...refs, therapistId: String(dto.therapistId) } as Prisma.ClinicPhysioSessionUncheckedCreateInput,
    });
  }

  async physioHistory(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicPhysioSession.findMany({
      where: { tenantId: user.tenantId, patientId },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
