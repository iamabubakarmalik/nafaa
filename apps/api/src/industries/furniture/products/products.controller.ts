import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FurnitureProductsService } from './products.service';
import { UpsertFurnitureProductDto } from './dto/upsert-furniture-product.dto';

@ApiTags('Furniture - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/products')
export class FurnitureProductsController {
  constructor(private readonly service: FurnitureProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertFurnitureProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('categoryType') categoryType?: string,
    @Query('conditionType') conditionType?: string,
    @Query('primaryMaterial') primaryMaterial?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('customizable') customizable?: string,
    @Query('ecoFriendly') ecoFriendly?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      categoryType, conditionType, primaryMaterial, search,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      customizable: customizable === 'true' ? true : undefined,
      ecoFriendly: ecoFriendly === 'true' ? true : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }
  @Get('by-category-count') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('showroom-layout') showroom(@GetUser() user: AuthenticatedUser) { return this.service.showroomLayout(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
