import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ADMIN_AREAS, SYSTEM_ROLES, cleanPermissions } from '../access/admin-permissions';
import { invalidateAdminAccess } from '../access/admin-access';

const SYSTEM_SLUG = 'nafaa-system';
const INVITE_DAYS = 7;
export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Admin staff: roles (sets of permission keys), members (people with admin
 * access), invites, sessions and the audit log.
 *
 * Staff are User rows with role ADMIN_STAFF in the internal "nafaa-system"
 * shop, so they never appear in or reach any merchant's data. Removing
 * someone disables them and ends their sessions; the user row is kept so the
 * audit log still names them.
 */
@Injectable()
export class AdminStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Catalog and roles ──────────────────────────────────────

  catalog() {
    return { areas: ADMIN_AREAS };
  }

  /** Creates any missing built-in role. Existing roles are never overwritten. */
  private async ensureSystemRoles() {
    const existing = await this.prisma.adminRole.findMany({ where: { key: { in: SYSTEM_ROLES.map((r) => r.key) } }, select: { key: true } });
    const have = new Set(existing.map((r) => r.key));
    const missing = SYSTEM_ROLES.filter((r) => !have.has(r.key));
    if (missing.length) {
      await this.prisma.adminRole.createMany({ data: missing.map((r) => ({ ...r, isSystem: true })), skipDuplicates: true });
    }
  }

  async roles() {
    await this.ensureSystemRoles();
    const roles = await this.prisma.adminRole.findMany({
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      include: { _count: { select: { members: true } } },
    });
    return roles.map(({ _count, ...r }) => ({ ...r, memberCount: _count.members }));
  }

  async createRole(dto: { name: string; description?: string; permissions: string[] }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Give the role a name.');
    const key = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${randomBytes(2).toString('hex')}`;
    return this.prisma.adminRole.create({
      data: { key, name, description: dto.description?.trim() || null, permissions: cleanPermissions(dto.permissions) },
    });
  }

  async updateRole(id: string, dto: { name?: string; description?: string; permissions?: string[] }) {
    const role = await this.prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    const updated = await this.prisma.adminRole.update({
      where: { id },
      data: {
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.permissions ? { permissions: cleanPermissions(dto.permissions) } : {}),
      },
    });
    invalidateAdminAccess();
    return updated;
  }

  async deleteRole(id: string) {
    const role = await this.prisma.adminRole.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Built-in roles cannot be deleted. You can change their permissions.');
    if (role._count.members) throw new ConflictException(`${role._count.members} people still have this role. Move them to another role first.`);
    await this.prisma.adminRole.delete({ where: { id } });
    return { success: true };
  }

  // ─── Members ────────────────────────────────────────────────

  async members() {
    const [supers, staff] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.SUPER_ADMIN },
        select: { id: true, fullName: true, email: true, isActive: true, lastLoginAt: true, createdAt: true, adminMember: { select: { totpEnabled: true, lastActiveAt: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.adminMember.findMany({
        where: { user: { role: UserRole.ADMIN_STAFF } },
        include: { user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true, lastLoginAt: true } }, role: { select: { id: true, name: true, key: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      superAdmins: supers.map((u) => ({
        userId: u.id, fullName: u.fullName, email: u.email, active: u.isActive, lastLoginAt: u.lastLoginAt,
        totpEnabled: u.adminMember?.totpEnabled ?? false, lastActiveAt: u.adminMember?.lastActiveAt ?? null, createdAt: u.createdAt,
      })),
      staff: staff.map((m) => ({
        id: m.id, userId: m.userId, fullName: m.user.fullName, email: m.user.email, phone: m.user.phone,
        status: m.status, role: m.role, extraPermissions: m.extraPermissions, totpEnabled: m.totpEnabled,
        inviteExpiresAt: m.status === 'INVITED' ? m.inviteExpiresAt : null,
        lastLoginAt: m.user.lastLoginAt, lastActiveAt: m.lastActiveAt, createdAt: m.createdAt,
      })),
    };
  }

  private async systemTenantId(fallbackUserId: string) {
    const system = await this.prisma.tenant.findUnique({ where: { slug: SYSTEM_SLUG }, select: { id: true } });
    if (system) return system.id;
    const inviter = await this.prisma.user.findUnique({ where: { id: fallbackUserId }, select: { tenantId: true } });
    if (!inviter) throw new BadRequestException('No internal shop found for admin staff.');
    return inviter.tenantId;
  }

  private newInvite() {
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    return { token, hash: hashInviteToken(token), expires, url: `${this.config.get<string>('ADMIN_URL')}/accept-invite?token=${token}` };
  }

  async invite(dto: { email: string; fullName: string; roleId: string; extraPermissions?: string[] }, inviterId: string) {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address.');
    if (!dto.fullName?.trim()) throw new BadRequestException('Enter their name.');
    const role = await this.prisma.adminRole.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException('Choose a role.');
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing) {
      throw new ConflictException(existing.role === UserRole.ADMIN_STAFF || existing.role === UserRole.SUPER_ADMIN
        ? 'This person already has admin access.'
        : 'This email belongs to a merchant account. Use a different email for admin access.');
    }
    const invite = this.newInvite();
    const tenantId = await this.systemTenantId(inviterId);
    const member = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { tenantId, email, fullName: dto.fullName.trim(), role: UserRole.ADMIN_STAFF, isActive: true, emailVerified: false },
      });
      return tx.adminMember.create({
        data: {
          userId: user.id, roleId: role.id, extraPermissions: cleanPermissions(dto.extraPermissions),
          status: 'INVITED', invitedById: inviterId, inviteTokenHash: invite.hash, inviteExpiresAt: invite.expires,
        },
      });
    });
    return { memberId: member.id, inviteUrl: invite.url, expiresAt: invite.expires };
  }

  async resendInvite(memberId: string) {
    const member = await this.prisma.adminMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Person not found');
    if (member.status !== 'INVITED') throw new BadRequestException('This person has already joined.');
    const invite = this.newInvite();
    await this.prisma.adminMember.update({ where: { id: memberId }, data: { inviteTokenHash: invite.hash, inviteExpiresAt: invite.expires } });
    return { inviteUrl: invite.url, expiresAt: invite.expires };
  }

  async updateMember(memberId: string, dto: { roleId?: string; extraPermissions?: string[]; status?: 'ACTIVE' | 'DISABLED' }, actorId: string) {
    const member = await this.prisma.adminMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Person not found');
    if (member.userId === actorId && dto.status === 'DISABLED') throw new ForbiddenException('You cannot disable your own access.');
    if (dto.roleId && !(await this.prisma.adminRole.findUnique({ where: { id: dto.roleId } }))) throw new BadRequestException('Choose a role.');
    if (dto.status === 'ACTIVE' && member.status === 'INVITED') throw new BadRequestException('They become active when they accept the invite.');
    const updated = await this.prisma.adminMember.update({
      where: { id: memberId },
      data: {
        ...(dto.roleId ? { roleId: dto.roleId } : {}),
        ...(dto.extraPermissions ? { extraPermissions: cleanPermissions(dto.extraPermissions) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
    if (dto.status === 'DISABLED') await this.prisma.session.deleteMany({ where: { userId: member.userId } });
    invalidateAdminAccess(member.userId);
    return updated;
  }

  /** Removes admin access: disabled, sessions ended, sign-in blocked. The user row stays for the audit log. */
  async removeMember(memberId: string, actorId: string) {
    const member = await this.prisma.adminMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Person not found');
    if (member.userId === actorId) throw new ForbiddenException('You cannot remove yourself.');
    await this.prisma.$transaction([
      this.prisma.adminMember.update({ where: { id: memberId }, data: { status: 'DISABLED', inviteTokenHash: null, roleId: null, extraPermissions: [] } }),
      this.prisma.user.update({ where: { id: member.userId }, data: { isActive: false } }),
      this.prisma.session.deleteMany({ where: { userId: member.userId } }),
    ]);
    invalidateAdminAccess(member.userId);
    return { success: true };
  }

  // ─── Sessions ───────────────────────────────────────────────

  async sessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, deviceName: true, location: true, lastUsedAt: true, createdAt: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async endSession(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
    return { success: true };
  }

  async endAllSessions(userId: string) {
    const { count } = await this.prisma.session.deleteMany({ where: { userId } });
    return { ended: count };
  }

  // ─── Audit log ──────────────────────────────────────────────

  async audit(params: { actorId?: string; search?: string; method?: string; failed?: boolean; from?: Date; to?: Date; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(params.actorId ? { actorId: params.actorId } : {}),
      ...(params.method ? { method: params.method } : {}),
      ...(params.failed ? { statusCode: { gte: 400 } } : {}),
      ...(params.from || params.to ? { createdAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lt: params.to } : {}) } } : {}),
      ...(params.search
        ? { OR: [
            { path: { contains: params.search, mode: 'insensitive' } },
            { action: { contains: params.search, mode: 'insensitive' } },
            { actorEmail: { contains: params.search, mode: 'insensitive' } },
            { targetId: params.search },
          ] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }
}
