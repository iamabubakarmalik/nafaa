import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkOrdersService } from './bulk-orders.service';

@ApiTags('Agri - Bulk Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/bulk-orders')
export class BulkOrdersController {
  constructor(private readonly service: BulkOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, farmerId: q.farmerId, season: q.season, from: q.from, to: q.to, search: q.search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancellationReason?: string }) {
    return this.service.updateStatus(user, id, body.status, body.cancellationReason);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.addPayment(user, id, body.amount);
  }
}
