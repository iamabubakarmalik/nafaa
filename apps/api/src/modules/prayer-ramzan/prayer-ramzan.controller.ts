import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../../marketplace/_shared/guards/customer-auth.guard';
import { GetCustomer } from '../../marketplace/_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../../marketplace/auth/interfaces/customer-jwt.interface';
import { PrayerRamzanService } from './prayer-ramzan.service';

@ApiTags('Prayer / Ramzan Mode')
@Controller('prayer-ramzan')
export class PrayerRamzanController {
  constructor(private readonly svc: PrayerRamzanService) {}

  @Public() @Get('times/:city')
  times(@Param('city') city: string, @Query('date') date?: string) {
    return this.svc.getPrayerTimes(city, date);
  }

  @Public() @Get('shop/:shopId/is-paused')
  isPaused(@Param('shopId') shopId: string, @Query('city') city: string) {
    return this.svc.isShopPausedNow(shopId, city);
  }

  @Post('shop/:shopId/configure')
  configure(@Param('shopId') shopId: string, @Body() dto: any) {
    return this.svc.configureShop(shopId, dto);
  }

  @Public() @Get('shop/:shopId/config')
  getConfig(@Param('shopId') shopId: string) { return this.svc.getShopConfig(shopId); }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post('zakat/calculate')
  calculate(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: any) {
    return this.svc.calculateZakat(c.id, dto);
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Get('zakat/history')
  history(@GetCustomer() c: AuthenticatedCustomer) { return this.svc.myZakatHistory(c.id); }
}
