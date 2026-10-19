import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ClinicServicesService } from './services.service';

/** Clinic services are the clinical details of a product, so they follow the products rights. */
@ApiTags('Clinic - Services / Procedures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
@Controller('clinic/services')
export class ClinicServicesController {
  constructor(private readonly service: ClinicServicesService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      category, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.byProduct(user, productId);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
