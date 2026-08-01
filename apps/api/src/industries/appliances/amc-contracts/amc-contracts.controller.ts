import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AmcContractsService } from './amc-contracts.service';
import { RenewAmcDto, UpdateAmcStatusDto, UpsertAmcDto } from './dto/upsert-amc.dto';

@ApiTags('Appliances - AMC Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/amc-contracts')
export class AmcContractsController {
  constructor(private readonly service: AmcContractsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertAmcDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('amcType') amcType?: string, @Query('customerId') customerId?: string, @Query('expiringSoon') e?: string, @Query('expired') ex?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      status, amcType, customerId, search,
      expiringSoon: e === 'true',
      expired: ex === 'true',
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('expiring-soon') expiring(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) { return this.service.expiringSoon(user, days ? Number(days) : 30); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertAmcDto) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAmcStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/renew') renew(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RenewAmcDto) { return this.service.renew(user, id, dto); }
  @Post(':id/send-reminder') reminder(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.sendReminder(user, id); }
}
