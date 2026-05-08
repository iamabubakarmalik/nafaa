import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Public } from '../auth/decorators/public.decorator';
import { BillingService } from './billing.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Public()
  @Get('bank-info')
  bankInfo() {
    return this.service.bankInfo();
  }

  @Get('invoices')
  invoices(@GetUser() user: AuthenticatedUser) {
    return this.service.listInvoices(user);
  }

  @Get('invoices/:id')
  invoice(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getInvoice(user, id);
  }

  @Get('payments')
  payments(@GetUser() user: AuthenticatedUser) {
    return this.service.listPayments(user);
  }

  @Post('payments')
  submitPayment(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: SubmitPaymentDto,
  ) {
    return this.service.submitPayment(user, dto);
  }
}
