import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { EmailService } from '../../email/email.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../common/constants/permissions.constants';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

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

  async toggleActive(user: AuthenticatedUser, id: string, isActive?: boolean) {
    this.requireOwner(user);

    const member = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) {
      throw new BadRequestException('Owner ko deactivate nahi kar sakte');
    }
    if (isActive !== undefined && member.isActive === isActive) {
      return { id: member.id, fullName: member.fullName, isActive: member.isActive };
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: isActive ?? !member.isActive },
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

  /**
   * Gives a staff member their own approval PIN. It approves only the
   * PIN-protected actions they also hold the permission for; the owner's PIN
   * must exist first and the new PIN may not match it or anyone else's.
   */
  async setApprovalPin(user: AuthenticatedUser, id: string, pin: string) {
    this.requireOwner(user);
    const member = await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, fullName: true, role: true } });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER) throw new BadRequestException('Malik apna PIN Settings → Security se lagata hai');
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { managerPin: true } });
    if (!settings?.managerPin) throw new BadRequestException('Pehle apna (malik ka) PIN Settings → Security me lagayein');
    if (await comparePassword(pin, settings.managerPin)) throw new BadRequestException('Yeh PIN malik ke PIN jaisa hai — koi aur chunein');
    const others = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, id: { not: id }, approvalPin: { not: null } },
      select: { approvalPin: true },
    });
    for (const o of others) {
      if (await comparePassword(pin, o.approvalPin!)) throw new BadRequestException('Yeh PIN kisi aur staff ka hai — koi aur chunein');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { approvalPin: await hashPassword(pin) } }),
      this.prisma.activityLog.create({
        data: { tenantId: user.tenantId, userId: user.id, action: 'STAFF_PIN_SET', entityType: 'User', entityId: id, description: `${member.fullName} ka manzoori PIN lagaya` },
      }),
    ]);
    return { id, hasApprovalPin: true };
  }

  async clearApprovalPin(user: AuthenticatedUser, id: string) {
    this.requireOwner(user);
    const member = await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, fullName: true } });
    if (!member) throw new NotFoundException('Team member not found');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { approvalPin: null } }),
      this.prisma.activityLog.create({
        data: { tenantId: user.tenantId, userId: user.id, action: 'STAFF_PIN_REMOVED', entityType: 'User', entityId: id, description: `${member.fullName} ka manzoori PIN hataya` },
      }),
    ]);
    return { id, hasApprovalPin: false };
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

    // Any record that ties this login to the books keeps it (deactivated, never deleted).
    // Sales count both the cashier and the seller picked at the counter.
    const [saleCount, expenseCount, cashRegCount, otherCount] = await Promise.all([
      this.prisma.sale.count({ where: { OR: [{ createdById: id }, { soldById: id }] } }),
      this.prisma.expense.count({ where: { createdById: id } }),
      this.prisma.cashRegister.count({
        where: { OR: [{ openedById: id }, { closedById: id }] },
      }),
      Promise.all([
        this.prisma.saleReturn.count({ where: { createdById: id } }),
        this.prisma.purchase.count({ where: { createdById: id } }),
        this.prisma.stockAdjustment.count({ where: { createdById: id } }),
        this.prisma.cashTransaction.count({ where: { createdById: id } }),
        this.prisma.customerLedger.count({ where: { createdById: id } }),
      ]).then((n) => n.reduce((a, b) => a + b, 0)),
    ]);

    if (saleCount > 0 || expenseCount > 0 || cashRegCount > 0 || otherCount > 0) {
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
          metadata: { saleCount, expenseCount, cashRegCount, otherCount },
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

  /** Role and branch rules shared by create, invite and update. */
  private async checkRoleShop(user: AuthenticatedUser, role: UserRole, shopId: string | null | undefined) {
    if (role === UserRole.OWNER || role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Owner role manually nahi bana sakte');
    }
    if ((role === UserRole.MANAGER || role === UserRole.CASHIER) && !shopId) {
      throw new BadRequestException(`${role} ke liye shop select karna zaroori hai`);
    }
    if (!shopId) return null;
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId, tenantId: user.tenantId }, select: { id: true, name: true, isActive: true } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (!shop.isActive) throw new BadRequestException('Yeh shop inactive hai');
    return shop;
  }

  /** Next free EMP-0001 style number; counting rows breaks once numbers have gaps. */
  private async nextStaffNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const rows = await tx.staff.findMany({ where: { tenantId }, select: { staffNumber: true } });
    const max = rows.reduce((m, r) => Math.max(m, Number(/(\d+)$/.exec(r.staffNumber)?.[1] ?? 0)), 0);
    return `EMP-${String(max + 1).padStart(4, '0')}`;
  }

  /**
   * New login and its HR record in one transaction, so a person never ends up
   * with a login but no salary/attendance record. A second click fails on the
   * unique email instead of making a second login.
   */
  async invite(user: AuthenticatedUser, dto: InviteTeamMemberDto) {
    this.requireOwner(user);
    const shop = await this.checkRoleShop(user, dto.role, dto.shopId);
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone?.trim() || null;

    const [emailTaken, phoneTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      phone ? this.prisma.user.findUnique({ where: { phone }, select: { id: true } }) : null,
    ]);
    if (emailTaken) throw new ConflictException('Yeh email pehle se kisi login par hai');
    if (phoneTaken) throw new ConflictException('Yeh phone number pehle se kisi login par hai');

    if (dto.staffId) {
      const st = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId }, select: { userId: true } });
      if (!st) throw new NotFoundException('HR record nahi mila');
      if (st.userId) throw new BadRequestException('Is HR record ka login pehle se bana hua hai');
    }

    const permissions = dto.permissions && dto.permissions.length > 0
      ? this.sanitizePermissions(dto.permissions)
      : DEFAULT_ROLE_PERMISSIONS[dto.role] ?? [];
    const passwordHash = await hashPassword(dto.password);
    const digits = (phone ?? '').replace(/[^0-9]/g, '').slice(-10);

    let result: { member: { id: string; fullName: string; email: string; role: UserRole; shopId: string | null }; staffId: string; linked: 'existing' | 'matched' | 'new' };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const member = await tx.user.create({
          data: {
            tenantId: user.tenantId, shopId: shop?.id ?? null, fullName: dto.fullName.trim(), email, phone,
            passwordHash, role: dto.role, permissions, isActive: true,
          },
          select: { id: true, fullName: true, email: true, role: true, shopId: true },
        });
        const hr = {
          ...(dto.designation ? { designation: dto.designation.trim() } : {}),
          ...(dto.salaryType ? { salaryType: dto.salaryType } : {}),
          ...(dto.baseSalary !== undefined ? { baseSalary: dto.baseSalary } : {}),
        };
        /* Link the given record, else one that matches by email or phone, else a new one. */
        const match = dto.staffId
          ? { id: dto.staffId }
          : await tx.staff.findFirst({
            where: {
              tenantId: user.tenantId, userId: null,
              OR: [{ email: { equals: email, mode: 'insensitive' } }, ...(digits.length >= 10 ? [{ phone: { endsWith: digits } }] : [])],
            },
            select: { id: true },
          });
        if (match) {
          await tx.staff.update({ where: { id: match.id }, data: { userId: member.id, ...hr } });
          await this.log(tx, user, 'CREATE', member.id, `${user.email} added ${member.role}: ${member.fullName}${shop ? ` (${shop.name})` : ''}`, { role: member.role, permissions, shopId: member.shopId, staffId: match.id });
          return { member, staffId: match.id, linked: dto.staffId ? 'existing' as const : 'matched' as const };
        }
        const created = await tx.staff.create({
          data: {
            tenantId: user.tenantId, userId: member.id, staffNumber: await this.nextStaffNumber(tx, user.tenantId),
            fullName: member.fullName, phone: phone ?? '—', email, shopId: shop?.id ?? null,
            designation: dto.designation?.trim() || prettyRole(dto.role),
            joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
            salaryType: dto.salaryType ?? 'MONTHLY', baseSalary: dto.baseSalary ?? 0, status: 'ACTIVE',
          },
          select: { id: true },
        });
        await this.log(tx, user, 'CREATE', member.id, `${user.email} added ${member.role}: ${member.fullName}${shop ? ` (${shop.name})` : ''}`, { role: member.role, permissions, shopId: member.shopId, staffId: created.id });
        return { member, staffId: created.id, linked: 'new' as const };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Yeh email ya phone pehle se registered hai');
      }
      throw e;
    }

    let emailSent = false;
    if (dto.sendEmail) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } });
      const owner = await this.prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true } });
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      emailSent = await this.email.send({
        tenantId: user.tenantId, templateSlug: 'team-member-invited', toEmail: email, toName: result.member.fullName,
        variables: {
          name: result.member.fullName, ownerName: owner?.fullName ?? '', shopName: tenant?.name ?? '', email,
          tempPassword: dto.password, role: result.member.role, loginUrl: `${appUrl}/login`, appUrl,
        },
      }).then(() => true, () => false);
    }

    return { ...result.member, staffId: result.staffId, linked: result.linked, emailSent };
  }

  /** Name, email, phone, role and branch of a login. Permissions are not touched. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateTeamMemberDto) {
    this.requireOwner(user);
    const member = await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!member) throw new NotFoundException('Team member not found');
    const isOwner = member.role === UserRole.OWNER || member.role === UserRole.SUPER_ADMIN;
    if (isOwner && ((dto.role && dto.role !== member.role) || dto.shopId !== undefined)) {
      throw new BadRequestException('Owner ka role aur branch yahan nahi badalte');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName?.trim()) data.fullName = dto.fullName.trim();
    if (dto.email && dto.email.toLowerCase().trim() !== member.email) {
      const email = dto.email.toLowerCase().trim();
      const taken = await this.prisma.user.findFirst({ where: { email, id: { not: id } }, select: { id: true } });
      if (taken) throw new ConflictException('Yeh email pehle se kisi login par hai');
      data.email = email;
    }
    if (dto.phone !== undefined) {
      const phone = dto.phone.trim() || null;
      if (phone && phone !== member.phone) {
        const taken = await this.prisma.user.findFirst({ where: { phone, id: { not: id } }, select: { id: true } });
        if (taken) throw new ConflictException('Yeh phone number pehle se kisi login par hai');
      }
      data.phone = phone;
    }
    if (!isOwner) {
      const role = dto.role ?? member.role;
      const shopId = dto.shopId !== undefined ? dto.shopId : member.shopId;
      const shop = await this.checkRoleShop(user, role, shopId);
      if (dto.role) data.role = role;
      if (dto.shopId !== undefined) data.assignedShop = shop ? { connect: { id: shop.id } } : { disconnect: true };
    }

    const updated = await this.prisma.user.update({
      where: { id }, data,
      select: { id: true, fullName: true, email: true, phone: true, role: true, shopId: true, isActive: true, permissions: true, assignedShop: { select: { id: true, name: true, isMain: true } } },
    });

    /* A new role or branch changes what the app shows; sign them in again so it takes effect now. */
    if (updated.role !== member.role || updated.shopId !== member.shopId) {
      await this.prisma.session.deleteMany({ where: { userId: id } });
    }
    await this.log(this.prisma, user, 'UPDATE', id, `${user.email} updated login of ${updated.fullName}`, {
      changed: Object.keys(data), role: { from: member.role, to: updated.role }, shopId: { from: member.shopId, to: updated.shopId },
    });
    return updated;
  }

  /** Owner sets a new password for a member; every device is signed out. */
  async resetPassword(user: AuthenticatedUser, id: string, password: string) {
    this.requireOwner(user);
    const member = await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.role === UserRole.OWNER || member.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Owner apna password Profile se badalta hai');
    }
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password), passwordResetToken: null, passwordResetExpires: null,
        ...(member.authProvider === 'GOOGLE' ? { authProvider: 'HYBRID' as const } : {}),
      },
    });
    const { count } = await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.log(this.prisma, user, 'UPDATE', id, `${user.email} reset the password of ${member.fullName}`, { sessionsClosed: count });
    return { ok: true, sessionsClosed: count };
  }

  /** Sign a member out of one device, or of all devices when `sessionId` is not given. */
  async signOut(user: AuthenticatedUser, id: string, sessionId?: string) {
    this.requireOwner(user);
    const member = await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, fullName: true } });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.id === user.id) throw new BadRequestException('Apne devices Profile → Security se band karein');
    const { count } = await this.prisma.session.deleteMany({ where: { userId: id, ...(sessionId ? { id: sessionId } : {}) } });
    await this.log(this.prisma, user, 'UPDATE', id, `${user.email} signed ${member.fullName} out of ${sessionId ? 'one device' : 'all devices'}`, { count });
    return { ok: true, sessionsClosed: count };
  }

  private log(db: Pick<Prisma.TransactionClient, 'activityLog'>, user: AuthenticatedUser, action: string, entityId: string, description: string, metadata?: Prisma.InputJsonValue) {
    return db.activityLog.create({
      data: { tenantId: user.tenantId, userId: user.id, action, entityType: 'TeamMember', entityId, description, metadata },
    });
  }

  getCatalog(user: AuthenticatedUser) {
    this.requireOwner(user);
    return {
      allPermissions: ALL_PERMISSIONS,
      defaultsByRole: DEFAULT_ROLE_PERMISSIONS,
    };
  }
}

/** OWNER → "Owner", CASHIER → "Cashier" for the HR record's job title. */
function prettyRole(role: string) {
  return role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
