import { BadRequestException, Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { ClinicAppointmentStatus, ClinicVisitType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { FEE_LINK, billClinicFee, clinicFeeLines, readFeePayment } from './fee-billing';

const STATUSES = Object.values(ClinicAppointmentStatus);
const VISIT_TYPES = Object.values(ClinicVisitType);
/** Still to be seen today. */
const OPEN: ClinicAppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'ARRIVED', 'IN_CONSULTATION'];
/** Allowed next steps; a finished visit is never reopened. */
const NEXT: Record<ClinicAppointmentStatus, ClinicAppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'ARRIVED', 'IN_CONSULTATION', 'NO_SHOW', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'IN_CONSULTATION', 'NO_SHOW', 'CANCELLED'],
  RESCHEDULED: ['CONFIRMED', 'ARRIVED', 'IN_CONSULTATION', 'NO_SHOW', 'CANCELLED'],
  ARRIVED: ['IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
  IN_CONSULTATION: ['COMPLETED', 'ARRIVED'],
  COMPLETED: [],
  NO_SHOW: ['CONFIRMED', 'ARRIVED'],
  CANCELLED: [],
};

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const PERSON = { id: true, fullName: true, mrn: true, phonePrimary: true, gender: true, dateOfBirth: true, customerId: true, allergies: true } as const;
const DOCTOR = { id: true, fullName: true, title: true, photoUrl: true, specialties: true, consultationFee: true, followUpFee: true, followUpDays: true, commissionPct: true, commissionType: true } as const;

function validDate(v: unknown, label: string) {
  const d = new Date(String(v ?? ''));
  if (!v || Number.isNaN(d.getTime())) throw new BadRequestException(`${label} sahi likhein`);
  return d;
}

