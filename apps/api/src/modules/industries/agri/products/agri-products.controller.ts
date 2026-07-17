import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AgriProductsService } from './agri-products.service';
import { UpsertAgriProductDto } from './dto/upsert-agri-product.dto';

@ApiTags('Agri - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/products')
export class AgriProductsController {
  constructor(private readonly service: AgriProductsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertAgriProductDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      category: q.category, seedType: q.seedType, fertilizerType: q.fertilizerType,
      feedType: q.feedType, season: q.season, search: q.search,
      isOrganic: q.isOrganic === 'true' ? true : undefined,
      featured: q.featured === 'true' ? true : undefined,
      seasonal: q.seasonal === 'true' ? true : undefined,
    });
  }
  @Get('by-category') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('expiring-certs') expiring(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.expiringCerts(user, days ? Number(days) : 30);
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
