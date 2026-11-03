/**
 * Endpoints the mobile app calls.
 *
 *   GET  /mobile/config     remote settings, update prompt, flags, banners (works signed out)
 *   POST /mobile/heartbeat  device check-in on app start and resume (signed in)
 */

import { Body, Controller, Get, Headers, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser, JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ConfigQueryDto, HeartbeatDto } from './mobile-control.dto';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';

const COUNTRY_HEADERS = ['cf-ipcountry', 'cloudfront-viewer-country', 'x-vercel-ip-country', 'x-country-code'];

@ApiTags('Mobile app')
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly configs: MobileConfigService,
    private readonly devices: MobileDevicesService,
    private readonly jwt: JwtService,
    private readonly env: ConfigService,
  ) {}

  @Public()
  @Get('config')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Remote app settings for this platform and version' })
  async config(
    @Query() q: ConfigQueryDto,
    @Headers('authorization') auth: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenantId = this.tenantFromToken(auth);
    res.setHeader('Cache-Control', `${tenantId ? 'private' : 'public'}, max-age=60`);
    return this.configs.publicConfig({ platform: q.platform, version: q.version, tenantId });
  }

  @Post('heartbeat')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @ApiOperation({ summary: 'Device check-in (start and resume)' })
  async heartbeat(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: HeartbeatDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const raw = COUNTRY_HEADERS.map((h) => headers[h]).find((v) => typeof v === 'string' && v.length === 2) as string | undefined;
    const country = raw && raw !== 'XX' ? raw.toUpperCase() : null;
    const out = await this.devices.heartbeat(user, dto, country);
    const { updatedAt } = await this.configs.getConfig();
    return { ...out, configVersion: updatedAt ? updatedAt.getTime() : 0 };
  }

  /** Signed-in callers get announcements for their business; a bad or expired token is ignored. */
  private tenantFromToken(auth: string | undefined): string | null {
    if (!auth?.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwt.verify<JwtPayload>(auth.slice(7), { secret: this.env.get<string>('JWT_ACCESS_SECRET') });
      return payload.tenantId ?? null;
    } catch {
      return null;
    }
  }
}
