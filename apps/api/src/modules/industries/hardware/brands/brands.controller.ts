import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { BrandsService } from './brands.service';
import { UpsertBrandDto } from './dto/upsert-brand.dto';

@ApiTags('Hardware - Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBrandDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('tier') tier?: string, @Query('featured') featured?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      tier, search,
      featured: featured === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertBrandDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle-featured') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleFeatured(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
