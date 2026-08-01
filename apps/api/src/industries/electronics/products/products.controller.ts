import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

import { ElectronicsProductsService } from './products.service';
import { UpsertElectronicsProductDto } from './dto/upsert-electronics-product.dto';

@ApiTags('Electronics - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/products')
export class ElectronicsProductsController {
  constructor(private readonly service: ElectronicsProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertElectronicsProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('brandId') brandId?: string, @Query('categoryType') categoryType?: string, @Query('conditionType') conditionType?: string, @Query('featured') featured?: string, @Query('bestSeller') bestSeller?: string, @Query('newArrival') newArrival?: string, @Query('trending') trending?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      brandId, categoryType, conditionType, search,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      trending: trending === 'true' ? true : undefined,
    });
  }
  @Get('by-category-count') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
