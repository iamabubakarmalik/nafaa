import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CatalogService } from './catalog.service';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';

@ApiTags('Service Business - Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/catalog')
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCatalogDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('businessType') businessType?: string, @Query('search') search?: string, @Query('featured') featured?: string, @Query('popular') popular?: string, @Query('emergency') emergency?: string) {
    return this.service.list(user, {
      category, businessType, search,
      featured: featured === 'true' ? true : undefined,
      popular: popular === 'true' ? true : undefined,
      emergency: emergency === 'true' ? true : undefined,
    });
  }
  @Get('by-category') byCategory(@GetUser() user: AuthenticatedUser) { return this.service.byCategory(user); }
  @Get('by-business-type') byBusinessType(@GetUser() user: AuthenticatedUser) { return this.service.byBusinessType(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCatalogDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
