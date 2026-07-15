import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { KotService } from './kot.service';
import { CreateKotDto } from './dto/create-kot.dto';

@ApiTags('Restaurant - KOT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/kot')
export class KotController {
  constructor(private readonly service: KotService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateKotDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('station') station?: string, @Query('orderId') orderId?: string) {
    return this.service.list(user, { status, station, orderId });
  }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(user, id, body.status);
  }
}
