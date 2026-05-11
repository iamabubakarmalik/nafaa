import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { comparePassword, hashPassword } from '../../../common/utils/password.util';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AdminLoginDto, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Admin access only');
    }

    // Admin accounts MUST have a password (no Google-only admins)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Admin account has no password set');
    }

    const ok = await comparePassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(
      {
        sub: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      },
      meta?.userAgent,
      meta?.ip,
    );

    const { passwordHash: _, ...sanitized } = user;
    return {
      user: sanitized,
      ...tokens,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException();
    }
    const { passwordHash: _, ...sanitized } = user;
    return sanitized;
  }

  async logout(userId: string, refreshToken?: string) {
    if (!refreshToken) {
      await this.prisma.session.deleteMany({ where: { userId } });
      return { success: true };
    }
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    for (const s of sessions) {
      if (await comparePassword(refreshToken, s.refreshTokenHash)) {
        await this.prisma.session.delete({ where: { id: s.id } });
        break;
      }
    }
    return { success: true };
  }

  private async issueTokens(
    payload: JwtPayload,
    userAgent?: string,
    ip?: string,
  ) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')!;
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!;

    const accessToken = await this.jwtService.signAsync(
      { ...payload },
      { secret: accessSecret, expiresIn: accessExpires as unknown as number },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload },
      { secret: refreshSecret, expiresIn: refreshExpires as unknown as number },
    );

    const refreshTokenHash = await hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.session.create({
      data: {
        userId: payload.sub,
        refreshTokenHash,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
