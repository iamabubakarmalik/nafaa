import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminSettingsService } from './admin-settings.service';
import { BulkSettingsDto, UpsertSettingDto } from './dto/upsert-setting.dto';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @Get()
  list(
    @Query('paged') paged?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.service.list({ paged: paged === '1' || paged === 'true', page: Number(page) || 1, limit: Number(limit) || 25, search, category: category || undefined });
  }

  @Get('category/:category')
  byCategory(@Param('category') category: string) {
    return this.service.byCategory(category);
  }

  @Post()
  upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertSettingDto) {
    return this.service.upsert(user.id, dto);
  }

  @Post('bulk')
  bulk(@GetUser() user: AuthenticatedUser, @Body() dto: BulkSettingsDto) {
    return this.service.bulkUpsert(user.id, dto.settings);
  }

  @Post('seed-defaults')
  seedDefaults() {
    return this.service.seedDefaults();
  }
}
