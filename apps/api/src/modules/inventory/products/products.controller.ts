import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(user, query);
  }

  @Get('low-stock')
  async lowStock(@GetUser() user: AuthenticatedUser) {
    const products = await this.prisma.$queryRaw<any[]>`
      SELECT id, name, sku, barcode, unit, stock, "lowStockAlert", price, "costPrice"
      FROM "Product"
      WHERE "tenantId" = ${user.tenantId}
        AND "isActive" = true
        AND stock <= "lowStockAlert"
      ORDER BY stock ASC
      LIMIT 50
    `;
    return products;
  }

  @Get('barcode/:code')
  async findByBarcode(
    @GetUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [{ barcode: code }, { sku: code }],
        isActive: true,
      },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found for this barcode');
    }
    return product;
  }

  @Get(':id')
  findOne(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user, id);
  }
}
