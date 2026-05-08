import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty Points')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('leaderboard')
  leaderboard(@GetUser() user: AuthenticatedUser) {
    return this.service.leaderboard(user);
  }

  @Get('customer/:customerId')
  history(
    @GetUser() user: AuthenticatedUser,
    @Param('customerId') customerId: string,
  ) {
    return this.service.customerHistory(user, customerId);
  }
}
