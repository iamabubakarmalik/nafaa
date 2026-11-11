import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PartnerAllowPending, PartnerGuard } from './partner.guard';
import { PartnerApplyInput, PartnerAuthService } from './partner-auth.service';

const meta = (req: Request) => ({ userAgent: req.headers['user-agent'], ip: req.ip });

@ApiTags('Partner portal - Auth')
@Controller('partner/auth')
export class PartnerAuthController {
  constructor(private readonly auth: PartnerAuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('apply')
  apply(@Body() body: PartnerApplyInput, @Req() req: Request) {
    return this.auth.apply(body ?? {}, meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() body: { login?: string; password?: string }, @Req() req: Request) {
    return this.auth.login(body ?? {}, meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() body: { refreshToken?: string }, @Req() req: Request) {
    return this.auth.refresh(body?.refreshToken, meta(req));
  }

  @UseGuards(PartnerGuard)
  @PartnerAllowPending()
  @Post('logout')
  logout(@GetUser() user: AuthenticatedUser, @Body() body: { refreshToken?: string }) {
    return this.auth.logout(user.id, body?.refreshToken);
  }

  @UseGuards(PartnerGuard)
  @PartnerAllowPending()
  @Get('me')
  me(@GetUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(PartnerGuard)
  @PartnerAllowPending()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password')
  changePassword(@GetUser() user: AuthenticatedUser, @Body() body: { current?: string; next?: string }) {
    return this.auth.changePassword(user.id, body ?? {});
  }
}
