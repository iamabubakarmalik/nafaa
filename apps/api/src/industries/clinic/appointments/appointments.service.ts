import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const dayStart = startOfDay(start);
    const dayEnd = endOfDay(start);
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
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

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

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Not found');
    const newPaid = apt.paidAmount + amount;
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= apt.total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.clinicAppointment.update({ where: { id }, data: { paidAmount: newPaid, paymentStatus } });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    return this.prisma.clinicAppointment.update({ where: { id }, data: { patientRating: rating, patientFeedback: feedback } });
  }
}