@Injectable()
export class AppointmentsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  /** A voided fee bill takes its amount off the appointment or lab order it paid for. */
  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.onBillVoided(tenantId, saleId));
  }

  private async onBillVoided(tenantId: string, saleId: string) {
    const lines = await clinicFeeLines(this.prisma, tenantId, saleId);
    if (!lines.length) return;
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true } });
    for (const l of lines) {
      if (l.kind === 'appointment') {
        const apt = await this.prisma.clinicAppointment.findFirst({ where: { id: l.id, tenantId } });
        if (!apt) continue;
        const paid = r2(Math.max(apt.paidAmount - l.total, 0));
        await this.prisma.clinicAppointment.update({
          where: { id: apt.id },
          data: { paidAmount: paid, paymentStatus: paid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID', internalNotes: [apt.internalNotes, `Bill ${sale?.saleNumber ?? ''} void: Rs ${l.total} wapas`].filter(Boolean).join('\n') },
        });
      } else {
        const lab = await this.prisma.clinicLabOrder.findFirst({ where: { id: l.id, tenantId } });
        if (!lab) continue;
        const paid = r2(Math.max(lab.paidAmount - l.total, 0));
        await this.prisma.clinicLabOrder.update({ where: { id: lab.id }, data: { paidAmount: paid, paymentStatus: paid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID' } });
      }
    }
  }

  /** Fee for this patient and doctor today: follow-up rate inside the doctor's follow-up days. */
  async feeQuote(user: AuthenticatedUser, doctorId: string, patientId?: string) {
    const doctor = await this.prisma.clinicDoctorProfile.findFirst({ where: { id: doctorId, tenantId: user.tenantId }, select: DOCTOR });
    if (!doctor) throw new NotFoundException('Doctor nahi mila');
    let last: Date | null = null;
    if (patientId) {
      const prev = await this.prisma.clinicAppointment.findFirst({
        where: { tenantId: user.tenantId, doctorId, patientId, status: 'COMPLETED' },
        orderBy: { scheduledStart: 'desc' }, select: { scheduledStart: true },
      });
      last = prev?.scheduledStart ?? null;
    }
    const followUp = !!last && doctor.followUpFee > 0 && Date.now() - last.getTime() <= doctor.followUpDays * 86_400_000;
    return { visitType: followUp ? 'FOLLOW_UP' : 'FIRST_VISIT', fee: followUp ? doctor.followUpFee : doctor.consultationFee, lastVisitAt: last, doctor };
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: any) {
    if (!dto?.patientId || !dto?.doctorId) throw new BadRequestException('Mareez aur doctor chunein');
    const start = dto.scheduledStart ? validDate(dto.scheduledStart, 'Waqt') : new Date();
    if (dto.visitType && !VISIT_TYPES.includes(dto.visitType)) throw new BadRequestException('Visit type ghalat hai');

    const [doctor, patient] = await Promise.all([
      this.prisma.clinicDoctorProfile.findFirst({ where: { id: dto.doctorId, tenantId: user.tenantId } }),
      this.prisma.clinicPatientProfile.findFirst({ where: { id: dto.patientId, tenantId: user.tenantId }, select: { id: true, isActive: true } }),
    ]);
    if (!doctor || !doctor.isActive) throw new NotFoundException('Doctor nahi mila ya band hai');
    if (!patient || !patient.isActive) throw new NotFoundException('Mareez nahi mila');

    const dayStart = startOfDayTz(start);
    const dayEnd = endOfDayTz(start);
    if (doctor.maxDailyPatients) {
      const booked = await this.prisma.clinicAppointment.count({
        where: { tenantId: user.tenantId, doctorId: doctor.id, scheduledStart: { gte: dayStart, lte: dayEnd }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      });
      if (booked >= doctor.maxDailyPatients && !dto.isEmergency) throw new BadRequestException(`Dr. ${doctor.fullName} ke aaj ke ${doctor.maxDailyPatients} mareez poore hain`);
    }

    // Fee: emergency / home / online rate, else follow-up inside the doctor's follow-up days.
    const quote = await this.feeQuote(user, doctor.id, patient.id);
    const visitType: ClinicVisitType = dto.visitType ?? (quote.visitType as ClinicVisitType);
    let consultationFee = visitType === 'FOLLOW_UP' && doctor.followUpFee ? doctor.followUpFee : doctor.consultationFee;
    if (dto.isTelemedicine && doctor.telemedicineFee) consultationFee = doctor.telemedicineFee;
    if (dto.isHomeVisit && doctor.homeVisitFee) consultationFee = doctor.homeVisitFee;
    if (dto.isEmergency && doctor.emergencyFee) consultationFee = doctor.emergencyFee;
    if (dto.consultationFee != null && dto.consultationFee !== '') consultationFee = r2(dto.consultationFee);

    const otherCharges = r2(dto.otherCharges);
    const discount = r2(dto.discount);
    const taxAmount = r2(dto.taxAmount);
    if (consultationFee < 0 || otherCharges < 0 || discount < 0 || taxAmount < 0) throw new BadRequestException('Fees manfi nahi ho sakti');
    if (discount > consultationFee + otherCharges + 0.009) throw new BadRequestException('Discount fees se zyada hai');
    const total = r2(consultationFee + otherCharges + taxAmount - discount);

    const durationMin = Number(dto.durationMin) > 0 ? Number(dto.durationMin) : doctor.slotDurationMin;
    const scheduledEnd = dto.scheduledEnd ? validDate(dto.scheduledEnd, 'Khatam hone ka waqt') : new Date(start.getTime() + durationMin * 60_000);
    if (scheduledEnd <= start) throw new BadRequestException('Khatam hone ka waqt shuru se pehle hai');
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId).catch(() => null);

    // Numbers come from the highest used one; retried if two desks book at the same moment.
    for (let attempt = 0; ; attempt += 1) {
      const [lastApt, lastToken] = await Promise.all([
        this.prisma.clinicAppointment.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, select: { appointmentNumber: true } }),
        this.prisma.clinicAppointment.aggregate({ where: { tenantId: user.tenantId, doctorId: doctor.id, scheduledStart: { gte: dayStart, lte: dayEnd } }, _max: { tokenNumber: true } }),
      ]);
      const year = new Date().getFullYear();
      const seq = Number(/(\d+)$/.exec(lastApt?.appointmentNumber ?? '')?.[1] ?? 0) + 1 + attempt;
      try {
        return await this.prisma.clinicAppointment.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            appointmentNumber: `APT-${year}-${String(seq).padStart(5, '0')}`,
            tokenNumber: (lastToken._max.tokenNumber ?? 0) + 1,
            patientId: patient.id,
            doctorId: doctor.id,
            visitType,
            isTelemedicine: !!dto.isTelemedicine,
            isHomeVisit: !!dto.isHomeVisit,
            isEmergency: !!dto.isEmergency,
            scheduledStart: start,
            scheduledEnd,
            chiefComplaint: dto.chiefComplaint ? String(dto.chiefComplaint).slice(0, 2000) : undefined,
            reasonForVisit: dto.reasonForVisit ? String(dto.reasonForVisit).slice(0, 2000) : undefined,
            patientNotes: dto.patientNotes ? String(dto.patientNotes).slice(0, 2000) : undefined,
            consultationFee, otherCharges, discount, taxAmount, total,
            status: dto.walkIn ? 'ARRIVED' : 'CONFIRMED',
            ...(dto.walkIn && { arrivedAt: new Date() }),
            createdById: user.id,
          },
        });
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  private async where(user: AuthenticatedUser, p: Record<string, string | undefined>): Promise<Prisma.ClinicAppointmentWhereInput> {
    const search = p.search?.trim();
    const patientIds = await this.patientIdsFor(user.tenantId, search);
    return {
      tenantId: user.tenantId,
      ...(p.status && STATUSES.includes(p.status as ClinicAppointmentStatus) && { status: p.status as ClinicAppointmentStatus }),
      ...(p.status === 'OPEN' && { status: { in: OPEN } }),
      ...(p.doctorId && { doctorId: p.doctorId }),
      ...(p.patientId && { patientId: p.patientId }),
      ...(p.paymentStatus === 'DUE' && { paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] }, total: { gt: 0 }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }),
      ...(p.from || p.to ? {
        scheduledStart: {
          ...(p.from && { gte: new Date(p.from) }),
          ...(p.to && { lte: new Date(p.to) }),
        },
      } : {}),
      ...(search && {
        OR: [
          { appointmentNumber: { contains: search, mode: 'insensitive' } },
          { chiefComplaint: { contains: search, mode: 'insensitive' } },
          { patientId: { in: patientIds } },
        ],
      }),
    };
  }

  /** Patients matching a search, for the appointment search box. */
  private async patientIdsFor(tenantId: string, search?: string) {
    const q = search?.trim();
    if (!q) return [];
    const rows = await this.prisma.clinicPatientProfile.findMany({
      where: { tenantId, OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { mrn: { contains: q, mode: 'insensitive' } }, { phonePrimary: { contains: q } }, { cnic: { contains: q } }] },
      select: { id: true }, take: 200,
    });
    return rows.map((r) => r.id);
  }

  private async withPeople<T extends { patientId: string; doctorId: string }>(tenantId: string, rows: T[]) {
    const [patients, doctors] = await Promise.all([
      this.prisma.clinicPatientProfile.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.patientId))] } }, select: PERSON }),
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.doctorId))] } }, select: DOCTOR }),
    ]);
    const pm = new Map(patients.map((p) => [p.id, p]));
    const dm = new Map(doctors.map((d) => [d.id, d]));
    return rows.map((r) => ({ ...r, patient: pm.get(r.patientId) ?? null, doctor: dm.get(r.doctorId) ?? null }));
  }

  /**
   * Appointments with patient and doctor. Without `page` the old array
   * (first 300, oldest first) is returned; with `page` a page and totals.
   */
  async list(user: AuthenticatedUser, params: Record<string, string | undefined>) {
    const where = await this.where(user, params);
    if (!params.page) {
      const rows = await this.prisma.clinicAppointment.findMany({ where, orderBy: { scheduledStart: 'asc' }, take: 300 });
      return this.withPeople(user.tenantId, rows);
    }
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const [rows, total, sums, byStatus] = await Promise.all([
      this.prisma.clinicAppointment.findMany({ where, orderBy: { scheduledStart: params.sort === 'asc' ? 'asc' : 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.clinicAppointment.count({ where }),
      this.prisma.clinicAppointment.aggregate({ where: { ...where, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }, _sum: { total: true, paidAmount: true } }),
      this.prisma.clinicAppointment.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ]);
    const fees = r2(sums._sum.total ?? 0);
    const billed = r2(sums._sum.paidAmount ?? 0);
    return {
      items: await this.withPeople(user.tenantId, rows),
      total, page, limit,
      summary: {
        fees, billed, due: r2(Math.max(fees - billed, 0)),
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      },
    };
  }

  /** Today's line for one doctor (or all), emergencies first, then token order. */
  async queue(user: AuthenticatedUser, doctorId: string | undefined, date: string | undefined) {
    const target = date ? validDate(date, 'Tareekh') : new Date();
    const appts = await this.prisma.clinicAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        ...(doctorId && { doctorId }),
        scheduledStart: { gte: startOfDayTz(target), lte: endOfDayTz(target) },
        status: { notIn: ['CANCELLED'] },
      },
      include: { vitals: { select: { id: true, bpSystolic: true, bpDiastolic: true, pulseRate: true, temperatureF: true, temperatureC: true, weightKg: true, spo2: true } } },
      orderBy: [{ isEmergency: 'desc' }, { tokenNumber: 'asc' }],
    });
    return this.withPeople(user.tenantId, appts);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const apt = await this.prisma.clinicAppointment.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { encounter: { include: { prescriptions: { include: { items: { orderBy: { displayOrder: 'asc' } } } }, labOrders: { include: { tests: true } } } }, vitals: true },
    });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    const [patient, doctor, bills] = await Promise.all([
      this.prisma.clinicPatientProfile.findFirst({ where: { id: apt.patientId, tenantId: user.tenantId } }),
      this.prisma.clinicDoctorProfile.findFirst({ where: { id: apt.doctorId, tenantId: user.tenantId } }),
      this.prisma.saleItem.findMany({
        where: { internalNote: `${FEE_LINK.appointment}${apt.id}`, sale: { tenantId: user.tenantId } },
        select: { total: true, sale: { select: { id: true, saleNumber: true, status: true, paidAmount: true, creditAmount: true, paymentMethod: true, createdAt: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { ...apt, patient, doctor, bills: bills.map((b) => ({ ...b.sale, amount: b.total })) };
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, cancellationReason?: string) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (!STATUSES.includes(status as ClinicAppointmentStatus)) throw new BadRequestException('Status ghalat hai');
    const next = status as ClinicAppointmentStatus;
    if (next === apt.status) return apt;
    if (!NEXT[apt.status].includes(next)) throw new BadRequestException(`"${apt.status}" ke baad "${next}" nahi ho sakta`);
    if ((next === 'CANCELLED' || next === 'NO_SHOW') && apt.paidAmount > 0) {
      throw new BadRequestException(`Is appointment ka Rs ${apt.paidAmount} bill bana hua hai — pehle Sales me wo bill void karein, phir cancel karein`);
    }
    if (next === 'CANCELLED' && !cancellationReason?.trim()) throw new BadRequestException('Cancel karne ki wajah likhein');

    const now = new Date();
    const patch: Prisma.ClinicAppointmentUpdateInput = { status: next };
    if (next === 'ARRIVED' && !apt.arrivedAt) patch.arrivedAt = now;
    if (next === 'IN_CONSULTATION') { patch.consultationStart = now; if (!apt.arrivedAt) patch.arrivedAt = now; }
    if (next === 'COMPLETED') { patch.consultationEnd = now; if (!apt.consultationStart) patch.consultationStart = now; }
    if (next === 'CANCELLED') { patch.cancelledAt = now; patch.cancellationReason = cancellationReason!.trim().slice(0, 500); }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.clinicAppointment.update({ where: { id }, data: patch });
      // Visit counters move once, when the visit is finished.
      if (next === 'COMPLETED') {
        await tx.clinicPatientProfile.update({ where: { id: apt.patientId }, data: { totalVisits: { increment: 1 }, lastVisitAt: now } });
        await tx.clinicDoctorProfile.update({ where: { id: apt.doctorId }, data: { totalAppointments: { increment: 1 } } });
      }
      return row;
    });
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: any) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (!['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'NO_SHOW'].includes(apt.status)) throw new BadRequestException('Sirf aane wali appointment ka waqt badal sakta hai');
    const start = validDate(dto?.scheduledStart, 'Naya waqt');
    const end = dto?.scheduledEnd ? validDate(dto.scheduledEnd, 'Khatam hone ka waqt') : new Date(start.getTime() + (apt.scheduledEnd.getTime() - apt.scheduledStart.getTime()));
    if (end <= start) throw new BadRequestException('Khatam hone ka waqt shuru se pehle hai');
    const sameDay = startOfDayTz(start).getTime() === startOfDayTz(apt.scheduledStart).getTime();
    const token = sameDay ? apt.tokenNumber : ((await this.prisma.clinicAppointment.aggregate({
      where: { tenantId: user.tenantId, doctorId: apt.doctorId, scheduledStart: { gte: startOfDayTz(start), lte: endOfDayTz(start) } }, _max: { tokenNumber: true },
    }))._max.tokenNumber ?? 0) + 1;
    return this.prisma.clinicAppointment.update({
      where: { id },
      data: {
        scheduledStart: start, scheduledEnd: end, tokenNumber: token, status: 'RESCHEDULED',
        internalNotes: [apt.internalNotes, `Waqt badla: ${dto?.reason ? String(dto.reason).slice(0, 200) : ''}`.trim()].filter(Boolean).join('\n'),
      },
    });
  }

  /**
   * Bills the fee (cash basis): each payment is its own bill, so the drawer
   * and reports carry exactly what was taken. `paidAmount` on the
   * appointment is what has been billed; any unpaid part of a bill sits on
   * the patient's khata.
   */
  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, body: any) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') throw new BadRequestException('Cancel / no-show appointment ki fees nahi li ja sakti');
    const pay = readFeePayment(body, r2(apt.total - apt.paidAmount));

    const [patient, doctor] = await Promise.all([
      this.prisma.clinicPatientProfile.findFirst({ where: { id: apt.patientId, tenantId: user.tenantId }, select: { customerId: true, fullName: true, mrn: true } }),
      this.prisma.clinicDoctorProfile.findFirst({ where: { id: apt.doctorId, tenantId: user.tenantId }, select: { fullName: true } }),
    ]);
    const sale = await billClinicFee(this.prisma, this.sales, user, scope, {
      ...pay,
      customerId: patient?.customerId,
      shopId: apt.shopId,
      link: `${FEE_LINK.appointment}${apt.id}`,
      lineNote: [`Token ${apt.tokenNumber ?? '-'}`, apt.appointmentNumber, doctor?.fullName ? `Dr. ${doctor.fullName}` : null].filter(Boolean).join(' · '),
      note: `Fees ${apt.appointmentNumber}${patient ? ` · ${patient.fullName} (${patient.mrn})` : ''}`,
    });

    // Re-read so two desks taking money together cannot both count from the same base.
    return this.prisma.$transaction(async (tx) => {
      const cur = await tx.clinicAppointment.findUniqueOrThrow({ where: { id } });
      const billed = r2(cur.paidAmount + pay.amount);
      const updated = await tx.clinicAppointment.update({
        where: { id },
        data: {
          paidAmount: billed,
          paymentStatus: billed >= cur.total - 0.009 ? 'PAID' : 'PARTIALLY_PAID',
          internalNotes: [cur.internalNotes, `Bill ${sale.saleNumber}: Rs ${pay.amount}${sale.creditAmount > 0 ? ` (khata Rs ${sale.creditAmount})` : ''}`].filter(Boolean).join('\n'),
        },
      });
      return { ...updated, sale };
    });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    const stars = Math.round(Number(rating));
    if (!(stars >= 1 && stars <= 5)) throw new BadRequestException('Rating 1 se 5 tak');
    return this.prisma.clinicAppointment.update({ where: { id }, data: { patientRating: stars, patientFeedback: feedback ? String(feedback).slice(0, 1000) : undefined } });
  }

  /** Follow-ups the doctors asked for in a date range, and whether the patient has booked again. */
  async followUps(user: AuthenticatedUser, from?: string, to?: string) {
    const start = from ? validDate(from, 'Tareekh') : startOfDayTz(new Date());
    const end = to ? validDate(to, 'Tareekh') : endOfDayTz(new Date(Date.now() + 7 * 86_400_000));
    const enc = await this.prisma.clinicEncounter.findMany({
      where: { tenantId: user.tenantId, followUpDate: { gte: start, lte: end } },
      select: { id: true, appointmentId: true, patientId: true, doctorId: true, followUpDate: true, followUpAdvice: true, finalDiagnosis: true, provisionalDiagnosis: true },
      orderBy: { followUpDate: 'asc' }, take: 500,
    });
    const later = await this.prisma.clinicAppointment.findMany({
      where: { tenantId: user.tenantId, patientId: { in: [...new Set(enc.map((e) => e.patientId))] }, scheduledStart: { gte: startOfDayTz(start) }, status: { notIn: ['CANCELLED'] } },
      select: { id: true, patientId: true, doctorId: true, scheduledStart: true },
    });
    const rows = enc.map((e) => {
      const booked = later.find((a) => a.patientId === e.patientId && a.doctorId === e.doctorId && a.id !== e.appointmentId);
      return { ...e, bookedAppointmentId: booked?.id ?? null, bookedFor: booked?.scheduledStart ?? null };
    });
    return this.withPeople(user.tenantId, rows);
  }

  /**
   * One day per doctor: patients booked, seen, cancelled; fees billed on
   * that day (from the bills themselves, so it matches the day book),
   * collected vs khata, and the doctor's share.
   */
  async dayClose(user: AuthenticatedUser, date?: string) {
    const day = date ? validDate(date, 'Tareekh') : new Date();
    const from = startOfDayTz(day);
    const to = endOfDayTz(day);
    const [doctors, appts, lines] = await Promise.all([
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId }, select: DOCTOR }),
      this.prisma.clinicAppointment.findMany({ where: { tenantId: user.tenantId, scheduledStart: { gte: from, lte: to } }, select: { doctorId: true, status: true } }),
      this.prisma.saleItem.findMany({
        where: { internalNote: { startsWith: 'clinic-' }, sale: { tenantId: user.tenantId, createdAt: { gte: from, lte: to }, status: { notIn: ['VOIDED', 'FULLY_RETURNED'] } } },
        select: { internalNote: true, total: true, sale: { select: { total: true, paidAmount: true, creditAmount: true, saleNumber: true } } },
      }),
    ]);
    const aptIds = lines.filter((l) => l.internalNote!.startsWith(FEE_LINK.appointment)).map((l) => l.internalNote!.slice(FEE_LINK.appointment.length));
    const labIds = lines.filter((l) => l.internalNote!.startsWith(FEE_LINK.lab)).map((l) => l.internalNote!.slice(FEE_LINK.lab.length));
    const [aptDoc, labDoc] = await Promise.all([
      this.prisma.clinicAppointment.findMany({ where: { tenantId: user.tenantId, id: { in: aptIds } }, select: { id: true, doctorId: true } }),
      this.prisma.clinicLabOrder.findMany({ where: { tenantId: user.tenantId, id: { in: labIds } }, select: { id: true, doctorId: true } }),
    ]);
    const docOf = new Map<string, string>([...aptDoc.map((a) => [`${FEE_LINK.appointment}${a.id}`, a.doctorId] as const), ...labDoc.map((l) => [`${FEE_LINK.lab}${l.id}`, l.doctorId] as const)]);

    const rows = new Map<string, { booked: number; seen: number; waiting: number; cancelled: number; fees: number; labFees: number; collected: number; khata: number; bills: number }>();
    const row = (id: string) => {
      if (!rows.has(id)) rows.set(id, { booked: 0, seen: 0, waiting: 0, cancelled: 0, fees: 0, labFees: 0, collected: 0, khata: 0, bills: 0 });
      return rows.get(id)!;
    };
    for (const a of appts) {
      const r = row(a.doctorId);
      r.booked += 1;
      if (a.status === 'COMPLETED') r.seen += 1;
      else if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') r.cancelled += 1;
      else r.waiting += 1;
    }
    for (const l of lines) {
      const doc = docOf.get(l.internalNote!);
      if (!doc) continue;
      const r = row(doc);
      const amount = Number(l.total) || 0;
      // Fee bills carry one line, so the bill's paid / khata split is the line's.
      const share = l.sale.total > 0 ? amount / l.sale.total : 0;
      if (l.internalNote!.startsWith(FEE_LINK.lab)) r.labFees += amount; else r.fees += amount;
      r.khata += (Number(l.sale.creditAmount) || 0) * share;
      r.collected += (Math.min(Number(l.sale.paidAmount) || 0, l.sale.total)) * share;
      r.bills += 1;
    }
    const out = [...rows.entries()].map(([doctorId, r]) => {
      const d = doctors.find((x) => x.id === doctorId);
      const pct = d?.commissionPct ?? 0;
      const fixed = d?.commissionType === 'FIXED';
      const share = r2(fixed ? pct * r.seen : (r.fees * pct) / 100);
      return {
        doctorId, doctor: d ?? null,
        ...r, fees: r2(r.fees), labFees: r2(r.labFees), collected: r2(r.collected), khata: r2(r.khata),
        commissionType: fixed ? 'FIXED' : 'PERCENTAGE', commissionPct: pct, share, clinicKeeps: r2(r.fees + r.labFees - share),
      };
    }).sort((a, b) => b.fees - a.fees);
    const sum = (k: 'booked' | 'seen' | 'fees' | 'labFees' | 'collected' | 'khata' | 'share') => r2(out.reduce((s, x) => s + x[k], 0));
    return {
      date: from, rows: out,
      totals: { booked: sum('booked'), seen: sum('seen'), fees: sum('fees'), labFees: sum('labFees'), collected: sum('collected'), khata: sum('khata'), share: sum('share') },
    };
  }
}
