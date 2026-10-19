import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CustomOrdersService } from './custom-orders.service';

/** Orders take money at the counter (pos.use); giving gold to a karigar moves metal stock. */
@ApiTags('Jewelry - Custom Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/custom-orders')
export class CustomOrdersController {
  constructor(private readonly service: CustomOrdersService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, customerId: q.customerId, karigarId: q.karigarId, from: q.from, to: q.to, search: q.search });
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.page(user, { view: q.view, search: q.search, karigarId: q.karigarId, from: q.from, to: q.to, page: Number(q.page), limit: Number(q.limit), sort: q.sort });
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: { status: string; reason?: string; managerPin?: string }) {
    return this.service.updateStatus(user, shop, id, body.status, body.reason, body.managerPin);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/gold-advance') goldAdvance(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.service.goldAdvance(user, id, body ?? {});
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/issue-metal') issueMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { grams: number; purity?: any; karigarId?: string }) {
    return this.service.issueMetal(user, id, body ?? { grams: 0 });
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/receive-metal') receiveMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { receivedGrams: number; wastageGrams?: number; returnedGrams?: number }) {
    return this.service.receiveMetal(user, id, body ?? { receivedGrams: 0 });
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/approve-design') approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { designUrl: string }) {
    return this.service.approveDesign(user, id, body?.designUrl);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number; paymentMethod?: string }) {
    return this.service.addPayment(user, id, body.amount, body.paymentMethod);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/rate') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) {
    return this.service.rate(user, id, body.rating, body.feedback);
  }
}
