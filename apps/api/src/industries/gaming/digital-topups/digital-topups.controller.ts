import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DigitalTopupsService } from './digital-topups.service';
import { BulkCreateTopupDto, CreateTopupDto, SellTopupDto } from './dto/create-topup.dto';

@ApiTags('Gaming - Digital Topups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/digital-topups')
export class DigitalTopupsController {
  constructor(private readonly service: DigitalTopupsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTopupDto) { return this.service.create(user, dto); }
  @Post('bulk') bulk(@GetUser() user: AuthenticatedUser, @Body() dto: BulkCreateTopupDto) { return this.service.bulkCreate(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('provider') provider?: string, @Query('redeemed') redeemed?: string, @Query('available') available?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      provider, search,
      redeemed: redeemed === 'true' ? true : redeemed === 'false' ? false : undefined,
      available: available === 'true',
    });
  }
  @Get('inventory') inventory(@GetUser() user: AuthenticatedUser) { return this.service.availableInventory(user); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('reveal') reveal?: string) { return this.service.getOne(user, id, reveal === 'true'); }
  @Post(':id/sell') sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SellTopupDto) { return this.service.sell(user, id, dto); }
  @Post(':id/redeem') redeem(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markRedeemed(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
