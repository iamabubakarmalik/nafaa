import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { WarrantyService } from './warranty.service';

@ApiTags('Service Business - Warranty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/warranty')
export class WarrantyController {
  constructor(private readonly service: WarrantyService) {}

  @Post('claims') create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createClaim(user, dto); }
  @Get('claims') list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('search') search?: string) {
    return this.service.listClaims(user, { status, customerId, search });
  }
  @Get('claims/:id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getClaim(user, id); }
  @Post('claims/:id/approve') approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { resolutionType: string; notes?: string }) { return this.service.approve(user, id, body.resolutionType, body.notes); }
  @Post('claims/:id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.reject(user, id, body.reason); }
  @Post('claims/:id/create-job') createJob(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.createServiceJob(user, id); }
}
