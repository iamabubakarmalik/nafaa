import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DairyProductionService } from './production.service';
import { CancelProductionDto, CreateProductionDto } from './dto/production.dto';

/** Production moves stock by hand: reading needs stock_movements.view, entries stock_adjustments.manage. */
@ApiTags('Dairy - Production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/production')
export class DairyProductionController {
  constructor(private readonly service: DairyProductionService) {}

  @Post() @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CreateProductionDto) { return this.service.create(user, scope, dto); }
  @Get() @RequirePermissions(PERMISSIONS.STOCK_MOVEMENTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) { return this.service.list(user, scope, { from, to }); }
  @Get(':ref') @RequirePermissions(PERMISSIONS.STOCK_MOVEMENTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('ref') ref: string) { return this.service.getOne(user, ref); }
  @Post(':ref/cancel') @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  cancel(@GetUser() user: AuthenticatedUser, @Param('ref') ref: string, @Body() dto: CancelProductionDto) { return this.service.cancel(user, ref, dto?.reason); }
}
