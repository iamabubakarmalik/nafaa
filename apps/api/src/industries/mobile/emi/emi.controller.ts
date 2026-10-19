import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { EmiService } from './emi.service';
import { CreateEmiPlanDto } from './dto/create-emi-plan.dto';
import { UpdateEmiPlanDto } from './dto/update-emi-plan.dto';
import { CollectEmiPaymentDto, RecordInstallmentPaymentDto } from './dto/record-installment-payment.dto';
import { QueryEmiPlansDto } from './dto/query-emi.dto';

class ReasonDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

/*
 * An installment plan splits a credit bill on the customer's khata, so it
 * follows the khata rights: reading needs khata.view, taking or forgiving
 * money and changing plans needs khata.manage.
 */
@ApiTags('EMI / Installments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.KHATA_VIEW)
@Controller('emi-plans')
export class EmiController {
  constructor(private readonly service: EmiService) {}

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryEmiPlansDto) {
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
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateEmiPlanDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEmiPlanDto) {
    return this.service.update(user, id, dto);
  }

  /** Any amount the customer brings, oldest installment first. */
  @Post(':id/collect')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  collect(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CollectEmiPaymentDto,
    @CurrentShop() shop: ShopScope,
  ) {
    return this.service.collect(user, id, dto, shop);
  }

  @Post(':id/installments/:installmentId/pay')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  recordPayment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: RecordInstallmentPaymentDto,
    @CurrentShop() shop: ShopScope,
  ) {
    return this.service.recordInstallmentPayment(user, id, installmentId, dto, shop);
  }

  @Patch(':id/installments/:installmentId/waive')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  waiveInstallment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() body: ReasonDto,
  ) {
    return this.service.waiveInstallment(user, id, installmentId, body?.reason);
  }

  @Patch(':id/default')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  markDefaulted(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonDto) {
    return this.service.markDefaulted(user, id, body?.reason);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonDto) {
    return this.service.cancel(user, id, body?.reason);
  }

  /** Cancels the plan; history stays. */
  @Delete(':id')
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
