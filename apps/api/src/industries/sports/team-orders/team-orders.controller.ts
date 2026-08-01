import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TeamOrdersService } from './team-orders.service';
import { CreateTeamOrderDto, RecordPaymentDto, UpdateTeamOrderStatusDto } from './dto/create-team-order.dto';

@ApiTags('Sports - Team Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sports/team-orders')
export class TeamOrdersController {
  constructor(private readonly service: TeamOrdersService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTeamOrderDto) {
    return this.service.create(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('hasCustomJerseys') hasCustom?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      status, from, to, search,
      hasCustomJerseys: hasCustom === 'true' ? true : hasCustom === 'false' ? false : undefined,
    });
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get('upcoming-deliveries')
  upcoming(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.upcomingDeliveries(user, days ? Number(days) : 14);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<CreateTeamOrderDto>) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTeamOrderStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Post(':id/payment')
  payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.service.recordPayment(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
