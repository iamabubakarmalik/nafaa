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
import { PaymentStatus } from '@prisma/client';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminBillingService } from './admin-billing.service';
import {
  ApprovePaymentDto,
  RejectPaymentDto,
} from './dto/approve-payment.dto';
import { AdminArea, AdminPermission } from '../access/admin-access.decorators';

@ApiTags('Admin - Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('billing')
@Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly service: AdminBillingService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get('payments')
  list(
    @Query('status') status?: PaymentStatus,
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      search,
      provider,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @AdminPermission('billing.approve')
  @Post('payments/:id/approve')
  approve(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApprovePaymentDto,
  ) {
    return this.service.approve(user, id, dto.notes);
  }

  @AdminPermission('billing.approve')
  @Post('payments/:id/reject')
  reject(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.service.reject(user, id, dto.reason);
  }
}
