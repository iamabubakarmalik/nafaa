import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FloristProductsService } from './products.service';
import { UpsertFloristProductDto } from './dto/upsert-product.dto';

@ApiTags('Florist - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('florist/products')
export class FloristProductsController {
  constructor(private readonly service: FloristProductsService) {}

  @Post() upsert(@GetUser() u: AuthenticatedUser, @Body() dto: UpsertFloristProductDto) { return this.service.upsert(u, dto); }

  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('categoryType') categoryType?: string,
    @Query('freshnessGrade') freshnessGrade?: string,
    @Query('flowerType') flowerType?: string,
    @Query('color') color?: string,
    @Query('occasion') occasion?: string,
    @Query('isImported') isImported?: string,
    @Query('isPreArranged') isPreArranged?: string,
    @Query('isCustomizable') isCustomizable?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('seasonalSpecial') seasonalSpecial?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(u, {
      categoryType, freshnessGrade, flowerType, color, occasion, search,
      isImported: isImported === 'true' ? true : undefined,
      isPreArranged: isPreArranged === 'true' ? true : undefined,
      isCustomizable: isCustomizable === 'true' ? true : undefined,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      seasonalSpecial: seasonalSpecial === 'true' ? true : undefined,
    });
  }

  @Get('freshness-alerts') freshness(@GetUser() u: AuthenticatedUser) { return this.service.freshnessAlerts(u); }
  @Get('by-category-count') byCat(@GetUser() u: AuthenticatedUser) { return this.service.byCategory(u); }
  @Get('by-occasion/:occasion') byOcc(@GetUser() u: AuthenticatedUser, @Param('occasion') o: string) { return this.service.byOccasion(u, o); }
  @Get('by-product/:productId') byProd(@GetUser() u: AuthenticatedUser, @Param('productId') p: string) { return this.service.byProduct(u, p); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
