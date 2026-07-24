import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SettingsHubService } from './settings-hub.service';

@ApiTags('Marketplace Settings Hub')
@Controller('marketplace/settings-hub')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsHubController {
  constructor(private readonly svc: SettingsHubService) {}

  private tid(req: Request) { return (req as any).user?.tenantId as string; }

  @Get()
  get(@Req() req: Request) {
    return this.svc.get(this.tid(req));
  }

  @Patch(':section')
  update(@Req() req: Request, @Param('section') section: string, @Body() data: any) {
    return this.svc.updateSection(this.tid(req), section, data);
  }

  @Post('test-integration/:provider')
  test(@Req() req: Request, @Param('provider') provider: string) {
    return this.svc.testIntegration(this.tid(req), provider);
  }

  @Post('webhooks')
  createWebhook(@Req() req: Request, @Body() data: { url: string; events: string[] }) {
    return this.svc.createWebhook(this.tid(req), data);
  }

  @Delete('webhooks/:id')
  deleteWebhook(@Req() req: Request, @Param('id') id: string) {
    return this.svc.deleteWebhook(this.tid(req), id);
  }

  @Post('webhooks/:id/test')
  testWebhook(@Req() req: Request, @Param('id') id: string) {
    return this.svc.testWebhook(this.tid(req), id);
  }

  @Post('blacklist')
  addBlacklist(@Req() req: Request, @Body() body: { type: string; value: string; reason?: string }) {
    return this.svc.addToBlacklist(this.tid(req), body.type, body.value, body.reason);
  }

  @Delete('blacklist')
  removeBlacklist(@Req() req: Request, @Query() query: { type: string; value: string }) {
    return this.svc.removeFromBlacklist(this.tid(req), query.type, query.value);
  }

  @Get('audit-log')
  auditLog(@Req() req: Request, @Query() query: any) {
    return this.svc.auditLog(this.tid(req), {
      entityType: query.entityType,
      userId: query.userId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 50,
    });
  }
}
