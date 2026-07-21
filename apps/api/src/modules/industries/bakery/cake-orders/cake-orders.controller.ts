import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CakeOrdersService } from './cake-orders.service';
import { CreateCakeOrderDto, UpdateCakeOrderStatusDto } from './dto/create-cake-order.dto';

@ApiTags('Bakery - Cake Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/cake-orders')
export class CakeOrdersController {
  constructor(private readonly service: CakeOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCakeOrderDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('occasion') occasion?: string, @Query('deliveryType') deliveryType?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string, @Query('customerId') customerId?: string) {
    return this.service.list(user, { status, occasion, deliveryType, from, to, search, customerId });
  }
  @Get('upcoming') upcoming(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) { return this.service.upcoming(user, days ? Number(days) : 7); }
  @Get('calendar') calendar(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) { return this.service.calendar(user, from, to); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCakeOrderStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.addPayment(user, id, body.amount); }
  @Post(':id/assign') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { bakerId: string; decoratorId?: string }) { return this.service.assignBaker(user, id, body.bakerId, body.decoratorId); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string; photoUrls?: string[] }) { return this.service.addRating(user, id, body.rating, body.feedback, body.photoUrls); }
}
