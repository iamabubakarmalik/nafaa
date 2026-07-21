import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MeasurementsService } from './measurements.service';

@ApiTags('Gym - Body Measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/measurements')
export class MeasurementsController {
  constructor(private readonly service: MeasurementsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get('by-member/:memberId') list(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.list(user, memberId); }
  @Get('progress/:memberId') progress(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.progress(user, memberId); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
