/**
 * Admin panel: Nafaa Market (`/api/admin/market`). Area `marketplace`
 * (marketplace.view for reads, marketplace.manage for changes). Every change
 * is written to the admin audit log by the AdminAuditInterceptor.
 */
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminMarketService } from './admin-market.service';
import { AdminMarketContentService } from './admin-market-content.service';

@ApiTags('Admin - Nafaa Market')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('marketplace')
@Controller('admin/market')
export class AdminMarketController {
  constructor(
    private readonly svc: AdminMarketService,
    private readonly content: AdminMarketContentService,
  ) {}

  @Get('overview') overview(@Query() q: any) { return this.svc.overview(q ?? {}); }

  // Shops
  @Get('shops') shops(@Query() q: any) { return this.svc.shops(q ?? {}); }
  @Get('shops/:shopId') shop(@Param('shopId') id: string) { return this.svc.shopDetail(id); }
  @Patch('shops/:shopId') updateShop(@Param('shopId') id: string, @Body() b: any) { return this.svc.updateShop(id, b ?? {}); }
  @Post('shops/:shopId/approve') @HttpCode(200) approve(@GetUser() u: AuthenticatedUser, @Param('shopId') id: string) { return this.svc.approve(id, u.id); }
  @Post('shops/:shopId/reject') @HttpCode(200) reject(@GetUser() u: AuthenticatedUser, @Param('shopId') id: string, @Body() b: { reason?: string }) { return this.svc.reject(id, b?.reason, u.id); }

  // Orders
  @Get('orders') orders(@Query() q: any) { return this.svc.orders(q ?? {}); }
  @Get('orders/:id') order(@Param('id') id: string) { return this.svc.orderDetail(id); }
  @Post('orders/:id/cancel') @HttpCode(200) cancel(@Param('id') id: string, @Body() b: { reason?: string }) { return this.svc.cancelOrder(id, b?.reason); }

  // Reviews
  @Get('reviews') reviews(@Query() q: any) { return this.content.reviews(q ?? {}); }
  @Patch('reviews/:id') review(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.content.setReviewHidden(id, b ?? {}, u.id); }

  // Customers
  @Get('customers') customers(@Query() q: any) { return this.content.customers(q ?? {}); }
  @Get('customers/:id') customer(@Param('id') id: string) { return this.content.customer(id); }
  @Patch('customers/:id') updateCustomer(@Param('id') id: string, @Body() b: any) { return this.content.setCustomerBlocked(id, b ?? {}); }

  // Home curation
  @Get('home') home() { return this.content.home(); }
  @Put('home') saveHome(@GetUser() u: AuthenticatedUser, @Body() b: unknown) { return this.content.saveHome(b ?? {}, u.id); }
  @Get('home/products') homeProducts(@Query() q: any) { return this.content.searchProducts(q ?? {}); }

  // Platform settings
  @Get('settings') settings() { return this.content.getSettings(); }
  @Put('settings') saveSettings(@GetUser() u: AuthenticatedUser, @Body() b: unknown) { return this.content.saveSettings(b ?? {}, u.id); }

  // Settlements (report only)
  @Get('settlements') settlements(@Query() q: any) { return this.svc.settlements(q ?? {}); }

  // Customer support tickets
  @Get('support') tickets(@Query() q: any) { return this.content.tickets(q ?? {}); }
  @Get('support/:id') ticket(@Param('id') id: string) { return this.content.ticket(id); }
  @Post('support/:id/reply') @HttpCode(200) reply(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.content.replyTicket(id, b ?? {}, u.id); }
  @Patch('support/:id') updateTicket(@Param('id') id: string, @Body() b: any) { return this.content.setTicketStatus(id, b ?? {}); }
}
