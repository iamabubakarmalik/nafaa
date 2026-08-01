import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SportsProductsService } from './products.service';
import { UpsertSportsProductDto } from './dto/upsert-sports-product.dto';

@ApiTags('Sports - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sports/products')
export class SportsProductsController {
  constructor(private readonly service: SportsProductsService) {}

  @Post()
  upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertSportsProductDto) {
    return this.service.upsert(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('brandId') brandId?: string,
    @Query('categoryType') categoryType?: string,
    @Query('sport') sport?: string,
    @Query('ageGroup') ageGroup?: string,
    @Query('genderTarget') genderTarget?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('professional') professional?: string,
    @Query('teamOrderable') teamOrderable?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      brandId, categoryType, sport, ageGroup, genderTarget, search,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      professional: professional === 'true' ? true : undefined,
      teamOrderable: teamOrderable === 'true' ? true : undefined,
    });
  }

  @Get('by-category-count')
  byCategory(@GetUser() user: AuthenticatedUser) {
    return this.service.byCategory(user);
  }

  @Get('by-sport-count')
  bySport(@GetUser() user: AuthenticatedUser) {
    return this.service.bySport(user);
  }

  @Get('team-orderable')
  teamOrderable(@GetUser() user: AuthenticatedUser) {
    return this.service.teamOrderable(user);
  }

  @Get('by-product/:productId')
  byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.byProduct(user, productId);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
