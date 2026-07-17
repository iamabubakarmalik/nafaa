import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { FarmersService } from './farmers.service';

@ApiTags('Agri - Farmers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/farmers')
export class FarmersController {
  constructor(private readonly service: FarmersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('district') district?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, district, search });
  }
  @Get('overdue') overdue(@GetUser() user: AuthenticatedUser) { return this.service.overdueList(user); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/suspend') suspend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.suspend(user, id, body.reason); }
  @Post(':id/reactivate') reactivate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.reactivate(user, id); }
  @Post(':id/purchase') purchase(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.recordPurchase(user, id, body.amount); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.recordPayment(user, id, body.amount); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
