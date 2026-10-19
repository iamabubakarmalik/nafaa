import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { BulkPricingService } from './bulk-pricing.service';
import { UpsertBulkPricingDto } from './dto/upsert-bulk-pricing.dto';

/** Quantity rates. Reading is open to the counter; changing a rate is a product edit. */
@ApiTags('Hardware - Bulk Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/bulk-pricing')
export class BulkPricingController {
  constructor(private readonly service: BulkPricingService) {}

  /** Every active tier of the shop, for the counter and the product list. */
  @Get() listAll(@GetUser() user: AuthenticatedUser) { return this.service.listAll(user); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBulkPricingDto) { return this.service.create(user, dto); }
  @Get('by-product/:productId') listByProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.listByProduct(user, productId); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertBulkPricingDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
  @Get('calculate') calculate(@GetUser() user: AuthenticatedUser, @Query('productId') productId: string, @Query('quantity') quantity: string) {
    return this.service.calculatePrice(user, productId, Number(quantity));
  }
}
