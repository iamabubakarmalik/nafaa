import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { BundlesService } from './bundles.service';
import { PatchBundleDto, UpsertBundleDto } from './dto/upsert-bundle.dto';

/**
 * Bundle deals (TV + soundbar, phone + cover). Reading is open to the POS;
 * changing a bundle is product editing, removing one is product deleting.
 */
@ApiTags('Electronics - Bundles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/bundles')
export class BundlesController {
  constructor(private readonly service: BundlesService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBundleDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('active') active?: string, @Query('featured') featured?: string, @Query('search') search?: string) {
    return this.service.list(user, shop, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
      search,
    });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) { return this.service.getOne(user, shop, id); }

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: PatchBundleDto) { return this.service.update(user, shop, id, dto); }

  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
