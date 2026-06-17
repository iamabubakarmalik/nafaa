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
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../common/constants/permissions.constants';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOwner(user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Sirf Owner team manage kar sakta hai');
    }
  }

  /**
   * Validate permission keys against the master list
   * Filters out any unknown permissions
   */
  private sanitizePermissions(perms: string[] | undefined): string[] {
    if (!perms || perms.length === 0) return [];
    const valid = new Set<string>(ALL_PERMISSIONS);
    return Array.from(new Set(perms.filter((p) => valid.has(p as any))));
  }

  /**
   * GET /team
   * Returns all team members with their permissions
   */
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
        permissions: true,
        shopId: true,
        assignedShop: {
          select: { id: true, name: true, isMain: true },
        },
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * POST /team
   * Create new team member with custom or default permissions
   */
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

    // Use custom permissions if provided, otherwise apply role defaults
    const permissions =
      dto.permissions && dto.permissions.length > 0
        ? this.sanitizePermissions(dto.permissions)
        : DEFAULT_ROLE_PERMISSIONS[dto.role] ?? [];

    const passwordHash = await hashPassword(dto.password);

    // Validate shopId if provided
    if ((dto as any).shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: (dto as any).shopId, tenantId: user.tenantId },
      });
      if (!shop) throw new NotFoundException('Shop not found');
    }

    const created = await this.prisma.user.create({
      data: {
        tenantId: user.tenantId,
        shopId: (dto as any).shopId || null,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        permissions,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        shopId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Activity log
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'TeamMember',
        entityId: created.id,
        description: `${user.email} added new team member: ${created.fullName} (${created.role})`,
        metadata: { role: created.role, permissions: created.permissions },
      },
    });

    return created;
  }

  /**
   * PATCH /team/:id/permissions
   * Owner updates a member's permissions
   */
  async updatePermissions(
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePermissionsDto,
  ) {
    this.requireOwner(user);

    const member = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) {
      throw new BadRequestException('Owner ki permissions change nahi kar sakte');
    }

    const cleanPerms = this.sanitizePermissions(dto.permissions);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { permissions: cleanPerms },
      select: {
        id: true,
        fullName: true,
        role: true,
        permissions: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'TeamMember',
        entityId: id,
        description: `${user.email} updated permissions for ${member.fullName}`,
        metadata: { permissions: cleanPerms },
      },
    });

    return updated;
  }

  /**
   * Assign team member to a specific shop
   */
  async updateShop(user: AuthenticatedUser, id: string, shopId: string | null) {
    this.requireOwner(user);

    const member = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) {
      throw new BadRequestException('Owner ko kisi shop se tie nahi kar sakte');
    }

    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId: user.tenantId },
      });
      if (!shop) throw new NotFoundException('Shop not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { shopId },
      select: {
        id: true, fullName: true, role: true, shopId: true,
        assignedShop: { select: { id: true, name: true, isMain: true } },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'TeamMember',
        entityId: id,
        description: `${user.email} ${shopId ? 'assigned' : 'unassigned'} ${member.fullName} ${shopId ? 'to shop' : 'from shop'}`,
        metadata: { shopId },
      },
    });

    return updated;
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

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !member.isActive },
      select: {
        id: true,
        fullName: true,
        isActive: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'TeamMember',
        entityId: id,
        description: `${user.email} ${updated.isActive ? 'activated' : 'deactivated'} ${member.fullName}`,
      },
    });

    return updated;
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

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'DELETE',
        entityType: 'TeamMember',
        entityId: id,
        description: `${user.email} removed team member: ${member.fullName}`,
      },
    });

    return { message: 'Team member removed successfully' };
  }

  /**
   * GET /team/permissions/catalog
   * Returns all available permissions + role defaults
   * Used by frontend to render permission checkboxes
   */
  getCatalog(user: AuthenticatedUser) {
    this.requireOwner(user);
    return {
      allPermissions: ALL_PERMISSIONS,
      defaultsByRole: DEFAULT_ROLE_PERMISSIONS,
    };
  }
}
