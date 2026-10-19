import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopIdParam, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { DeliveryService } from './delivery.service';
import { AssignRiderDto, DeliveryStatusDto, SettleRiderCashDto } from './dto/delivery.dto';

@ApiTags('Restaurant - Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Post('assign/:orderId') assign(@GetUser() user: AuthenticatedUser, @Param('orderId') orderId: string, @Body() body: AssignRiderDto) {
    return this.service.assign(user, orderId, body);
  }

  @Post(':orderId/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('orderId') orderId: string, @Body() body: DeliveryStatusDto) {
    return this.service.updateStatus(user, orderId, body);
  }

  @Get('active') listActive(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) { return this.service.listActive(user, shopId); }

  /** Delivery orders by stage (waiting for a rider, on the way, cash with rider) for the delivery board. */
  @Get('board') board(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) { return this.service.board(user, shopId); }

  /** Cash each rider still has to hand over, per rider. */
  @Get('rider-cash') riderCash(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) { return this.service.riderCash(user, shopId); }

  /** Takes the rider's cash for delivered orders: each order becomes a cash bill now, so the drawer matches. */
  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE, PERMISSIONS.POS_USE)
  @Post('settle') settle(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: SettleRiderCashDto) {
    return this.service.settle(user, scope, dto);
  }
}
