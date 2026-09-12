import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Sales Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.list(user, shop);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreateReturnDto,
  ) {
    return this.service.create(user, shop, dto);
  }
}
