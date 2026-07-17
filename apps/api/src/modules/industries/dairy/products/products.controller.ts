import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { DairyProductsService } from './products.service';
import { UpsertDairyProductDto } from './dto/upsert-dairy-product.dto';

@ApiTags('Dairy - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/products')
export class DairyProductsController {
  constructor(private readonly service: DairyProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertDairyProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('productType') productType?: string, @Query('quality') quality?: string, @Query('featured') featured?: string, @Query('bestSeller') bestSeller?: string, @Query('morning') morning?: string, @Query('evening') evening?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      productType, quality, search,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      morning: morning === 'true',
      evening: evening === 'true',
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
