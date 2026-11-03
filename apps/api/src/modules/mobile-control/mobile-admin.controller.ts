/**
 * Super-admin control of the mobile app (admin panel → Mobile app).
 * Appearance defaults use the existing /admin/appearance/platform endpoints.
 */

import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../admin/common/super-admin.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { DevicesQueryDto, OverviewQueryDto, PageQueryDto } from './mobile-control.dto';
import { MobileAnalyticsService } from './mobile-analytics.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';
import { MobilePushService } from './mobile-push.service';
import { PushDeliveryService } from '../push/push-delivery.service';

@ApiTags('Admin - Mobile app')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/mobile')
export class MobileAdminController {
  constructor(
    private readonly analytics: MobileAnalyticsService,
    private readonly configs: MobileConfigService,
    private readonly devices: MobileDevicesService,
    private readonly push: MobilePushService,
    private readonly delivery: PushDeliveryService,
  ) {}

  @Get('overview')
  overview(@Query() q: OverviewQueryDto) {
    return this.analytics.overview(q.days ?? 30);
  }

  @Get('targets')
  targets() {
    return this.analytics.targets();
  }

  @Get('tenants')
  tenants(@Query('q') q?: string, @Query('ids') ids?: string) {
    if (ids) return this.analytics.tenantNames(ids.split(',').filter(Boolean));
    return this.analytics.searchTenants(q ?? '');
  }

  // ─── Devices ──────────────────────────────────────────────────────

  @Get('devices')
  listDevices(@Query() q: DevicesQueryDto) {
    return this.devices.list(q);
  }

  @Get('devices/:id')
  device(@Param('id') id: string) {
    return this.devices.detail(id);
  }

  @Post('devices/:id/clear-push')
  clearPush(@Param('id') id: string) {
    return this.devices.clearPush(id);
  }

  @Delete('devices/:id')
  removeDevice(@Param('id') id: string) {
    return this.devices.remove(id);
  }

  // ─── Remote settings (releases, maintenance, flags) ──────────────

  @Get('config')
  config() {
    return this.configs.adminConfig();
  }

  @Put('config')
  saveConfig(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.configs.saveConfig(user.id, body);
  }

  /** What the app would receive, for previewing targeting. */
  @Get('config/preview')
  preview(@Query('platform') platform?: string, @Query('version') version?: string, @Query('tenantId') tenantId?: string) {
    return this.configs.publicConfig({ platform, version, tenantId });
  }

  // ─── Announcements ────────────────────────────────────────────────

  @Get('announcements')
  announcements() {
    return this.configs.listAnnouncements();
  }

  @Post('announcements')
  createAnnouncement(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.configs.createAnnouncement(user.id, body);
  }

  @Put('announcements/:id')
  updateAnnouncement(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.configs.updateAnnouncement(id, body);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.configs.deleteAnnouncement(id);
  }

  // ─── Push ─────────────────────────────────────────────────────────

  @Post('push/audience')
  audience(@Body() body: Record<string, unknown>) {
    return this.push.audience(body);
  }

  @Post('push')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  send(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.push.create(user.id, body);
  }

  @Get('push')
  history(@Query() q: PageQueryDto) {
    return this.push.history(q.page ?? 1, q.limit ?? 20);
  }

  /** Delivery health from Expo receipts: sent, delivered, errors by type and platform. */
  @Get('push-health')
  pushHealth(@Query('days') days?: string) {
    return this.delivery.health(Number(days) || 7);
  }

  @Get('push/:id')
  broadcast(@Param('id') id: string) {
    return this.push.get(id);
  }
}
