/**
 * Bulk product editor: the rows to edit (with branch stock) and a chunked
 * save of changed fields. Reading needs products.view (route map); saving
 * changes existing products, so it needs products.edit.
 */

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../../common/shop-scope';
import { BulkEditRowsQuery, BulkEditSaveDto } from './product-bulk-edit.dto';
import { ProductBulkEditService } from './product-bulk-edit.service';

@ApiTags('Products - Bulk edit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products/bulk-edit')
export class ProductBulkEditController {
  constructor(private readonly service: ProductBulkEditService) {}

  @Get('rows')
  rows(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: BulkEditRowsQuery) {
    return this.service.rows(user, scope, q);
  }

  @Post('save')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  save(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: BulkEditSaveDto) {
    return this.service.save(user, scope, dto);
  }
}
