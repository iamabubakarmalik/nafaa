import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
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

  /** Delete tenant permanently — irreversible */
  async deleteTenant(user: AuthenticatedUser, confirmation: string, currentPassword: string) {
    if (confirmation !== 'DELETE MY SHOP') {
      throw new BadRequestException('Confirmation text ghalat — "DELETE MY SHOP" likhein');
    }
    await this.verifyOwnerPassword(user, currentPassword);

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'TENANT_DELETION_REQUESTED',
        description: 'Owner initiated tenant deletion',
      },
    });

    // Mark suspended first — real deletion via scheduled job
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { status: 'SUSPENDED' },
    });

    return {
      success: true,
      message: 'Deletion request queue ho gayi. 7 din mein data permanently delete ho jayega. Cancel karna ho to support se contact karein.',
    };
  }

  /** Cancel pending deletion within grace period */
  async cancelDeletion(user: AuthenticatedUser) {
    if (user.role !== 'OWNER') throw new ForbiddenException();
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { status: 'ACTIVE' },
    });
    return { success: true, message: 'Deletion cancel ho gayi' };
  }
}
