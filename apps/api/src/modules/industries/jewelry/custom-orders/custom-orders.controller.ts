import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CustomOrdersService } from './custom-orders.service';

@ApiTags('Jewelry - Custom Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/custom-orders')
export class CustomOrdersController {
  constructor(private readonly service: CustomOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, customerId: q.customerId, karigarId: q.karigarId, from: q.from, to: q.to, search: q.search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.service.updateStatus(user, id, body.status, body.reason);
  }
  @Post(':id/issue-metal') issueMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { grams: number }) {
    return this.service.issueMetal(user, id, body.grams);
  }
  @Post(':id/receive-metal') receiveMetal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { receivedGrams: number; wastageGrams: number }) {
    return this.service.receiveMetal(user, id, body.receivedGrams, body.wastageGrams);
  }
  @Post(':id/approve-design') approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { designUrl: string }) {
    return this.service.approveDesign(user, id, body.designUrl);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.addPayment(user, id, body.amount);
  }
  @Post(':id/rate') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) {
    return this.service.rate(user, id, body.rating, body.feedback);
  }
}
