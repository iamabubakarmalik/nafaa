import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RidersService } from './riders.service';
import { RiderLocationDto, UpdateRiderDto, UpsertRiderDto } from './dto/upsert-rider.dto';

/** Riders belong to the order floor: viewing needs orders.view, changes need orders.manage. */
@ApiTags('Restaurant - Riders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/riders')
export class RidersController {
  constructor(private readonly service: RidersService) {}

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRiderDto) { return this.service.create(user, dto); }

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('active') active?: string) {
    return this.service.list(user, { status, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRiderDto) { return this.service.update(user, id, dto); }

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE)
  @Post(':id/location') updateLocation(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RiderLocationDto) {
    return this.service.updateLocation(user, id, body.lat, body.lng);
  }

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
