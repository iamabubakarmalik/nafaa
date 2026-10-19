import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { AppointmentsService } from './appointments.service';
import {
  AddPaymentDto, AppointmentPageQuery, CheckoutAppointmentDto, CreateAppointmentDto, RatingDto, RescheduleDto, UpdateAppointmentStatusDto,
} from './dto/create-appointment.dto';

@ApiTags('Salon - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateAppointmentDto) {
    return this.service.create(user, dto, shop.shopId);
  }
  @Get() list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('staffProfileId') staffProfileId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string,
    @Query('saleId') saleId?: string, @Query('saleIds') saleIds?: string,
  ) {
    return this.service.list(user, { status, customerId, staffProfileId, from, to, search, saleId, saleIds });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AppointmentPageQuery) {
    return this.service.page(user, shop, q);
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, shop, { from, to });
  }
  @Get('calendar') calendar(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string, @Query('staffProfileId') staffProfileId?: string) {
    return this.service.calendar(user, { from, to, staffProfileId });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.service.updateStatus(user, shop, id, dto);
  }
  @Post(':id/reschedule') reschedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RescheduleDto) { return this.service.reschedule(user, id, dto); }
  @Post(':id/checkout') checkout(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: CheckoutAppointmentDto) {
    return this.service.checkout(user, shop, id, dto);
  }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RatingDto) { return this.service.submitRating(user, id, body.rating, body.feedback); }
}
