import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { QurbaniService } from './qurbani.service';

/** Bookings take money at the counter (pos.use); reading is a sales view; an advance back is a refund. */
@ApiTags('Meat - Qurbani / Aqeeqa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/qurbani')
export class QurbaniController {
  constructor(private readonly service: QurbaniService) {}

  @Post() @RequirePermissions(P.POS_USE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: unknown) { return this.service.create(user, scope, dto); }

  @Get() @RequirePermissions(P.SALES_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('occasion') occasion?: string, @Query('animalType') animalType?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, occasion, animalType, search });
  }

  @Get(':id') @RequirePermissions(P.SALES_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.POS_USE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  @Post(':id/payment') @RequirePermissions(P.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: unknown) { return this.service.addPayment(user, scope, id, body); }

  @Post(':id/status') @RequirePermissions(P.POS_USE)
  status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; reason?: string }) { return this.service.updateStatus(user, id, body?.status, body?.reason); }

  @Post(':id/complete') @RequirePermissions(P.POS_USE)
  complete(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: unknown) { return this.service.complete(user, scope, id, body); }

  @Post(':id/refund') @RequirePermissions(P.RETURNS_CREATE)
  refund(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { managerPin?: string }) { return this.service.refund(user, scope, id, body?.managerPin); }
}
