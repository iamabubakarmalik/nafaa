import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminAiUsageService } from './admin-ai-usage.service';

@ApiTags('Admin - Nafaa AI usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('system')
@Controller('admin/ai-usage')
export class AdminAiUsageController {
  constructor(private readonly service: AdminAiUsageService) {}

  @Get()
  summary(@Query('days') days?: string) {
    return this.service.summary(days ? Number(days) : 30);
  }
}
