import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { BrandsService } from './brands.service';
import { UpdateBrandDto, UpsertBrandDto } from './dto/upsert-brand.dto';
import { MergeTaxonomyDto } from '../taxonomy/merge.dto';

@ApiTags('Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.service.list(user, search);
  }

  @Get('insights')
  insights(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.insights(user, from, to);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBrandDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/merge')
  merge(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MergeTaxonomyDto) {
    return this.service.merge(user, id, dto.intoId);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
