/**
 * HTTP routes of the trade network, under /api/trade-network. Route
 * permissions are in common/constants/permission-routes.ts (`trade-network/...`);
 * services check the caller's side of each link on top. Contract: API.md.
 */

import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  BuyerSettingsDto, CartDto, CatalogQueryDto, DirectoryQueryDto, DisputeDto, FindSellerDto, LinkRequestDto, LinkTermsDto, ListTradeOrdersDto,
  PaymentsQueryDto, PlaceOrderDto, ProductMapDto, ProfileDto, ReceiveDto, RecordPaymentDto, RejectDto,
} from './dto/trade.dto';
import { TradeLinksService } from './services/links.service';
import { TradeCatalogService } from './services/catalog.service';
import { TradeOrdersService } from './services/orders.service';
import { TradePaymentsService } from './services/payments.service';

@ApiTags('Trade network')
@ApiBearerAuth()
@Controller('trade-network')
export class TradeNetworkController {
  constructor(
    private readonly links: TradeLinksService,
    private readonly catalog: TradeCatalogService,
    private readonly orders: TradeOrdersService,
    private readonly payments: TradePaymentsService,
  ) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser) {
    return this.links.overview(user);
  }

  /* ── seller profile ── */

  @Get('profile')
  profile(@GetUser() user: AuthenticatedUser) {
    return this.links.getProfile(user);
  }

  @Put('profile')
  saveProfile(@GetUser() user: AuthenticatedUser, @Body() dto: ProfileDto) {
    return this.links.updateProfile(user, dto);
  }

  @Post('profile/new-code')
  newCode(@GetUser() user: AuthenticatedUser) {
    return this.links.newCode(user);
  }

  @Get('profile/options')
  options(@GetUser() user: AuthenticatedUser) {
    return this.links.sellerOptions(user);
  }

  /* ── finding and linking ── */

  @Get('find')
  find(@GetUser() user: AuthenticatedUser, @Query() q: FindSellerDto) {
    return this.links.find(user, q);
  }

  @Get('directory')
  directory(@GetUser() user: AuthenticatedUser, @Query() q: DirectoryQueryDto) {
    return this.links.directory(user, q);
  }

  @Post('requests')
  request(@GetUser() user: AuthenticatedUser, @Body() dto: LinkRequestDto) {
    return this.links.request(user, dto);
  }

  @Get('requests/incoming')
  incoming(@GetUser() user: AuthenticatedUser) {
    return this.links.incoming(user);
  }

  @Get('links/:id')
  link(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.links.linkView(user.tenantId, id);
  }

  @Post('links/:id/approve')
  approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LinkTermsDto) {
    return this.links.approve(user, id, dto);
  }

  @Post('links/:id/reject')
  reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectDto) {
    return this.links.reject(user, id, dto);
  }

  @Post('links/:id/cancel')
  cancelRequest(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.links.cancelRequest(user, id);
  }

  @Post('links/:id/pause')
  pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.links.pause(user, id);
  }

  @Post('links/:id/resume')
  resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.links.resume(user, id);
  }

  @Post('links/:id/unlink')
  unlink(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.links.unlink(user, id);
  }

  @Patch('links/:id/terms')
  terms(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LinkTermsDto) {
    return this.links.setTerms(user, id, dto);
  }

  @Patch('links/:id/buyer-settings')
  buyerSettings(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BuyerSettingsDto) {
    return this.links.buyerSettings(user, id, dto);
  }

  @Get('links/:id/statement')
  statement(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payments.statement(user, id);
  }

  @Get('links/:id/orders')
  sellerOrders(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orders.sellerOrders(user, id);
  }

  @Post('links/:id/payments')
  record(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.payments.record(user, id, dto);
  }

  /* ── seller lists ── */

  @Get('customers')
  customers(@GetUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.links.customers(user, status);
  }

  /* ── buyer ── */

  @Get('suppliers')
  suppliers(@GetUser() user: AuthenticatedUser) {
    return this.links.suppliers(user);
  }

  @Get('suppliers/:linkId/catalog')
  catalogOf(@GetUser() user: AuthenticatedUser, @Param('linkId') linkId: string, @Query() q: CatalogQueryDto) {
    return this.catalog.catalog(user, linkId, q);
  }

  @Post('suppliers/:linkId/preview')
  preview(@GetUser() user: AuthenticatedUser, @Param('linkId') linkId: string, @Body() dto: CartDto) {
    return this.catalog.preview(user, linkId, dto);
  }

  @Get('suppliers/:linkId/suggestions')
  suggestions(@GetUser() user: AuthenticatedUser, @Param('linkId') linkId: string) {
    return this.catalog.suggestions(user, linkId);
  }

  @Get('suppliers/:linkId/product-map')
  maps(@GetUser() user: AuthenticatedUser, @Param('linkId') linkId: string) {
    return this.catalog.listMaps(user, linkId);
  }

  @Put('suppliers/:linkId/product-map')
  putMaps(@GetUser() user: AuthenticatedUser, @Param('linkId') linkId: string, @Body() dto: ProductMapDto) {
    return this.catalog.putMaps(user, linkId, dto);
  }

  @Get('orders')
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListTradeOrdersDto) {
    return this.orders.list(user, q);
  }

  @Post('orders')
  place(@GetUser() user: AuthenticatedUser, @Body() dto: PlaceOrderDto) {
    return this.orders.place(user, dto);
  }

  @Get('orders/my-products')
  myProducts(@GetUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.catalog.myProducts(user, search);
  }

  @Get('orders/:id')
  detail(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orders.detail(user, id);
  }

  @Post('orders/:id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orders.cancel(user, id);
  }

  @Post('orders/:id/receive')
  receive(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReceiveDto) {
    return this.orders.receive(user, id, dto);
  }

  @Get('receiving')
  receiving(@GetUser() user: AuthenticatedUser) {
    return this.orders.receiving(user);
  }

  /* ── payments ── */

  @Get('payments')
  paymentsList(@GetUser() user: AuthenticatedUser, @Query() q: PaymentsQueryDto) {
    return this.payments.list(user, q);
  }

  @Post('payments/:id/confirm')
  confirm(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payments.confirm(user, id);
  }

  @Post('payments/:id/dispute')
  dispute(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DisputeDto) {
    return this.payments.dispute(user, id, dto);
  }

  @Post('payments/:id/cancel')
  cancelPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payments.cancel(user, id);
  }
}
