import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AmcService } from './amc.service';

@ApiTags('Service Business - AMC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/amc')
export class AmcController {
  constructor(private readonly service: AmcService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('type') type?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, type, search });
  }
  @Get('renewal-due') renewalDue(@GetUser() user: AuthenticatedUser, @Query('daysAhead') daysAhead?: string) {
    return this.service.renewalDue(user, daysAhead ? Number(daysAhead) : 30);
  }
  @Post('expire-old') expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/visits/schedule') schedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.scheduleVisit(user, id, dto); }
  @Post(':id/visits/:visitId/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('visitId') visitId: string, @Body() dto: any) { return this.service.completeVisit(user, id, visitId, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string; refundAmount?: number }) { return this.service.cancel(user, id, body.reason, body.refundAmount); }
}
