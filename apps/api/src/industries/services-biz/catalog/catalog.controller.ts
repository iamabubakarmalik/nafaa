import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CatalogService } from './catalog.service';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';

/** The rate list is read by the job form and the counter; changing it is a products right. */
@ApiTags('Service Business - Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/catalog')
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCatalogDto) { return this.service.create(user, dto); }

  @Post('sync-products') @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  syncProducts(@GetUser() user: AuthenticatedUser) { return this.service.syncProducts(user); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('businessType') businessType?: string, @Query('search') search?: string, @Query('active') active?: string, @Query('featured') featured?: string, @Query('popular') popular?: string, @Query('emergency') emergency?: string) {
    return this.service.list(user, {
      category, businessType, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
      popular: popular === 'true' ? true : undefined,
      emergency: emergency === 'true' ? true : undefined,
    });
  }
  @Get('by-category') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('by-business-type') byBusinessType(@GetUser() user: AuthenticatedUser) { return this.service.byBusinessType(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCatalogDto) { return this.service.update(user, id, dto); }

  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
