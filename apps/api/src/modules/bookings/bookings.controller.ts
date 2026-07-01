import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AddBookingPaymentDto } from './dto/add-payment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ConvertBookingDto } from './dto/convert-booking.dto';

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

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('shopId') shopId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
  ) {
    return this.bookingsService.findAll(user, { status, shopId, customerId, search });
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) {
    return this.bookingsService.summary(user, shopId);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.findOne(user, id);
  }

  @Post(':id/payment')
  addPayment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddBookingPaymentDto,
  ) {
    return this.bookingsService.addPayment(user, id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(user, id, dto);
  }

  @Post(':id/convert')
  convert(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConvertBookingDto,
  ) {
    return this.bookingsService.convertToSale(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.remove(user, id);
  }
}
