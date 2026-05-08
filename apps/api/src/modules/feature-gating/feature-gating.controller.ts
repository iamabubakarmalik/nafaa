import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGatingService } from './feature-gating.service';

@ApiTags('Plan Usage')
@ApiBearerAuth()
@Controller('plan-usage')
export class FeatureGatingController {
  constructor(private readonly service: FeatureGatingService) {}

  @Get()
  myUsage(@GetUser() user: AuthenticatedUser) {
    return this.service.getUsage(user);
  }
}
