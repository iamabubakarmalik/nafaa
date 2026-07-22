import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GarmentProductsService } from './garment-products.service';
import { UpsertGarmentProductDto, UpsertVariantProfileDto } from './dto/upsert-garment-product.dto';

@ApiTags('Garments - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/products')
export class GarmentProductsController {
  constructor(private readonly service: GarmentProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertGarmentProductDto) { return this.service.upsertProfile(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('gender') gender?: string, @Query('categoryType') categoryType?: string, @Query('season') season?: string, @Query('collectionId') collectionId?: string, @Query('featured') featured?: string, @Query('newArrival') newArrival?: string, @Query('bestSeller') bestSeller?: string, @Query('onSale') onSale?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      gender, categoryType, season, collectionId, search,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      onSale: onSale === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.getByProductId(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }

  // Variant profile
  @Post('variant-profile') upsertVariant(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertVariantProfileDto) { return this.service.upsertVariantProfile(user, dto); }
  @Get('variant-profiles/:productId') variantProfiles(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.variantProfilesByProduct(user, productId); }
  @Delete('variant-profile/:id') removeVariant(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removeVariantProfile(user, id); }
}
