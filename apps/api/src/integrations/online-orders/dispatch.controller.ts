import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { DispatchService } from './dispatch.service';

/**
 * Dispatch desk (/online-orders/dispatch/*). Registered before
 * OnlineOrdersController so `online-orders/:id` never takes these paths.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/dispatch')
export class DispatchController {
  constructor(private readonly svc: DispatchService) {}

  @Get('settings')
  settings(@GetUser() user: AuthenticatedUser) {
    return this.svc.getSettings(user);
  }

  @Put('settings')
  saveSettings(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.svc.saveSettings(user, body);
  }

  @Post('rates')
  @ApiOperation({ summary: 'Connected couriers: rate card price, RTO rate and the best pick for the picked orders' })
  rates(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { orderIds?: string[]; weightKg?: number }) {
    return this.svc.rates(user, scope, body ?? {});
  }

  @Post('book')
  @ApiOperation({ summary: 'Bulk booking: courier code, AUTO (rules) or BEST (rate compare); then move per setting' })
  book(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { orderIds?: string[]; courier?: string; weightKg?: number; pieces?: number; serviceType?: string; after?: string }) {
    return this.svc.book(user, scope, body ?? {});
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel booking through the courier API, else clear the CN in Nafaa' })
  cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { ids?: string[]; local?: boolean; note?: string }) {
    return this.svc.cancel(user, scope, body ?? {});
  }

  @Post('labels')
  @ApiOperation({ summary: 'Label data (4x6 / A4) for the picked orders' })
  labels(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { ids?: string[] }) {
    return this.svc.labels(user, scope, body ?? {});
  }

  @Get('loadsheet')
  loadsheet(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('day') day?: string, @Query('courier') courier?: string) {
    return this.svc.loadsheet(user, scope, { day, courier });
  }

  @Post('loadsheet')
  @ApiOperation({ summary: 'Save the day\'s sheet; Leopards / PostEx also get it through their API' })
  submitLoadsheet(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { day?: string; courier?: string; orderIds?: string[] }) {
    return this.svc.submitLoadsheet(user, scope, body ?? {});
  }

  @Post('scan')
  @ApiOperation({ summary: 'Dispatch scan: CN or order number → Dispatched' })
  scan(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { code?: string; force?: boolean }) {
    return this.svc.scan(user, scope, body ?? {});
  }

  @Get('report')
  report(
    @GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope,
    @Query('from') from?: string, @Query('to') to?: string, @Query('courier') courier?: string, @Query('integrationId') integrationId?: string,
  ) {
    return this.svc.report(user, scope, { from, to, courier, integrationId });
  }

  @Get('cod-audit')
  codAudit(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string, @Query('courier') courier?: string) {
    return this.svc.codAudit(user, scope, { from, to, courier });
  }

  @Get('post-office')
  postOffice(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.svc.postOffice(user, scope);
  }

  @Post('post-office/mark')
  markPost(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { ids?: string[]; on?: boolean }) {
    return this.svc.markPost(user, scope, body ?? {});
  }

  @Post('post-office/articles')
  articles(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { items?: Array<{ id?: string; article?: string }>; dispatch?: boolean }) {
    return this.svc.articles(user, scope, body ?? {});
  }

  @Post(':id/redispatch')
  @ApiOperation({ summary: 'Send again with a new CN (API booking or written)' })
  redispatch(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { courier?: string; trackingNumber?: string; book?: boolean; weightKg?: number; note?: string }) {
    return this.svc.redispatch(user, scope, id, body ?? {});
  }

  @Post(':id/claim')
  claim(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { status?: string; amount?: number; note?: string }) {
    return this.svc.claim(user, scope, id, body ?? {});
  }
}
