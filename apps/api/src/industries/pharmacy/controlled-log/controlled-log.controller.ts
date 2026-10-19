import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ControlledLogService } from './controlled-log.service';
import { CreateControlledLogDto, SaleDetailsDto } from './dto/create-controlled-log.dto';

/**
 * Narcotic register. Reading it needs products.view (it is a stock record);
 * writing patient and doctor details is counter work (pos.use).
 */
@ApiTags('Pharmacy - Controlled Substances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/controlled-log')
export class ControlledLogController {
  constructor(private readonly service: ControlledLogService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateControlledLogDto) { return this.service.create(user, dto); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post('sale-details') saleDetails(@GetUser() user: AuthenticatedUser, @Body() dto: SaleDetailsDto) {
    return this.service.saveSaleDetails(user, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string, @Query('logType') logType?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { productId, logType, from, to });
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('overview') overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.overview(user, shop, { from, to });
  }

  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('register/:productId') register(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.register(user, shop, productId, { from, to });
  }
}
