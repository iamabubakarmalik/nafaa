import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { SlaughterService } from './slaughter.service';

/** Reading the log is a goods view; a slaughter moves stock, so it needs the stock-change right. */
@ApiTags('Meat - Slaughter Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/slaughter')
export class SlaughterController {
  constructor(private readonly service: SlaughterService) {}

  @Post() @RequirePermissions(P.STOCK_ADJUSTMENTS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: unknown) { return this.service.create(user, dto, scope); }

  @Get() @RequirePermissions(P.PRODUCTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('animalType') animalType?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { animalType, from, to, search });
  }

  @Get('halal-compliance') @RequirePermissions(P.PRODUCTS_VIEW)
  halalCompliance(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.halalCompliance(user, from, to);
  }

  @Get(':id') @RequirePermissions(P.PRODUCTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.STOCK_ADJUSTMENTS_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }
}
