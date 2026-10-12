import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DamageService } from './damage.service';
import { CreateDamageDto } from './dto/create-damage.dto';
import { ApproveDamageDto, ApproveManyDamageDto, ListDamageDto, RejectDamageDto } from './dto/approve-damage.dto';

/**
 * Damage and wastage for every industry (the path stays under `retail/` for
 * existing callers). Any staff member can report and read; approving or
 * rejecting needs the stock adjustments permission, because approval moves
 * stock.
 */
@ApiTags('Damage & Wastage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/damage')
export class DamageController {
  constructor(private readonly service: DamageService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateDamageDto) {
    return this.service.create(user, shop, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListDamageDto) {
    return this.service.findAll(user, shop, q);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, shop, { from, to });
  }

  /** Pending approvals in the active branch. */
  @Get('queue')
  queue(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.queue(user, shop);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListDamageDto) {
    return this.service.analytics(user, shop, q);
  }

  /** Variants, units, batches and branch stock of a product, for the report form. */
  @Get('options/:productId')
  options(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string) {
    return this.service.options(user, shop, productId);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post('approve-many')
  approveMany(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: ApproveManyDamageDto) {
    return this.service.approveMany(user, shop, dto.ids, dto.notes);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/approve')
  approve(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: ApproveDamageDto) {
    return this.service.approve(user, shop, id, dto.notes);
  }

  @RequirePermissions(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)
  @Post(':id/reject')
  reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RejectDamageDto) {
    return this.service.reject(user, id, dto.reason);
  }
}
