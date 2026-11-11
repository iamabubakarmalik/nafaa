import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminInvoicesService } from './admin-invoices.service';
import { CreateInvoiceDto, MarkInvoicePaidDto } from './dto/create-invoice.dto';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('billing')
@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(private readonly service: AdminInvoicesService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('overdue') overdue?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      tenantId,
      search,
      overdue: overdue === 'true',
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Post(':id/mark-paid')
  markPaid(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MarkInvoicePaidDto,
  ) {
    return this.service.markPaid(user.id, id, dto.notes);
  }

  @Post(':id/void')
  voidInvoice(@Param('id') id: string) {
    return this.service.voidInvoice(id);
  }
}
