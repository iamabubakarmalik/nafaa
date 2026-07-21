import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertMemberDto } from './dto/upsert-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertMemberDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.gymMember.findUnique({ where: { customerId: dto.customerId } });
    if (existing) throw new BadRequestException('Gym member profile already exists for this customer');

    if (!dto.memberNumber) {
      const count = await this.prisma.gymMember.count({ where: { tenantId: user.tenantId } });
      dto.memberNumber = 'MEM-' + String(count + 1).padStart(5, '0');
    }

    if (!dto.qrCode) dto.qrCode = 'GYM-' + user.tenantId.slice(0, 8) + '-' + dto.memberNumber;

    return this.prisma.gymMember.create({
      data: {
  tenantId: user.tenantId,
  customerId: dto.customerId,
  memberNumber: dto.memberNumber!, // ✅ FORCE (already generated above)
  qrCode: dto.qrCode!,
  referralCode: 'REF-' + dto.memberNumber,
  
  dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,

  // OPTIONAL FIELDS
  gender: dto.gender,
  bloodGroup: dto.bloodGroup,
  rfidCard: dto.rfidCard,
  biometricId: dto.biometricId,
},
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertMemberDto) {
    const m = await this.prisma.gymMember.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member not found');
    return this.prisma.gymMember.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; goal?: string; search?: string; hasActiveMembership?: boolean }) {
    const members = await this.prisma.gymMember.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as any }),
        ...(params.goal && { primaryGoal: params.goal as any }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const customerIds = members.map((m) => m.customerId);
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
          ],
        }),
      },
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
