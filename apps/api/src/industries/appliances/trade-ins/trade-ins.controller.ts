import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ApplianceTradeInsService } from './trade-ins.service';
import { CreateApplianceTradeInDto, ListTradeInsQuery, SellTradeInDto, SetTradeInStatusDto, UpdateApplianceTradeInDto } from './dto/trade-in.dto';

@ApiTags('Appliances - Trade-ins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/trade-ins')
export class ApplianceTradeInsController {
  constructor(private readonly service: ApplianceTradeInsService) {}

  /** The register of old appliances taken in trade. */
  @RequirePermissions(PERMISSIONS.RETURNS_VIEW)
  @Get() page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListTradeInsQuery) { return this.service.page(user, shop, q); }

  /** Units the counter can take toward a bill. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get('counter') counter(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.counter(user, shop); }

  /** The customer hands in an old unit at the counter. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateApplianceTradeInDto) { return this.service.create(user, shop, dto); }

  /** Corrects a unit not yet on a bill. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateApplianceTradeInDto) { return this.service.update(user, id, dto); }

  /** Scrapped, given back, or back in the shop. */
  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Patch(':id/status') setStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetTradeInStatusDto) { return this.service.setStatus(user, id, dto); }

  /** Sold on for cash: a bill at the counter. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/sell') sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SellTradeInDto) { return this.service.sell(user, id, dto); }
}
