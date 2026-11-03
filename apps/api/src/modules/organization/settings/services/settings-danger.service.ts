import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { comparePassword } from '../../../../common/utils/password.util';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SettingsDangerService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyOwnerPassword(user: AuthenticatedUser, password: string) {
    if (user.role !== 'OWNER') throw new ForbiddenException('Sirf owner');
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!dbUser?.passwordHash) throw new UnauthorizedException('Password set nahi hai');
    const ok = await comparePassword(password, dbUser.passwordHash);
    if (!ok) throw new UnauthorizedException('Ghalat password');
  }

  /** Transfer ownership to another user in same tenant */
  async transferOwnership(user: AuthenticatedUser, newOwnerUserId: string, currentPassword: string) {
    await this.verifyOwnerPassword(user, currentPassword);

    const newOwner = await this.prisma.user.findFirst({
      where: { id: newOwnerUserId, tenantId: user.tenantId },
    });
    if (!newOwner) throw new BadRequestException('User is tenant mein nahi hai');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { role: 'MANAGER' } }),
      this.prisma.user.update({ where: { id: newOwnerUserId }, data: { role: 'OWNER' } }),
      this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'OWNERSHIP_TRANSFERRED',
          description: `Ownership transferred to ${newOwner.email}`,
        },
      }),
    ]);

    return { success: true, message: 'Ownership transfer ho gayi' };
  }

  private static readonly TENANT_GRACE_DAYS = 7;

  private latestTenantDeletionLog(tenantId: string) {
    return this.prisma.activityLog.findFirst({
      where: { tenantId, action: { in: ['TENANT_DELETION_REQUESTED', 'TENANT_DELETION_CANCELLED', 'TENANT_DELETION_PROCESSED'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Owner asks to delete the shop. The shop is suspended right away and a super admin
   * processes the request by hand after the 7-day grace period (admin panel, Deletion requests).
   * The status before the request is remembered so a cancel can put it back exactly.
   */
  async deleteTenant(user: AuthenticatedUser, confirmation: string, currentPassword?: string) {
    if (confirmation !== 'DELETE MY SHOP') {
      throw new BadRequestException('Confirmation text ghalat — "DELETE MY SHOP" likhein');
    }
    // An owner who signs in only with Google or Apple has no password; the typed
    // confirmation is the check then (App Store: account deletion must be possible in-app).
    if (user.role !== 'OWNER') throw new ForbiddenException('Sirf owner');
    const owner = await this.prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (owner?.passwordHash) await this.verifyOwnerPassword(user, currentPassword ?? '');

    const latest = await this.latestTenantDeletionLog(user.tenantId);
    if (latest?.action === 'TENANT_DELETION_REQUESTED') {
      return { success: true, message: 'Deletion request pehle se lagi hui hai. 7 din mein cancel kar sakte hain.' };
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { status: true } });
    const scheduledFor = new Date(Date.now() + SettingsDangerService.TENANT_GRACE_DAYS * 86_400_000).toISOString();

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'TENANT_DELETION_REQUESTED',
        entityType: 'TENANT',
        entityId: user.tenantId,
        description: 'Owner initiated tenant deletion',
        metadata: { previousStatus: tenant?.status ?? null, scheduledFor },
      },
    });

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { status: 'SUSPENDED' },
    });

    return {
      success: true,
      message: 'Deletion request lag gayi. 7 din tak cancel kar sakte hain, uske baad hamari team process karegi.',
    };
  }

  /**
   * Cancel a pending deletion within the grace period. Only the deletion state is undone:
   * the tenant goes back to the status it had before the request, so a shop an admin had
   * suspended for another reason stays suspended.
   */
  async cancelDeletion(user: AuthenticatedUser) {
    if (user.role !== 'OWNER') throw new ForbiddenException();
    const latest = await this.latestTenantDeletionLog(user.tenantId);
    if (!latest || latest.action !== 'TENANT_DELETION_REQUESTED') {
      return { success: true, message: 'Koi deletion request nahi hai' };
    }
    const meta = (latest.metadata ?? {}) as { previousStatus?: TenantStatus | null };
    // Requests made before the status was recorded were always lifted to ACTIVE.
    const restoreTo: TenantStatus = meta.previousStatus ?? 'ACTIVE';

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { status: true } });
    // Only touch the status while it is still the suspension made by the request.
    if (tenant?.status === 'SUSPENDED' && restoreTo !== 'SUSPENDED') {
      await this.prisma.tenant.update({ where: { id: user.tenantId }, data: { status: restoreTo } });
    }
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId, userId: user.id, action: 'TENANT_DELETION_CANCELLED', entityType: 'TENANT',
        entityId: user.tenantId, description: 'Owner cancelled tenant deletion', metadata: { restoredTo: restoreTo },
      },
    });
    return { success: true, message: 'Deletion cancel ho gayi' };
  }
}
