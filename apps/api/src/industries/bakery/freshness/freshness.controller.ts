import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { FreshnessService } from './freshness.service';

@ApiTags('Bakery - Freshness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/freshness')
export class FreshnessController {
  constructor(private readonly service: FreshnessService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, shop, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('status') status?: string, @Query('productId') productId?: string, @Query('active') active?: string) {
    return this.service.list(user, shop, { status, productId, active });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.summary(user, shop); }

  /** Wastage log for a period of business days: batches, failed baking, raw materials, damage. */
  @Get('wastage') wastage(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.wastage(user, shop, from, to);
  }

  @Post('run-expiry-check') runCheck(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.runExpiryCheck(user, shop); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/sale') sale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { qty: number }) { return this.service.recordSale(user, id, body?.qty); }
  @Post(':id/discard') discard(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { qty: number; reason: string }) { return this.service.discard(user, id, body?.qty, body?.reason); }
  @Post(':id/discount') discount(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { qty: number }) { return this.service.discount(user, id, body?.qty); }
}
