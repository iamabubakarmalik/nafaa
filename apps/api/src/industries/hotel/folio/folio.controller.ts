import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FolioService } from './folio.service';

@ApiTags('Hotel - Folio Charges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/folio')
export class FolioController {
  constructor(private readonly service: FolioService) {}

  @Post() addCharge(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.addCharge(user, dto); }
  @Get('by-booking/:bookingId') byBooking(@GetUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) { return this.service.byBooking(user, bookingId); }
  @Post(':id/void') voidCharge(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.voidCharge(user, id, body.reason); }
}
