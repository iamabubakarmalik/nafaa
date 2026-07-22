import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AlterationsService } from './alterations.service';
import { CreateAlterationDto } from './dto/create-alteration.dto';

@ApiTags('Garments - Alterations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/alterations')
export class AlterationsController {
  constructor(private readonly service: AlterationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateAlterationDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('customerId') customerId?: string, @Query('tailorId') tailorId?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, customerId, tailorId, search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; afterImageUrls?: string[] }) { return this.service.updateStatus(user, id, body.status, body.afterImageUrls); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.recordPayment(user, id, body.amount); }
}
