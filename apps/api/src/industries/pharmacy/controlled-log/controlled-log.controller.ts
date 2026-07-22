import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ControlledLogService } from './controlled-log.service';

@ApiTags('Pharmacy - Controlled Substances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/controlled-log')
export class ControlledLogController {
  constructor(private readonly service: ControlledLogService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string, @Query('logType') logType?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { productId, logType, from, to });
  }
  @Get('register/:productId') register(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.register(user, productId, { from, to });
  }
}
