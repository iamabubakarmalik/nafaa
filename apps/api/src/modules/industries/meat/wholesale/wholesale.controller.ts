import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { WholesaleService } from './wholesale.service';

@ApiTags('Meat - Wholesale Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/wholesale')
export class WholesaleController {
  constructor(private readonly service: WholesaleService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, { active: active === 'true' ? true : active === 'false' ? false : undefined, search });
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/purchase') purchase(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.recordPurchase(user, id, body.amount); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.recordPayment(user, id, body.amount); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
