import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { IntegrationService } from './integration.service';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly svc: IntegrationService) {}

  private tid(req: Request) { return (req as any).user?.tenantId as string; }

  // ─── CATALOG ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('available')
  @ApiOperation({ summary: 'List all available integrations to connect' })
  available() {
    return this.svc.getAvailableIntegrations();
  }

  // ─── DASHBOARD ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('dashboard')
  @ApiOperation({ summary: 'Integration dashboard — connected channels, order stats, sync logs' })
  dashboard(@Req() req: Request) {
    return this.svc.getDashboard(this.tid(req));
  }

  // ─── LIST ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get()
  list(@Req() req: Request, @Query('category') category?: any) {
    return this.svc.list(this.tid(req), category);
  }

  // ─── GET ONE ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get(':id')
  get(@Req() req: Request, @Param('id') id: string) {
    return this.svc.get(this.tid(req), id);
  }

  // ─── CREATE / CONNECT ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Connect a new integration' })
  create(@Req() req: Request, @Body() dto: any) {
    return this.svc.create(this.tid(req), dto);
  }

  // ─── UPDATE ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(this.tid(req), id, dto);
  }

  // ─── DISCONNECT ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/disconnect')
  disconnect(@Req() req: Request, @Param('id') id: string) {
    return this.svc.disconnect(this.tid(req), id);
  }

  // ─── RECONNECT ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/reconnect')
  reconnect(@Req() req: Request, @Param('id') id: string) {
    return this.svc.reconnect(this.tid(req), id);
  }

  // ─── DELETE ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.svc.remove(this.tid(req), id);
  }

  // ─── CHANNEL ORDERS ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get(':id/orders')
  orders(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listChannelOrders(this.tid(req), {
      integrationId: id, status,
      limit: +(limit ?? 20), offset: +(offset ?? 0),
    });
  }

  // ─── CONVERT CHANNEL ORDER TO SALE ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post('orders/:channelOrderId/convert')
  @ApiOperation({ summary: 'Convert a channel order into a Nafaa sale' })
  convert(@Req() req: Request, @Param('channelOrderId') id: string) {
    return this.svc.convertToSale(this.tid(req), id);
  }

  // ═══════════════════════════════════════════════════════════
  // TEST CONNECTION — verify credentials actually work
  // ═══════════════════════════════════════════════════════════
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/test-connection')
  @ApiOperation({ summary: 'Test if integration credentials actually work' })
  async testConnection(@Req() req: Request, @Param('id') id: string) {
    return this.svc.testConnection(this.tid(req), id);
  }

  // ═══════════════════════════════════════════════════════════
  // DEMO ORDER — create a fake order to test the flow
  // ═══════════════════════════════════════════════════════════
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/demo-order')
  @ApiOperation({ summary: 'Create a demo/test order (no real API call)' })
  async demoOrder(@Req() req: Request, @Param('id') id: string) {
    return this.svc.createDemoOrder(this.tid(req), id);
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCT MAPPINGS
  // ═══════════════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get(':id/product-mappings')
  async listMappings(@Req() req: Request, @Param('id') id: string) {
    return this.svc.listProductMappings(this.tid(req), id);
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/product-mappings')
  async createMapping(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { productId: string; externalSku?: string; externalProductId?: string },
  ) {
    return this.svc.upsertProductMapping(this.tid(req), id, body);
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Delete(':id/product-mappings/:mappingId')
  async deleteMapping(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('mappingId') mid: string,
  ) {
    return this.svc.deleteProductMapping(this.tid(req), id, mid);
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCT SYNC — Import all products from channel
  // ═══════════════════════════════════════════════════════════
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/sync-products')
  @ApiOperation({ summary: 'Import all products from external channel' })
  async syncProducts(@Req() req: Request, @Param('id') id: string) {
    return this.svc.syncProducts(this.tid(req), id);
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH single product to channel
  // ═══════════════════════════════════════════════════════════
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':id/push-product')
  @ApiOperation({ summary: 'Push a single Nafaa product to external channel' })
  async pushProduct(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { productId: string },
  ) {
    return this.svc.pushProductToChannel(this.tid(req), id, body.productId);
  }

  // ═══════════════════════════════════════════════════════════
  // ORDER STATUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post('orders/:orderId/update-status')
  async updateOrderStatus(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.svc.updateChannelOrderStatus(this.tid(req), orderId, body.status, body.reason);
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post('orders/bulk-update-status')
  async bulkUpdateStatus(
    @Req() req: Request,
    @Body() body: { ids: string[]; status: string },
  ) {
    return this.svc.bulkUpdateStatus(this.tid(req), body.ids, body.status);
  }
}
