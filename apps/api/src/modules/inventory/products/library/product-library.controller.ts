/**
 * Product library: browse ready-made products for the shop's industry and
 * import the picked ones (or every match of a search) as normal products.
 * Same permission as creating a product.
 */

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../common/constants/permissions.constants';
import { ShopIdParam } from '../../../../common/shop-scope';
import { ProductLibraryService, type LibraryFilters, type LibraryImportBody } from './product-library.service';

@ApiTags('Product library')
@ApiBearerAuth()
@Controller('products/library')
@RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
export class ProductLibraryController {
  constructor(private readonly library: ProductLibraryService) {}

  @Get('meta')
  meta(@GetUser() user: AuthenticatedUser, @Query('library') library?: string) {
    return this.library.meta(user, library);
  }

  @Get('items')
  items(@GetUser() user: AuthenticatedUser, @Query() query: LibraryFilters & { page?: string; pageSize?: string }) {
    return this.library.items(user, query);
  }

  @Get('barcode/:code')
  byBarcode(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.library.byBarcode(user, code);
  }

  @Post('import')
  startImport(@GetUser() user: AuthenticatedUser, @Body() body: LibraryImportBody, @ShopIdParam() currentShopId?: string) {
    // Opening stock goes to the branch picked in the dialog, else the branch being viewed.
    return this.library.startImport(user, { ...(body ?? {}), shopId: body?.shopId || currentShopId });
  }

  @Get('import/:jobId')
  job(@GetUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.library.getJob(user, jobId);
  }
}
