import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { KotService } from './kot.service';
import { CurrentShop, ShopIdParam, ShopScope } from '../../../common/shop-scope';
import { CreateKotDto, UpdateKotStatusDto } from './dto/create-kot.dto';

@ApiTags('Restaurant - KOT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/kot')
export class KotController {
  constructor(private readonly service: KotService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateKotDto) { return this.service.create(user, dto); }

  /** `active=true`: the kitchen screen (tickets still cooking and fresh cancel tickets) for the branch being viewed. */
  @Get() list(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined,
    @Query('status') status?: string, @Query('station') station?: string, @Query('orderId') orderId?: string, @Query('active') active?: string) {
    return this.service.list(user, { status, station, orderId, active: active === 'true', shopId });
  }

  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: UpdateKotStatusDto) {
    return this.service.updateStatus(user, scope, id, body.status);
  }
}
