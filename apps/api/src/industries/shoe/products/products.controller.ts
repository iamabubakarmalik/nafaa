import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeProductsService } from './products.service';
import { UpsertShoeProductDto } from './dto/upsert-product.dto';

@ApiTags('Shoe - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/products')
export class ShoeProductsController {
  constructor(private readonly service: ShoeProductsService) {}
  @Post() upsert(@GetUser() u: AuthenticatedUser, @Body() dto: UpsertShoeProductDto) { return this.service.upsert(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('brandId') brandId?: string,
    @Query('categoryType') categoryType?: string,
    @Query('gender') gender?: string,
    @Query('sizeSystem') sizeSystem?: string,
    @Query('color') color?: string,
    @Query('sport') sport?: string,
    @Query('isWaterproof') isWaterproof?: string,
    @Query('isOrthopedic') isOrthopedic?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('trending') trending?: string,
    @Query('bridal') bridal?: string,
    @Query('eidSpecial') eidSpecial?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(u, {
      brandId, categoryType, gender, sizeSystem, color, sport, search,
      isWaterproof: isWaterproof === 'true' ? true : undefined,
      isOrthopedic: isOrthopedic === 'true' ? true : undefined,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      trending: trending === 'true' ? true : undefined,
      bridal: bridal === 'true' ? true : undefined,
      eidSpecial: eidSpecial === 'true' ? true : undefined,
    });
  }
  @Get('by-category-count') byCat(@GetUser() u: AuthenticatedUser) { return this.service.byCategory(u); }
  @Get('by-gender-count') byGender(@GetUser() u: AuthenticatedUser) { return this.service.byGender(u); }
  @Get('by-product/:productId') byProd(@GetUser() u: AuthenticatedUser, @Param('productId') p: string) { return this.service.byProduct(u, p); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
