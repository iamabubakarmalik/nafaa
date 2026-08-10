import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
