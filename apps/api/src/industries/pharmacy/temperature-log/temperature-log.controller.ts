import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { TemperatureLogService } from './temperature-log.service';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';

/** Fridge and store temperature readings; any staff member may record one. */
@ApiTags('Pharmacy - Temperature Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/temperature-log')
export class TemperatureLogController {
  constructor(private readonly service: TemperatureLogService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateTemperatureLogDto) {
    return this.service.create(user, shop, dto);
  }
  @Get() list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('location') location?: string, @Query('withinRange') withinRange?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, shop, { location, withinRange: withinRange === 'true' ? true : withinRange === 'false' ? false : undefined, from, to });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('days') days?: string) {
    return this.service.summary(user, shop, days ? parseInt(days, 10) || 7 : 7);
  }
}
