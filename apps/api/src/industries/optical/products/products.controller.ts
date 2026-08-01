import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { OpticalProductsService } from './products.service';
import { UpsertOpticalProductDto } from './dto/upsert-optical-product.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Optical - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/products')
export class OpticalProductsController {
  constructor(private readonly service: OpticalProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertOpticalProductDto) { return this.service.upsert(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('categoryType') categoryType?: string,
    @Query('frameShape') frameShape?: string,
    @Query('frameMaterial') frameMaterial?: string,
    @Query('gender') gender?: string,
    @Query('brand') brand?: string,
    @Query('contactLensOnly') contactLensOnly?: string,
    @Query('blueCut') blueCut?: string,
    @Query('polarized') polarized?: string,
    @Query('photochromic') photochromic?: string,
    @Query('progressive') progressive?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('designer') designer?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      categoryType, frameShape, frameMaterial, gender, brand, search,
      contactLensOnly: bool(contactLensOnly),
      blueCut: bool(blueCut), polarized: bool(polarized),
      photochromic: bool(photochromic), progressive: bool(progressive),
      featured: bool(featured), bestSeller: bool(bestSeller),
      newArrival: bool(newArrival), designer: bool(designer),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('match-prescription') match(@GetUser() user: AuthenticatedUser,
    @Query('sph') sph: string,
    @Query('cyl') cyl?: string,
    @Query('progressive') progressive?: string,
    @Query('contactLens') contactLens?: string,
  ) {
    return this.service.matchPrescription(user, {
      sph: Number(sph),
      cyl: cyl ? Number(cyl) : undefined,
      needsProgressive: bool(progressive),
      contactLens: bool(contactLens),
    });
  }

  @Get('by-category-count') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('brands') brands(@GetUser() user: AuthenticatedUser) { return this.service.brands(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
