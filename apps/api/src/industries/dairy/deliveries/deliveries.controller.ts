import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DairyDeliveriesService } from './deliveries.service';
import { BulkGenerateDto, ConfirmAllDto, ConfirmDeliveryDto, CreateDeliveryDto, UndoDeliveryDto } from './dto/create-delivery.dto';

/**
 * Delivering milk is selling it, so the delivery sheet needs the counter
 * right (`pos.use`). Undoing a delivered entry also voids its bill, which
 * the service checks against `sales.void`.
 */
@ApiTags('Dairy - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('dairy/deliveries')
export class DairyDeliveriesController {
  constructor(private readonly service: DairyDeliveriesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CreateDeliveryDto) { return this.service.create(user, scope, dto); }
  @Post('bulk-generate') bulkGenerate(@GetUser() user: AuthenticatedUser, @Body() dto: BulkGenerateDto) { return this.service.bulkGenerate(user, dto); }
  @Post('confirm-all') confirmAll(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: ConfirmAllDto) { return this.service.confirmAll(user, scope, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId?: string, @Query('routeId') routeId?: string, @Query('slot') slot?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { customerId, routeId, slot, status, from, to, search });
  }
  @Get('today') today(@GetUser() user: AuthenticatedUser, @Query('slot') slot?: string, @Query('routeId') routeId?: string) { return this.service.todaysDeliveries(user, slot, routeId); }
  @Get('daily-summary') summary(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) { return this.service.dailySummary(user, date); }
  @Post(':id/confirm') confirm(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) { return this.service.confirmDelivery(user, scope, id, dto); }
  @Post(':id/skip') skip(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: UndoDeliveryDto) { return this.service.skipDelivery(user, scope, id, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: UndoDeliveryDto) { return this.service.cancelDelivery(user, scope, id, dto); }
}
