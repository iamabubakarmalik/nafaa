import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ShopIdParam } from '../../../common/shop-scope';
import { SerialTrackingService } from './serial-tracking.service';
import { BulkCreateSerialDto, ListSerialsDto, SellSerialDto, TradeInDto, UpsertSerialDto } from './dto/upsert-serial.dto';

@ApiTags('Electronics - Serial Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/serial-tracking')
export class SerialTrackingController {
  constructor(private readonly service: SerialTrackingService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertSerialDto) { return this.service.create(user, dto); }
  @Post('bulk') bulk(@GetUser() user: AuthenticatedUser, @Body() dto: BulkCreateSerialDto) { return this.service.bulkCreate(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string, @Query('status') status?: string, @Query('imei') imei?: string, @Query('search') search?: string, @ShopIdParam() shopId?: string) {
    return this.service.list(user, { productId, status, imei, search, shopId });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined, @Query() q: ListSerialsDto) {
    return this.service.page(user, shopId, q);
  }
  /** Buying a used unit adds stock and pays cash, so it also needs the purchase permission. */
  @RequirePermissions(PERMISSIONS.ELECTRONICS_SERIALS_MANAGE, PERMISSIONS.PURCHASES_CREATE)
  @Post('trade-in') tradeIn(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined, @Body() dto: TradeInDto) {
    return this.service.tradeIn(user, shopId, dto);
  }
  @Get('lookup/:code') lookup(@GetUser() user: AuthenticatedUser, @Param('code') code: string) { return this.service.lookupBySerialOrImei(user, code); }
  @Get('warranty-check/:code') warranty(@GetUser() user: AuthenticatedUser, @Param('code') code: string) { return this.service.warrantyCheck(user, code); }
  /** Units on the given bills (comma-separated ids, up to 100), for sales history. */
  @Get('for-sales') forSales(@GetUser() user: AuthenticatedUser, @Query('saleIds') saleIds?: string) { return this.service.forSales(user, saleIds); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertSerialDto) { return this.service.update(user, id, dto); }
  @Post(':id/sell') sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SellSerialDto) { return this.service.sell(user, id, dto); }
  @Post(':id/return') returnSerial(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.returnSerial(user, id, body.reason); }
  @Post(':id/defective') defective(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.markDefective(user, id, body.reason); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
