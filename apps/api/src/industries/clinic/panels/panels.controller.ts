import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PanelsService } from './panels.service';

/**
 * Panels are khata customers: the list needs customers view, the statement
 * khata view, and adding or changing a panel (its credit limit) khata manage.
 */
@ApiTags('Clinic - Panels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW)
@Controller('clinic/panels')
export class PanelsController {
  constructor(private readonly service: PanelsService) {}

  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('status') status?: string) {
    return this.service.list(user, { search, status });
  }

  @Post() @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }

  @Get(':id/statement') @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  statement(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.statement(user, id, from, to);
  }

  @Patch(':id') @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
}
