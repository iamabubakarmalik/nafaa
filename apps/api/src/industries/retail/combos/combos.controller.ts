import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CombosService } from './combos.service';
import { ComboRangeDto, CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@ApiTags('Combos')
@ApiBearerAuth()
@Controller('retail/combos')
export class CombosController {
  constructor(private readonly service: CombosService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateComboDto) {
    return this.service.create(user, shop, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('status') status?: string,
    @Query('featured') featured?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user, shop, {
      status,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      search,
    });
  }

  /** Combos sold, revenue and profit over a business-day range. */
  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ComboRangeDto) {
    return this.service.analytics(user, shop, q);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) {
    return this.service.findOne(user, shop, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
    @Body() dto: UpdateComboDto,
  ) {
    return this.service.update(user, shop, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post(':id/toggle-featured')
  toggleFeatured(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.toggleFeatured(user, id);
  }
}
