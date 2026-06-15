import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';

@ApiTags('Industry: Pharmacy - Batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('industries/pharmacy/batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Get('expiring-soon')
  expiringSoon(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.expiringSoon(user, days ? Number(days) : 30);
  }

  @Get('expired')
  expired(@GetUser() user: AuthenticatedUser) {
    return this.service.expired(user);
  }

  @Get('product/:productId')
  listByProduct(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.service.listByProduct(user, productId);
  }

  @Get('product/:productId/available')
  available(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.service.available(user, productId, variantId);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateBatchDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateBatchDto>,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
