import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminCustomersService } from './admin-customers.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('merchant_data')
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get()
  list(
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('hasCredit') hasCredit?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      search,
      tenantId,
      hasCredit: hasCredit === 'true',
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }
}
