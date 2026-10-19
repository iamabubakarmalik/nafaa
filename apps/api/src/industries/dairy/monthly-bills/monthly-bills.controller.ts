import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MonthlyBillsService } from './monthly-bills.service';
import { BillPaymentDto, BulkBillsDto, GenerateBillDto } from './dto/monthly-bill.dto';

/** Monthly bills are khata statements: reading needs khata.view, making them and taking money khata.manage. */
@ApiTags('Dairy - Monthly Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/monthly-bills')
export class MonthlyBillsController {
  constructor(private readonly service: MonthlyBillsService) {}

  @Post() @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  generate(@GetUser() user: AuthenticatedUser, @Body() dto: GenerateBillDto) { return this.service.generateBill(user, dto); }
  @Post('bulk-generate') @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  bulk(@GetUser() user: AuthenticatedUser, @Body() body: BulkBillsDto) { return this.service.generateBulkBills(user, body.month, body.year); }
  @Get() @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId?: string, @Query('month') month?: string, @Query('year') year?: string, @Query('isPaid') isPaid?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      customerId, search,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      isPaid: isPaid === 'true' ? true : isPaid === 'false' ? false : undefined,
    });
  }
  @Get(':id') @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/payments') @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: BillPaymentDto) { return this.service.recordPayment(user, scope, id, dto); }
  @Post(':id/mark-sent') @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  markSent(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markSent(user, id); }
  @Post(':id/mark-printed') @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  markPrinted(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markSent(user, id, true); }
}
