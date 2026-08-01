import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceBrandsService } from './brands.service';
import { UpsertApplianceBrandDto } from './dto/upsert-brand.dto';

@ApiTags('Appliances - Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/brands')
export class ApplianceBrandsController {
  constructor(private readonly service: ApplianceBrandsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertApplianceBrandDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('featured') featured?: string, @Query('authorized') authorized?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      search,
      featured: featured === 'true' ? true : undefined,
      authorized: authorized === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertApplianceBrandDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
