import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeSizeVariantsService } from './size-variants.service';
import { AdjustStockDto, BulkUpsertSizeVariantsDto, UpsertSizeVariantDto } from './dto/upsert-size-variant.dto';

@ApiTags('Shoe - Size Variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/size-variants')
export class ShoeSizeVariantsController {
  constructor(private readonly service: ShoeSizeVariantsService) {}

  @Post() upsert(@GetUser() u: AuthenticatedUser, @Body() dto: UpsertSizeVariantDto) { return this.service.upsert(u, dto); }
  @Post('bulk') bulk(@GetUser() u: AuthenticatedUser, @Body() dto: BulkUpsertSizeVariantsDto) { return this.service.bulkUpsert(u, dto); }
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
  @Get('low-stock-report') lowStock(@GetUser() u: AuthenticatedUser) { return this.service.lowStockReport(u); }
  @Get('by-product/:productId') byProduct(@GetUser() u: AuthenticatedUser, @Param('productId') p: string) { return this.service.byProduct(u, p); }
  @Get('by-product/:productId/availability') avail(@GetUser() u: AuthenticatedUser, @Param('productId') p: string) { return this.service.sizeAvailability(u, p); }
  @Get('by-sku/:sku') bySku(@GetUser() u: AuthenticatedUser, @Param('sku') s: string) { return this.service.bySku(u, s); }
  @Get('by-barcode/:barcode') byBarcode(@GetUser() u: AuthenticatedUser, @Param('barcode') b: string) { return this.service.byBarcode(u, b); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id/adjust-stock') adjust(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdjustStockDto) { return this.service.adjustStock(u, id, dto); }
  @Post(':id/reserve') reserve(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { quantity: number }) { return this.service.reserve(u, id, body.quantity); }
  @Post(':id/release-reservation') release(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { quantity: number }) { return this.service.releaseReservation(u, id, body.quantity); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
