import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CancelDto } from '../layaway/dto/layaway.dto';
import { ReservationQuery, ReservationsService } from './reservations.service';
import { ConvertReservationDto, CreateReservationDto, ExtendReservationDto, SellReservationDto } from './dto/reservation.dto';

@ApiTags('Garments - Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateReservationDto) { return this.service.create(user, dto, shop.shopId); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('productId') productId?: string) { return this.service.list(user, { status, customerId, productId }); }
  /** One page of a view (active, today, expired, sold, cancelled, all) with counts. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReservationQuery) { return this.service.page(user, shop, q); }
  /** Pieces held per item in this branch; available to sell = stock − reserved. */
  @Get('held') held(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.heldStock(user, shop); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/sell') sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SellReservationDto) { return this.service.sell(user, id, body); }
  @Post(':id/extend') extend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ExtendReservationDto) { return this.service.extend(user, id, body.days); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CancelDto) { return this.service.cancel(user, id, body.reason); }
  @Post(':id/convert') convert(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ConvertReservationDto) { return this.service.convert(user, id, body.saleId); }
  @Post('expire-old') expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }
}
