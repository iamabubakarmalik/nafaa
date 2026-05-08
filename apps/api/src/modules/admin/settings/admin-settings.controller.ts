import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminSettingsService } from './admin-settings.service';
import { BulkSettingsDto, UpsertSettingDto } from './dto/upsert-setting.dto';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @Get()
  list() {
    return this.service.list();
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
