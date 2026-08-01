import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CustomOrdersService } from './custom-orders.service';
import { CreateCustomOrderDto, RecordPaymentDto, UpdateOrderStatusDto, UpdateProgressDto } from './dto/create-custom-order.dto';

@ApiTags('Furniture - Custom Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/custom-orders')
export class CustomOrdersController {
  constructor(private readonly service: CustomOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCustomOrderDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('carpenterId') carpenterId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, customerId, carpenterId, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('overdue') overdue(@GetUser() user: AuthenticatedUser) { return this.service.overdue(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/approve') approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { finalPrice?: number }) {
    return this.service.approve(user, id, body.finalPrice);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.service.recordPayment(user, id, dto);
  }
  @Post(':id/assign-carpenter') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { carpenterId: string; workshopLocation?: string }) {
    return this.service.assignCarpenter(user, id, body.carpenterId, body.workshopLocation);
  }
  @Post(':id/progress') progress(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateProgressDto) {
    return this.service.updateProgress(user, id, dto);
  }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
