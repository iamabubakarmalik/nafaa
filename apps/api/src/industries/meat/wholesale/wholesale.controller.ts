import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { WholesaleService } from './wholesale.service';

/**
 * Restaurant / hotel accounts: customer records with a khata. Bills come
 * from the counter like any udhaar bill; a payment here is a khata payment.
 */
@ApiTags('Meat - Wholesale Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/wholesale')
export class WholesaleController {
  constructor(private readonly service: WholesaleService) {}

  @Post() @RequirePermissions(P.CUSTOMERS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: unknown) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(P.CUSTOMERS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, { active: active === 'true' ? true : active === 'false' ? false : undefined, search });
  }

  @Get('by-customer/:customerId') @RequirePermissions(P.CUSTOMERS_VIEW)
  byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }

  @Get(':id') @RequirePermissions(P.CUSTOMERS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.CUSTOMERS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  @Post(':id/payment') @RequirePermissions(P.KHATA_MANAGE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { amount?: unknown; paymentMethod?: unknown; note?: unknown }) {
    return this.service.recordPayment(user, scope, id, body);
  }

  /** Switches the account off; the customer and khata stay. */
  @Delete(':id') @RequirePermissions(P.CUSTOMERS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
