import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { MoneyService } from './money.service';

@ApiTags('Dukaan ka Hisab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/money')
export class MoneyController {
  constructor(private readonly service: MoneyService) {}

  /** Abhi ka haal — cash, maal, lena, dena, aur "kharch karne layak" */
  @Get('position')
  @ApiOperation({ summary: 'Abhi kitna paisa kahan hai' })
  position(@GetUser() user: AuthenticatedUser) {
    return this.service.position(user);
  }

  /** Chune hue arse me paisa kahan se aaya aur kahan gaya */
  @Get('flow')
  @ApiOperation({ summary: 'Paisa kahan se aaya, kahan gaya' })
  flow(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.flow(user, from, to);
  }

  /** Mahina ba mahina rujhan */
  @Get('trend')
  @ApiOperation({ summary: 'Mahina ba mahina' })
  trend(@GetUser() user: AuthenticatedUser, @Query('months') months?: string) {
    return this.service.trend(user, months ? Number(months) : 12);
  }

  /** Rozana */
  @Get('daily')
  @ApiOperation({ summary: 'Rozana' })
  daily(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.daily(user, from, to);
  }
}
