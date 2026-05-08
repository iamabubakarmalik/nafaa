import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminBulkService } from './admin-bulk.service';
import {
  BulkBroadcastDto,
  BulkTenantStatusDto,
} from './dto/bulk-action.dto';

@ApiTags('Admin - Bulk Actions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/bulk')
export class AdminBulkController {
  constructor(private readonly service: AdminBulkService) {}

  @Post('tenants/status')
  updateStatus(@Body() dto: BulkTenantStatusDto) {
    return this.service.updateStatus(dto.tenantIds, dto.status, dto.reason);
  }

  @Post('broadcast')
  broadcast(@Body() dto: BulkBroadcastDto) {
    return this.service.broadcastToTenants(dto.tenantIds, dto.title, dto.message);
  }
}
