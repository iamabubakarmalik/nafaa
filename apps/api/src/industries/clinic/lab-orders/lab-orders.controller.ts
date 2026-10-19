import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { LabOrdersService } from './lab-orders.service';

/** Lab orders are medical records: read with bookings view, change with bookings manage; billing needs pos.use. */
@ApiTags('Clinic - Lab Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.CLINIC_RECORDS_VIEW)
@Controller('clinic/lab-orders')
export class LabOrdersController {
  constructor(private readonly service: LabOrdersService) {}

  @Post() @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, {
      patientId: q.patientId, doctorId: q.doctorId, status: q.status, paymentStatus: q.paymentStatus, search: q.search, from: q.from, to: q.to, page: q.page, limit: q.limit,
    });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id/status') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(user, id, body?.status); }

  @Patch('tests/:testId/result') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  result(@GetUser() user: AuthenticatedUser, @Param('testId') testId: string, @Body() dto: any) { return this.service.recordResult(user, testId, dto); }

  @Post(':id/attach-report') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  attach(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reportUrl: string }) { return this.service.attachReport(user, id, body?.reportUrl); }

  @Post(':id/payment') @RequirePermissions(PERMISSIONS.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: any) { return this.service.addPayment(user, shop, id, body); }
}
