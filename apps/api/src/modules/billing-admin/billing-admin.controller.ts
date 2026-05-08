import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { BillingAdminService } from './billing-admin.service';
import { ApprovePaymentDto, RejectPaymentDto } from './dto/approve-payment.dto';

@ApiTags('Billing Admin')
@ApiBearerAuth()
@Controller('billing-admin')
export class BillingAdminController {
  constructor(private readonly service: BillingAdminService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Get('pending')
  pending(@GetUser() user: AuthenticatedUser) {
    return this.service.listPending(user);
  }

  @Get('all')
  all(@GetUser() user: AuthenticatedUser) {
    return this.service.listAll(user);
  }

  @Post(':paymentId/approve')
  approve(
    @GetUser() user: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: ApprovePaymentDto,
  ) {
    return this.service.approve(user, paymentId, dto.notes);
  }

  @Post(':paymentId/reject')
  reject(
    @GetUser() user: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.service.reject(user, paymentId, dto.reason);
  }
}
