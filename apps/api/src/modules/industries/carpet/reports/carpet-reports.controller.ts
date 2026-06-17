import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CarpetReportsService } from './carpet-reports.service';

@ApiTags('Carpet Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-reports')
export class CarpetReportsController {
  constructor(private readonly service: CarpetReportsService) {}

  @Get('overview')
  overview(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.overview(user, shopId);
  }

  @Get('roll-profit')
  rollProfit(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.rollProfitReport(user, shopId);
  }

  @Get('slow-moving')
  slowMoving(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.slowMovingRolls(user, days ? Number(days) : 30, shopId);
  }

  @Get('todays-cuts')
  todaysCuts(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.todaysCuts(user, shopId);
  }

  @Get('top-designs')
  topDesigns(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.topSellingDesigns(
      user,
      days ? Number(days) : 30,
      shopId,
    );
  }

  @Get('cut-pieces')
  cutPiecesReport(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.cutPiecesReport(user, shopId);
  }
}
