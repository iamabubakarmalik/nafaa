import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceSerialService } from './serial-tracking.service';
import { UpsertApplianceSerialDto } from './dto/upsert-serial.dto';

@ApiTags('Appliances - Serial Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/serial-tracking')
export class ApplianceSerialController {
  constructor(private readonly service: ApplianceSerialService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertApplianceSerialDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string, @Query('status') status?: string, @Query('installationStatus') installationStatus?: string, @Query('search') search?: string) {
    return this.service.list(user, { productId, status, installationStatus, search });
  }
  @Get('lookup/:code') lookup(@GetUser() user: AuthenticatedUser, @Param('code') code: string) { return this.service.lookupBySerial(user, code); }
  @Get('warranty-check/:code') warranty(@GetUser() user: AuthenticatedUser, @Param('code') code: string) { return this.service.warrantyCheck(user, code); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertApplianceSerialDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
