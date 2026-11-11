import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminSalesService } from './admin-sales.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('merchant_data')
@Controller('admin/sales')
export class AdminSalesController {
  constructor(private readonly service: AdminSalesService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get()
  list(
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('method') method?: string,
    @Query('credit') credit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      search,
      tenantId,
      method,
      credit: credit === 'true',
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }
}
