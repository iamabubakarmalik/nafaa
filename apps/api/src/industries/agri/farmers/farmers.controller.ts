import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FarmersService, type FarmerTab } from './farmers.service';

/**
 * Farmers. Reading needs farmers.view and changing them farmers.manage
 * (route rules); taking money on a farmer's khata needs khata.manage and
 * reading the season khata needs khata.view.
 */
@ApiTags('Agri - Farmers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/farmers')
export class FarmersController {
  constructor(private readonly service: FarmersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: Record<string, unknown>) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('district') district?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, district, search });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string>) {
    return this.service.page(user, { search: q.search, district: q.district, tab: q.tab as FarmerTab, sort: q.sort, page: Number(q.page), limit: Number(q.limit) });
  }
  @Get('overdue') overdue(@GetUser() user: AuthenticatedUser) { return this.service.overdueList(user); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Post(':id/link-customer') linkCustomer(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { customerId?: string }) {
    return this.service.linkCustomer(user, id, body?.customerId);
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }
  @RequirePermissions(PERMISSIONS.AGRI_FARMERS_VIEW, PERMISSIONS.KHATA_VIEW)
  @Get(':id/khata') khata(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.khata(user, id); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.service.update(user, id, dto); }
  @Post(':id/suspend') suspend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.suspend(user, id, body?.reason); }
  @Post(':id/reactivate') reactivate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.reactivate(user, id); }
  @Post(':id/purchase') purchase() { return this.service.recordPurchase(); }
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number; paymentMethod?: string; note?: string }) {
    return this.service.recordPayment(user, id, Number(body?.amount), body?.paymentMethod, body?.note);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
