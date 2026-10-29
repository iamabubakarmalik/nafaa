import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PriceCalculatorService, QuoteBody } from './price-calculator.service';

/**
 * Price calculator. It shows cost and profit, so every route needs
 * `cost.view`; the product list also needs `products.view` and saving the
 * shop's defaults `settings.edit`. Setting a price goes through the product
 * and online-product endpoints with their own permissions.
 */
@ApiTags('Price calculator')
@ApiBearerAuth()
@Controller('price-calculator')
export class PriceCalculatorController {
  constructor(private readonly service: PriceCalculatorService) {}

  @Get('context')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'Defaults, shop data (RTO, ads per order, rate cards) and an optional product' })
  context(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string) {
    return this.service.context(user, productId || undefined);
  }

  @Post('quote')
  @RequirePermissions(PERMISSIONS.COST_VIEW)
  @ApiOperation({ summary: 'Suggested price, break-even, profit and breakdown per channel' })
  quote(@GetUser() user: AuthenticatedUser, @Body() body: QuoteBody) {
    return this.service.quote(user, body ?? {});
  }

  @Post('bulk-preview')
  @RequirePermissions(PERMISSIONS.COST_VIEW, PERMISSIONS.PRODUCTS_VIEW)
  @ApiOperation({ summary: 'Suggested prices for a filtered product list' })
  bulkPreview(@GetUser() user: AuthenticatedUser, @Body() body: QuoteBody & { search?: string; categoryId?: string; integrationId?: string; limit?: number }) {
    return this.service.bulkPreview(user, body ?? {});
  }

  @Put('defaults')
  @RequirePermissions(PERMISSIONS.COST_VIEW, PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: "Save the shop's calculator defaults" })
  saveDefaults(@GetUser() user: AuthenticatedUser, @Body() body: { price?: Record<string, unknown> }) {
    return this.service.saveDefaults(user, body);
  }
}
