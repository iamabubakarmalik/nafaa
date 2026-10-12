import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { BulkAddUnitDto, CreateProductUnitDto, UnitsAnalyticsDto, UnitsOverviewDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';
import { ProductUnitsService } from './product-units.service';

class ConvertDto {
  @IsString() fromUnitId!: string;
  @IsString() toUnitId!: string;
  @IsNumber() @Min(0) quantity!: number;
}

@ApiTags('Product Units')
@ApiBearerAuth()
@Controller('retail/product-units')
export class ProductUnitsController {
  constructor(private readonly service: ProductUnitsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateProductUnitDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser) {
    return this.service.findAll(user);
  }

  /** Products with their packs, filtered and paged, for the Multi-units page. */
  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: UnitsOverviewDto) {
    return this.service.overview(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: UnitsAnalyticsDto) {
    return this.service.analytics(user, shop, q);
  }

  /** One pack added to many products. */
  @Post('bulk')
  bulkAdd(@GetUser() user: AuthenticatedUser, @Body() dto: BulkAddUnitDto) {
    return this.service.bulkAdd(user, dto);
  }

  @Get('by-product/:productId')
  findByProduct(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.service.findByProduct(user, productId, variantId);
  }

  @Get('by-barcode/:barcode')
  findByBarcode(@GetUser() user: AuthenticatedUser, @Param('barcode') barcode: string) {
    return this.service.findByBarcode(user, barcode);
  }

  @Post('convert')
  convert(@GetUser() user: AuthenticatedUser, @Body() body: ConvertDto) {
    return this.service.convertQuantity(user, body.fromUnitId, body.toUnitId, body.quantity);
  }

  @Post(':id/generate-barcode')
  generateBarcode(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.generateBarcode(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductUnitDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
