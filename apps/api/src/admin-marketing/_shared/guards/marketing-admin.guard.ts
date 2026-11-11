import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveAdminAccess } from '../../../admin/access/admin-access';

@Injectable()
export class MarketingAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Not authenticated');

    // SUPER_ADMIN gets everything
    if (user.role === UserRole.SUPER_ADMIN) {
      request.marketingRole = 'SUPER';
      request.marketingPermissions = [];
      return true;
    }

    // Admin panel staff: their admin role decides (marketing.view to read, marketing.manage to change).
    if (user.role === UserRole.ADMIN_STAFF) {
      const access = await resolveAdminAccess(this.prisma, user.id, user.role);
      const needed = ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ? 'marketing.view' : 'marketing.manage';
      if (!access?.permissions.includes(needed)) throw new ForbiddenException(`Your admin role does not include "${needed}".`);
      request.adminPermission = needed;
      request.marketingRole = 'SUPER';
      request.marketingPermissions = [];
      return true;
    }

    const marketingAdmin = await this.prisma.marketingAdmin.findUnique({
      where: { userId: user.id },
    });

    if (!marketingAdmin || !marketingAdmin.isActive) {
      throw new ForbiddenException(
        'Marketing admin access required — contact SUPER_ADMIN to be added',
      );
    }

    // Update lastActiveAt
    await this.prisma.marketingAdmin
      .update({
        where: { id: marketingAdmin.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => null);

    request.marketingRole = marketingAdmin.role;
    request.marketingPermissions = marketingAdmin.permissions;
    return true;
  }
}
