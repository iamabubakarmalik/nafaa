import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  private readonly logger = new Logger(CustomerAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    let payload: any;
    try {
      const accessSecret =
        this.configService.get<string>('MARKETPLACE_JWT_SECRET') ||
        this.configService.get<string>('JWT_ACCESS_SECRET');

      payload = await this.jwtService.verifyAsync(token, { secret: accessSecret });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`JWT verify failed: ${msg}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Support multiple key names in payload
    const customerId =
      payload?.sub || payload?.customerId || payload?.id || payload?.userId;

    if (!customerId) {
      this.logger.warn(`No customer ID in JWT payload: ${JSON.stringify(payload)}`);
      throw new UnauthorizedException('Invalid token payload');
    }

    let customer;
    try {
      customer = await this.prisma.marketplaceCustomer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          phone: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          isActive: true,
          isBanned: true,
          phoneVerified: true,
          emailVerified: true,
          isEmailVerified: true,
          language: true,
          loyaltyPoints: true,
          walletBalance: true,
          referralCode: true,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`Prisma lookup error: ${msg}`);
      throw new UnauthorizedException('Auth lookup failed');
    }

    if (!customer) {
      this.logger.warn(`Customer not found for id: ${customerId}`);
      throw new UnauthorizedException('User not found — please login again');
    }

    if (customer.isBanned) {
      throw new UnauthorizedException('Account is banned');
    }

    if (!customer.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Attach BOTH shapes so any downstream code works
    const authenticated = {
      ...customer,
      sub: customer.id,
      customerId: customer.id,
    };
    (request as any).customer = authenticated;
    (request as any).user = authenticated;

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
