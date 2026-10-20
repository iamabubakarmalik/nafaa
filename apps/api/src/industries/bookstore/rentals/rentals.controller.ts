import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RentalsService } from './rentals.service';

/** Rentals take and pay out money at the counter: pos.use. */
@ApiTags('Bookstore - Rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/rentals')
export class RentalsController {
  constructor(private readonly service: RentalsService) {}

  @Post() @RequirePermissions(PERMISSIONS.POS_USE) create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: any) { return this.service.create(user, scope, dto); }
  @Get() @RequirePermissions(PERMISSIONS.POS_USE) list(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() query: any) {
    return this.service.list(user, { ...query, overdue: query.overdue === 'true' }, scope);
  }
  @Post(':id/return') @RequirePermissions(PERMISSIONS.POS_USE) return(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: any) { return this.service.returnBook(user, scope, id, dto); }
  @Post(':id/lost') @RequirePermissions(PERMISSIONS.POS_USE) lost(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) { return this.service.markLost(user, scope, id); }
  @Post(':id/cancel') @RequirePermissions(PERMISSIONS.POS_USE) cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) { return this.service.cancel(user, scope, id); }
  @Post('update-overdue') @RequirePermissions(PERMISSIONS.POS_USE) updateOverdue(@GetUser() user: AuthenticatedUser) { return this.service.updateOverdueStatus(user); }
}
