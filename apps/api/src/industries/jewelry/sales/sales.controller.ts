import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { SalesService } from './sales.service';
import { AddPaymentDto, CreateJewelrySaleDto, UpdateSaleStatusDto } from './dto/create-sale.dto';

@ApiTags('Jewelry - Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateJewelrySaleDto) {
    return this.service.create(user, shop, dto);
  }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    const numbers = typeof q.numbers === 'string' && q.numbers ? q.numbers.split(',').map((n: string) => n.trim()).filter(Boolean) : undefined;
    return this.service.list(user, { status: q.status, customerId: q.customerId, from: q.from, to: q.to, search: q.search, numbers });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  /** Cancelling voids the shared bill, so it needs the void permission. */
  @RequirePermissions(PERMISSIONS.SALES_VOID)
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateSaleStatusDto) {
    return this.service.updateStatus(user, shop, id, dto);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
  @RequirePermissions(PERMISSIONS.RETURNS_CREATE)
  @Post(':id/return') markReturned(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: { reason: string; managerPin?: string }) {
    return this.service.markReturned(user, shop, id, body?.reason, body?.managerPin);
  }
  @Post(':id/exchange') markExchanged(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { exchangeType: string }) { return this.service.markExchanged(user, id, body.exchangeType); }
}
