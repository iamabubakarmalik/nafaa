import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../modules/auth/decorators/public.decorator';

/**
 * CustomerAuthGuard — protects marketplace endpoints.
 * Uses a SEPARATE JWT secret from business/tenant auth.
 * Expects `Authorization: Bearer <marketplace_token>` header.
 */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip auth for @Public() endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Marketplace token required');
    }

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret:
          this.config.get<string>('MARKETPLACE_JWT_SECRET') ||
          this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      req.customer = { ...payload, id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired marketplace token');
    }
  }
}
