import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FolioChargeDto, ReasonDto } from '../common/hotel.dto';
import { FolioService } from './folio.service';

/** Charges on a stay are booking work: view to read, manage to post or remove. */
@ApiTags('Hotel - Folio Charges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/folio')
export class FolioController {
  constructor(private readonly service: FolioService) {}

  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post() addCharge(@GetUser() user: AuthenticatedUser, @Body() dto: FolioChargeDto) { return this.service.addCharge(user, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
  @Get('by-booking/:bookingId') byBooking(@GetUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) { return this.service.byBooking(user, bookingId); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post(':id/void') voidCharge(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonDto) { return this.service.voidCharge(user, id, body.reason); }
}
