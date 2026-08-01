import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RepairServicesService } from './repair-services.service';
import { CreateRepairServiceDto, UpdateRepairStatusDto } from './dto/create-repair.dto';

@ApiTags('Sports - Repair Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sports/repair-services')
export class RepairServicesController {
  constructor(private readonly service: RepairServicesService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateRepairServiceDto) {
    return this.service.create(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('itemType') itemType?: string,
    @Query('repairType') repairType?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, itemType, repairType, customerId, from, to, search });
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get('overdue')
  overdue(@GetUser() user: AuthenticatedUser) {
    return this.service.overdueRepairs(user);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id/status')
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRepairStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Post(':id/payment')
  payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.recordPayment(user, id, body.amount);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
