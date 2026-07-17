import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MetalRatesService } from './metal-rates.service';
import { UpsertMetalRateDto } from './dto/upsert-metal-rate.dto';

@ApiTags('Jewelry - Metal Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/metal-rates')
export class MetalRatesController {
  constructor(private readonly service: MetalRatesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMetalRateDto) { return this.service.create(user, dto); }
  @Get('current') current(@GetUser() user: AuthenticatedUser) { return this.service.currentRates(user); }
  @Get('history') history(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.history(user, { metalType: q.metalType, purity: q.purity, from: q.from, to: q.to, limit: q.limit ? Number(q.limit) : undefined });
  }
  @Get('current/:metalType/:purity') getCurrent(@GetUser() user: AuthenticatedUser, @Param('metalType') metalType: string, @Param('purity') purity: string) {
    return this.service.getCurrentRate(user, metalType, purity);
  }
  @Get('movement/:metalType/:purity') movement(@GetUser() user: AuthenticatedUser, @Param('metalType') metalType: string, @Param('purity') purity: string, @Query('days') days?: string) {
    return this.service.priceMovement(user, metalType, purity, days ? Number(days) : 30);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
