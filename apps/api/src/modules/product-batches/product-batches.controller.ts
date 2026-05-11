import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ProductBatchesService } from './product-batches.service';
import { UpsertBatchDto } from './dto/upsert-batch.dto';

@ApiTags('Product Batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProductBatchesController {
  constructor(private readonly service: ProductBatchesService) {}

  @Get('product-batches/expiring-soon')
  expiringSoon(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.expiringSoon(user, days ? Number(days) : 30);
  }

  @Get('product-batches/expired')
  expired(@GetUser() user: AuthenticatedUser) {
    return this.service.expired(user);
  }

  @Get('products/:productId/batches')
  list(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.list(user, productId);
  }

  @Post('products/:productId/batches')
  create(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: UpsertBatchDto,
  ) {
    return this.service.create(user, productId, dto);
  }

  @Patch('products/:productId/batches/:id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() dto: UpsertBatchDto,
  ) {
    return this.service.update(user, productId, id, dto);
  }

  @Delete('products/:productId/batches/:id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(user, productId, id);
  }
}
