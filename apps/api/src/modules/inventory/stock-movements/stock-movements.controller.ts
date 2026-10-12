import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ListMovementsDto } from './dto/list-movements.dto';
import { StockMovementsService } from './stock-movements.service';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListMovementsDto) {
    return this.stockMovementsService.list(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListMovementsDto) {
    return this.stockMovementsService.analytics(user, shop, q);
  }

  @Get('people')
  people(@GetUser() user: AuthenticatedUser) {
    return this.stockMovementsService.people(user);
  }
}
