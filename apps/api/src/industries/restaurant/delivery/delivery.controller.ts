import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DeliveryService } from './delivery.service';

@ApiTags('Restaurant - Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Post('assign/:orderId') assign(@GetUser() user: AuthenticatedUser, @Param('orderId') orderId: string,
    @Body() body: { riderId: string; estimatedMinutes?: number; distanceKm?: number; deliveryFee?: number; riderCommission?: number }) {
    return this.service.assign(user, orderId, body.riderId, body);
  }

  @Post(':orderId/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('orderId') orderId: string,
    @Body() body: { status: string; customerRating?: number; feedback?: string; proofPhotoUrl?: string; failureReason?: string }) {
    return this.service.updateStatus(user, orderId, body.status, body);
  }

  @Get('active') listActive(@GetUser() user: AuthenticatedUser) { return this.service.listActive(user); }
}
