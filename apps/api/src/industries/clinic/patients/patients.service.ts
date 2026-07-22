import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.customerId) throw new BadRequestException('customerId required (create Customer first)');
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.clinicPatientProfile.findUnique({ where: { customerId: dto.customerId } });
    if (existing) throw new BadRequestException('Patient profile already exists');

    const count = await this.prisma.clinicPatientProfile.count({ where: { tenantId: user.tenantId } });
    const mrn = 'MRN-' + new Date().getFullYear() + '-' + String(count + 1).padStart(6, '0');

    // Calculate BMI
    let bmi: number | undefined;
    if (dto.heightCm && dto.weightKg) {
      const heightM = dto.heightCm / 100;
      bmi = Number((dto.weightKg / (heightM * heightM)).toFixed(2));
    }

    return this.prisma.clinicPatientProfile.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        mrn,
        bmi,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        lmpDate: dto.lmpDate ? new Date(dto.lmpDate) : undefined,
        edd: dto.edd ? new Date(dto.edd) : undefined,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { search?: string; gender?: string; bloodGroup?: string }) {
    return this.prisma.clinicPatientProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.gender && { gender: params.gender as any }),
        ...(params.bloodGroup && { bloodGroup: params.bloodGroup as any }),
        ...(params.search && {
          OR: [
            { mrn: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { phonePrimary: { contains: params.search } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: { lastVisitAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.clinicPatientProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Patient not found');
    return p;
  }

  async byMrn(user: AuthenticatedUser, mrn: string) {
    return this.prisma.clinicPatientProfile.findFirst({ where: { mrn, tenantId: user.tenantId } });
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const p = await this.prisma.clinicPatientProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Patient not found');

    let bmi: number | undefined;
    const heightCm = dto.heightCm ?? p.heightCm;
    const weightKg = dto.weightKg ?? p.weightKg;
    if (heightCm && weightKg) {
      const heightM = heightCm / 100;
      bmi = Number((weightKg / (heightM * heightM)).toFixed(2));
    }

    return this.prisma.clinicPatientProfile.update({
      where: { id },
      data: {
        ...dto,
        bmi,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        lmpDate: dto.lmpDate ? new Date(dto.lmpDate) : undefined,
        edd: dto.edd ? new Date(dto.edd) : undefined,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
      },
    });
  }

  async history(user: AuthenticatedUser, id: string) {
    const patient = await this.prisma.clinicPatientProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const [appointments, prescriptions, labOrders, vaccinations, vitalsHistory] = await Promise.all([
      this.prisma.clinicAppointment.findMany({
        where: { patientId: id, tenantId: user.tenantId },
        include: { encounter: true, vitals: true },
        orderBy: { scheduledStart: 'desc' },
        take: 50,
      }),
      this.prisma.clinicPrescription.findMany({
        where: { patientId: id, tenantId: user.tenantId },
        include: { items: true },
        orderBy: { issuedAt: 'desc' },
        take: 20,
      }),
      this.prisma.clinicLabOrder.findMany({
        where: { patientId: id, tenantId: user.tenantId },
        include: { tests: true },
        orderBy: { orderedAt: 'desc' },
        take: 20,
      }),
      this.prisma.clinicVaccination.findMany({
        where: { patientId: id, tenantId: user.tenantId },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.clinicVitals.findMany({
        where: { patientId: id },
        orderBy: { recordedAt: 'desc' },
        take: 20,
      }),
    ]);

    return { patient, appointments, prescriptions, labOrders, vaccinations, vitalsHistory };
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.clinicPatientProfile.update({ where: { id }, data: { isActive: false } });
  }
}
