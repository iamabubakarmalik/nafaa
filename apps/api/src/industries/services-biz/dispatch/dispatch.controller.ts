import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DispatchService } from './dispatch.service';

@ApiTags('Service Business - Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/dispatch')
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  @Get('suggest/:jobId') suggest(@GetUser() user: AuthenticatedUser, @Param('jobId') jobId: string) { return this.service.suggestTechnicians(user, jobId); }
  @Get('live-map') liveMap(@GetUser() user: AuthenticatedUser) { return this.service.liveMap(user); }
}
