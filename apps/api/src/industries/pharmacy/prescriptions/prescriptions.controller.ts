import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto, DispenseDto, ListPrescriptionsDto, RejectPrescriptionDto, VerifyPrescriptionDto } from './dto/create-prescription.dto';

/**
 * Prescriptions are counter work: taking one in, checking it, handing the
 * medicines over (which bills a sale) and refills all need pos.use. Reading
 * them needs it too, since they hold patients' medical details.
 */
@ApiTags('Pharmacy - Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('pharmacy/prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreatePrescriptionDto) {
    return this.service.create(user, shop, dto);
  }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('doctorId') doctorId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, doctorId, from, to, search });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListPrescriptionsDto) {
    return this.service.page(user, shop, q);
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, { from, to });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/verify') verify(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: VerifyPrescriptionDto) {
    return this.service.verify(user, id, body.notes);
  }
  @Post(':id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RejectPrescriptionDto) {
    return this.service.reject(user, id, body.reason);
  }
  @Post(':id/dispense') dispense(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: DispenseDto) {
    return this.service.dispense(user, shop, id, dto);
  }
  @Post(':id/refill') refill(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.refill(user, id);
  }
}
