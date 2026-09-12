import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CustomerLedgerService } from './customer-ledger.service';
import {
  AddUdhaarDto,
  CreatePaymentDto,
  OpeningBalanceDto,
} from './dto/create-payment.dto';

@ApiTags('Customer Ledger (Khata)')
@ApiBearerAuth()
@Controller('customer-ledger')
export class CustomerLedgerController {
  constructor(private readonly service: CustomerLedgerService) {}

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.summary(user, shop);
  }

  @Get(':customerId')
  list(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('customerId') customerId: string,
  ) {
    return this.service.list(user, shop, customerId);
  }

  @Post(':customerId/payment')
  receivePayment(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('customerId') customerId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.receivePayment(user, shop, customerId, dto);
  }

  @Post(':customerId/udhaar')
  addUdhaar(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('customerId') customerId: string,
    @Body() dto: AddUdhaarDto,
  ) {
    return this.service.addUdhaar(user, shop, customerId, dto);
  }

  @Post(':customerId/opening-balance')
  openingBalance(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('customerId') customerId: string,
    @Body() dto: OpeningBalanceDto,
  ) {
    return this.service.setOpeningBalance(user, shop, customerId, dto);
  }
}
