import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RadarService } from './radar.service';

/** Product Radar. Under `online-orders` (online_orders.view); margin and bundle prices also need cost.view. */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/radar')
export class RadarController {
  constructor(private readonly svc: RadarService) {}

  @Get()
  @ApiOperation({ summary: 'Rising and falling products, margin opportunities and bundle ideas' })
  radar(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: { days?: string; integrationId?: string }) {
    return this.svc.radar(user, scope, q);
  }
}
