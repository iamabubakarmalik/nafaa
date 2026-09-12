import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ElectronicsPosService } from './electronics-pos.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Electronics POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/pos')
export class ElectronicsPosController {
  constructor(private readonly service: ElectronicsPosService) {}

  /**
   * POS ka poora catalog — products (shop ke stock ke saath),
   * serial-tracked units, aur bundles.
   */
  @Get('catalog')
  catalog(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
    @Query('search') search?: string,
    @Query('categoryType') categoryType?: string,
  ) {
    return this.service.catalog(user, { shopId, search, categoryType });
  }
}
