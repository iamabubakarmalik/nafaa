import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkPricingService } from './bulk-pricing.service';
import { UpsertBulkPricingDto } from './dto/upsert-bulk-pricing.dto';

@ApiTags('Hardware - Bulk Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/bulk-pricing')
export class BulkPricingController {
  constructor(private readonly service: BulkPricingService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBulkPricingDto) { return this.service.create(user, dto); }
  @Get('by-product/:productId') listByProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.listByProduct(user, productId); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertBulkPricingDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
  @Get('calculate') calculate(@GetUser() user: AuthenticatedUser, @Query('productId') productId: string, @Query('quantity') quantity: string) {
    return this.service.calculatePrice(user, productId, Number(quantity));
  }
}
