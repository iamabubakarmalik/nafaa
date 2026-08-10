import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MARKETING_PERMISSIONS_KEY } from '../decorators/marketing-permissions.decorator';
import {
  hasMarketingPermission,
  type MarketingPermissionKey,
} from '../constants/marketing-permissions.constants';

@Injectable()
export class MarketingPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<MarketingPermissionKey[]>(
        MARKETING_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role = request.marketingRole;
    const permissions = request.marketingPermissions ?? [];

    if (!role) {
      throw new ForbiddenException('Marketing admin context missing');
    }

    const missing = required.filter(
      (p) => !hasMarketingPermission(role, permissions, p),
    );

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing marketing permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
