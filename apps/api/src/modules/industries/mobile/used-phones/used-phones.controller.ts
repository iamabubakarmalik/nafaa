import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateUsedPhoneDto } from './dto/create-used-phone.dto';
import { UpdateUsedPhoneDto } from './dto/update-used-phone.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryUsedPhonesDto } from './dto/query-used-phones.dto';
import { UsedPhonesService } from './used-phones.service';

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

  @Post('estimate')
  estimate(
    @Body() body: {
      referencePrice: number;
      condition: any;
      modelYear?: number;
      hasOriginalBox?: boolean;
      hasOriginalCharger?: boolean;
      hasOriginalReceipt?: boolean;
      hasWarrantyLeft?: boolean;
      batteryHealth?: number;
    },
  ) {
    return this.service.estimateValuation(body);
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

  @Patch(':id/mark-sold')
  markSold(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { finalPrice: number; saleId?: string },
  ) {
    return this.service.markSold(user, id, body.finalPrice, body.saleId);
  }

  @Patch(':id/discard')
  discard(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.markDiscarded(user, id, body.reason);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
