/**
 * Product import routes: dry-run check, chunked import, price update and the
 * job history. New products need products.create (route map); a price update
 * changes existing products, so it needs products.edit.
 */

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../../common/shop-scope';
import { ProductsService } from '../products.service';
import { ImportCheckDto, ImportRunDto } from './product-import.dto';
import { ProductImportService } from './product-import.service';

@ApiTags('Products - Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductImportController {
  constructor(
    private readonly service: ProductImportService,
    private readonly products: ProductsService,
  ) {}

  @Post('bulk-import/check')
  check(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: ImportCheckDto) {
    return this.service.checkCreate(user, scope, dto);
  }

  @Post('bulk-import/run')
  run(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: ImportRunDto) {
    return this.service.runCreate(user, scope, dto);
  }

  @Get('bulk-import/prices/sheet')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  priceSheet(@GetUser() user: AuthenticatedUser) {
    return this.service.priceSheet(user);
  }

  @Post('bulk-import/prices/check')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  checkPrices(@GetUser() user: AuthenticatedUser, @Body() dto: ImportCheckDto) {
    return this.service.checkPrices(user, dto);
  }

  @Post('bulk-import/prices/run')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  runPrices(@GetUser() user: AuthenticatedUser, @Body() dto: ImportRunDto) {
    return this.service.runPrices(user, dto);
  }

  @Get('bulk-import/jobs')
  jobs(@GetUser() user: AuthenticatedUser) {
    return this.service.listJobs(user);
  }

  @Get('bulk-import/jobs/:id')
  job(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getJob(user, id);
  }

  /** Paths the mobile app calls; same as bulk-import/preview and /apply. */
  @Post('bulk-import-preview')
  mobilePreview(@GetUser() user: AuthenticatedUser, @Body() body: { rows: unknown[] }) {
    return this.products.bulkImportPreview(user, body.rows || []);
  }

  @Post('bulk-import-apply')
  mobileApply(@GetUser() user: AuthenticatedUser, @Body() body: { rows: unknown[] }, @CurrentShop() scope: ShopScope) {
    return this.products.bulkImportApply(user, body.rows || [], scope);
  }
}
