import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOwner(user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Sirf Owner team manage kar sakta hai');
    }
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.user.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateTeamMemberDto) {
    this.requireOwner(user);

    if (dto.role === UserRole.OWNER) {
      throw new BadRequestException('Owner role manually nahi bana sakte');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already in use');
      }
    }

    const passwordHash = await hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        tenantId: user.tenantId,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async toggleActive(user: AuthenticatedUser, id: string) {
    this.requireOwner(user);

    const member = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) {
      throw new BadRequestException('Owner ko deactivate nahi kar sakte');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !member.isActive },
      select: {
        id: true,
        fullName: true,
        isActive: true,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.requireOwner(user);

    const member = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) {
      throw new BadRequestException('Owner ko delete nahi kar sakte');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Team member removed successfully' };
  }
}
