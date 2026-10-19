import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DairyCustomersService } from './customers.service';
import { CloseCustomerDto, CustomerPaymentDto, PauseDeliveryDto, UpdateCustomerDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

/**
 * Reading and editing follow the customers route rule (customers.view /
 * customers.edit); taking money is a khata action (khata.manage), and an
 * advance at sign-up is checked against it in the service.
 */
@ApiTags('Dairy - Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/customers')
export class DairyCustomersController {
  constructor(private readonly service: DairyCustomersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: UpsertCustomerDto) { return this.service.create(user, scope, dto); }
  @Get() list(
    @GetUser() user: AuthenticatedUser, @Query('routeId') routeId?: string, @Query('status') status?: string, @Query('area') area?: string,
    @Query('search') search?: string, @Query('tab') tab?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { routeId, status, area, search, tab, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('outstanding') outstanding(@GetUser() user: AuthenticatedUser) { return this.service.withOutstandingBalance(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(user, id, dto); }
  @Post(':id/payments') @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: CustomerPaymentDto) { return this.service.recordPayment(user, scope, id, dto); }
  @Post(':id/pause') pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PauseDeliveryDto) { return this.service.pauseDelivery(user, id, dto); }
  @Post(':id/resume') resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.resumeDelivery(user, id); }
  @Post(':id/close') close(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CloseCustomerDto) { return this.service.close(user, id, body?.reason); }
  @Post(':id/reopen') reopen(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.reopen(user, id); }
  /** Kept for old screens: closes the khata (never deletes it). */
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.close(user, id); }
}
