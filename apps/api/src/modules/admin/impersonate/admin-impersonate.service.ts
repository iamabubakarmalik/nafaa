import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashPassword } from '../../../common/utils/password.util';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AdminImpersonateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async impersonate(adminUserId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const owner = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: UserRole.OWNER,
        isActive: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('No active owner for this tenant');
    }

    const payload: JwtPayload = {
      sub: owner.id,
      tenantId: tenant.id,
      email: owner.email,
      role: owner.role,
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET')!;

    const accessToken = await this.jwtService.signAsync(
      { ...payload, impersonatedBy: adminUserId },
      { secret: accessSecret, expiresIn: '1h' as any },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, impersonatedBy: adminUserId },
      { secret: refreshSecret, expiresIn: '1h' as any },
    );

    const refreshTokenHash = await hashPassword(refreshToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: owner.id,
        refreshTokenHash,
        userAgent: `IMPERSONATED by admin ${adminUserId}`,
        expiresAt,
      },
    });

    const { passwordHash: _passwordHash, ...sanitized } = owner;

    return {
      user: sanitized,
      tenant,
      accessToken,
      refreshToken,
      impersonatedBy: adminUserId,
      expiresInMinutes: 60,
    };
  }
}
