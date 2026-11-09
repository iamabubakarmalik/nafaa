/**
 * Product suppliers and bulk product changes. Registered before the main
 * products controller so `supplier-links` and `bulk-update` are not read as
 * a product id.
 */

import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../common/constants/permissions.constants';
import { ProductSuppliersService } from './product-suppliers.service';
import { BulkProductUpdateDto, ReplaceSupplierLinksDto, SupplierLinksQuery } from './product-suppliers.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductSuppliersController {
  constructor(private readonly service: ProductSuppliersService) {}

  /** Preferred supplier and costs per product, for the purchase editor. */
  @Get('supplier-links')
  map(@GetUser() user: AuthenticatedUser, @Query() q: SupplierLinksQuery) {
    return this.service.map(user, q.supplierId);
  }

  /** Category, brand, supplier or price percent for many products. */
  @Post('bulk-update')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  bulkUpdate(@GetUser() user: AuthenticatedUser, @Body() dto: BulkProductUpdateDto) {
    return this.service.bulkUpdate(user, dto);
  }

  @Get(':id/suppliers')
  list(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.list(user, id);
  }

  @Put(':id/suppliers')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  replace(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReplaceSupplierLinksDto) {
    return this.service.replace(user, id, dto);
  }
}
