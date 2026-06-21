import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { EmiService } from './emi.service';
import { CreateEmiPlanDto } from './dto/create-emi-plan.dto';
import { UpdateEmiPlanDto } from './dto/update-emi-plan.dto';
import { RecordInstallmentPaymentDto } from './dto/record-installment-payment.dto';
import { QueryEmiPlansDto } from './dto/query-emi.dto';

@ApiTags('EMI / Installments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emi-plans')
export class EmiController {
  constructor(private readonly service: EmiService) {}

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query() query: QueryEmiPlansDto,
  ) {
    return this.service.findAll(user, query);
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Post('update-overdue-flags')
  updateOverdueFlags(@GetUser() user: AuthenticatedUser) {
    return this.service.updateOverdueFlags(user);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateEmiPlanDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmiPlanDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/installments/:installmentId/pay')
  recordPayment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: RecordInstallmentPaymentDto,
  ) {
    return this.service.recordInstallmentPayment(user, id, installmentId, dto);
  }

  @Patch(':id/installments/:installmentId/waive')
  waiveInstallment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.waiveInstallment(user, id, installmentId, body?.reason);
  }

  @Patch(':id/default')
  markDefaulted(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.markDefaulted(user, id, body?.reason);
  }

  @Patch(':id/cancel')
  cancel(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.cancel(user, id, body?.reason);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
