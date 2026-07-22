import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FarmerSuppliesService } from './farmer-supplies.service';
import { CreateSupplyDto } from './dto/create-supply.dto';

@ApiTags('Dairy - Farmer Supplies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/farmer-supplies')
export class FarmerSuppliesController {
  constructor(private readonly service: FarmerSuppliesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateSupplyDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('farmerId') farmerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('slot') slot?: string, @Query('quality') quality?: string) {
    return this.service.list(user, { farmerId, from, to, slot, quality });
  }
  @Get('daily-summary') dailySummary(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) { return this.service.dailySummary(user, date); }
  @Get('by-farmer/:farmerId') byFarmer(@GetUser() user: AuthenticatedUser, @Param('farmerId') farmerId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.byFarmer(user, farmerId, { from, to });
  }
  @Post(':id/mark-paid') markPaid(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markPaid(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
