import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { AccountingService } from './accounting.service';
import { AccountMapping } from './daily-journal';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  @Get()
  status(@GetUser() user: AuthenticatedUser) {
    return this.svc.status(user);
  }

  @Post(':provider/start')
  @ApiOperation({ summary: 'Accounting software jorein (OAuth link)' })
  start(@GetUser() user: AuthenticatedUser, @Param('provider') provider: string, @Body() body: { returnOrigin?: string }) {
    return this.svc.start(user, provider, body?.returnOrigin);
  }

  @Delete()
  disconnect(@GetUser() user: AuthenticatedUser) {
    return this.svc.disconnect(user);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Software ka chart of accounts (mapping ke liye)' })
  accounts(@GetUser() user: AuthenticatedUser) {
    return this.svc.accounts(user);
  }

  @Patch('settings')
  settings(@GetUser() user: AuthenticatedUser, @Body() body: { mapping?: AccountMapping; includeCogs?: boolean; includeExpenses?: boolean; autoSync?: boolean }) {
    return this.svc.updateSettings(user, body ?? {});
  }

  @Get('preview')
  @ApiOperation({ summary: 'Ek din ka journal — bhejne se pehle dekhein' })
  preview(@GetUser() user: AuthenticatedUser, @Query('day') day: string) {
    return this.svc.preview(user, day);
  }

  @Post('sync')
  sync(@GetUser() user: AuthenticatedUser, @Body() body: { day?: string; force?: boolean }) {
    return this.svc.sync(user, body ?? {});
  }
}

/** Software se wapsi (OAuth) — web ke accounting safhe par */
@ApiTags('Accounting (public)')
@Public()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('integrations/accounting')
export class AccountingPublicController {
  constructor(private readonly svc: AccountingService) {}

  @Get(':provider/callback')
  async callback(@Param('provider') provider: string, @Query() query: Record<string, string>, @Res() res: Response) {
    return res.redirect(302, await this.svc.callback(provider, query));
  }
}
