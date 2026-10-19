import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaymentMethod, UsedPhoneCondition } from '@prisma/client';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MONEY_METHODS } from '../../../common/helpers/sale-payments.helper';
import { CreateUsedPhoneDto } from './dto/create-used-phone.dto';
import { UpdateUsedPhoneDto } from './dto/update-used-phone.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryUsedPhonesDto } from './dto/query-used-phones.dto';
import { UsedPhonesService } from './used-phones.service';

class EstimateDto {
  @IsNumber() @Min(0) referencePrice!: number;
  @IsEnum(UsedPhoneCondition) condition!: UsedPhoneCondition;
  @IsOptional() @IsInt() @Min(1990) @Max(2100) modelYear?: number;
  @IsOptional() @IsBoolean() hasOriginalBox?: boolean;
  @IsOptional() @IsBoolean() hasOriginalCharger?: boolean;
  @IsOptional() @IsBoolean() hasOriginalReceipt?: boolean;
  @IsOptional() @IsBoolean() hasWarrantyLeft?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(100) batteryHealth?: number;
}

class MarkSoldDto {
  @IsNumber() @Min(0) finalPrice!: number;
  @IsOptional() @IsString() saleId?: string;
  @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() customerId?: string;
}

class ReasonDto {
  @IsOptional() @IsString() reason?: string;
}

@ApiTags('Used Phones (Trade-In)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('used-phones')
export class UsedPhonesController {
  constructor(private readonly service: UsedPhonesService) {}

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryUsedPhonesDto) {
    return this.service.findAll(user, query);
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  /** Exchange phones not yet used as a trade-in on a bill, for the POS payment step. */
  @Get('trade-ins/open')
  @RequirePermissions(PERMISSIONS.POS_USE)
  openTradeIns(@GetUser() user: AuthenticatedUser) {
    return this.service.openTradeIns(user);
  }

  /** Suggested buy-back price; reads nothing and writes nothing. */
  @Post('estimate')
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_VIEW)
  estimate(@Body() body: EstimateDto) {
    return this.service.estimateValuation(body);
  }

  /** One phone with its drawer payment, trade-in bill and resale bill. */
  @Get(':id/detail')
  detail(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.detail(user, id);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateUsedPhoneDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUsedPhoneDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/inspection')
  addInspection(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateInspectionDto,
  ) {
    return this.service.addInspection(user, id, dto);
  }

  @Patch(':id/mark-in-stock')
  markInStock(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markInStock(user, id);
  }

  /** Sells through a real bill, so it also needs the counter right. */
  @Patch(':id/mark-sold')
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_MANAGE, PERMISSIONS.POS_USE)
  markSold(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: MarkSoldDto,
  ) {
    return this.service.markSold(user, scope, id, body);
  }

  @Patch(':id/discard')
  discard(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReasonDto,
  ) {
    return this.service.markDiscarded(user, id, body?.reason);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
