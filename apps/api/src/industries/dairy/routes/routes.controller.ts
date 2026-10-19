import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RoutesService } from './routes.service';
import { UpdateRouteDto, UpsertRouteDto } from './dto/upsert-route.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

/** Routes group delivery customers: reading needs customers.view, changes customers.edit. */
@ApiTags('Dairy - Routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/routes')
export class RoutesController {
  constructor(private readonly service: RoutesService) {}

  @Post() @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRouteDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) list(@GetUser() user: AuthenticatedUser, @Query('slot') slot?: string, @Query('status') status?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      slot, status, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/today-deliveries') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW) today(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.todayDeliveries(user, id); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRouteDto) { return this.service.update(user, id, dto); }
  @Post(':id/recalculate') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) recalc(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculateStats(user, id); }
  /** Switches the route off (never deletes it). */
  @Delete(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
