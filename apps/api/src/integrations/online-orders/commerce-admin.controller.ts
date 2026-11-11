/**
 * Super-admin online store section (Admin > Online store): platform overview,
 * channels across tenants, catalog jobs, orders monitor, couriers and the
 * platform commerce controls. Mostly read only; see CommerceAdminService for
 * the few actions and how they are logged.
 *
 * CommerceControlsController gives signed-in merchants the non-secret part of
 * the controls (paused channel types, "Coming soon" modules, defaults).
 */

import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../../admin/common/super-admin.guard';
import { CommerceAdminService } from './commerce-admin.service';
import { AdminArea } from '../../admin/access/admin-access.decorators';

const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);

@ApiTags('Admin - Online store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('online_store')
@Controller('admin/commerce')
export class CommerceAdminController {
  constructor(private readonly svc: CommerceAdminService) {}

  @Get('overview')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.overview(from, to);
  }

  // ─── Channels ──────────────────────────────────────────────

  @Get('channels')
  channels(
    @Query('search') search?: string, @Query('kind') kind?: string, @Query('status') status?: string, @Query('tenantId') tenantId?: string,
    @Query('problems') problems?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.svc.channels({ search, kind: kind || undefined, status: status || undefined, tenantId: tenantId || undefined, problems: problems === '1' || problems === 'true', page: num(page), limit: num(limit) });
  }

  @Get('channels/:id')
  channel(@Param('id') id: string) {
    return this.svc.channel(id);
  }

  @Post('channels/:id/pause')
  pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.setActive(user.id, id, false);
  }

  @Post('channels/:id/resume')
  resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.setActive(user.id, id, true);
  }

  @Post('channels/:id/rescan')
  rescan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.rescan(user.id, id);
  }

  @Post('channels/:id/repush')
  repush(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.repush(user.id, id, false);
  }

  @Post('channels/:id/retry-failed')
  retryFailed(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.repush(user.id, id, true);
  }

  // ─── Catalog jobs ──────────────────────────────────────────

  @Get('jobs')
  jobs(
    @Query('status') status?: string, @Query('tenantId') tenantId?: string, @Query('kind') kind?: string,
    @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string,
  ) {
    return this.svc.jobList({ status, tenantId: tenantId || undefined, kind: kind || undefined, page: Number(page) || 1, limit: Number(limit) || 25, search });
  }

  @Post('jobs/:id/cancel')
  cancelJob(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.cancelJob(user.id, id);
  }

  @Post('jobs/:id/retry')
  retryJob(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.retryJob(user.id, id);
  }

  // ─── Orders monitor (read only) ────────────────────────────

  @Get('orders/search')
  searchOrders(@Query('q') q: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.searchOrders(q, Number(page) || 1, Number(limit) || 25);
  }

  @Get('orders/stuck')
  stuckOrders(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.stuckOrders(Number(page) || 1, Number(limit) || 25);
  }

  @Get('orders/:id')
  order(@Param('id') id: string) {
    return this.svc.order(id);
  }

  // ─── Couriers, controls, tenant ────────────────────────────

  @Get('couriers')
  couriers(@Query('tenantId') tenantId?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.couriers(tenantId || undefined, { search, page: Number(page) || 1, limit: Number(limit) || 25 });
  }

  @Get('controls')
  controls() {
    return this.svc.controls();
  }

  @Put('controls')
  saveControls(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.svc.saveControls({ id: user.id, tenantId: user.tenantId }, body ?? {});
  }

  @Get('tenants/:tenantId')
  tenant(@Param('tenantId') tenantId: string) {
    return this.svc.tenant(tenantId);
  }

  @Get('tenants/:tenantId/stock-recovery')
  stockRecovery(@Param('tenantId') tenantId: string) {
    return this.svc.stockRecovery(tenantId);
  }

  @Post('tenants/:tenantId/stock-recovery/apply')
  applyStockRecovery(@GetUser() user: AuthenticatedUser, @Param('tenantId') tenantId: string, @Body() body: { channelId?: string; mappingIds?: string[] }) {
    return this.svc.applyStockRecovery(user.id, tenantId, String(body?.channelId ?? ''), body?.mappingIds ?? []);
  }

  @Get('tenants/:tenantId/price-recovery')
  priceRecovery(@Param('tenantId') tenantId: string) {
    return this.svc.priceRecovery(tenantId);
  }

  @Post('tenants/:tenantId/price-recovery/apply')
  applyPriceRecovery(@GetUser() user: AuthenticatedUser, @Param('tenantId') tenantId: string, @Body() body: { channelId?: string; items?: Array<{ mappingId: string; choice: 'channel' | 'nafaa' }> }) {
    return this.svc.applyPriceRecovery(user.id, tenantId, String(body?.channelId ?? ''), body?.items ?? []);
  }
}

@ApiTags('Online store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/platform-controls')
export class CommerceControlsController {
  constructor(private readonly svc: CommerceAdminService) {}

  @Get()
  get() {
    return this.svc.publicControls();
  }
}
export { CommerceAdminService } from './commerce-admin.service';
