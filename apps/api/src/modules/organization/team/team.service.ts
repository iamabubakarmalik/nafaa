import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../common/constants/permissions.constants';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOwner(user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner team manage kar sakta hai');
    }
  }

  private sanitizePermissions(perms: string[] | undefined): string[] {
    if (!perms || perms.length === 0) return [];
    const valid = new Set<string>(ALL_PERMISSIONS);
    return Array.from(new Set(perms.filter((p) => valid.has(p as any))));
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
        permissions: true,
        shopId: true,
        assignedShop: {
          select: { id: true, name: true, isMain: true, type: true, isActive: true },
        },
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

    // Shop assignment rules
    const needsShop =
      dto.role === UserRole.MANAGER ||
      dto.role === UserRole.CASHIER;

    if (needsShop && !(dto as any).shopId) {
      throw new BadRequestException(
        `${dto.role} ke liye shop select karna zaroori hai`,
      );
    }

    // Validate shopId if provided
    let shop: any = null;
    if ((dto as any).shopId) {
      shop = await this.prisma.shop.findFirst({
        where: { id: (dto as any).shopId, tenantId: user.tenantId },
      });
      if (!shop) throw new NotFoundException('Shop not found');
      if (!shop.isActive) throw new BadRequestException('Yeh shop inactive hai');
    }

    // Check duplicate email
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

    const permissions =
      dto.permissions && dto.permissions.length > 0
        ? this.sanitizePermissions(dto.permissions)
        : DEFAULT_ROLE_PERMISSIONS[dto.role] ?? [];

    const passwordHash = await hashPassword(dto.password);

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
        assignedShop: {
          select: { id: true, name: true, isMain: true },
        },
        isActive: true,
        createdAt: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'TeamMember',
        entityId: created.id,
        description: `${user.email} added ${created.role}: ${created.fullName}${
          shop ? ` (assigned to ${shop.name})` : ''
        }`,
        metadata: {
          role: created.role,
          permissions: created.permissions,
          shopId: created.shopId,
        },
      },
    });

    return created;
  }

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

  async updateShop(user: AuthenticatedUser, id: string, shopId: string | null) {
    this.requireOwner(user);

    const member = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) {
      throw new BadRequestException('Owner ko kisi shop se tie nahi kar sakte');
    }

    // Manager/Cashier MUST have a shop
    if (
      (member.role === UserRole.MANAGER || member.role === UserRole.CASHIER) &&
      !shopId
    ) {
      throw new BadRequestException(
        `${member.role} ko shop se unassign nahi kar sakte. Naya shop de dein.`,
      );
    }

    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId: user.tenantId },
      });
      if (!shop) throw new NotFoundException('Shop not found');
      if (!shop.isActive) throw new BadRequestException('Yeh shop inactive hai');
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
        description: `${user.email} ${
          shopId ? 'assigned' : 'unassigned'
        } ${member.fullName} ${shopId ? 'to shop' : 'from shop'}`,
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

    // If deactivating, kill all sessions
    if (!updated.isActive) {
      await this.prisma.session.deleteMany({ where: { userId: id } });
    }

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'TeamMember',
        entityId: id,
        description: `${user.email} ${
          updated.isActive ? 'activated' : 'deactivated'
        } ${member.fullName}`,
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

    // Check if user has any transactional history
    const [saleCount, expenseCount, cashRegCount] = await Promise.all([
      this.prisma.sale.count({ where: { createdById: id } }),
      this.prisma.expense.count({ where: { createdById: id } }),
      this.prisma.cashRegister.count({
        where: { OR: [{ openedById: id }, { closedById: id }] },
      }),
    ]);

    if (saleCount > 0 || expenseCount > 0 || cashRegCount > 0) {
      // Soft delete — deactivate + kill sessions
      const updated = await this.prisma.user.update({
        where: { id },
        data: { isActive: false, shopId: null },
      });
      await this.prisma.session.deleteMany({ where: { userId: id } });

      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'DEACTIVATE',
          entityType: 'TeamMember',
          entityId: id,
          description: `${user.email} soft-deleted (deactivated) ${member.fullName} — has history`,
          metadata: { saleCount, expenseCount, cashRegCount },
        },
      });

      return {
        message: 'Team member deactivated (had transactional history)',
        softDeleted: true,
      };
    }

    await this.prisma.user.delete({ where: { id } });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'DELETE',
        entityType: 'TeamMember',
        entityId: id,
        description: `${user.email} removed ${member.fullName}`,
      },
    });

    return { message: 'Team member removed successfully', softDeleted: false };
  }

  getCatalog(user: AuthenticatedUser) {
    this.requireOwner(user);
    return {
      allPermissions: ALL_PERMISSIONS,
      defaultsByRole: DEFAULT_ROLE_PERMISSIONS,
    };
  }
}
