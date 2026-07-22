import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { QurbaniService } from './qurbani.service';

@ApiTags('Meat - Qurbani / Aqeeqa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/qurbani')
export class QurbaniController {
  constructor(private readonly service: QurbaniService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('occasion') occasion?: string, @Query('animalType') animalType?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, occasion, animalType, search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.addPayment(user, id, body.amount); }
  @Post(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; reason?: string }) { return this.service.updateStatus(user, id, body.status, body.reason); }
}
