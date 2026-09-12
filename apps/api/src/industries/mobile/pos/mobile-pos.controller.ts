import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MobilePosService } from './mobile-pos.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Mobile POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('industries/mobile/pos')
export class MobilePosController {
  constructor(private readonly service: MobilePosService) {}

  /**
   * POS screen ka poora catalog — new phones (IMEI), used phones, accessories.
   * `shopId` do to accessories ka stock us shop ka aayega (checkout se match karta hua).
   */
  @Get('catalog')
  catalog(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.catalog(user, { shopId, search });
  }
}
