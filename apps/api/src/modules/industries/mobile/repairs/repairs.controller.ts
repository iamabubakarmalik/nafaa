import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateRepairTicketDto } from './dto/create-repair-ticket.dto';
import { UpdateRepairTicketDto } from './dto/update-repair-ticket.dto';
import { DiagnoseDto } from './dto/diagnose.dto';
import { AddPartDto } from './dto/add-part.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { QueryRepairsDto } from './dto/query-repairs.dto';
import { RepairsService } from './repairs.service';

@ApiTags('Repair Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('repair-tickets')
export class RepairsController {
  constructor(private readonly service: RepairsService) {}

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryRepairsDto) {
    return this.service.findAll(user, query);
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateRepairTicketDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRepairTicketDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/diagnose')
  diagnose(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DiagnoseDto,
  ) {
    return this.service.diagnose(user, id, dto);
  }

  @Post(':id/parts')
  addPart(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddPartDto,
  ) {
    return this.service.addPart(user, id, dto);
  }

  @Delete(':id/parts/:partId')
  removePart(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('partId') partId: string,
  ) {
    return this.service.removePart(user, id, partId);
  }

  @Patch(':id/status')
  updateStatus(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }

  @Post(':id/payments')
  addPayment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.service.addPayment(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
