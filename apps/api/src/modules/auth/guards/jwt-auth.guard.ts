import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  /** Admin staff tokens only work on admin routes; they have no merchant access. */
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    const result = super.handleRequest<TUser>(err, user, info, context, status);
    if ((result as { role?: string } | undefined)?.role === 'ADMIN_STAFF') {
      const req = context.switchToHttp().getRequest();
      const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
      if (!/^(\/api)?\/admin(\/|$)/.test(path)) throw new ForbiddenException('Admin panel accounts cannot use the merchant app.');
    }
    if ((result as { role?: string } | undefined)?.role === 'PARTNER') {
      const req = context.switchToHttp().getRequest();
      const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
      if (!/^(\/api)?\/partner(\/|$)/.test(path)) throw new ForbiddenException('Partner accounts can only use the partner portal.');
    }
    return result;
  }
}
