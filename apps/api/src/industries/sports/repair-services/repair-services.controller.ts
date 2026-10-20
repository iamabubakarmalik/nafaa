import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RepairServicesService } from './repair-services.service';
import { CreateRepairServiceDto, RepairPaymentDto, UpdateRepairStatusDto } from './dto/create-repair.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Sports - Repair Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
/** Repairs take money at the counter (advance, delivery bill): pos.use. Cash refunds also need returns.create. */
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('sports/repair-services')
export class RepairServicesController {
  constructor(private readonly service: RepairServicesService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateRepairServiceDto) {
    return this.service.create(user, dto, shop.shopId);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('itemType') itemType?: string,
    @Query('repairType') repairType?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, itemType, repairType, customerId, from, to, search });
  }

  @Get('page')
  page(
    @GetUser() user: AuthenticatedUser,
    @Query('view') view?: string, @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('search') search?: string, @Query('from') from?: string, @Query('to') to?: string,
  ) {
    return this.service.page(user, { view, page, limit, search, from, to });
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get('overdue')
  overdue(@GetUser() user: AuthenticatedUser) {
    return this.service.overdueRepairs(user);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id/status')
  updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateRepairStatusDto) {
    return this.service.updateStatus(user, id, dto, shop.shopId);
  }

  @Post(':id/payment')
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: RepairPaymentDto) {
    return this.service.recordPayment(user, id, body.amount, shop.shopId, body.paymentMethod);
  }

  @Post(':id/refund')
  @RequirePermissions(PERMISSIONS.POS_USE, PERMISSIONS.RETURNS_CREATE)
  refund(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: { managerPin?: string }) {
    return this.service.refund(user, id, shop.shopId, body?.managerPin);
  }

  /** Cancels the repair (kept for older screens); nothing is deleted. */
  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
