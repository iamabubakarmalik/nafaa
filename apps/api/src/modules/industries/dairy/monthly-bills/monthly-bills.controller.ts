import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MonthlyBillsService } from './monthly-bills.service';

@ApiTags('Dairy - Monthly Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/monthly-bills')
export class MonthlyBillsController {
  constructor(private readonly service: MonthlyBillsService) {}

  @Post() generate(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.generateBill(user, dto); }
  @Post('bulk-generate') bulk(@GetUser() user: AuthenticatedUser, @Body() body: { month: number; year: number }) { return this.service.generateBulkBills(user, body.month, body.year); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId?: string, @Query('month') month?: string, @Query('year') year?: string, @Query('isPaid') isPaid?: string) {
    return this.service.list(user, {
      customerId,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      isPaid: isPaid === 'true' ? true : isPaid === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/payments') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.recordPayment(user, id, dto); }
  @Post(':id/mark-sent') markSent(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markSent(user, id); }
}
