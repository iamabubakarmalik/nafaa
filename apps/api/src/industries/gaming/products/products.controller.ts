import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GamingProductsService } from './products.service';
import { UpsertGamingProductDto } from './dto/upsert-gaming-product.dto';

@ApiTags('Gaming - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/products')
export class GamingProductsController {
  constructor(private readonly service: GamingProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertGamingProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('categoryType') categoryType?: string, @Query('platform') platform?: string, @Query('conditionType') conditionType?: string, @Query('featured') featured?: string, @Query('bestSeller') bestSeller?: string, @Query('newRelease') newRelease?: string, @Query('preOrder') preOrder?: string, @Query('rentable') rentable?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      categoryType, platform, conditionType, search,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newRelease: newRelease === 'true' ? true : undefined,
      preOrder: preOrder === 'true' ? true : undefined,
      rentable: rentable === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
