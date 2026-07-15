import {
  Body, Controller, Get, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { DamageService } from './damage.service';
import { CreateDamageDto } from './dto/create-damage.dto';
import { ApproveDamageDto, RejectDamageDto } from './dto/approve-damage.dto';

@ApiTags('Retail - Damage Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/damage')
export class DamageController {
  constructor(private readonly service: DamageService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateDamageDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('shopId') shopId?: string,
    @Query('reasonCode') reasonCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(user, { status, shopId, reasonCode, from, to });
  }

  @Get('summary')
  summary(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.summary(user, { from, to });
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post(':id/approve')
  approve(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveDamageDto,
  ) {
    return this.service.approve(user, id, dto.notes);
  }

  @Post(':id/reject')
  reject(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectDamageDto,
  ) {
    return this.service.reject(user, id, dto.reason);
  }
}
