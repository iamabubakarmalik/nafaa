import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ProcessSalaryDto } from './dto/process-salary.dto';
import { startOfDay, endOfDay, differenceInMinutes, differenceInDays } from 'date-fns';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // ───── STAFF CRUD ─────
  async create(user: AuthenticatedUser, dto: CreateStaffDto) {
    if (dto.cnic) {
      const existing = await this.prisma.staff.findFirst({
        where: { tenantId: user.tenantId, cnic: dto.cnic },
      });
      if (existing) throw new ConflictException('CNIC already registered');
    }

    const count = await this.prisma.staff.count({ where: { tenantId: user.tenantId } });
    const staffNumber = `EMP-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.staff.create({
      data: {
        tenantId: user.tenantId,
        staffNumber,
        fullName: dto.fullName,
        fatherName: dto.fatherName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        cnic: dto.cnic,
        phone: dto.phone,
        altPhone: dto.altPhone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
        emergencyRelation: dto.emergencyRelation,
        designation: dto.designation,
        department: dto.department,
        joinDate: new Date(dto.joinDate),
        status: dto.status ?? 'ACTIVE',
        salaryType: dto.salaryType,
        baseSalary: dto.baseSalary,
        workingHoursPerDay: dto.workingHoursPerDay ?? 8,
        workingDaysPerMonth: dto.workingDaysPerMonth ?? 26,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        iban: dto.iban,
        avatarUrl: dto.avatarUrl,
        cnicFrontUrl: dto.cnicFrontUrl,
        cnicBackUrl: dto.cnicBackUrl,
        shopId: dto.shopId,
        notes: dto.notes,
      },
    });
  }

  async findAll(user: AuthenticatedUser, search?: string, status?: string) {
    const where: any = { tenantId: user.tenantId };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { cnic: { contains: search } },
        { staffNumber: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    return this.prisma.staff.findMany({
      where,
      include: {
        shop: { select: { id: true, name: true } },
        _count: { select: { attendances: true, leaves: true, salaryPayments: true } },
      },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        shop: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        leaves: { orderBy: { startDate: 'desc' }, take: 20 },
        salaryPayments: { orderBy: { periodStart: 'desc' }, take: 12 },
      },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateStaffDto) {
    await this.findOne(user, id);

    const data: any = { ...dto };
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.joinDate) data.joinDate = new Date(dto.joinDate);

    return this.prisma.staff.update({ where: { id }, data });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.findOne(user, id);
    // Soft delete — mark as TERMINATED
    return this.prisma.staff.update({
      where: { id },
      data: { status: 'TERMINATED', endDate: new Date() },
    });
  }

  // ───── ATTENDANCE ─────
  async markAttendance(user: AuthenticatedUser, dto: MarkAttendanceDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, tenantId: user.tenantId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const date = startOfDay(new Date(dto.date));

    // Check existing
    const existing = await this.prisma.attendance.findUnique({
      where: { staffId_date: { staffId: dto.staffId, date } },
    });

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : existing?.checkIn ?? null;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : existing?.checkOut ?? null;

    let workedHours = 0;
    let overtimeHours = 0;
    let isLate = false;
    let lateMinutes = 0;

    if (checkIn && checkOut) {
      const minutes = differenceInMinutes(checkOut, checkIn);
      workedHours = Math.max(minutes / 60, 0);
      if (workedHours > staff.workingHoursPerDay) {
        overtimeHours = workedHours - staff.workingHoursPerDay;
      }
    }

    // Late check (assume 9:30 AM start)
    if (checkIn) {
      const expectedStart = new Date(checkIn);
      expectedStart.setHours(9, 30, 0, 0);
      if (checkIn > expectedStart) {
        isLate = true;
        lateMinutes = differenceInMinutes(checkIn, expectedStart);
      }
    }

    const data = {
      tenantId: user.tenantId,
      staffId: dto.staffId,
      date,
      checkIn,
      checkOut,
      checkInPhotoUrl: dto.checkInPhotoUrl,
      checkOutPhotoUrl: dto.checkOutPhotoUrl,
      checkInLocation: dto.checkInLocation,
      checkOutLocation: dto.checkOutLocation,
      status: dto.status ?? (checkIn ? 'PRESENT' : 'ABSENT') as any,
      workedHours,
      overtimeHours,
      isLate,
      lateMinutes,
      notes: dto.notes,
      markedById: user.id,
    };

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.attendance.create({ data });
  }

  async getAttendance(user: AuthenticatedUser, staffId: string, month?: string) {
    const where: any = { staffId, tenantId: user.tenantId };
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async todayAttendance(user: AuthenticatedUser) {
    const today = startOfDay(new Date());
    return this.prisma.attendance.findMany({
      where: { tenantId: user.tenantId, date: today },
      include: { staff: { select: { id: true, fullName: true, avatarUrl: true, designation: true } } },
    });
  }

  // ───── LEAVES ─────
  async createLeave(user: AuthenticatedUser, dto: CreateLeaveDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, tenantId: user.tenantId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date before start date');

    const days = differenceInDays(end, start) + 1;

    return this.prisma.staffLeave.create({
      data: {
        tenantId: user.tenantId,
        staffId: dto.staffId,
        type: dto.type,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason,
      },
    });
  }

  async approveLeave(user: AuthenticatedUser, id: string) {
    const leave = await this.prisma.staffLeave.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!leave) throw new NotFoundException('Leave not found');
    return this.prisma.staffLeave.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: user.id, approvedAt: new Date() },
    });
  }

  async rejectLeave(user: AuthenticatedUser, id: string, reason?: string) {
    return this.prisma.staffLeave.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }

  // ───── SALARY ─────
  async processSalary(user: AuthenticatedUser, dto: ProcessSalaryDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, tenantId: user.tenantId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const start = startOfDay(new Date(dto.periodStart));
    const end = endOfDay(new Date(dto.periodEnd));

    // Calculate attendance
    const attendances = await this.prisma.attendance.findMany({
      where: {
        staffId: dto.staffId,
        date: { gte: start, lte: end },
      },
    });

    const daysWorked = attendances.filter((a) => 
      a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY'
    ).length;
    
    const hoursWorked = attendances.reduce((sum, a) => sum + a.workedHours, 0);
    const totalLateMinutes = attendances.reduce((sum, a) => sum + a.lateMinutes, 0);

    // Calculate base
    let baseSalary = 0;
    switch (staff.salaryType) {
      case 'MONTHLY':
        baseSalary = (staff.baseSalary / staff.workingDaysPerMonth) * daysWorked;
        break;
      case 'DAILY':
        baseSalary = staff.baseSalary * daysWorked;
        break;
      case 'HOURLY':
        baseSalary = staff.baseSalary * hoursWorked;
        break;
      case 'COMMISSION':
        baseSalary = dto.commissionEarned ?? 0;
        break;
      default:
        baseSalary = staff.baseSalary;
    }

    // Late deduction (1 hour worth per 60min late, after 30min grace)
    const lateDeduction = totalLateMinutes > 30
      ? (totalLateMinutes / 60) * (staff.baseSalary / (staff.workingDaysPerMonth * staff.workingHoursPerDay))
      : 0;

    const overtimePay = dto.overtimePay ?? 0;
    const commissionEarned = dto.commissionEarned ?? 0;
    const bonuses = dto.bonuses ?? 0;
    const advances = dto.advances ?? 0;
    const otherDeductions = dto.otherDeductions ?? 0;

    const grossAmount = baseSalary + overtimePay + bonuses + (staff.salaryType !== 'COMMISSION' ? commissionEarned : 0);
    const totalDeductions = advances + lateDeduction + otherDeductions;
    const netAmount = Math.max(grossAmount - totalDeductions, 0);
    const paidAmount = dto.paidAmount ?? netAmount;
    const balanceAmount = netAmount - paidAmount;

    const count = await this.prisma.salaryPayment.count({ where: { tenantId: user.tenantId } });
    const paymentNumber = `PAY-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.salaryPayment.create({
      data: {
        tenantId: user.tenantId,
        staffId: dto.staffId,
        paymentNumber,
        periodStart: start,
        periodEnd: end,
        baseSalary,
        daysWorked,
        hoursWorked,
        overtimePay,
        commissionEarned,
        bonuses,
        advances,
        leaveDeduction: 0,
        lateDeduction,
        otherDeductions,
        grossAmount,
        totalDeductions,
        netAmount,
        paidAmount,
        balanceAmount,
        paymentMethod: dto.paymentMethod ?? 'CASH',
        status: balanceAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING',
        paidAt: paidAmount > 0 ? new Date() : null,
        paidById: user.id,
        notes: dto.notes,
      },
    });
  }

  async getSalaryPayments(user: AuthenticatedUser, staffId?: string) {
    const where: any = { tenantId: user.tenantId };
    if (staffId) where.staffId = staffId;

    return this.prisma.salaryPayment.findMany({
      where,
      include: { staff: { select: { id: true, fullName: true, avatarUrl: true, designation: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSalaryPayment(user: AuthenticatedUser, id: string) {
    const payment = await this.prisma.salaryPayment.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { staff: true },
    });
    if (!payment) throw new NotFoundException('Salary payment not found');
    return payment;
  }

  // ───── DOCUMENTS ─────
  async addDocument(user: AuthenticatedUser, staffId: string, data: any) {
    await this.findOne(user, staffId);
    return this.prisma.staffDocument.create({
      data: {
        staffId,
        type: data.type,
        title: data.title,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        notes: data.notes,
      },
    });
  }

  async removeDocument(user: AuthenticatedUser, staffId: string, docId: string) {
    await this.findOne(user, staffId);
    return this.prisma.staffDocument.delete({ where: { id: docId } });
  }

  // ───── STATS ─────
  async stats(user: AuthenticatedUser) {
    const [total, active, onLeave, today] = await Promise.all([
      this.prisma.staff.count({ where: { tenantId: user.tenantId } }),
      this.prisma.staff.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.staff.count({ where: { tenantId: user.tenantId, status: 'ON_LEAVE' } }),
      this.prisma.attendance.findMany({
        where: { tenantId: user.tenantId, date: startOfDay(new Date()) },
      }),
    ]);

    const presentToday = today.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const absentToday = active - presentToday;

    return { total, active, onLeave, presentToday, absentToday };
  }
}
