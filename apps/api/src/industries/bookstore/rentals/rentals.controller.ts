import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RentalsService } from './rentals.service';

@ApiTags('Bookstore - Rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/rentals')
export class RentalsController {
  constructor(private readonly service: RentalsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: any) { return this.service.create(user, scope, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
    return this.service.list(user, { ...query, overdue: query.overdue === 'true' });
  }
  @Post(':id/return') return(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: any) { return this.service.returnBook(user, scope, id, dto); }
  @Post(':id/lost') lost(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) { return this.service.markLost(user, scope, id); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) { return this.service.cancel(user, scope, id); }
  @Post('update-overdue') updateOverdue(@GetUser() user: AuthenticatedUser) { return this.service.updateOverdueStatus(user); }
}
