import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ImeiStatus } from '@prisma/client';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ImeiService } from './imei.service';
import { CreateImeiDto } from './dto/create-imei.dto';
import { BulkCreateImeiDto } from './dto/bulk-create-imei.dto';

@ApiTags('Industry: Mobile - IMEI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('industries/mobile/imei')
export class ImeiController {
  constructor(private readonly service: ImeiService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Get('search')
  search(@GetUser() user: AuthenticatedUser, @Query('q') q: string) {
    return this.service.search(user, q || '');
  }

  @Get('product/:productId')
  listByProduct(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('status') status?: ImeiStatus,
  ) {
    return this.service.listByProduct(user, productId, status);
  }

  @Get('product/:productId/available')
  available(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.service.availableForSale(user, productId, variantId);
  }

  @Get('variant/:variantId')
  listByVariant(
    @GetUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Query('status') status?: ImeiStatus,
  ) {
    return this.service.listByVariant(user, variantId, status);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateImeiDto) {
    return this.service.create(user, dto);
  }

  @Post('bulk')
  bulkCreate(@GetUser() user: AuthenticatedUser, @Body() dto: BulkCreateImeiDto) {
    return this.service.bulkCreate(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateImeiDto>,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
