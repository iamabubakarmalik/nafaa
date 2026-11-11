import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ADMIN_AREA_KEY, ADMIN_PERMISSION_KEY } from '../access/admin-access.decorators';
import { resolveAdminAccess } from '../access/admin-access';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guard for every admin endpoint (the name is kept so existing
 * @UseGuards(JwtAuthGuard, SuperAdminGuard) lines need no change).
 *
 * - SUPER_ADMIN: always allowed, exactly as before.
 * - ADMIN_STAFF: allowed when their permissions include the key this
 *   handler needs: @AdminPermission(key) on the handler, otherwise
 *   '<area>.view' for reads and '<area>.manage' for changes, where the area
 *   comes from @AdminArea on the handler or controller.
 * - Endpoints without an area stay super-admin only.
 *
 * The resolved permission key is stored on the request for the audit log.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targets = [context.getHandler(), context.getClass()];
    const explicit = this.reflector.getAllAndOverride<string | undefined>(ADMIN_PERMISSION_KEY, targets);
    const area = this.reflector.getAllAndOverride<string | undefined>(ADMIN_AREA_KEY, targets);
    const required = explicit ?? (area ? `${area}.${READ_METHODS.has(request.method) ? 'view' : 'manage'}` : null);
    request.adminPermission = required ?? 'super_admin';

    const access = user ? await resolveAdminAccess(this.prisma, user.id, user.role) : null;
    if (!access) throw new ForbiddenException('Admin access only');
    request.adminAccess = access;
    if (access.isSuperAdmin) return true;
    if (!required || !access.permissions.includes(required)) {
      throw new ForbiddenException(required ? `Your admin role does not include "${required}".` : 'Only a super admin can do this.');
    }
    return true;
  }
}

/** Clearer name for new code. */
export { SuperAdminGuard as AdminAccessGuard };
