import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { EmergencyDeliveryService } from './emergency-delivery.service';

@ApiTags('Marketplace / Emergency Delivery')
@Controller('marketplace/emergency-delivery')
export class EmergencyDeliveryController {
  constructor(private readonly svc: EmergencyDeliveryService) {}

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Post('request')
  request(@GetCustomer() c: AuthenticatedCustomer, @Body() body: { orderId: string }) {
    return this.svc.request(c.id, body.orderId);
  }

  @Post(':orderId/delivered')
  delivered(@Param('orderId') orderId: string) { return this.svc.markDelivered(orderId); }

  @Get() list(@Query('status') status?: any, @Query('limit') l?: string) { return this.svc.list(status, +(l ?? 50)); }
}
