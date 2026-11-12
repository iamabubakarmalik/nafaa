/**
 * Admin panel: Nafaa Stores (`/api/admin/stores`). Area `stores`
 * (stores.view for reads, stores.manage for changes); suspend needs
 * stores.suspend. Every change is written to the admin audit log by the
 * AdminAuditInterceptor.
 */
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../../../admin/common/super-admin.guard';
import { AdminArea, AdminPermission } from '../../../admin/access/admin-access.decorators';
import { AdminStoresService } from './admin-stores.service';

@ApiTags('Admin - Nafaa Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('stores')
@Controller('admin/stores')
export class AdminStoresController {
  constructor(private readonly svc: AdminStoresService) {}

  // Fixed paths first, so `:id` never takes them.
  @Get('overview') overview(@Query('days') days?: string) { return this.svc.overview(days); }
  @Get('domains') domains(@Query() q: any) { return this.svc.domainsList(q ?? {}); }
  @Post('domains/:domainId/retry') @HttpCode(200) retry(@Param('domainId') d: string) { return this.svc.retryDomain(d); }
  @Get('controls') controls() { return this.svc.controls(); }
  @Put('controls') saveControls(@Body() b: unknown) { return this.svc.saveControls(b ?? {}); }
  @Get('reports') reports(@Query() q: any) { return this.svc.reports(q ?? {}); }
  @Patch('reports/:reportId') updateReport(@GetUser() u: AuthenticatedUser, @Param('reportId') r: string, @Body() b: any) { return this.svc.updateReport(r, u.id, b ?? {}); }
  @Get() list(@Query() q: any) { return this.svc.list(q ?? {}); }

  @Get(':id') detail(@Param('id') id: string) { return this.svc.detail(id); }
  @Get(':id/theme-history') history(@Param('id') id: string) { return this.svc.themeHistory(id); }
  @Post(':id/suspend') @HttpCode(200) @AdminPermission('stores.suspend') suspend(@Param('id') id: string, @Body() b: { reason?: string }) { return this.svc.suspend(id, b?.reason); }
  @Post(':id/unsuspend') @HttpCode(200) @AdminPermission('stores.suspend') unsuspend(@Param('id') id: string) { return this.svc.unsuspend(id); }
  @Post(':id/force-password') @HttpCode(200) forcePassword(@Param('id') id: string, @Body() b: any) { return this.svc.forcePassword(id, b ?? {}); }
  @Post(':id/revalidate') @HttpCode(200) revalidate(@Param('id') id: string) { return this.svc.revalidateStore(id); }
  @Post(':id/domains/:domainId/verify') @HttpCode(200) verify(@Param('id') id: string, @Param('domainId') d: string) { return this.svc.verifyDomain(id, d); }
  @Post(':id/domains/:domainId/remove-vercel') @HttpCode(200) removeVercel(@Param('id') id: string, @Param('domainId') d: string) { return this.svc.removeFromVercel(id, d); }
}
