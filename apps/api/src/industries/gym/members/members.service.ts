import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertMemberDto } from './dto/upsert-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertMemberDto) {
    if (!dto.customerId) throw new BadRequestException('Customer chunein');
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.gymMember.findUnique({ where: { customerId: dto.customerId } });
    if (existing) throw new BadRequestException('Is customer ka gym member profile pehle se bana hua hai');

    if (!dto.memberNumber) {
      const count = await this.prisma.gymMember.count({ where: { tenantId: user.tenantId } });
      dto.memberNumber = 'MEM-' + String(count + 1).padStart(5, '0');
    }
    if (!dto.qrCode) dto.qrCode = 'GYM-' + user.tenantId.slice(0, 8) + '-' + dto.memberNumber;

    // The typed referral code is the code of the member who referred this one.
    const { referralCode, customerId, dateOfBirth, ...rest } = dto;
    let referredById = dto.referredById;
    if (!referredById && referralCode) {
      const referrer = await this.prisma.gymMember.findFirst({ where: { tenantId: user.tenantId, referralCode }, select: { id: true } });
      referredById = referrer?.id;
    }

    return this.prisma.gymMember.create({
      data: {
        ...rest,
        tenantId: user.tenantId,
        customerId: customerId!,
        memberNumber: dto.memberNumber!,
        qrCode: dto.qrCode!,
        referralCode: 'REF-' + dto.memberNumber,
        referredById,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertMemberDto) {
    const m = await this.prisma.gymMember.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member not found');
    // The customer link and own referral code never change on edit.
    const { customerId: _c, referralCode: _r, ...rest } = dto;
    return this.prisma.gymMember.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; goal?: string; search?: string; hasActiveMembership?: boolean }) {
    // Search by name / phone / member number over every member, not only the latest 200.
    const q = params.search?.trim();
    const matchedCustomers = q
      ? await this.prisma.customer.findMany({
          where: { tenantId: user.tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] },
          select: { id: true },
          take: 500,
        })
      : [];
    const members = await this.prisma.gymMember.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(q && {
          OR: [
            { customerId: { in: matchedCustomers.map((c) => c.id) } },
            { memberNumber: { contains: q, mode: 'insensitive' } },
          ],
        }),
        ...(params.status && { status: params.status as any }),
        ...(params.goal && { primaryGoal: params.goal as any }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const customerIds = members.map((m) => m.customerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, tenantId: user.tenantId },
    });
    const customersMap = new Map(customers.map((c) => [c.id, c]));

    let result = members.filter((m) => customersMap.has(m.customerId)).map((m) => ({ ...m, customer: customersMap.get(m.customerId) }));

    if (params.hasActiveMembership !== undefined) {
      const memberIds = result.map((m) => m.id);
      const activeMemberships = await this.prisma.gymMemberMembership.findMany({
        where: { memberId: { in: memberIds }, status: 'ACTIVE', endDate: { gte: new Date() } },
      });
      const activeSet = new Set(activeMemberships.map((am) => am.memberId));
      result = params.hasActiveMembership
        ? result.filter((m) => activeSet.has(m.id))
        : result.filter((m) => !activeSet.has(m.id));
    }

    return result;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMember.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        memberships: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 10 },
        measurements: { orderBy: { measurementDate: 'desc' }, take: 12 },
        attendances: { orderBy: { checkInAt: 'desc' }, take: 20 },
      },
    });
    if (!m) throw new NotFoundException('Member not found');
    const customer = await this.prisma.customer.findUnique({ where: { id: m.customerId } });
    return { ...m, customer };
  }

  async byQrCode(user: AuthenticatedUser, qrCode: string) {
    const m = await this.prisma.gymMember.findFirst({ where: { qrCode, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member not found');
    const customer = await this.prisma.customer.findUnique({ where: { id: m.customerId } });
    return { ...m, customer };
  }

  async byRfid(user: AuthenticatedUser, rfidCard: string) {
    const m = await this.prisma.gymMember.findFirst({ where: { rfidCard, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member not found');
    const customer = await this.prisma.customer.findUnique({ where: { id: m.customerId } });
    return { ...m, customer };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMember.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member not found');
    return this.prisma.gymMember.update({ where: { id }, data: { isActive: false, status: 'INACTIVE' } });
  }

  async summary(user: AuthenticatedUser) {
    const [total, active, byGoal, byStatus] = await Promise.all([
      this.prisma.gymMember.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.gymMember.count({ where: { tenantId: user.tenantId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.gymMember.groupBy({ by: ['primaryGoal'], where: { tenantId: user.tenantId, isActive: true }, _count: { _all: true } }),
      this.prisma.gymMember.groupBy({ by: ['status'], where: { tenantId: user.tenantId, isActive: true }, _count: { _all: true } }),
    ]);
    return { total, active, byGoal, byStatus };
  }
}
