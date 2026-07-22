import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SubsidyService } from './subsidy.service';

@ApiTags('Agri - Subsidy Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/subsidy')
export class SubsidyController {
  constructor(private readonly service: SubsidyService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, farmerId: q.farmerId, schemeName: q.schemeName, search: q.search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/approve') approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { approvedBy?: string }) { return this.service.approve(user, id, body.approvedBy); }
  @Post(':id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.reject(user, id, body.reason); }
  @Post(':id/disburse') disburse(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markDisbursed(user, id); }
}
