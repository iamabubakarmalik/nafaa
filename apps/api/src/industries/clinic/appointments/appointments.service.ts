import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { billClinicFee } from './fee-billing';


@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.patientId || !dto.doctorId || !dto.scheduledStart) {
      throw new BadRequestException('patientId, doctorId, scheduledStart required');
    }

    const doctor = await this.prisma.clinicDoctorProfile.findFirst({ where: { id: dto.doctorId, tenantId: user.tenantId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const patient = await this.prisma.clinicPatientProfile.findFirst({ where: { id: dto.patientId, tenantId: user.tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const count = await this.prisma.clinicAppointment.count({ where: { tenantId: user.tenantId } });
    const appointmentNumber = 'APT-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    // Token for the day
    const start = new Date(dto.scheduledStart);
    const dayStart = startOfDayTz(start);
    const dayEnd = endOfDayTz(start);
    const dayCount = await this.prisma.clinicAppointment.count({
      where: {
        tenantId: user.tenantId,
        doctorId: dto.doctorId,
        scheduledStart: { gte: dayStart, lte: dayEnd },
      },
    });
    const tokenNumber = dayCount + 1;

    const durationMin = dto.durationMin || doctor.slotDurationMin;
    const scheduledEnd = dto.scheduledEnd ? new Date(dto.scheduledEnd) : new Date(start.getTime() + durationMin * 60 * 1000);

    // Fee
    let consultationFee = doctor.consultationFee;
    if (dto.visitType === 'FOLLOW_UP' && doctor.followUpFee) consultationFee = doctor.followUpFee;
    if (dto.isTelemedicine && doctor.telemedicineFee) consultationFee = doctor.telemedicineFee;
    if (dto.isHomeVisit && doctor.homeVisitFee) consultationFee = doctor.homeVisitFee;
    if (dto.isEmergency && doctor.emergencyFee) consultationFee = doctor.emergencyFee;

    const otherCharges = Number(dto.otherCharges) || 0;
    const discount = Number(dto.discount) || 0;
    const taxAmount = Number(dto.taxAmount) || 0;
    const total = Math.max(consultationFee + otherCharges + taxAmount - discount, 0);

    return this.prisma.clinicAppointment.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        appointmentNumber,
        tokenNumber,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        visitType: dto.visitType || 'FIRST_VISIT',
        isTelemedicine: dto.isTelemedicine ?? false,
        isHomeVisit: dto.isHomeVisit ?? false,
        isEmergency: dto.isEmergency ?? false,
        scheduledStart: start,
        scheduledEnd,
        chiefComplaint: dto.chiefComplaint,
        reasonForVisit: dto.reasonForVisit,
        patientNotes: dto.patientNotes,
        consultationFee,
        otherCharges,
        discount,
        taxAmount,
        total,
        status: 'CONFIRMED',
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; doctorId?: string; patientId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.clinicAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.doctorId && { doctorId: params.doctorId }),
        ...(params.patientId && { patientId: params.patientId }),
        ...(params.from || params.to ? {
          scheduledStart: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { appointmentNumber: { contains: params.search, mode: 'insensitive' } },
            { chiefComplaint: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { scheduledStart: 'asc' },
      take: 300,
    });
  }

  async queue(user: AuthenticatedUser, doctorId: string, date: string) {
    const targetDate = new Date(date);
    const dayStart = startOfDayTz(targetDate);
    const dayEnd = endOfDayTz(targetDate);

    const appts = await this.prisma.clinicAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        doctorId,
        scheduledStart: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: [{ isEmergency: 'desc' }, { tokenNumber: 'asc' }],
    });

    const patientIds = appts.map((a) => a.patientId);
    const patients = await this.prisma.clinicPatientProfile.findMany({ where: { id: { in: patientIds } } });
    const patientsMap = new Map(patients.map((p) => [p.id, p]));

    return appts.map((a) => ({ ...a, patient: patientsMap.get(a.patientId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const apt = await this.prisma.clinicAppointment.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { encounter: true, vitals: true },
    });
    if (!apt) throw new NotFoundException('Appointment not found');

    const [patient, doctor] = await Promise.all([
      this.prisma.clinicPatientProfile.findUnique({ where: { id: apt.patientId } }),
      this.prisma.clinicDoctorProfile.findUnique({ where: { id: apt.doctorId } }),
    ]);
    return { ...apt, patient, doctor };
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, cancellationReason?: string) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Not found');

    const patch: any = { status };
    const now = new Date();
    if (status === 'ARRIVED') patch.arrivedAt = now;
    if (status === 'IN_CONSULTATION') patch.consultationStart = now;
    if (status === 'COMPLETED') patch.consultationEnd = now;
    if (status === 'CANCELLED') { patch.cancelledAt = now; patch.cancellationReason = cancellationReason; }

    return this.prisma.clinicAppointment.update({ where: { id }, data: patch });
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: { scheduledStart: string; scheduledEnd: string; reason?: string }) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Not found');
    return this.prisma.clinicAppointment.update({
      where: { id },
      data: {
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        status: 'RESCHEDULED',
        internalNotes: `${apt.internalNotes || ''}\nRescheduled: ${dto.reason || ''}`.trim(),
      },
    });
  }

  /**
   * Takes the patient's fee and bills it as a sale (cash basis): each payment
   * is its own bill, so the drawer and reports carry exactly what was taken.
   */
  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, body: { amount: number; paymentMethod?: PaymentMethod }) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Not found');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      throw new BadRequestException('Cancel / no-show appointment ki fees nahi li ja sakti');
    }
    const amount = Math.round(Number(body?.amount) * 100) / 100;
    if (!(amount > 0)) throw new BadRequestException('Raqam 0 se zyada honi chahiye');
    const remaining = Math.round((apt.total - apt.paidAmount) * 100) / 100;
    if (amount > remaining + 0.009) {
      throw new BadRequestException(remaining > 0 ? `Sirf Rs ${remaining} baqi hain` : 'Is appointment ki poori fees mil chuki hai');
    }

    const [patient, doctor] = await Promise.all([
      this.prisma.clinicPatientProfile.findFirst({ where: { id: apt.patientId, tenantId: user.tenantId }, select: { customerId: true, fullName: true } }),
      this.prisma.clinicDoctorProfile.findFirst({ where: { id: apt.doctorId, tenantId: user.tenantId }, select: { fullName: true } }),
    ]);
    const sale = await billClinicFee(this.prisma, this.sales, user, scope, {
      amount,
      paymentMethod: body?.paymentMethod,
      customerId: patient?.customerId,
      shopId: apt.shopId,
      lineNote: [apt.appointmentNumber, doctor?.fullName ? `Dr. ${doctor.fullName}` : null].filter(Boolean).join(' · '),
      note: `Fees ${apt.appointmentNumber}${patient?.fullName ? ' · ' + patient.fullName : ''}`,
    });

    const newPaid = Math.round((apt.paidAmount + amount) * 100) / 100;
    const paymentStatus = newPaid >= apt.total - 0.009 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    const updated = await this.prisma.clinicAppointment.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        paymentStatus,
        internalNotes: [apt.internalNotes, `Bill ${sale.saleNumber}: Rs ${amount}`].filter(Boolean).join('\n'),
      },
    });
    return { ...updated, sale };
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!apt) throw new NotFoundException('Not found');
    return this.prisma.clinicAppointment.update({ where: { id }, data: { patientRating: rating, patientFeedback: feedback } });
  }
}
