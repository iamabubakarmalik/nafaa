import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { LedgerService } from './ledger.service';

@ApiTags('Agri - Farmer Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/ledger')
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Post() addEntry(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.addEntry(user, dto); }
  @Get('by-farmer/:farmerId') byFarmer(@GetUser() user: AuthenticatedUser, @Param('farmerId') farmerId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.byFarmer(user, farmerId, { from, to });
  }
  @Get('summary/:farmerId') summary(@GetUser() user: AuthenticatedUser, @Param('farmerId') farmerId: string) { return this.service.summary(user, farmerId); }
}
