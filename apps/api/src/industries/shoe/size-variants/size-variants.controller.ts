import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeSizeVariantsService } from './size-variants.service';
import { AdjustStockDto, BulkUpsertSizeVariantsDto, UpsertSizeVariantDto } from './dto/upsert-size-variant.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Shoe - Size Variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
/** Older shoe size rows (box, shelf). Stock itself lives on the core variants. */
@RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
@Controller('shoe/size-variants')
export class ShoeSizeVariantsController {
  constructor(private readonly service: ShoeSizeVariantsService) {}

  @Post() upsert(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: UpsertSizeVariantDto) { return this.service.upsert(u, dto, shop.shopId); }
  @Post('bulk') bulk(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: BulkUpsertSizeVariantsDto) { return this.service.bulkUpsert(u, dto, shop.shopId); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('productId') productId?: string,
    @Query('size') size?: string,
    @Query('inStock') inStock?: string,
    @Query('lowStock') lowStock?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(u, {
      productId, size, search,
      inStock: inStock === 'true' ? true : undefined,
      lowStock: lowStock === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('low-stock-report') lowStock(@GetUser() u: AuthenticatedUser) { return this.service.lowStockReport(u); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('by-product/:productId') byProduct(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') p: string) { return this.service.byProduct(u, p, shop.shopId); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('by-product/:productId/availability') avail(@GetUser() u: AuthenticatedUser, @Param('productId') p: string) { return this.service.sizeAvailability(u, p); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('by-sku/:sku') bySku(@GetUser() u: AuthenticatedUser, @Param('sku') s: string) { return this.service.bySku(u, s); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('by-barcode/:barcode') byBarcode(@GetUser() u: AuthenticatedUser, @Param('barcode') b: string) { return this.service.byBarcode(u, b); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id/adjust-stock') adjust(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: AdjustStockDto) { return this.service.adjustStock(u, id, dto, shop.shopId); }
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/reserve') reserve(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { quantity: number }) { return this.service.reserve(u, id, body.quantity); }
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/release-reservation') release(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { quantity: number }) { return this.service.releaseReservation(u, id, body.quantity); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
