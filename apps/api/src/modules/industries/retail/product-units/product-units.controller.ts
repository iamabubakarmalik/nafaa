import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';
import { ProductUnitsService } from './product-units.service';

@ApiTags('Retail - Product Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/product-units')
export class ProductUnitsController {
  constructor(private readonly service: ProductUnitsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateProductUnitDto) {
    return this.service.create(user, dto);
  }

  @Get('by-product/:productId')
  findByProduct(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.service.findByProduct(user, productId, variantId);
  }

  @Get('by-barcode/:barcode')
  findByBarcode(@GetUser() user: AuthenticatedUser, @Param('barcode') barcode: string) {
    return this.service.findByBarcode(user, barcode);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductUnitDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post('convert')
  convert(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { fromUnitId: string; toUnitId: string; quantity: number },
  ) {
    return this.service.convertQuantity(user, body.fromUnitId, body.toUnitId, body.quantity);
  }
}
