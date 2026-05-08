import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CustomerLedgerService } from './customer-ledger.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Customer Ledger (Khata)')
@ApiBearerAuth()
@Controller('customer-ledger')
export class CustomerLedgerController {
  constructor(private readonly service: CustomerLedgerService) {}

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get(':customerId')
  list(
    @GetUser() user: AuthenticatedUser,
    @Param('customerId') customerId: string,
  ) {
    return this.service.list(user, customerId);
  }

  @Post(':customerId/payment')
  receivePayment(
    @GetUser() user: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.receivePayment(user, customerId, dto);
  }
}
