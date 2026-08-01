import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeBrandsService } from './brands.service';
import { UpsertShoeBrandDto } from './dto/upsert-brand.dto';

@ApiTags('Shoe - Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/brands')
export class ShoeBrandsController {
  constructor(private readonly service: ShoeBrandsService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: UpsertShoeBrandDto) { return this.service.create(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('featured') featured?: string,
    @Query('premium') premium?: string,
    @Query('sports') sports?: string,
    @Query('local') local?: string,
    @Query('authorized') authorized?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(u, {
      search,
      featured: featured === 'true' ? true : undefined,
      premium: premium === 'true' ? true : undefined,
      sports: sports === 'true' ? true : undefined,
      local: local === 'true' ? true : undefined,
      authorized: authorized === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('top') top(@GetUser() u: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.service.topBrands(u, limit ? Number(limit) : 10);
  }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertShoeBrandDto) { return this.service.update(u, id, dto); }
  @Post(':id/toggle-featured') toggle(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleFeatured(u, id); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
