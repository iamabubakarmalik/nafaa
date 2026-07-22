import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MeatProductsService } from './meat-products.service';
import { UpsertMeatProductDto } from './dto/upsert-meat-product.dto';

@ApiTags('Meat - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/products')
export class MeatProductsController {
  constructor(private readonly service: MeatProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMeatProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('animalType') animalType?: string, @Query('cutCategory') cutCategory?: string, @Query('freshnessType') freshnessType?: string, @Query('featured') featured?: string, @Query('popular') popular?: string, @Query('onSale') onSale?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      animalType, cutCategory, freshnessType, search,
      featured: featured === 'true' ? true : undefined,
      popular: popular === 'true' ? true : undefined,
      onSale: onSale === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
