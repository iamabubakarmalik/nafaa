import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AddBookingPaymentDto } from './dto/add-payment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ConvertBookingDto } from './dto/convert-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { MarkReadyDto, UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user, dto);
  }

  /** Older list: latest 100 as a plain array. */
  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('status') status?: string,
    @Query('shopId') shopId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
  ) {
    return this.bookingsService.findAll(user, shop, { status, shopId, customerId, search });
  }

  /** Paged record with filters and money totals. Before `:id`. */
  @Get('records')
  records(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListBookingsDto) {
    return this.bookingsService.records(user, shop, q);
  }

  /** KPI numbers for the list page. */
  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListBookingsDto) {
    return this.bookingsService.overview(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListBookingsDto) {
    return this.bookingsService.analytics(user, shop, q);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string) {
    return this.bookingsService.summary(user, shop, shopId);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.findOne(user, id);
  }

  /** Reschedule pickup / deadline or edit notes. */
  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(user, id, dto);
  }

  @Post(':id/ready')
  markReady(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MarkReadyDto) {
    return this.bookingsService.markReady(user, id, dto.ready);
  }

  @Post(':id/payment')
  addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddBookingPaymentDto) {
    return this.bookingsService.addPayment(user, id, dto);
  }

  @Post(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(user, id, dto);
  }

  @Post(':id/convert')
  convert(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConvertBookingDto) {
    return this.bookingsService.convertToSale(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.remove(user, id);
  }
}
