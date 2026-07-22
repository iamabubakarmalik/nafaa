import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BakeryProductsService } from './bakery-products.service';
import { UpsertBakeryProductDto } from './dto/upsert-bakery-product.dto';

@ApiTags('Bakery - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/products')
export class BakeryProductsController {
  constructor(private readonly service: BakeryProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBakeryProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('featured') featured?: string, @Query('popular') popular?: string, @Query('bestSeller') bestSeller?: string, @Query('newArrival') newArrival?: string, @Query('seasonal') seasonal?: string, @Query('eggless') eggless?: string, @Query('vegan') vegan?: string, @Query('sugarFree') sugarFree?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      category, search,
      featured: featured === 'true' ? true : undefined,
      popular: popular === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      seasonal: seasonal === 'true' ? true : undefined,
      eggless: eggless === 'true' ? true : undefined,
      vegan: vegan === 'true' ? true : undefined,
      sugarFree: sugarFree === 'true' ? true : undefined,
    });
  }
  @Get('by-category') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
