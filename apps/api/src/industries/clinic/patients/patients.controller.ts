import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PatientsService } from './patients.service';

/**
 * Patients are customers with a medical record: the directory needs
 * customers.view / customers.edit; the full history (notes, prescriptions,
 * results) also needs bookings view.
 */
@ApiTags('Clinic - Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW)
@Controller('clinic/patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post() @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, shop, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, {
      search: q.search, gender: q.gender, bloodGroup: q.bloodGroup, insurance: q.insurance, allergies: q.allergies, status: q.status, sort: q.sort, page: q.page, limit: q.limit,
    });
  }

  @Get('by-mrn/:mrn') byMrn(@GetUser() user: AuthenticatedUser, @Param('mrn') mrn: string) { return this.service.byMrn(user, mrn); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Get(':id/history') @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_VIEW)
  history(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.history(user, id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }

  @Delete(':id') @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
