/**
 * Appearance endpoints.
 *
 *   GET  /appearance            platform + business + personal layers for the signed-in user
 *   PUT  /appearance/personal   the user's own preferences (any signed-in user)
 *   PUT  /appearance/business   business defaults (owner or settings.edit)
 *   GET  /appearance/platform   platform defaults (public; used before sign-in)
 *   PUT  /admin/appearance/platform  platform defaults (Nafaa super admins)
 */

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../../admin/common/super-admin.guard';
import { AppearanceService } from './appearance.service';

@ApiTags('Appearance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appearance')
export class AppearanceController {
  constructor(private readonly svc: AppearanceService) {}

  @Get()
  @ApiOperation({ summary: 'Appearance layers for the signed-in user' })
  get(@GetUser() user: AuthenticatedUser) {
    return this.svc.forUser(user);
  }

  @Put('personal')
  @ApiOperation({ summary: 'Save my appearance preferences' })
  savePersonal(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.svc.savePersonal(user, body);
  }

  @Put('business')
  @ApiOperation({ summary: 'Save the business default appearance' })
  saveBusiness(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.svc.saveBusiness(user, body);
  }

  @Public()
  @Get('platform')
  @ApiOperation({ summary: 'Platform default appearance (public)' })
  platform() {
    return this.svc.platform();
  }
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/appearance')
export class AdminAppearanceController {
  constructor(private readonly svc: AppearanceService) {}

  @Get('platform')
  @ApiOperation({ summary: 'Platform default appearance' })
  get() {
    return this.svc.platform();
  }

  @Put('platform')
  @ApiOperation({ summary: 'Save the platform default appearance' })
  save(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.svc.savePlatform(user.id, body);
  }
}
