import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CoreReturnsService } from './core-returns.service';
import { CreateCoreReturnDto, ListCoreReturnsQuery, SetCoreStatusDto } from './dto/core-return.dto';

@ApiTags('Auto Parts - Core Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/core-returns')
export class CoreReturnsController {
  constructor(private readonly service: CoreReturnsService) {}

  /** The record of old parts taken back. */
  @RequirePermissions(PERMISSIONS.RETURNS_VIEW)
  @Get() page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListCoreReturnsQuery) { return this.service.page(user, shop, q); }

  /** Held parts the counter can take toward a bill. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get('trade-ins') tradeIns(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.tradeIns(user, shop); }

  /** The customer gives an old part at the counter or with a job. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateCoreReturnDto) { return this.service.create(user, shop, dto); }

  /** Sent back to the supplier, scrapped, or held again. */
  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Patch(':id/status') setStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetCoreStatusDto) { return this.service.setStatus(user, id, dto.status); }
}
