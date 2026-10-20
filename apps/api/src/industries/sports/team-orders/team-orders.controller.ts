import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TeamOrdersService } from './team-orders.service';
import { CreateTeamOrderDto, RecordPaymentDto, UpdateTeamOrderDto, UpdateTeamOrderStatusDto } from './dto/create-team-order.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Sports - Team Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
/** Orders take money at the counter (advance, delivery bill): pos.use. Cash refunds also need returns.create. */
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('sports/team-orders')
export class TeamOrdersController {
  constructor(private readonly service: TeamOrdersService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateTeamOrderDto) {
    return this.service.create(user, dto, shop);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('status') status?: string,
    @Query('hasCustomJerseys') hasCustom?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      status, from, to, search,
      hasCustomJerseys: hasCustom === 'true' ? true : hasCustom === 'false' ? false : undefined,
    }, shop);
  }

  @Get('page')
  page(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('view') view?: string, @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('search') search?: string, @Query('from') from?: string, @Query('to') to?: string,
  ) {
    return this.service.page(user, { view, page, limit, search, from, to }, shop);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.summary(user, shop);
  }

  @Get('upcoming-deliveries')
  upcoming(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('days') days?: string) {
    return this.service.upcomingDeliveries(user, days ? Number(days) : 14, shop);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTeamOrderDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateTeamOrderStatusDto) {
    return this.service.updateStatus(user, id, dto, shop);
  }

  @Post(':id/payment')
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.service.recordPayment(user, id, dto, shop);
  }

  @Post(':id/refund')
  @RequirePermissions(PERMISSIONS.POS_USE, PERMISSIONS.RETURNS_CREATE)
  refund(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: { managerPin?: string }) {
    return this.service.refund(user, id, shop, body?.managerPin);
  }

  /** Cancels the order (kept for older screens); nothing is deleted. */
  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
