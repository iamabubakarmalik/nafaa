import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ReservationsService } from './reservations.service';

@ApiTags('Garments - Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('productId') productId?: string) { return this.service.list(user, { status, customerId, productId }); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body.reason); }
  @Post(':id/convert') convert(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { saleId: string }) { return this.service.convert(user, id, body.saleId); }
  @Post('expire-old') expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }
}
