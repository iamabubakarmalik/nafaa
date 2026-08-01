import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeExchangesService } from './exchanges.service';
import { CreateExchangeDto, UpdateExchangeStatusDto } from './dto/create-exchange.dto';

@ApiTags('Shoe - Exchanges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/exchanges')
export class ShoeExchangesController {
  constructor(private readonly service: ShoeExchangesService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateExchangeDto) { return this.service.create(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('reasonCategory') reasonCategory?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) { return this.service.list(u, { status, reasonCategory, from, to, search }); }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get('by-reason-category') byReason(@GetUser() u: AuthenticatedUser) { return this.service.byReasonCategory(u); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id/status') status(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateExchangeStatusDto) {
    return this.service.updateStatus(u, id, dto);
  }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
