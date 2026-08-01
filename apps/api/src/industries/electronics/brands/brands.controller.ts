import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ElectronicsBrandsService } from './brands.service';
import { UpsertElectronicsBrandDto } from './dto/upsert-brand.dto';

@ApiTags('Electronics - Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/brands')
export class ElectronicsBrandsController {
  constructor(private readonly service: ElectronicsBrandsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertElectronicsBrandDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('featured') featured?: string, @Query('authorized') authorized?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      search,
      featured: featured === 'true' ? true : undefined,
      authorized: authorized === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('top') top(@GetUser() user: AuthenticatedUser, @Query('limit') limit?: string) { return this.service.topBrands(user, limit ? Number(limit) : 10); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertElectronicsBrandDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle-featured') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleFeatured(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
