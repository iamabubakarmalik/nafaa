import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PetProductsService } from './products.service';
import { UpsertPetProductDto } from './dto/upsert-pet-product.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Pet Shop - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('petshop/products')
export class PetProductsController {
  constructor(private readonly service: PetProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertPetProductDto) { return this.service.upsert(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('categoryType') categoryType?: string,
    @Query('species') species?: string,
    @Query('lifeStage') lifeStage?: string,
    @Query('brand') brand?: string,
    @Query('grainFree') grainFree?: string,
    @Query('organic') organic?: string,
    @Query('hypoallergenic') hypoallergenic?: string,
    @Query('prescriptionOnly') prescriptionOnly?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('onSale') onSale?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      categoryType, species, lifeStage, brand, search,
      grainFree: bool(grainFree), organic: bool(organic),
      hypoallergenic: bool(hypoallergenic), prescriptionOnly: bool(prescriptionOnly),
      featured: bool(featured), bestSeller: bool(bestSeller),
      newArrival: bool(newArrival), onSale: bool(onSale),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('for-pet') forPet(@GetUser() user: AuthenticatedUser, @Query('species') species: string, @Query('lifeStage') lifeStage?: string) {
    return this.service.forPet(user, species, lifeStage);
  }
  @Get('expiring-soon') expiring(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.expiringSoon(user, days ? Number(days) : 90);
  }
  @Get('expired') expired(@GetUser() user: AuthenticatedUser) { return this.service.expired(user); }
  @Get('by-category-count') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('brands') brands(@GetUser() user: AuthenticatedUser) { return this.service.brands(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
